import faiss, pickle
from pathlib import Path
import numpy as np

class FaissStore:
    def __init__(self, dim=768, index_file="faiss.index", meta_file="meta.pkl"):
        self.dim = dim
        self.index_file = index_file
        self.meta_file = meta_file
        self.index = faiss.IndexFlatIP(dim)
        self.meta = []

    def add_vectors(self, vectors: np.ndarray, metas: list):
        if vectors.dtype != np.float32:
            vectors = vectors.astype("float32")
        self.index.add(vectors)
        self.meta.extend(metas)

    def search_vectors(self, vector: np.ndarray, top_k=5):
        if vector.dtype != np.float32:
            vector = vector.astype("float32")
        d, i = self.index.search(vector, top_k)
        results = []
        for dist, idx in zip(d[0], i[0]):
            if idx < len(self.meta):
                results.append({"score": float(dist), "meta": self.meta[idx]})
        return results

    def save_index(self):
        faiss.write_index(self.index, self.index_file)
        with open(self.meta_file, "wb") as f:
            pickle.dump(self.meta, f)

    def load_index(self):
        if Path(self.index_file).exists():
            self.index = faiss.read_index(self.index_file)
        if Path(self.meta_file).exists():
            with open(self.meta_file, "rb") as f:
                self.meta = pickle.load(f)
