import io
import cv2
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def create_synthetic_face(skin_tone=(100, 140, 200), eye_offset=0, mouth_smile=0):
    img = np.ones((200, 200, 3), dtype=np.uint8) * 240
    cv2.ellipse(img, (100, 100), (60, 85), 0, 0, 360, skin_tone, -1)
    cv2.circle(img, (75 + eye_offset, 80), 10, (255, 255, 255), -1)
    cv2.circle(img, (125 + eye_offset, 80), 10, (255, 255, 255), -1)
    cv2.circle(img, (75 + eye_offset, 80), 4, (40, 20, 10), -1)
    cv2.circle(img, (125 + eye_offset, 80), 4, (40, 20, 10), -1)
    cv2.ellipse(img, (75 + eye_offset, 68), (12, 3), 0, 0, 360, (30, 20, 10), -1)
    cv2.ellipse(img, (125 + eye_offset, 68), (12, 3), 0, 0, 360, (30, 20, 10), -1)
    pts = np.array([[100, 92], [93, 115], [107, 115]], np.int32)
    cv2.polylines(img, [pts], False, (80, 50, 30), 2)
    cv2.ellipse(img, (100, 145), (25, 12 + mouth_smile), 0, 0, 180, (40, 30, 140), -1)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()

def run_step3_tests():
    print("==================================================")
    print("RUNNING STEP 3 REAL NLP SEMANTIC TEXT MATCH TESTS")
    print("==================================================")

    # 1. Test GET /health
    print("\n1. Testing GET /health...")
    res = client.get("/health")
    assert res.status_code == 200
    print(f"✔ Health Check Passed: {res.json()}")

    # 2. Test 1: Highly Similar Descriptions
    print("\n2. Test 1 — Highly Similar Descriptions...")
    payload_similar = {
        "text1": "15 year old boy wearing blue shirt and black pants",
        "text2": "Teenage male wearing a blue top and dark trousers"
    }
    res = client.post("/api/ai/text-match", json=payload_similar)
    data = res.json()
    print(f"Status Code: {res.status_code}")
    print(f"Similarity Score: {data.get('similarityScore')}")
    print(f"Possible Match: {data.get('possibleMatch')}")
    print(f"Match Status: {data.get('matchStatus')}")

    assert res.status_code == 200
    assert data["success"] is True
    assert isinstance(data["similarityScore"], float)
    score_similar = data["similarityScore"]
    assert score_similar >= 0.70  # High similarity threshold
    assert data["possibleMatch"] is True
    assert data["matchStatus"] == "POSSIBLE_SEMANTIC_MATCH"
    print("✔ Highly similar description test passed!")

    # 3. Test 2: Clearly Different Descriptions
    print("\n3. Test 2 — Clearly Different Descriptions...")
    payload_different = {
        "text1": "15 year old boy wearing blue shirt",
        "text2": "70 year old woman wearing a red saree"
    }
    res = client.post("/api/ai/text-match", json=payload_different)
    data = res.json()
    print(f"Status Code: {res.status_code}")
    print(f"Similarity Score: {data.get('similarityScore')}")
    print(f"Possible Match: {data.get('possibleMatch')}")
    print(f"Match Status: {data.get('matchStatus')}")

    assert res.status_code == 200
    assert data["success"] is True
    score_diff = data["similarityScore"]
    assert score_diff < score_similar  # Score for different text must be lower
    assert score_diff < 0.70
    assert data["possibleMatch"] is False
    assert data["matchStatus"] == "UNLIKELY_SEMANTIC_MATCH"
    print("✔ Clearly different description test passed!")

    # 4. Test 3: Similar Meaning with Different Wording (Synonyms)
    print("\n4. Test 3 — Similar Meaning with Different Wording (Synonyms)...")
    payload_synonyms = {
        "text1": "Child last seen near railway platform wearing yellow raincoat",
        "text2": "Young kid spotted by train tracks with a yellow waterproof jacket"
    }
    res = client.post("/api/ai/text-match", json=payload_synonyms)
    data = res.json()
    print(f"Status Code: {res.status_code}")
    print(f"Similarity Score: {data.get('similarityScore')}")
    print(f"Possible Match: {data.get('possibleMatch')}")

    assert res.status_code == 200
    assert data["similarityScore"] >= 0.70
    assert data["possibleMatch"] is True
    print("✔ Synonyms & paraphrased text semantic test passed!")

    # 5. Test 4: Empty Description Input Validation
    print("\n5. Test 4 — Empty Description Input Validation...")
    payload_empty = {
        "text1": "   ",
        "text2": "Teenage male wearing blue clothes"
    }
    res = client.post("/api/ai/text-match", json=payload_empty)
    print(f"Status Code: {res.status_code}")
    print(f"Response Detail: {res.json().get('detail')}")

    assert res.status_code == 400
    assert "cannot be empty" in res.json()["detail"]
    print("✔ Empty text validation error test passed!")

    # 6. Test Regression: POST /api/ai/image-match (Step 2)
    print("\n6. Test 5 — Regression Check: POST /api/ai/image-match...")
    face_a1 = create_synthetic_face(skin_tone=(100, 140, 200), eye_offset=0, mouth_smile=0)
    face_a2 = create_synthetic_face(skin_tone=(100, 140, 200), eye_offset=0, mouth_smile=2)

    files_image = {
        "image1": ("person1.jpg", face_a1, "image/jpeg"),
        "image2": ("person2.jpg", face_a2, "image/jpeg"),
    }
    res = client.post("/api/ai/image-match", files=files_image)
    print(f"Status Code: {res.status_code}")
    assert res.status_code == 200
    assert res.json()["success"] is True
    print("✔ Step 2 Image Match regression test passed!")

    print("\n==================================================")
    print("ALL STEP 3 REAL NLP SEMANTIC TEXT TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_step3_tests()
