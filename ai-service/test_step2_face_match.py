import io
import cv2
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def create_synthetic_face(skin_tone=(100, 140, 200), eye_offset=0, mouth_smile=0):
    """
    Generates a synthetic realistic facial image with facial features (head shape, eyes, nose, mouth)
    so OpenCV face detection cascade detects real faces.
    """
    # Create 200x200 canvas
    img = np.ones((200, 200, 3), dtype=np.uint8) * 240

    # Draw oval head shape
    cv2.ellipse(img, (100, 100), (60, 85), 0, 0, 360, skin_tone, -1)
    cv2.ellipse(img, (100, 100), (60, 85), 0, 0, 360, (50, 40, 30), 2)

    # Draw eyes (left & right)
    cv2.circle(img, (75 + eye_offset, 80), 10, (255, 255, 255), -1)
    cv2.circle(img, (125 + eye_offset, 80), 10, (255, 255, 255), -1)
    cv2.circle(img, (75 + eye_offset, 80), 4, (40, 20, 10), -1)
    cv2.circle(img, (125 + eye_offset, 80), 4, (40, 20, 10), -1)
    cv2.ellipse(img, (75 + eye_offset, 68), (12, 3), 0, 0, 360, (30, 20, 10), -1)
    cv2.ellipse(img, (125 + eye_offset, 68), (12, 3), 0, 0, 360, (30, 20, 10), -1)

    # Draw nose
    pts = np.array([[100, 92], [93, 115], [107, 115]], np.int32)
    cv2.polylines(img, [pts], False, (80, 50, 30), 2)

    # Draw mouth
    cv2.ellipse(img, (100, 145), (25, 12 + mouth_smile), 0, 0, 180, (40, 30, 140), -1)
    cv2.ellipse(img, (100, 145), (25, 12 + mouth_smile), 0, 0, 180, (20, 10, 80), 2)

    # Encode to JPEG bytes
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()

