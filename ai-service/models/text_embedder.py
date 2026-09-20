import os
import re
import logging
from typing import Optional, Dict, Any, List, Set, Union
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TextEmbedder")

PUNCTUATION = re.compile(r"[^a-zA-Z0-9\s]")
STOP_WORDS = {
    "a", "an", "the", "in", "on", "at", "with", "wearing", "and", "is", "was",
    "of", "to", "for", "by", "has", "had", "he", "she", "color", "coloured",
    "clothes", "dress", "person", "man", "woman", "boy", "girl", "seen", "last"
}

SYNONYMS = {
    "spectacles": {"spectacles", "glasses", "specs", "eyewear", "goggles"},
    "shirt": {"shirt", "tshirt", "t-shirt", "top", "tee", "kurta"},
    "pants": {"pants", "trousers", "jeans", "bottom", "trackpants", "slacks"},
    "saree": {"saree", "sari"},
    "sweater": {"sweater", "pullover", "cardigan", "sweatshirt", "hoodie"},
    "jacket": {"jacket", "coat", "blazer", "windcheater"},
    "child": {"kid", "child", "minor", "boy", "girl", "toddler"},
    "cap": {"cap", "hat", "headwear"}
}

class TextEmbedder:
    """
    NLP & Text Semantic Similarity Embedding Engine for MISXMATCH.
    
    Provides hybrid semantic vector similarity (via sentence-transformers)
    combined with domain-specific attire and attribute keyword overlap matching.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(model_name)
            logger.info(f"TextEmbedder initialized with sentence-transformer model '{model_name}'.")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer model '{model_name}': {str(e)}. Operating with TF-IDF/frequency fallback.")

    def tokenize_and_clean(self, text: str) -> Set[str]:
        """Tokenizes, cleans, and removes stopwords from input string."""
        if not text:
            return set()
        cleaned = PUNCTUATION.sub(" ", text.lower())
        tokens = [w.strip() for w in cleaned.split() if len(w.strip()) > 1 and w.strip() not in STOP_WORDS]
        return set(tokens)

    def expand_synonyms(self, tokens: Set[str]) -> Set[str]:
        """Expands tokens with domain-specific synonym terms."""
        expanded = set(tokens)
        for t in tokens:
            for canon, syn_set in SYNONYMS.items():
                if t in syn_set:
                    expanded.update(syn_set)
        return expanded

    def compute_embedding(self, text: str) -> List[float]:
        """
        Extracts 384-dimensional (or dense float) normalized text embedding vector.
        """
        if not text or not text.strip():
            # Return zero vector fallback
            dim = 384 if self.model is not None else 128
            return [0.0] * dim

        if self.model is not None:
            emb = self.model.encode(text, convert_to_numpy=True)
            norm = np.linalg.norm(emb)
            if norm > 0:
                emb = emb / norm
            return emb.tolist()
        else:
            # Deterministic hash-vector fallback when sentence-transformers offline
            tokens = self.tokenize_and_clean(text)
            vec = np.zeros(128, dtype=np.float32)
            for t in tokens:
                idx = abs(hash(t)) % 128
                vec[idx] += 1.0
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            return vec.tolist()

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        """Computes cosine similarity between two float vectors."""
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        a = np.array(v1, dtype=np.float32)
        b = np.array(v2, dtype=np.float32)
        dot = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        sim = float(dot / (norm_a * norm_b))
        return max(-1.0, min(1.0, sim))

    def jaccard_keyword_similarity(self, text1: str, text2: str) -> Dict[str, Any]:
        """
        Computes domain-specific attire/attribute keyword Jaccard overlap similarity score.
        """
        tokens1 = self.tokenize_and_clean(text1)
        tokens2 = self.tokenize_and_clean(text2)

        if not tokens1 or not tokens2:
            return {"score": 0.0, "matched_keywords": []}

        expanded1 = self.expand_synonyms(tokens1)
        expanded2 = self.expand_synonyms(tokens2)

        intersection = tokens1.intersection(tokens2)
        expanded_intersection = expanded1.intersection(expanded2)

        union = expanded1.union(expanded2)
        jaccard = len(expanded_intersection) / len(union) if union else 0.0

        # Check key color + item pairs
        matched_attributes = []
        colors = ["blue", "red", "yellow", "green", "black", "white", "navy", "dark", "pink", "brown", "grey", "gray"]
        items = ["shirt", "sweater", "kurta", "jeans", "hoodie", "jacket", "saree", "spectacles", "glasses", "shoes", "scar", "tattoo", "bag"]

        for c in colors:
            for item in items:
                t1_has = (c in expanded1) and (item in expanded1)
                t2_has = (c in expanded2) and (item in expanded2)
                if t1_has and t2_has:
                    matched_attributes.append(f"{c} {item}")

        matched_list = list(set(matched_attributes + list(intersection)))

        return {
            "score": round(jaccard, 4),
            "matched_keywords": matched_list
        }

    def compare_text_embeddings(self, emb1: List[float], emb2: List[float], threshold: float = 0.40) -> Dict[str, Any]:
        """Compares two text embedding vectors directly."""
        raw_cosine = self.cosine_similarity(emb1, emb2)
        similarity_pct = round(max(0.0, min(1.0, raw_cosine)) * 100.0, 2)
        is_match = raw_cosine >= threshold

        if raw_cosine >= 0.70:
            confidence = "HIGH"
        elif raw_cosine >= threshold:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        return {
            "is_match": is_match,
            "similarity_score": similarity_pct,
            "raw_cosine_similarity": round(raw_cosine, 4),
            "confidence": confidence,
            "threshold_used": threshold,
            "model_used": self.model_name if self.model is not None else "hash_vector_fallback"
        }

    def compare_texts(self, text1: str, text2: str, threshold: float = 0.40) -> Dict[str, Any]:
        """
        Compares two text descriptions directly using hybrid semantic + keyword overlap similarity.
        """
        if not text1 or not text2:
            return {
                "status": "SUCCESS",
                "is_match": False,
                "similarity_score": 0.0,
                "semantic_similarity": 0.0,
                "keyword_similarity": 0.0,
                "matched_keywords": [],
                "confidence": "LOW",
                "threshold_used": threshold,
                "model_used": self.model_name if self.model is not None else "hash_vector_fallback"
            }

        # 1. Semantic Embedding Cosine Similarity
        emb1 = self.compute_embedding(text1)
        emb2 = self.compute_embedding(text2)
        sem_sim = max(0.0, self.cosine_similarity(emb1, emb2))

        # 2. Keyword & Attire Jaccard Overlap
        kw_res = self.jaccard_keyword_similarity(text1, text2)
        kw_sim = kw_res["score"]
        matched_kw = kw_res["matched_keywords"]

        # 3. Hybrid Score Combination (60% Semantic + 40% Keyword)
        hybrid_score = (0.60 * sem_sim) + (0.40 * kw_sim)
        
        # Boost if explicit matched color/item attributes found
        if matched_kw:
            hybrid_score = min(0.99, hybrid_score + (0.15 * min(3, len(matched_kw))))

        similarity_pct = round(max(0.0, min(1.0, hybrid_score)) * 100.0, 2)
        is_match = hybrid_score >= threshold

        if hybrid_score >= 0.65:
            confidence = "HIGH"
        elif hybrid_score >= threshold:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        return {
            "status": "SUCCESS",
            "is_match": is_match,
            "similarity_score": similarity_pct,
            "semantic_similarity": round(sem_sim, 4),
            "keyword_similarity": round(kw_sim, 4),
            "matched_keywords": matched_kw,
            "confidence": confidence,
            "threshold_used": threshold,
            "model_used": self.model_name if self.model is not None else "hash_vector_fallback"
        }

    def rank_candidates(self, query_text: str, candidate_texts: List[Dict[str, str]], top_k: int = 5) -> Dict[str, Any]:
        """
        Ranks candidate text records against query text using hybrid text similarity.
        Each candidate_text dict should contain 'id' or 'caseNumber' and 'description'.
        """
        results = []
        for cand in candidate_texts:
            c_id = cand.get("id") or cand.get("caseNumber") or "UNKNOWN"
            c_text = cand.get("description") or cand.get("text") or ""
            
            comp = self.compare_texts(query_text, c_text)
            results.append({
                "candidate_id": str(c_id),
                "is_match": comp["is_match"],
                "similarity_score": comp["similarity_score"],
                "semantic_similarity": comp["semantic_similarity"],
                "keyword_similarity": comp["keyword_similarity"],
                "matched_keywords": comp["matched_keywords"],
                "confidence": comp["confidence"]
            })

        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return {
            "status": "SUCCESS",
            "query_text": query_text,
            "total_candidates": len(candidate_texts),
            "top_matches": results[:top_k]
        }
