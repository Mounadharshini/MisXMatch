import logging
from typing import Dict, Any, List, Optional
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("MultimodalFusion")

class MultimodalMatcher:
    """
    Multimodal Biometric Fusion Engine for MISXMATCH.
    
    Combines facial recognition (InsightFace/SFace) and person re-identification (Torchreid/OSNet)
    using weighted score-level fusion:
    
        S_fusion = alpha * S_face + (1 - alpha) * S_reid
    
    Why Fusion is Critical in Missing Persons Search:
    - Surveillance/CCTV frames often have low facial resolution or off-angle head poses where face recognition confidence drops.
    - Person Re-ID captures full-body clothing, silhouette, and gait patterns across distant cameras.
    - Fusing both modalities creates robustness against occlusions, partial head turns, and surveillance camera artifacts.
    """

    def __init__(self, default_alpha: float = 0.65):
        self.default_alpha = default_alpha

    def fuse_scores(
        self,
        face_score: Optional[float],
        reid_score: Optional[float],
        alpha: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Computes weighted fusion similarity score.
        Handles missing modalities gracefully (e.g. when face is occluded or full body is not captured).
        """
        if alpha is None:
            alpha = self.default_alpha

        # Case 1: Both modalities available
        if face_score is not None and reid_score is not None:
            fused = (alpha * face_score) + ((1.0 - alpha) * reid_score)
            modality_used = "MULTIMODAL_FACE_PLUS_REID"
            confidence = min(0.99, max(0.0, fused))
        # Case 2: Only Face available
        elif face_score is not None:
            fused = face_score
            modality_used = "FACE_ONLY"
            confidence = face_score
        # Case 3: Only Re-ID available (e.g. back of head / distant CCTV)
        elif reid_score is not None:
            fused = reid_score
            modality_used = "REID_ONLY"
            confidence = reid_score
        else:
            fused = 0.0
            modality_used = "NONE"
            confidence = 0.0

        return {
            "fusion_score": round(float(fused), 4),
            "face_score": round(float(face_score), 4) if face_score is not None else None,
            "reid_score": round(float(reid_score), 4) if reid_score is not None else None,
            "alpha_weight": alpha,
            "modality_used": modality_used
        }