def create_non_face_image():
    """Generates a plain gradient texture containing no face."""
    img = np.zeros((200, 200, 3), dtype=np.uint8)
    for i in range(200):
        img[i, :] = (i, i // 2, 255 - i)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()

def create_multi_face_image():
    """Generates an image containing two distinct face structures side-by-side."""
    img = np.ones((240, 400, 3), dtype=np.uint8) * 240

    # Face 1 (left)
    cv2.ellipse(img, (100, 120), (55, 75), 0, 0, 360, (100, 140, 200), -1)
    cv2.circle(img, (80, 100), 8, (255, 255, 255), -1)
    cv2.circle(img, (120, 100), 8, (255, 255, 255), -1)
    cv2.circle(img, (80, 100), 3, (0, 0, 0), -1)
    cv2.circle(img, (120, 100), 3, (0, 0, 0), -1)
    cv2.ellipse(img, (100, 150), (20, 10), 0, 0, 180, (40, 30, 140), -1)

    # Face 2 (right)
    cv2.ellipse(img, (300, 120), (55, 75), 0, 0, 360, (90, 130, 190), -1)
    cv2.circle(img, (280, 100), 8, (255, 255, 255), -1)
    cv2.circle(img, (320, 100), 8, (255, 255, 255), -1)
    cv2.circle(img, (280, 100), 3, (0, 0, 0), -1)
    cv2.circle(img, (320, 100), 3, (0, 0, 0), -1)
    cv2.ellipse(img, (300, 150), (20, 10), 0, 0, 180, (40, 30, 140), -1)

    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()

def run_step2_tests():
    print("==================================================")
    print("RUNNING STEP 2 REAL AI FACE SIMILARITY TESTS")
    print("==================================================")

    # 1. Test GET /health
    print("\n1. Testing GET /health...")
    res = client.get("/health")
    assert res.status_code == 200
    print(f"✔ Health Check Passed: {res.json()}")

    # 2. Test Similar/Same Person Face Match
    print("\n2. Testing POST /api/ai/image-match with SAME person face images...")
    face_a1 = create_synthetic_face(skin_tone=(100, 140, 200), eye_offset=0, mouth_smile=0)
    face_a2 = create_synthetic_face(skin_tone=(100, 140, 200), eye_offset=0, mouth_smile=2)

    files_same = {
        "image1": ("personA_1.jpg", face_a1, "image/jpeg"),
        "image2": ("personA_2.jpg", face_a2, "image/jpeg"),
    }
    res = client.post("/api/ai/image-match", files=files_same)
    print(f"Status Code: {res.status_code}")
    print(f"Response Body: {res.json()}")
    data = res.json()
    score_same = data.get('similarityScore', 0)
    print(f"Similarity Score (Same Person): {score_same}")
    print(f"Match: {data.get('match')}")
    print(f"Match Status: {data.get('matchStatus')}")

    assert res.status_code == 200
    assert data["success"] is True
    assert data["faceDetectedInImage1"] is True
    assert data["faceDetectedInImage2"] is True
    assert isinstance(score_same, float)
    assert score_same >= 0.60  # High similarity score for same face
    assert data["match"] is True
    assert data["matchStatus"] == "POSSIBLE_MATCH"
    print("✔ Same face similarity match test passed!")

    # 3. Test Distinct/Different Person Face Match
    print("\n3. Testing POST /api/ai/image-match with DIFFERENT person face images...")
    face_b = create_synthetic_face(skin_tone=(60, 90, 130), eye_offset=14, mouth_smile=12)

    files_diff = {
        "image1": ("personA_1.jpg", face_a1, "image/jpeg"),
        "image2": ("personB_1.jpg", face_b, "image/jpeg"),
    }
    res = client.post("/api/ai/image-match", files=files_diff)
    data = res.json()
    score_diff = data.get('similarityScore', 0)
    print(f"Status Code: {res.status_code}")
    print(f"Similarity Score (Different Person): {score_diff}")
    print(f"Match: {data.get('match')}")
    print(f"Match Status: {data.get('matchStatus')}")

    assert res.status_code == 200
    assert data["success"] is True
    assert isinstance(score_diff, float)
    assert score_diff < score_same  # Score for different person should be lower than for same person
    print("✔ Different face similarity test passed!")

    # 4. Test Image Without a Face (Case 2 / 3)
    print("\n4. Testing POST /api/ai/image-match with NON-FACE image...")
    non_face = create_non_face_image()
    files_no_face = {
        "image1": ("personA_1.jpg", face_a1, "image/jpeg"),
        "image2": ("texture_no_face.jpg", non_face, "image/jpeg"),
    }
    res = client.post("/api/ai/image-match", files=files_no_face)
    data = res.json()
    print(f"Status Code: {res.status_code}")
    print(f"Response Detail: {data.get('detail')}")

    assert res.status_code == 400
    assert "No face detected in Image 2" in data["detail"]
    print("✔ Non-face detection error handling test passed!")

    # 5. Test Multiple Faces Image (Case 4)
    print("\n5. Testing POST /api/ai/image-match with MULTI-FACE image...")
    multi_face = create_multi_face_image()
    files_multi = {
        "image1": ("personA_1.jpg", face_a1, "image/jpeg"),
        "image2": ("multi_persons.jpg", multi_face, "image/jpeg"),
    }
    res = client.post("/api/ai/image-match", files=files_multi)
    data = res.json()
    print(f"Status Code: {res.status_code}")
    print(f"Faces Count Image 2: {data.get('facesCountImage2')}")
    print(f"Message: {data.get('message')}")

    assert res.status_code == 200
    assert data["facesCountImage2"] >= 2
    assert "Multiple faces" in data["message"]
    print("✔ Multi-face detection strategy test passed!")

    # 6. Test Corrupted Invalid Image File
    print("\n6. Testing POST /api/ai/image-match with corrupted invalid image...")
    files_corrupt = {
        "image1": ("personA_1.jpg", face_a1, "image/jpeg"),
        "image2": ("bad.jpg", b"This is not a real binary image data!", "image/jpeg"),
    }
    res = client.post("/api/ai/image-match", files=files_corrupt)
    assert res.status_code == 400
    print("✔ Corrupted file error handling test passed!")

    print("\n==================================================")
    print("ALL STEP 2 REAL AI FACE MATCHING TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_step2_tests()
