import logging
from typing import List, Dict, Any, Optional
import numpy as np

logger = logging.getLogger("VectorSearch")

class VectorSearchEngine:
    """
    Vector Similarity Search Engine for 512-dimensional Biometric & Person Embeddings.
    Uses FAISS index (IndexFlatIP for L2-normalized cosine similarity) when available,
    with a high-performance PyTorch/NumPy matrix fallback.
    """

    def __init__(self, dimension: int = 512):
        self.dimension = dimension
        self.faiss_available = False
        self.index = None
        self.id_to_key: Dict[int, str] = {}
        self.key_to_id: Dict[str, int] = {}
        self.vectors: List[np.ndarray] = []

        try:
            import faiss
            self.index = faiss.IndexFlatIP(dimension)
            self.faiss_available = True
            logger.info(f"FAISS index initialized successfully for dim={dimension}")
        except Exception as e:
            logger.info(f"FAISS not installed or failed to initialize ({str(e)}). Using PyTorch/NumPy vector matrix fallback.")

    def add_vector(self, key: str, vector: List[float]):
        """Adds a 512-d normalized embedding vector with unique key identifier."""
        if not vector or len(vector) != self.dimension:
            raise ValueError(f"Vector must be dimension {self.dimension}, got {len(vector) if vector else 0}")
        
        arr = np.array(vector, dtype=np.float32)
        norm = np.linalg.norm(arr)
        if norm > 0:
            arr = arr / norm

        if key in self.key_to_id:
            idx = self.key_to_id[key]
            self.vectors[idx] = arr
        else:
            idx = len(self.vectors)
            self.key_to_id[key] = idx
            self.id_to_key[idx] = key
            self.vectors.append(arr)

        if self.faiss_available and self.index is not None:
            import faiss
            matrix = np.array(self.vectors, dtype=np.float32)
            self.index = faiss.IndexFlatIP(self.dimension)
            self.index.add(matrix)

    def search(self, query_vector: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Searches index for top-k closest matches to query vector using Cosine Similarity.
        
        Returns:
            List of dicts: [{"key": str, "similarity": float, "score_percentage": float}]
        """
        if not self.vectors or not query_vector:
            return []

        q_arr = np.array(query_vector, dtype=np.float32)
        norm = np.linalg.norm(q_arr)
        if norm > 0:
            q_arr = q_arr / norm

        top_k = min(top_k, len(self.vectors))

        if self.faiss_available and self.index is not None and self.index.ntotal > 0:
            q_matrix = np.array([q_arr], dtype=np.float32)
            scores, indices = self.index.search(q_matrix, top_k)
            results = []
            for sim, idx in zip(scores[0], indices[0]):
                if idx >= 0 and idx in self.id_to_key:
                    sim_val = float(sim)
                    sim_val = max(0.0, min(1.0, sim_val))
                    results.append({
                        "key": self.id_to_key[idx],
                        "similarity": round(sim_val, 4),
                        "score_percentage": round(sim_val * 100.0, 2)
                    })
            return results
        else:
            matrix = np.array(self.vectors, dtype=np.float32)
            sims = np.dot(matrix, q_arr)
            top_indices = np.argsort(sims)[::-1][:top_k]

            results = []
            for idx in top_indices:
                sim_val = float(sims[idx])
                sim_val = max(0.0, min(1.0, sim_val))
                results.append({
                    "key": self.id_to_key[idx],
                    "similarity": round(sim_val, 4),
                    "score_percentage": round(sim_val * 100.0, 2)
                })
            return results
