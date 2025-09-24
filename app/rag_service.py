from .chunker import chunk_text
from .embeddings import embed
from .vector_store import FaissStore
from .llm_client import call_llm
import threading

INDEX = FaissStore()
INDEX.load_index()
DOC_STORE = {}
CHAT_HISTORY = {}
LOCK = threading.Lock()

def index_doc(doc_id, text):
    chunks = chunk_text(text)
    texts = [c["text"] for c in chunks]
    if not texts:
        return {"indexed":0}
    embs = embed(texts)
    metas = [{"doc_id":doc_id,"chunk_id":c["id"],"start":c["start"],"end":c["end"],"text":c["text"]} for c in chunks]
    INDEX.add_vectors(embs, metas)
    INDEX.save_index()
    DOC_STORE.setdefault(doc_id, []).extend(metas)
    return {"indexed": len(chunks)}

def _build_context(results, max_chars=4000):
    parts,total = [],0
    for r in results:
        m = r["meta"]
        t = m.get("text","")
        part = f"[doc:{m.get('doc_id')} chunk:{m.get('chunk_id')}]\n{t}\n(score:{r.get('score'):.3f})"
        parts.append(part)
        total += len(part)
        if total>max_chars:
            break
    return "\n\n---\n\n".join(parts)

def query(question,k=5):
    q_emb = embed([question])
    results = INDEX.search_vectors(q_emb, k)
    context = _build_context(results)
    prompt = f"You are an assistant. Use context to answer.\n\nContext:\n{context}\n\nQuestion:\n{question}\nAnswer:"
    answer = call_llm(prompt)
    return {"answer":answer,"sources":results}

def chat(user_id, question, doc_id=None, k=5):
    q_emb = embed([question])
    results = INDEX.search_vectors(q_emb, k)
    if doc_id:
        results = [r for r in results if r["meta"].get("doc_id")==doc_id][:k]
    context = _build_context(results)
    with LOCK:
        hist = CHAT_HISTORY.get(user_id, [])[-10:]
    hist_text = "\n".join(hist)
    prompt = f"Assistant. History:\n{hist_text}\n\nContext:\n{context}\nUser: {question}\nAnswer:"
    answer = call_llm(prompt)
    with LOCK:
        CHAT_HISTORY.setdefault(user_id, []).append(f"User: {question}")
        CHAT_HISTORY[user_id].append(f"Assistant: {answer}")
    return {"answer":answer,"sources":results,"history":CHAT_HISTORY[user_id]}

def summarize(doc_id,max_len=300,k=20):
    chunks = [m for m in INDEX.meta if m.get("doc_id")==doc_id]
    if not chunks:
        return {"summary":"","msg":"not found"}
    chunks = sorted(chunks,key=lambda x:x.get("chunk_id"))[:k]
    combined = "\n\n".join([c["text"] for c in chunks])
    prompt = f"Summarize in {max_len} words:\n\n{combined}\n\nSummary:"
    summary = call_llm(prompt, max_tokens=max_len+50)
    return {"summary":summary}
