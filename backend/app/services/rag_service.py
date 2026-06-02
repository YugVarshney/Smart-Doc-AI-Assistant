import os
import logging
import numpy as np
import json
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text, func, or_
from backend.app.core.config import settings
from backend.app.db.database import is_sqlite
from backend.app.models.models import Document, DocumentChunk, KnowledgeGraph, Message
from backend.app.services.reranker_service import rerank_chunks
from backend.app.services.doc_parser import parse_document

logger = logging.getLogger(__name__)

_emb_model = None

def _load_emb_model():
    global _emb_model
    if _emb_model is None:
        try:
            logger.info("Loading local embedding model: all-mpnet-base-v2...")
            from sentence_transformers import SentenceTransformer
            _emb_model = SentenceTransformer("all-mpnet-base-v2")
            logger.info("Local embedding model loaded.")
        except Exception as e:
            logger.error(f"Failed to load sentence-transformer model: {e}")
            raise e
    return _emb_model

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Generates embedding vectors for a list of texts."""
    if not texts:
        return []
        
    if settings.EMBEDDING_BACKEND == "openai":
        try:
            import openai
            client = openai.OpenAI(
                api_key=settings.LLM_API_KEY or settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL
            )
            resp = client.embeddings.create(
                model="text-embedding-3-small",
                input=texts
            )
            return [data.embedding for data in resp.data]
        except Exception as e:
            logger.error(f"OpenAI embeddings creation failed: {e}. Falling back to local embeddings...")
            
    model = _load_emb_model()
    embs = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    norms = np.linalg.norm(embs, axis=1, keepdims=True)
    normalized_embs = embs / (norms + 1e-12)
    return normalized_embs.tolist()

def call_llm(prompt: str, system_prompt: str = "You are a helpful assistant.", max_tokens: int = 1000, temp: float = 0.0) -> str:
    """Invokes OpenAI Chat API or falls back to a mock response."""
    if settings.LLM_BACKEND == "openai" and (settings.LLM_API_KEY or settings.OPENAI_API_KEY):
        try:
            import openai
            client = openai.OpenAI(
                api_key=settings.LLM_API_KEY or settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL
            )
            resp = client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=temp
            )
            return resp.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            return f"Error connecting to LLM. Technical Details: {e}"
    else:
        logger.info("Using Stub LLM response.")
        return f"[STUB RESPONSE] Here is a mock answer for: '{prompt[:100]}...'\n\nThis stub is running because LLM_BACKEND is not set to 'openai' or your LLM_API_KEY/OPENAI_API_KEY is missing."

def split_text_into_chunks(paragraphs: List[Dict[str, Any]], chunk_size: int = 1000, overlap: int = 200) -> List[Dict[str, Any]]:
    """Combines paragraph nodes into chunks of roughly chunk_size characters with overlap."""
    chunks = []
    current_chunk = []
    current_length = 0
    chunk_index = 0
    
    for i, para in enumerate(paragraphs):
        para_text = para["text"]
        para_len = len(para_text)
        
        if current_length + para_len > chunk_size and current_chunk:
            chunk_content = "\n\n".join([p["text"] for p in current_chunk])
            chunks.append({
                "chunk_index": chunk_index,
                "content": chunk_content,
                "page_number": current_chunk[0]["page"],
                "start_char": current_chunk[0]["start_char"],
                "end_char": current_chunk[-1]["end_char"]
            })
            chunk_index += 1
            

            overlap_length = 0
            overlap_elements = []
            for item in reversed(current_chunk):
                if overlap_length + len(item["text"]) < overlap:
                    overlap_elements.insert(0, item)
                    overlap_length += len(item["text"])
                else:
                    break
            current_chunk = overlap_elements
            current_length = sum(len(x["text"]) for x in current_chunk)
            
        current_chunk.append(para)
        current_length += para_len
        
    if current_chunk:
        chunk_content = "\n\n".join([p["text"] for p in current_chunk])
        chunks.append({
            "chunk_index": chunk_index,
            "content": chunk_content,
            "page_number": current_chunk[0]["page"],
            "start_char": current_chunk[0]["start_char"],
            "end_char": current_chunk[-1]["end_char"]
        })
        
    return chunks

def index_document_in_db(db: Session, doc_id: str, file_path: str):
    """Parses a document, generates embeddings, and indexes chunks in SQL DB."""
    paragraphs = parse_document(file_path)
    if not paragraphs:
        logger.warning(f"No text extracted from document {doc_id}")
        return
        
    chunks = split_text_into_chunks(paragraphs)
    logger.info(f"Split document into {len(chunks)} chunks.")
    
    chunk_contents = [c["content"] for c in chunks]
    embeddings = get_embeddings(chunk_contents)
    
    db_chunks = []
    for i, chunk in enumerate(chunks):
        db_chunk = DocumentChunk(
            document_id=doc_id,
            chunk_index=chunk["chunk_index"],
            content=chunk["content"],
            embedding=embeddings[i] if i < len(embeddings) else None,
            page_number=chunk["page_number"],
            start_char=chunk["start_char"],
            end_char=chunk["end_char"]
        )
        db.add(db_chunk)
        db_chunks.append(db_chunk)
        
    db.commit()
    logger.info(f"Successfully saved and indexed {len(db_chunks)} chunks for doc {doc_id}.")
    
    try:
        extract_doc_metadata_and_graph(db, doc_id, chunk_contents)
    except Exception as e:
        logger.error(f"Failed to generate metadata or graph for document {doc_id}: {e}")

def extract_doc_metadata_and_graph(db: Session, doc_id: str, chunk_contents: List[str]):
    """Generates document tags, summary, and a knowledge graph of entities and relations."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return
        
    sample_text = "\n\n".join(chunk_contents[:5])
    
    summary_prompt = f"Summarize the following document content in under 150 words. Focus on key themes and target audience:\n\n{sample_text}"
    summary = call_llm(summary_prompt, max_tokens=250)
    
    tags_prompt = f"Based on the text, output a valid JSON list containing exactly 3 to 5 keywords or tags representing the document subjects. Output ONLY the raw JSON list:\n\n{sample_text}"
    tags_raw = call_llm(tags_prompt, max_tokens=100)
    
    try:
        if "```json" in tags_raw:
            tags_raw = tags_raw.split("```json")[1].split("```")[0].strip()
        elif "```" in tags_raw:
            tags_raw = tags_raw.split("```")[1].split("```")[0].strip()
        tags = json.loads(tags_raw.strip())
    except Exception:
        tags = ["DocAI", "Research", "Analysis"]
        
    doc.summary = summary
    doc.tags = tags
    db.commit()
    
    kg_prompt = (
        "Extract up to 15 key entities and up to 15 relationships between them from the following text.\n"
        "Return the output as a valid JSON object matching this schema exactly:\n"
        "{\n"
        "  \"nodes\": [{\"id\": \"entity1_name\", \"label\": \"Display Name\", \"type\": \"Person/Org/Concept/etc.\"}],\n"
        "  \"edges\": [{\"source\": \"entity1_name\", \"target\": \"entity2_name\", \"label\": \"RELATIONSHIP_TYPE\"}]\n"
        "}\n"
        "Output ONLY raw JSON code block, do not include any explanatory text.\n\n"
        f"Text:\n{sample_text}"
    )
    kg_raw = call_llm(kg_prompt, max_tokens=1500)
    try:
        if "```json" in kg_raw:
            kg_raw = kg_raw.split("```json")[1].split("```")[0].strip()
        elif "```" in kg_raw:
            kg_raw = kg_raw.split("```")[1].split("```")[0].strip()
        kg_data = json.loads(kg_raw.strip())
        
        kg = KnowledgeGraph(
            document_id=doc_id,
            nodes=kg_data.get("nodes", []),
            edges=kg_data.get("edges", [])
        )
        db.add(kg)
        db.commit()
        logger.info(f"Knowledge Graph created for doc {doc_id}")
    except Exception as e:
        logger.error(f"Failed parsing Knowledge Graph JSON: {e}. Raw response: {kg_raw}")
        kg = KnowledgeGraph(
            document_id=doc_id,
            nodes=[{"id": "doc", "label": doc.title, "type": "Document"}],
            edges=[]
        )
        db.add(kg)
        db.commit()


