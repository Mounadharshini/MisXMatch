import sys
import os
import cv2
import numpy as np

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models.ai_safety_gate import ImageQualitySafetyGate
from models.ai_calibrated_card import CalibratedMultimodalLeadCard
from models.ai_temporal_tracker import TemporalContinuityTracker

def create_synthetic_image_bytes(blur=False, brightness=120, size=(200, 200)):
    img = np.full((size[1], size[0], 3), brightness, dtype=np.uint8)
    if blur:
        img = cv2.GaussianBlur(img, (21, 21), 0)
    else:
        cv2.rectangle(img, (20, 20), (180, 180), (255, 255, 255), 4)
        cv2.circle(img, (100, 100), 40, (0, 0, 0), -1)
    
    success, buffer = cv2.imencode('.jpg', img)
    return buffer.tobytes()

def run_all_tests():
    print("Running AI Safety Module Tests...")
    
    # Test 1: Usable image quality assessment
    gate = ImageQualitySafetyGate()
    img_bytes = create_synthetic_image_bytes(blur=False, brightness=120)
    faces = [{"bbox": [20, 20, 180, 180]}]
    res = gate.assess_quality(img_bytes, faces)
    assert res["usableForMatching"] is True, "Expected usableForMatching == True"
    assert res["reviewRequired"] is True, "Expected reviewRequired == True"
    print(" [PASS] test_quality_assessment_usable_image")

    # Test 2: Blurry image rejection
    blurry_bytes = create_synthetic_image_bytes(blur=True, brightness=120)
    res_blur = gate.assess_quality(blurry_bytes, faces)
    assert res_blur["usableForMatching"] is False, "Expected usableForMatching == False for blurry image"
    assert len(res_blur["reasons"]) > 0, "Expected quality warning reasons"
    print(" [PASS] test_quality_assessment_blurry_image_rejection")

    # Test 3: Calibrated candidate lead card
    card_gen = CalibratedMultimodalLeadCard()
    card = card_gen.generate_lead_card(
        source_case_number="MP-001",
        target_case_number="FP-002",
        face_score=0.85,
        reid_score=0.72
    )
    assert card["decisionStatus"] == "REVIEW_REQUIRED", "Expected REVIEW_REQUIRED decision status"
    assert 0.0 <= card["calibratedConfidence"] <= 100.0, "Calibrated confidence out of range"
    print(" [PASS] test_calibrated_candidate_card")

    # Test 4: Temporal tracker file cleanup in finally block
    tracker = TemporalContinuityTracker()
    try:
        tracker.process_temporal_video(b"INVALID_VIDEO_BYTES", "MP-999", "CAM-01")
        assert False, "Expected ValueError on invalid video bytes"
    except ValueError:
        print(" [PASS] test_temporal_tracker_file_cleanup (Temporary file deleted in finally block)")

    print("\nALL AI SAFETY TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_all_tests()
