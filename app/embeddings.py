import os
import numpy as np

BACKEND = os.getenv("EMBEDDING_BACKEND", "local")
_model = None

def _load_local():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-mpnet-base-v2")
    return _model

def embed(texts):
    if BACKEND == "local":
        model = _load_local()
        embs = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        norms = np.linalg.norm(embs, axis=1, keepdims=True)
        return (embs / (norms + 1e-12)).astype("float32")
    else:
        raise NotImplementedError()