def retrieve_semantic(db: Session, query_emb: List[float], document_ids: List[str], top_k: int = 20) -> List[Tuple[DocumentChunk, float]]:
    """Retrieve top-k matches using pgvector distance (or numpy similarity fallback)."""
    if is_sqlite:
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(document_ids)).all()
        scored_chunks = []
        q_vec = np.array(query_emb)
        for chunk in chunks:
            if chunk.embedding is not None:
                c_vec = np.array(chunk.embedding)
                sim = float(np.dot(q_vec, c_vec) / (np.linalg.norm(q_vec) * np.linalg.norm(c_vec) + 1e-12))
                scored_chunks.append((chunk, sim))
        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        return scored_chunks[:top_k]
    else:

        results = db.query(DocumentChunk, DocumentChunk.embedding.cosine_distance(query_emb).label("dist"))\
            .filter(DocumentChunk.document_id.in_(document_ids))\
            .order_by("dist")\
            .limit(top_k)\
            .all()
        return [(chunk, 1.0 - float(dist)) for chunk, dist in results]

def retrieve_keyword(db: Session, query: str, document_ids: List[str], top_k: int = 20) -> List[Tuple[DocumentChunk, float]]:
    """Retrieve top-k matches using full-text keyword search."""
    if is_sqlite:
        words = [w.strip() for w in query.split() if len(w.strip()) > 2]
        if not words:
            chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(document_ids)).limit(top_k).all()
            return [(c, 1.0) for c in chunks]
            
        filters = []
        for word in words:
            filters.append(DocumentChunk.content.ilike(f"%{word}%"))
            
        chunks = db.query(DocumentChunk)\
            .filter(DocumentChunk.document_id.in_(document_ids))\
            .filter(or_(*filters))\
            .limit(top_k).all()
            
        results = []
        for c in chunks:
            hits = sum(1 for w in words if w.lower() in c.content.lower())
            results.append((c, float(hits)))
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]
    else:
        words = [w.strip() for w in query.replace("'", "").replace('"', "").split() if len(w.strip()) > 2]
        if not words:
            ts_query = func.plainto_tsquery('english', query)
        else:
            ts_query = func.to_tsquery('english', " | ".join(words))
            
        results = db.query(DocumentChunk, func.ts_rank_cd(func.to_tsvector('english', DocumentChunk.content), ts_query).label("rank"))\
            .filter(DocumentChunk.document_id.in_(document_ids))\
            .filter(func.to_tsvector('english', DocumentChunk.content).op("@@")(ts_query))\
            .order_by(text("rank DESC"))\
            .limit(top_k)\
            .all()
        return [(chunk, float(rank)) for chunk, rank in results]

