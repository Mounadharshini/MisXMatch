import os
import base64
import numpy as np

from typing import Optional, Dict, Any, Tuple
from app.models.schemas import (
    PersonRecord,
    FactorDetail,
    MultiMatchResponse,
    PersonAttributes,
    LocationPoint
)
from app.services.face_service import face_engine
from app.services.text_service import text_engine
from app.services.attribute_service import AttributeMatchService
from app.services.location_service import LocationMatchService
from app.services.time_service import TimeMatchService

class MultiMatchService:
    def __init__(self):
        self.attribute_service = AttributeMatchService()
        self.location_service = LocationMatchService()
        self.time_service = TimeMatchService()

    def _get_normalized_raw_weights(self) -> Dict[str, float]:
        """
        Reads base weight configuration from .env and validates/normalizes
        them so the sum of raw base weights equals 1.0.
        """
        raw = {
            "face": float(os.getenv("MULTI_MATCH_WEIGHT_FACE", "0.40")),
            "text": float(os.getenv("MULTI_MATCH_WEIGHT_TEXT", "0.25")),
            "attributes": float(os.getenv("MULTI_MATCH_WEIGHT_ATTRIBUTE", "0.15")),
            "location": float(os.getenv("MULTI_MATCH_WEIGHT_LOCATION", "0.10")),
            "time": float(os.getenv("MULTI_MATCH_WEIGHT_TIME", "0.10")),
        }
        total_raw = sum(raw.values())
        if total_raw <= 0:
            # Fallback to standard specification defaults if total raw weight is non-positive
            return {"face": 0.40, "text": 0.25, "attributes": 0.15, "location": 0.10, "time": 0.10}

        # Normalize raw weights to sum to 1.0
        normalized_raw = {k: round(v / total_raw, 4) for k, v in raw.items()}
        return normalized_raw

    def _decode_image_input(self, img_input: Optional[str]) -> Optional[np.ndarray]:
        """
        Decodes optional image input string (Base64 data URL, raw Base64, or file path)
        into an OpenCV BGR numpy matrix. Returns None if input is invalid or missing.
        """
        if not img_input or not str(img_input).strip():
            return None

        cleaned_str = str(img_input).strip()

        # 1. Base64 string decoding (e.g. data:image/jpeg;base64,/9j/4AAQSk...)
        if "base64," in cleaned_str:
            cleaned_str = cleaned_str.split("base64,")[1]

        try:
            img_bytes = base64.b64decode(cleaned_str)
            return face_engine.decode_image_bytes(img_bytes)
        except Exception:
            pass

        # 2. Disk file path check
        if os.path.exists(cleaned_str) and os.path.isfile(cleaned_str):
            try:
                with open(cleaned_str, "rb") as f:
                    img_bytes = f.read()
                return face_engine.decode_image_bytes(img_bytes)
            except Exception:
                pass

        # 3. HTTP / HTTPS URL download
        if cleaned_str.startswith("http://") or cleaned_str.startswith("https://"):
            try:
                import urllib.request
                req = urllib.request.Request(cleaned_str, headers={"User-Agent": "MisXMatch-AI/1.0"})
                with urllib.request.urlopen(req, timeout=5) as response:
                    img_bytes = response.read()
                return face_engine.decode_image_bytes(img_bytes)
            except Exception:
                pass

        # 4. Local storage fallback if URL contains /files/
        if "/files/" in cleaned_str:
            key_part = cleaned_str.split("/files/")[-1].replace("/", "_")
            possible_dirs = [
                os.path.join(os.getcwd(), "..", "MISXMATCH BACKEND 11", "MISXMATCH 10", "uploads_storage"),
                os.path.join(os.getcwd(), "..", "MISXMATCH BACKEND 11", "MISXMATCH 10", "case-service", "uploads_storage"),
                os.path.join(os.getcwd(), "uploads_storage"),
                os.path.join(os.getcwd(), "..", "uploads_storage"),
            ]
            for base in possible_dirs:
                candidate = os.path.abspath(os.path.join(base, key_part))
                if os.path.exists(candidate) and os.path.isfile(candidate):
                    try:
                        with open(candidate, "rb") as f:
                            return face_engine.decode_image_bytes(f.read())
                    except Exception:
                        pass

        return None

    def evaluate_multi_match(
        self,
        person1: PersonRecord,
        person2: PersonRecord
    ) -> MultiMatchResponse:
        """
        Combines 5 AI signals (face, text, attributes, location, time) into a single,
        explainable weighted multi-factor match response with dynamic weight normalization.
        """
        raw_weights = self._get_normalized_raw_weights()

        factors: Dict[str, FactorDetail] = {}

        # -------------------------------------------------------------
        # 1. Face Similarity Signal
        # -------------------------------------------------------------
        img1_bgr = self._decode_image_input(person1.image)
        img2_bgr = self._decode_image_input(person2.image)

        if img1_bgr is not None and img2_bgr is not None:
            count1, bboxes1 = face_engine.detect_faces(img1_bgr)
            count2, bboxes2 = face_engine.detect_faces(img2_bgr)

            if count1 > 0 and count2 > 0:
                primary_bbox1 = sorted(bboxes1, key=lambda b: b[2] * b[3], reverse=True)[0]
                primary_bbox2 = sorted(bboxes2, key=lambda b: b[2] * b[3], reverse=True)[0]

                emb1 = face_engine.extract_face_embedding(img1_bgr, primary_bbox1)
                emb2 = face_engine.extract_face_embedding(img2_bgr, primary_bbox2)

                face_score = face_engine.compute_cosine_similarity(emb1, emb2)
                face_status = "MATCH" if face_score >= float(os.getenv("FACE_MATCH_THRESHOLD", "0.60")) else "MISMATCH"
                factors["face"] = FactorDetail(
                    available=True,
                    score=face_score,
                    rawWeight=raw_weights["face"],
                    effectiveWeight=None,  # Populated during dynamic normalization
                    status=face_status,
                    explanation=f"Face embedding similarity is {int(face_score * 100)}% (Cosine similarity: {face_score})."
                )
            else:
                missing_face_source = "person1" if count1 == 0 else "person2"
                factors["face"] = FactorDetail(
                    available=False,
                    score=None,
                    rawWeight=raw_weights["face"],
                    effectiveWeight=None,
                    status="UNKNOWN",
                    explanation=f"No face detected in image for {missing_face_source}."
                )
        else:
            factors["face"] = FactorDetail(
                available=False,
                score=None,
                rawWeight=raw_weights["face"],
                effectiveWeight=None,
                status="UNKNOWN",
                explanation="One or both person records did not provide a valid face image."
            )

        # -------------------------------------------------------------
        # 2. Text Similarity Signal
        # -------------------------------------------------------------
        desc1 = person1.description.strip() if person1.description else ""
        desc2 = person2.description.strip() if person2.description else ""

        if desc1 and desc2 and desc1.lower() != "unknown" and desc2.lower() != "unknown":
            try:
                emb1 = text_engine.extract_text_embedding(desc1)
                emb2 = text_engine.extract_text_embedding(desc2)
                text_score = text_engine.compute_cosine_similarity(emb1, emb2)
                text_status = "MATCH" if text_score >= float(os.getenv("TEXT_MATCH_THRESHOLD", "0.70")) else "MISMATCH"
                factors["text"] = FactorDetail(
                    available=True,
                    score=text_score,
                    rawWeight=raw_weights["text"],
                    effectiveWeight=None,
                    status=text_status,
                    explanation=f"NLP sentence embedding semantic text similarity is {int(text_score * 100)}%."
                )
            except Exception as e:
                factors["text"] = FactorDetail(
                    available=False,
                    score=None,
                    rawWeight=raw_weights["text"],
                    effectiveWeight=None,
                    status="UNKNOWN",
                    explanation=f"Failed to extract text embedding: {str(e)}"
                )

        else:
            factors["text"] = FactorDetail(
                available=False,
                score=None,
                rawWeight=raw_weights["text"],
                effectiveWeight=None,
                status="UNKNOWN",
                explanation="One or both report text descriptions are missing or empty."
            )

        # -------------------------------------------------------------
        # 3. Attribute Similarity Signal
        # -------------------------------------------------------------
        attr_res = self.attribute_service.evaluate_attribute_match(person1.attributes, person2.attributes)
        if attr_res.availableAttributesCount > 0:
            factors["attributes"] = FactorDetail(
                available=True,
                score=attr_res.overallAttributeScore,
                rawWeight=raw_weights["attributes"],
                effectiveWeight=None,
                status="MATCH" if attr_res.overallAttributeScore >= attr_res.threshold else "MISMATCH",
                explanation=f"Structured attribute similarity score is {int(attr_res.overallAttributeScore * 100)}% across {attr_res.availableAttributesCount} available attribute(s)."
            )
        else:
            factors["attributes"] = FactorDetail(
                available=False,
                score=None,
                rawWeight=raw_weights["attributes"],
                effectiveWeight=None,
                status="UNKNOWN",
                explanation="No structured attributes available for comparison."
            )

        # -------------------------------------------------------------
        # 4. Location Relevance Signal
        # -------------------------------------------------------------
        loc_res = self.location_service.evaluate_location_match(person1.location, person2.location)
        if loc_res.available:
            factors["location"] = FactorDetail(
                available=True,
                score=loc_res.locationRelevanceScore,
                rawWeight=raw_weights["location"],
                effectiveWeight=None,
                status=loc_res.status,
                explanation=loc_res.explanation
            )
        else:
            factors["location"] = FactorDetail(
                available=False,
                score=None,
                rawWeight=raw_weights["location"],
                effectiveWeight=None,
                status="UNKNOWN",
                explanation=loc_res.explanation
            )

        # -------------------------------------------------------------
        # 5. Time Relevance Signal
        # -------------------------------------------------------------
        time_res = self.time_service.evaluate_time_match(person1.timestamp, person2.timestamp)
        if time_res.available:
            factors["time"] = FactorDetail(
                available=True,
                score=time_res.timeRelevanceScore,
                rawWeight=raw_weights["time"],
                effectiveWeight=None,
                status=time_res.status,
                explanation=time_res.explanation
            )
        else:
            factors["time"] = FactorDetail(
                available=False,
                score=None,
                rawWeight=raw_weights["time"],
                effectiveWeight=None,
                status="UNKNOWN",
                explanation=time_res.explanation
            )

        # -------------------------------------------------------------
        # Dynamic Weight Renormalization & Overall Score Calculation
        # -------------------------------------------------------------
        available_factors_count = sum(1 for f in factors.values() if f.available)
        available_weight_sum = sum(f.rawWeight for f in factors.values() if f.available)

        if available_factors_count == 0 or available_weight_sum <= 0:
            return MultiMatchResponse(
                success=True,
                overallScore=None,
                classification="INSUFFICIENT_DATA",
                availableFactorsCount=0,
                totalFactorsEvaluated=5,
                factors=factors,
                message="No available AI signals were found for comparison."
            )

        # Compute effective weights and weighted sum
        weighted_score_sum = 0.0
        for f_name, f_detail in factors.items():
            if f_detail.available and f_detail.score is not None:
                eff_weight = round(f_detail.rawWeight / available_weight_sum, 4)
                f_detail.effectiveWeight = eff_weight
                weighted_score_sum += f_detail.score * f_detail.rawWeight
            else:
                f_detail.effectiveWeight = None

        overall_score = round(weighted_score_sum / available_weight_sum, 4)
        overall_score = min(max(overall_score, 0.0), 1.0)

        # Classify overall score
        high_threshold = float(os.getenv("MULTI_MATCH_HIGH_THRESHOLD", "0.75"))
        possible_threshold = float(os.getenv("MULTI_MATCH_POSSIBLE_THRESHOLD", "0.55"))

        if overall_score >= high_threshold:
            classification = "HIGH_CONFIDENCE_MATCH"
        elif overall_score >= possible_threshold:
            classification = "POSSIBLE_MATCH"
        else:
            classification = "LOW_CONFIDENCE"

        message = "AI-assisted multi-factor match indication. Human/official verification required."

        return MultiMatchResponse(
            success=True,
            overallScore=overall_score,
            classification=classification,
            availableFactorsCount=available_factors_count,
            totalFactorsEvaluated=5,
            factors=factors,
            message=message
        )
