import math
from typing import Dict, Any, List, Optional
import os

class CalibratedMultimodalLeadCard:
    """
    Calibrated Multimodal Candidate Card generator.
    Converts raw similarity scores into calibrated confidence bands via Temperature / Platt Scaling.
    Guarantees strict separation of modalities (Face, Re-ID, Text, Location, Timeline).
    Enforces decisionStatus = REVIEW_REQUIRED only.
    """

    MODEL_VERSIONS = {
        "face": "InsightFace-SFace-512-v1",
        "reid": "OSNet-IBN-x1_0-v1",
        "text": "SentenceTransformer-MiniLM-L6-v2",
        "fusion_calibration": "PlattScaling-Temperature-1.2"
    }

    def __init__(self, temperature: float = 1.2, platt_a: float = 12.0, platt_b: float = -5.0):
        # Dynamic configuration from environment variables or defaults
        self.temperature = float(os.getenv("AI_CALIBRATION_TEMPERATURE", str(temperature)))
        self.platt_a = float(os.getenv("AI_PLATT_SCALE_A", str(platt_a)))
        self.platt_b = float(os.getenv("AI_PLATT_SCALE_B", str(platt_b)))
        
        self.face_threshold = float(os.getenv("AI_FACE_SIMILARITY_THRESHOLD", "0.40"))
        self.reid_threshold = float(os.getenv("AI_REID_THRESHOLD", "0.45"))
        self.text_threshold = float(os.getenv("AI_TEXT_THRESHOLD", "0.35"))

    def calibrate_score(self, raw_score: float) -> float:
        """
        Applies Platt / Sigmoid calibration to map raw cosine similarity [-1, 1]
        or normalized similarity [0, 1] to a calibrated probability/confidence [0, 100].
        """
        # Ensure score is in range [0, 1]
        norm_s = max(0.0, min(1.0, raw_score))
        logit = self.platt_a * (norm_s - 0.40) + self.platt_b
        # Temperature scaling
        scaled_logit = logit / self.temperature
        calibrated_prob = 1.0 / (1.0 + math.exp(-scaled_logit))
        return round(calibrated_prob * 100.0, 1)

    def generate_lead_card(
        self,
        source_case_number: str,
        target_case_number: str,
        face_score: Optional[float] = None,
        reid_score: Optional[float] = None,
        text_score: Optional[float] = None,
        location_score: Optional[float] = None,
        timeline_score: Optional[float] = None,
        quality_assessment: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Constructs an explainable candidate lead card.
        """
        modality_availability = {
            "face": face_score is not None,
            "reid": reid_score is not None,
            "text": text_score is not None,
            "location": location_score is not None,
            "timeline": timeline_score is not None
        }

        # Collect raw and weighted components
        weights = {"face": 0.45, "reid": 0.25, "text": 0.15, "location": 0.10, "timeline": 0.05}
        total_weight = 0.0
        weighted_sum = 0.0

        if face_score is not None:
            weighted_sum += face_score * weights["face"]
            total_weight += weights["face"]
        if reid_score is not None:
            weighted_sum += reid_score * weights["reid"]
            total_weight += weights["reid"]
        if text_score is not None:
            weighted_sum += text_score * weights["text"]
            total_weight += weights["text"]
        if location_score is not None:
            weighted_sum += location_score * weights["location"]
            total_weight += weights["location"]
        if timeline_score is not None:
            weighted_sum += timeline_score * weights["timeline"]
            total_weight += weights["timeline"]

        raw_fused = (weighted_sum / total_weight) if total_weight > 0 else 0.0
        calibrated_confidence = self.calibrate_score(raw_fused)

        # Quality Warnings
        quality_warnings: List[str] = []
        image_quality_low = False

        if quality_assessment:
            if not quality_assessment.get("usableForMatching", False):
                quality_warnings.extend(quality_assessment.get("reasons", []))
                image_quality_low = True
            elif quality_assessment.get("imageQualityScore", 100) < 50.0:
                quality_warnings.append("Image quality score is low; increased manual verification required.")
                image_quality_low = True

        # Generate human-readable explanation
        explanation_parts = []
        if face_score is not None:
            if face_score >= self.face_threshold:
                explanation_parts.append(f"facial similarity is high ({face_score*100:.1f}%)")
            else:
                explanation_parts.append(f"facial similarity is moderate/low ({face_score*100:.1f}%)")

        if reid_score is not None:
            explanation_parts.append(f"clothing/appearance Re-ID score is {reid_score*100:.1f}%")

        if text_score is not None:
            explanation_parts.append(f"text description match is {text_score*100:.1f}%")

        if image_quality_low:
            explanation_parts.append("image quality warning flagged")

        explanation_str = "; ".join(explanation_parts) + "; manual review required."
        explanation_str = explanation_str[0].upper() + explanation_str[1:]

        score_contributions = {
            "face": round(face_score, 4) if face_score is not None else None,
            "reid": round(reid_score, 4) if reid_score is not None else None,
            "text": round(text_score, 4) if text_score is not None else None,
            "location": round(location_score, 4) if location_score is not None else None,
            "timeline": round(timeline_score, 4) if timeline_score is not None else None
        }

        return {
            "leadId": f"LEAD-{source_case_number}-{target_case_number}",
            "sourceCaseNumber": source_case_number,
            "targetCaseNumber": target_case_number,
            "decisionStatus": "REVIEW_REQUIRED",  # Mandatory investigative lead status
            "calibratedConfidence": calibrated_confidence,
            "rawFusedSimilarity": round(raw_fused, 4),
            "scoreContributions": score_contributions,
            "modalityAvailability": modality_availability,
            "qualityWarnings": quality_warnings,
            "modelVersions": self.MODEL_VERSIONS,
            "explanation": explanation_str,
            "disclaimer": "Investigative lead — human verification required. Never auto-closes cases or confirms legal identity."
        }