def reciprocal_rank_fusion(
    semantic_results: List[Tuple[DocumentChunk, float]], 
    keyword_results: List[Tuple[DocumentChunk, float]], 
    k_rrf: int = 60,
    top_k: int = 20
) -> List[Dict[str, Any]]:
    """Combines semantic and keyword scores using Reciprocal Rank Fusion (RRF)."""
    scores = {}
    
    def add_to_scores(results):
        for rank, (chunk, _) in enumerate(results):
            if chunk.id not in scores:
                scores[chunk.id] = {
                    "chunk": chunk,
                    "rrf_score": 0.0
                }
            scores[chunk.id]["rrf_score"] += 1.0 / (k_rrf + (rank + 1))
            
    add_to_scores(semantic_results)
    add_to_scores(keyword_results)
    
    sorted_items = sorted(scores.values(), key=lambda x: x["rrf_score"], reverse=True)
    
    fused_results = []
    for item in sorted_items[:top_k]:
        chunk = item["chunk"]
        fused_results.append({
            "id": chunk.id,
            "document_id": chunk.document_id,
            "filename": chunk.document.filename if chunk.document else "Unknown",
            "chunk_index": chunk.chunk_index,
            "content": chunk.content,
            "page_number": chunk.page_number,
            "start_char": chunk.start_char,
            "end_char": chunk.end_char,
            "rrf_score": item["rrf_score"]
        })
    return fused_results

def retrieve_hybrid_and_rerank(db: Session, query: str, document_ids: List[str], retrieve_limit: int = 15, final_limit: int = 5) -> List[Dict[str, Any]]:
    """Executes hybrid dense-sparse search, merges with RRF, and applies Cross-Encoder reranking."""
    if not document_ids:
        return []
        
    query_emb = get_embeddings([query])[0]
    
    semantic_matches = retrieve_semantic(db, query_emb, document_ids, top_k=retrieve_limit)
    keyword_matches = retrieve_keyword(db, query, document_ids, top_k=retrieve_limit)
    
    fused_candidates = reciprocal_rank_fusion(semantic_matches, keyword_matches, top_k=retrieve_limit * 2)
    
    reranked_chunks = rerank_chunks(query, fused_candidates, top_k=final_limit)
    
    return reranked_chunks


