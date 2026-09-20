import pytest
import os
import cv2
import numpy as np
from models.ai_safety_gate import ImageQualitySafetyGate
from models.ai_calibrated_card import CalibratedMultimodalLeadCard
from models.ai_temporal_tracker import TemporalContinuityTracker

def create_synthetic_image_bytes(blur=False, brightness=128, size=(200, 200)):
    img = np.full((size[1], size[0], 3), brightness, dtype=np.uint8)
    if blur:
        img = cv2.GaussianBlur(img, (21, 21), 0)
    else:
        # Add high frequency edges
        cv2.rectangle(img, (20, 20), (180, 180), (255, 255, 255), 4)
        cv2.circle(img, (100, 100), 40, (0, 0, 0), -1)
    
    success, buffer = cv2.imencode('.jpg', img)
    return buffer.tobytes()

def test_quality_assessment_usable_image():
    gate = ImageQualitySafetyGate()
    img_bytes = create_synthetic_image_bytes(blur=False, brightness=120)
    faces = [{"bbox": [20, 20, 180, 180]}]
    
    res = gate.assess_quality(img_bytes, faces)
    assert res["usableForMatching"] is True
    assert res["reviewRequired"] is True
    assert res["detectedFaceCount"] == 1
    assert res["imageQualityScore"] > 50.0

def test_quality_assessment_blurry_image_rejection():
    gate = ImageQualitySafetyGate()
    img_bytes = create_synthetic_image_bytes(blur=True, brightness=120)
    faces = [{"bbox": [20, 20, 180, 180]}]
    
    res = gate.assess_quality(img_bytes, faces)
    assert res["usableForMatching"] is False
    assert len(res["reasons"]) > 0
    assert any("blurry" in r.lower() for r in res["reasons"])

def test_calibrated_candidate_card():
    card_gen = CalibratedMultimodalLeadCard()
    res = card_gen.generate_lead_card(
        source_case_number="MP-001",
        target_case_number="FP-002",
        face_score=0.85,
        reid_score=0.72
    )
    
    assert res["decisionStatus"] == "REVIEW_REQUIRED"
    assert "calibratedConfidence" in res
    assert res["calibratedConfidence"] >= 0.0 and res["calibratedConfidence"] <= 100.0
    assert res["modalityAvailability"]["face"] is True
    assert res["modalityAvailability"]["reid"] is True
    assert res["modalityAvailability"]["text"] is False

def test_temporal_tracker_file_cleanup():
    tracker = TemporalContinuityTracker()
    # Mock invalid video bytes to trigger cleanup error handler
    invalid_bytes = b"NOT_A_REAL_VIDEO_FILE_CONTENT"
    
    with pytest.raises(ValueError):
        tracker.process_temporal_video(
            video_bytes=invalid_bytes,
            case_id="MP-999",
            camera_id="CAM-01"
        )
    # Temporary files should be cleaned up safely in try/finally
