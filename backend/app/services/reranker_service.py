import logging
from typing import List, Dict, Any, Tuple
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

_reranker_model = None

def _load_reranker():
    global _reranker_model
    if _reranker_model is None:
        try:
            logger.info(f"Loading Cross-Encoder reranker model: {settings.RERANK_MODEL}...")
            from sentence_transformers import CrossEncoder
            _reranker_model = CrossEncoder(settings.RERANK_MODEL)
            logger.info("Reranker model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load cross-encoder model: {e}. Check internet connection or model path.")
            _reranker_model = "FAILED"
    return _reranker_model

def rerank_chunks(query: str, chunks: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Reranks document chunks against the user query using a Cross-Encoder.
    If model is disabled or fails to load, returns the chunks in their original order.
    """
    if not settings.RERANK_ENABLED or not chunks:
        return chunks[:top_k]
        
    model = _load_reranker()
    if model == "FAILED" or model is None:
        logger.warning("Reranker model unavailable. Skipping reranking stage.")
        return chunks[:top_k]
        
    try:
        pairs = [(query, chunk.get("content", "")) for chunk in chunks]
        scores = model.predict(pairs)
        
        chunk_score_pairs = list(zip(chunks, scores))
        sorted_pairs = sorted(chunk_score_pairs, key=lambda x: x[1], reverse=True)
        
        reranked_chunks = []
        for chunk, score in sorted_pairs:
            chunk_copy = dict(chunk)
            chunk_copy["rerank_score"] = float(score)
            reranked_chunks.append(chunk_copy)
            
        logger.info(f"Successfully reranked {len(chunks)} chunks down to top {top_k}.")
        return reranked_chunks[:top_k]
    except Exception as e:
        logger.error(f"Error during reranking: {e}")
        return chunks[:top_k]
