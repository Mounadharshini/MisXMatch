import os
import numpy as np
from typing import Tuple
from fastapi import HTTPException, status
from sentence_transformers import SentenceTransformer

class TextFeatureEngine:
    """
    Singleton AI NLP Engine for Pretrained Sentence Transformer Semantic Embedding Extraction
    and Cosine Similarity Calculation.
    Loaded ONCE at service startup.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TextFeatureEngine, cls).__new__(cls)
            cls._instance._initialize_model()
        return cls._instance

    def _initialize_model(self):
        """Initializes pretrained SentenceTransformer model ('all-MiniLM-L6-v2') once in memory."""
        model_name = os.getenv("NLP_MODEL_NAME", "all-MiniLM-L6-v2")
        print(f"Loading pretrained NLP SentenceTransformer model '{model_name}'...")
        try:
            self.model = SentenceTransformer(model_name)
            self.embedding_dim = 384
            print(f"✔ AI NLP Text Engine initialized successfully ('{model_name}', 384-D Semantic Embedding).")
        except Exception as e:
            raise RuntimeError(f"Failed to load NLP SentenceTransformer model '{model_name}': {str(e)}")

    def extract_text_embedding(self, text: str) -> np.ndarray:
        """
        Generates 384-dimensional L2-normalized dense semantic vector embedding for input description text.
        """
        if not text or not text.strip():
            raise ValueError("Text content cannot be empty for embedding extraction.")

        # Generate dense semantic vector embedding
        embedding = self.model.encode(text.strip(), convert_to_numpy=True, normalize_embeddings=True)
        return embedding.astype(np.float32)

    def compute_cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """
        Computes Cosine Similarity between two L2-normalized 384-D semantic vectors:
        Cosine Similarity = (vec1 . vec2) / (||vec1|| * ||vec2||)
        """
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        if norm1 < 1e-12 or norm2 < 1e-12:
            return 0.0

        dot_product = float(np.dot(vec1, vec2))
        cosine_sim = dot_product / (norm1 * norm2)

        # Clamp score to [0.0, 1.0] range
        similarity_score = max(0.0, min(1.0, float(cosine_sim)))
        return round(similarity_score, 4)

# Global Singleton Instance
text_engine = TextFeatureEngine()
