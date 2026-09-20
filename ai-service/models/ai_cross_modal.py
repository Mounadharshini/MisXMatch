from typing import Dict, Any, List, Optional
import numpy as np

class CrossModalNarrativeSearch:
    """
    Cross-Modal Narrative Retrieval:
    Encodes textual descriptions (e.g. "red backpack near railway station")
    and retrieves top matching authorized case evidence without demographic inference.
    """

    MODEL_VERSION = "1.0.0-cross-modal-minilm"

    def __init__(self, text_embedder=None):
        self.text_embedder = text_embedder

    def search_cases_by_narrative(
        self,
        query_text: str,
        authorized_candidate_cases: List[Dict[str, Any]],
        top_k: int = 5
    ) -> Dict[str, Any]:
        if not query_text or not query_text.strip():
            return {
                "status": "FAILED",
                "message": "Query text description cannot be empty.",
                "results": []
            }

        # Compute query text embedding
        query_emb = None
        if self.text_embedder and hasattr(self.text_embedder, "extract_embedding"):
            try:
                res = self.text_embedder.extract_embedding(query_text)
                query_emb = res.get("embedding")
            except Exception:
                pass

        results = []
        for cand in authorized_candidate_cases:
            cand_desc = cand.get("description", "")
            cand_location = cand.get("location", "")
            full_text = f"{cand_desc} {cand_location}".strip()

            similarity = 0.0
            if query_emb and full_text and self.text_embedder:
                try:
                    cand_res = self.text_embedder.extract_embedding(full_text)
                    cand_emb = cand_res.get("embedding")
                    if cand_emb:
                        # Cosine similarity
                        dot = np.dot(query_emb, cand_emb)
                        norm_q = np.linalg.norm(query_emb)
                        norm_c = np.linalg.norm(cand_emb)
                        similarity = float(dot / (norm_q * norm_c)) if norm_q > 0 and norm_c > 0 else 0.0
                except Exception:
                    pass

            if similarity <= 0.0:
                # Fallback keyword overlap ratio
                q_words = set(query_text.lower().split())
                c_words = set(full_text.lower().split())
                overlap = len(q_words.intersection(c_words))
                similarity = float(overlap / max(1, len(q_words))) * 0.5

            results.append({
                "targetCaseNumber": cand.get("caseNumber", "UNKNOWN"),
                "reportType": cand.get("reportType", "MISSING"),
                "narrativeSimilarity": round(similarity, 4),
                "matchedLocation": cand_location,
                "matchedDescriptionSnippet": cand_desc[:120] if cand_desc else "No description",
                "decisionStatus": "REVIEW_REQUIRED"
            })

        # Sort by similarity descending
        results.sort(key=lambda x: x["narrativeSimilarity"], reverse=True)
        top_results = results[:top_k]

        return {
            "status": "SUCCESS",
            "queryText": query_text,
            "topK": top_k,
            "resultsCount": len(top_results),
            "results": top_results,
            "modelVersion": self.MODEL_VERSION,
            "disclaimer": "Narrative retrieval yields investigative leads only. Human review is required."
        }
