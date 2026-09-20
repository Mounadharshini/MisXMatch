import os
import math
from typing import Dict, Any, Optional, Tuple
from app.models.schemas import PersonAttributes, AttributeDetail, AttributeMatchResponse
from app.services.text_service import text_engine

class AttributeMatchService:
    """
    Service for calculating individual attribute similarities, handling missing attributes (UNKNOWN),
    and aggregating weighted overall attribute similarity scores.
    """

    @staticmethod
    def _normalize_gender(val: Optional[str]) -> Optional[str]:
        if not val or not str(val).strip():
            return None
        v = str(val).strip().lower()
        if v in ["m", "male", "boy", "man"]:
            return "male"
        if v in ["f", "female", "girl", "woman"]:
            return "female"
        return v

    @staticmethod
    def _compare_age(age1: Optional[int], age2: Optional[int]) -> AttributeDetail:
        if age1 is None or age2 is None:
            return AttributeDetail(
                score=None,
                status="UNKNOWN",
                explanation="Age is missing or unknown in one or both records."
            )

        diff = abs(age1 - age2)
        # Linear tolerance decay: 10 years tolerance
        score = max(0.0, min(1.0, 1.0 - (diff / 10.0)))
        score = round(score, 4)

        if diff == 0:
            status_str = "MATCH"
            explanation = f"Age matches exactly ({age1} years)."
        elif score >= 0.85:
            status_str = "MATCH"
            explanation = f"Age difference of {diff} year(s) ({age1} vs {age2}) is well within 10-year tolerance."
        elif score >= 0.50:
            status_str = "PARTIAL_MATCH"
            explanation = f"Age difference of {diff} year(s) ({age1} vs {age2}) is partially similar."
        else:
            status_str = "MISMATCH"
            explanation = f"Significant age difference of {diff} year(s) ({age1} vs {age2})."

        return AttributeDetail(score=score, status=status_str, explanation=explanation)

    @staticmethod
    def _compare_gender(g1_raw: Optional[str], g2_raw: Optional[str]) -> AttributeDetail:
        g1 = AttributeMatchService._normalize_gender(g1_raw)
        g2 = AttributeMatchService._normalize_gender(g2_raw)

        if not g1 or not g2:
            return AttributeDetail(
                score=None,
                status="UNKNOWN",
                explanation="Gender is missing or unknown in one or both records."
            )

        if g1 == g2:
            return AttributeDetail(
                score=1.0,
                status="MATCH",
                explanation=f"Gender matches exactly ('{g1}')."
            )
        else:
            return AttributeDetail(
                score=0.0,
                status="MISMATCH",
                explanation=f"Gender mismatch ('{g1_raw}' vs '{g2_raw}')."
            )

    @staticmethod
    def _compare_height(h1: Optional[float], h2: Optional[float]) -> AttributeDetail:
        if h1 is None or h2 is None:
            return AttributeDetail(
                score=None,
                status="UNKNOWN",
                explanation="Height is missing or unknown in one or both records."
            )

        diff = abs(h1 - h2)
        # Linear tolerance decay: 25 cm tolerance
        score = max(0.0, min(1.0, 1.0 - (diff / 25.0)))
        score = round(score, 4)

        if diff == 0:
            status_str = "MATCH"
            explanation = f"Height matches exactly ({h1:.0f} cm)."
        elif score >= 0.85:
            status_str = "MATCH"
            explanation = f"Height difference of {diff:.1f} cm ({h1:.0f} cm vs {h2:.0f} cm) is within 25 cm tolerance."
        elif score >= 0.50:
            status_str = "PARTIAL_MATCH"
            explanation = f"Height difference of {diff:.1f} cm ({h1:.0f} cm vs {h2:.0f} cm) is moderately similar."
        else:
            status_str = "MISMATCH"
            explanation = f"Significant height difference of {diff:.1f} cm ({h1:.0f} cm vs {h2:.0f} cm)."

        return AttributeDetail(score=score, status=status_str, explanation=explanation)

    @staticmethod
    def _compare_text_attribute(t1: Optional[str], t2: Optional[str], attr_name: str) -> AttributeDetail:
        if not t1 or not str(t1).strip() or not t2 or not str(t2).strip():
            return AttributeDetail(
                score=None,
                status="UNKNOWN",
                explanation=f"{attr_name.capitalize()} description is missing in one or both records."
            )

        # Real NLP SentenceTransformer cosine similarity comparison
        try:
            emb1 = text_engine.extract_text_embedding(t1)
            emb2 = text_engine.extract_text_embedding(t2)
            score = text_engine.compute_cosine_similarity(emb1, emb2)
        except Exception:
            score = 0.0

        pct = int(score * 100)
        if score >= 0.80:
            status_str = "MATCH"
            explanation = f"{attr_name.capitalize()} descriptions are semantically similar ({pct}% NLP match)."
        elif score >= 0.50:
            status_str = "PARTIAL_MATCH"
            explanation = f"{attr_name.capitalize()} descriptions have partial semantic similarity ({pct}% NLP match)."
        else:
            status_str = "MISMATCH"
            explanation = f"{attr_name.capitalize()} descriptions are semantically distinct ({pct}% NLP match)."

        return AttributeDetail(score=score, status=status_str, explanation=explanation)

    @staticmethod
    def _compare_skin_tone(s1_raw: Optional[str], s2_raw: Optional[str]) -> AttributeDetail:
        if not s1_raw or not str(s1_raw).strip() or not s2_raw or not str(s2_raw).strip():
            return AttributeDetail(
                score=None,
                status="UNKNOWN",
                explanation="Skin tone is missing or unknown in one or both records."
            )

        s1 = str(s1_raw).strip().lower()
        s2 = str(s2_raw).strip().lower()

        if s1 == s2:
            return AttributeDetail(
                score=1.0,
                status="MATCH",
                explanation=f"Skin tone matches exactly ('{s1_raw}')."
            )

        close_groups = [
            {"fair", "light", "pale", "white"},
            {"medium", "wheatish", "brown", "olive", "tan"},
            {"dark", "deep", "black"}
        ]

        same_group = any((s1 in g and s2 in g) for g in close_groups)
        if same_group:
            return AttributeDetail(
                score=0.75,
                status="PARTIAL_MATCH",
                explanation=f"Skin tones ('{s1_raw}' vs '{s2_raw}') belong to similar complexion category."
            )
        else:
            return AttributeDetail(
                score=0.0,
                status="MISMATCH",
                explanation=f"Skin tone mismatch ('{s1_raw}' vs '{s2_raw}')."
            )

    @classmethod
    def evaluate_attribute_match(cls, p1: Optional[PersonAttributes], p2: Optional[PersonAttributes]) -> AttributeMatchResponse:
        """
        Evaluates individual attributes, handles missing fields (UNKNOWN),
        and calculates weighted overall attribute similarity score.
        """
        p1 = p1 or PersonAttributes()
        p2 = p2 or PersonAttributes()

        # Read configurable weights from .env

        weights = {
            "age": float(os.getenv("ATTRIBUTE_WEIGHT_AGE", "0.20")),
            "gender": float(os.getenv("ATTRIBUTE_WEIGHT_GENDER", "0.25")),
            "height": float(os.getenv("ATTRIBUTE_WEIGHT_HEIGHT", "0.15")),
            "clothing": float(os.getenv("ATTRIBUTE_WEIGHT_CLOTHING", "0.20")),
            "hair": float(os.getenv("ATTRIBUTE_WEIGHT_HAIR", "0.10")),
            "skinTone": float(os.getenv("ATTRIBUTE_WEIGHT_SKIN_TONE", "0.10")),
        }

        # Evaluate individual attributes
        evaluations = {
            "age": cls._compare_age(p1.age, p2.age),
            "gender": cls._compare_gender(p1.gender, p2.gender),
            "height": cls._compare_height(p1.height, p2.height),
            "clothing": cls._compare_text_attribute(p1.clothing, p2.clothing, "clothing"),
            "hair": cls._compare_text_attribute(p1.hair, p2.hair, "hair"),
            "skinTone": cls._compare_skin_tone(p1.skinTone, p2.skinTone),
        }

        # Calculate weighted score over AVAILABLE (non-UNKNOWN) attributes
        weighted_score_sum = 0.0
        weighted_denominator = 0.0
        available_count = 0

        for attr, detail in evaluations.items():
            if detail.status != "UNKNOWN" and detail.score is not None:
                w = weights.get(attr, 0.15)
                weighted_score_sum += detail.score * w
                weighted_denominator += w
                available_count += 1

        if weighted_denominator > 0:
            overall_score = round(weighted_score_sum / weighted_denominator, 4)
        else:
            overall_score = 0.0

        threshold = float(os.getenv("ATTRIBUTE_MATCH_THRESHOLD", "0.65"))
        possible_match = overall_score >= threshold
        match_status = "POSSIBLE_ATTRIBUTE_MATCH" if possible_match else "UNLIKELY_ATTRIBUTE_MATCH"

        msg = f"Structured attribute comparison completed over {available_count} available attribute(s)."
        if available_count < 6:
            msg += f" ({6 - available_count} attribute(s) missing/unknown; excluded from score calculation without penalty)."

        return AttributeMatchResponse(
            success=True,
            overallAttributeScore=overall_score,
            matchStatus=match_status,
            threshold=threshold,
            availableAttributesCount=available_count,
            totalAttributesEvaluated=6,
            attributes=evaluations,
            message=msg,
        )
