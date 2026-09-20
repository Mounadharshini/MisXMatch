import cv2
import numpy as np
import io
import base64
from typing import Dict, Any, List, Tuple, Optional
from PIL import Image, ImageChops, ImageEnhance

class ImageQualitySafetyGate:
    """
    Evidence-quality and uncertainty gate for biometric missing-person matching.
    Enforces deterministic and deep-learning image quality checks:
    - Blur score (Laplacian variance)
    - Illumination / brightness score (luminance distribution)
    - Face coverage ratio & multi-face detection
    - ELA (Error Level Analysis) tampering risk assessment
    - Usability gating decision (usableForMatching)
    """

    MODEL_VERSION = "1.0.0-safety-gate"
    HUMAN_LIMITATION_NOTICE = (
        "AI evidence quality assessment is an investigative lead filter only. "
        "Predictions do not auto-close cases or constitute definitive legal identity verification."
    )

    def __init__(self, min_blur_thresh: float = 20.0, min_face_coverage: float = 0.04):
        self.min_blur_thresh = min_blur_thresh
        self.min_face_coverage = min_face_coverage

    def _decode_image(self, image_bytes: bytes) -> Optional[np.ndarray]:
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return img
        except Exception:
            return None

    def calculate_blur_score(self, gray_img: np.ndarray) -> float:
        """Calculates variance of Laplacian for blur estimation."""
        if gray_img is None or gray_img.size == 0:
            return 0.0
        return float(cv2.Laplacian(gray_img, cv2.CV_64F).var())

    def calculate_brightness_score(self, gray_img: np.ndarray) -> float:
        """Calculates mean brightness (0-255)."""
        if gray_img is None or gray_img.size == 0:
            return 0.0
        return float(np.mean(gray_img))

    def calculate_ela_tampering_score(self, image_bytes: bytes) -> float:
        """
        Error Level Analysis (ELA) to detect image manipulation / compression anomalies.
        Returns a score from 0.0 (low risk) to 1.0 (high risk).
        """
        try:
            orig = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            buffer = io.BytesIO()
            orig.save(buffer, 'JPEG', quality=90)
            buffer.seek(0)
            resaved = Image.open(buffer)

            diff = ImageChops.difference(orig, resaved)
            extrema = diff.getextrema()
            max_diff = max([ex[1] for ex in extrema])
            if max_diff == 0:
                max_diff = 1
            scale = 255.0 / max_diff
            diff = ImageEnhance.Brightness(diff).enhance(scale)
            
            diff_np = np.array(diff)
            mean_diff = float(np.mean(diff_np))
            # Normalize to 0-1 range
            tampering_score = min(1.0, max(0.0, mean_diff / 64.0))
            return tampering_score
        except Exception:
            return 0.1

    def assess_quality(self, image_bytes: bytes, detected_faces: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Main quality assessment pipeline.
        Returns usableForMatching, reviewRequired, reasons[], imageQualityScore, etc.
        """
        reasons: List[str] = []
        img = self._decode_image(image_bytes)

        if img is None:
            return {
                "usableForMatching": False,
                "reviewRequired": True,
                "reasons": ["Invalid or unreadable image bytes"],
                "imageQualityScore": 0.0,
                "detectedFaceCount": 0,
                "faceCoverage": 0.0,
                "blurScore": 0.0,
                "brightnessScore": 0.0,
                "tamperingRiskScore": 1.0,
                "modelVersion": self.MODEL_VERSION,
                "limitationNotice": self.HUMAN_LIMITATION_NOTICE
            }

        height, width = img.shape[:2]
        total_pixels = height * width
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        blur_score = self.calculate_blur_score(gray)
        brightness = self.calculate_brightness_score(gray)
        tampering_score = self.calculate_ela_tampering_score(image_bytes)

        face_count = len(detected_faces)
        face_coverage = 0.0

        if face_count > 0:
            primary_face = detected_faces[0]
            bbox = primary_face.get("bbox", [0, 0, 0, 0])
            if len(bbox) == 4:
                bw = max(0, bbox[2] - bbox[0])
                bh = max(0, bbox[3] - bbox[1])
                face_area = bw * bh
                face_coverage = float(face_area / total_pixels) if total_pixels > 0 else 0.0

        # Quality Gate Logic
        if face_count == 0:
            reasons.append("No clear human face detected in the image.")
        elif face_count > 1:
            reasons.append(f"Multiple faces ({face_count}) detected. Primary single subject required for automatic matching.")

        if blur_score < self.min_blur_thresh:
            reasons.append(f"Image is too blurry (blur score {blur_score:.1f} < threshold {self.min_blur_thresh}).")

        if brightness < 30:
            reasons.append(f"Image illumination is severely underexposed (brightness {brightness:.1f}).")
        elif brightness > 230:
            reasons.append(f"Image illumination is severely overexposed (brightness {brightness:.1f}).")

        if face_count > 0 and face_coverage < self.min_face_coverage:
            reasons.append(f"Face size is too small (coverage {face_coverage*100:.1f}% < threshold {self.min_face_coverage*100:.1f}%).")

        if tampering_score > 0.75:
            reasons.append(f"High digital alteration / compression artifact risk detected (score {tampering_score:.2f}).")

        usable_for_matching = (len(reasons) == 0)

        # Calculate overall 0-100 quality score
        norm_blur = min(100.0, (blur_score / 100.0) * 100.0)
        norm_bright = 100.0 - abs(128.0 - brightness) * 0.78
        norm_cov = min(100.0, face_coverage * 500.0)
        quality_score = float(max(0.0, min(100.0, 0.35 * norm_blur + 0.30 * norm_bright + 0.35 * norm_cov)))

        return {
            "usableForMatching": usable_for_matching,
            "reviewRequired": True,  # Mandatory human verification
            "reasons": reasons,
            "imageQualityScore": round(quality_score, 1),
            "detectedFaceCount": face_count,
            "faceCoverage": round(face_coverage, 4),
            "blurScore": round(blur_score, 2),
            "brightnessScore": round(brightness, 2),
            "tamperingRiskScore": round(tampering_score, 3),
            "modelVersion": self.MODEL_VERSION,
            "limitationNotice": self.HUMAN_LIMITATION_NOTICE
        }