def generate_rag_response(db: Session, query: str, document_ids: List[str], chat_id: str) -> Dict[str, Any]:
    """Retrieves relevant contexts, generates answer with citations, and returns source payload."""
    top_chunks = retrieve_hybrid_and_rerank(db, query, document_ids, retrieve_limit=15, final_limit=5)
    
    context_blocks = []
    for idx, c in enumerate(top_chunks):
        context_blocks.append(f"--- Chunk [{idx + 1}] (File: {c['filename']}, Page: {c['page_number']}) ---\n{c['content']}")
    context_str = "\n\n".join(context_blocks)
    
    system_prompt = (
        "You are an expert AI intelligence document assistant. Your task is to answer user queries truthfully using only the provided context blocks.\n"
        "Draft a clean, natural, and direct response (similar to ChatGPT). You MUST include simple inline citation numbers mapping exactly to the chunk index that provided the facts (e.g. [1], [2]).\n"
        "Place these citations immediately at the end of the sentence or clause containing the cited fact. Use ONLY standard square bracket citations (e.g. [1]). Do NOT output search-engine style footnote symbols (like 【1†...】).\n"
        "If the document context does not contain enough information to answer the question, state honestly that you do not know. Do not hallucinate."
    )
    
    prompt = (
        f"Context Blocks:\n{context_str}\n\n"
        f"User Question: {query}\n\n"
        "Draft a clean, well-structured answer utilizing markdown formatting (bullet points, subheadings, etc.) and explicit inline citations (e.g. [1]):"
    )
    
    answer = call_llm(prompt, system_prompt=system_prompt, max_tokens=1000)
    
    cited_sources = []
    for idx, c in enumerate(top_chunks):
        cite_str = f"[{idx + 1}]"
        if cite_str in answer:
            cited_sources.append({
                "citation_index": idx + 1,
                "chunk_id": c["id"],
                "document_id": c["document_id"],
                "filename": c["filename"],
                "content": c["content"],
                "page_number": c["page_number"],
                "start_char": c["start_char"],
                "end_char": c["end_char"]
            })
            
    msg_user = Message(chat_id=chat_id, role="user", content=query)
    msg_assistant = Message(
        chat_id=chat_id, 
        role="assistant", 
        content=answer, 
        sources=cited_sources,
        evaluation_metrics=None
    )
    db.add(msg_user)
    db.add(msg_assistant)
    db.commit()
    
    return {
        "message_id": msg_assistant.id,
        "answer": answer,
        "sources": cited_sources
    }


def evaluate_rag_quality(query: str, retrieved_contexts: List[str], answer: str) -> Dict[str, float]:
    """
    Computes RAG quality metrics (Faithfulness, Answer Relevancy, Context Precision)
    using LLM-as-a-judge prompts. Returns scores between 0.0 and 1.0.
    """
    context_str = "\n\n".join([f"Chunk {i+1}: {c}" for i, c in enumerate(retrieved_contexts)])
    
    faithfulness_prompt = (
        "Evaluate the FAITHFULNESS of the AI-generated answer based on the provided source contexts.\n"
        "Does the answer contain statements that cannot be backed up or verified by the source contexts? If yes, that is unfaithful.\n"
        "Output a score between 0.0 and 1.0, where 1.0 means fully faithful and grounded, and 0.0 means completely hallucinated.\n"
        "You must output ONLY a float value representing the score, without any explanations.\n\n"
        f"Contexts:\n{context_str}\n\n"
        f"AI Answer:\n{answer}\n\n"
        "Faithfulness Score (0.0 to 1.0):"
    )
    
    relevancy_prompt = (
        "Evaluate the RELEVANCY of the AI-generated answer based on the user's question.\n"
        "Does the answer fully address the question? Is it redundant or talking about unrelated topics?\n"
        "Output a score between 0.0 and 1.0, where 1.0 means highly relevant and precise, and 0.0 means completely off-topic.\n"
        "You must output ONLY a float value representing the score, without any explanations.\n\n"
        f"Question:\n{query}\n\n"
        f"AI Answer:\n{answer}\n\n"
        "Relevancy Score (0.0 to 1.0):"
    )
    
    precision_prompt = (
        "Evaluate the CONTEXT PRECISION of the retrieved source contexts based on the user's question.\n"
        "Are the retrieved source chunks useful to construct a complete answer? Or are they irrelevant clutter?\n"
        "Output a score between 0.0 and 1.0, where 1.0 means all chunks are highly relevant, and 0.0 means none are useful.\n"
        "You must output ONLY a float value representing the score, without any explanations.\n\n"
        f"Question:\n{query}\n\n"
        f"Source Contexts:\n{context_str}\n\n"
        "Context Precision Score (0.0 to 1.0):"
    )
    
    scores = {"faithfulness": 1.0, "relevancy": 1.0, "context_precision": 1.0}
    
    try:
        f_raw = call_llm(faithfulness_prompt, max_tokens=10).strip()
        scores["faithfulness"] = min(1.0, max(0.0, float(f_raw)))
    except Exception:
        pass
        
    try:
        r_raw = call_llm(relevancy_prompt, max_tokens=10).strip()
        scores["relevancy"] = min(1.0, max(0.0, float(r_raw)))
    except Exception:
        pass
        
    try:
        p_raw = call_llm(precision_prompt, max_tokens=10).strip()
        scores["context_precision"] = min(1.0, max(0.0, float(p_raw)))
    except Exception:
        pass
        
    return scores
