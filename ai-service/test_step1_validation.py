import io
import sys
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

import cv2
import numpy as np

def create_dummy_image(format="JPEG", color=(100, 140, 200), size=(200, 200)):
    img = np.ones((200, 200, 3), dtype=np.uint8) * 240
    cv2.ellipse(img, (100, 100), (60, 85), 0, 0, 360, color, -1)
    cv2.ellipse(img, (100, 100), (60, 85), 0, 0, 360, (50, 40, 30), 2)
    cv2.circle(img, (75, 80), 10, (255, 255, 255), -1)
    cv2.circle(img, (125, 80), 10, (255, 255, 255), -1)
    cv2.circle(img, (75, 80), 4, (40, 20, 10), -1)
    cv2.circle(img, (125, 80), 4, (40, 20, 10), -1)
    cv2.ellipse(img, (75, 68), (12, 3), 0, 0, 360, (30, 20, 10), -1)
    cv2.ellipse(img, (125, 68), (12, 3), 0, 0, 360, (30, 20, 10), -1)
    pts = np.array([[100, 92], [93, 115], [107, 115]], np.int32)
    cv2.polylines(img, [pts], False, (80, 50, 30), 2)
    cv2.ellipse(img, (100, 145), (25, 12), 0, 0, 180, (40, 30, 140), -1)
    cv2.ellipse(img, (100, 145), (25, 12), 0, 0, 180, (20, 10, 80), 2)
    fmt = "." + format.lower()
    if fmt == ".jpeg":
        fmt = ".jpg"
    _, buf = cv2.imencode(fmt, img)
    return buf.tobytes()

def run_all_tests():
    print("==================================================")
    print("RUNNING STEP 1 AI SERVICE VERIFICATION TESTS")
    print("==================================================")

    # 1. Test GET /health
    print("\n1. Testing GET /health...")
    res = client.get("/health")
    print(f"Status Code: {res.status_code}")
    print(f"Response Body: {res.json()}")
    assert res.status_code == 200
    assert res.json()["status"] == "UP"
    assert res.json()["service"] == "MISXMATCH AI Service"
    print("✔ GET /health test passed!")

    # 2. Test POST /api/ai/image-match with valid images
    print("\n2. Testing POST /api/ai/image-match with valid JPEG images...")
    img1_bytes = create_dummy_image(format="JPEG", color=(255, 0, 0))
    img2_bytes = create_dummy_image(format="PNG", color=(0, 255, 0))

    files = {
        "image1": ("test_person1.jpg", img1_bytes, "image/jpeg"),
        "image2": ("test_person2.png", img2_bytes, "image/png"),
    }
    res = client.post("/api/ai/image-match", files=files)
    print(f"Status Code: {res.status_code}")
    print(f"Response Body: {res.json()}")
    assert res.status_code == 200
    assert res.json().get("success") is True or res.json().get("status") == "SUCCESS"
    assert res.json()["image1"]["format"] == "JPEG"
    assert res.json()["image2"]["format"] == "PNG"
    print("✔ Valid image pair test passed!")

    # 3. Test missing image parameter
    print("\n3. Testing POST /api/ai/image-match with missing image parameter...")
    files_missing = {
        "image1": ("test_person1.jpg", img1_bytes, "image/jpeg"),
    }
    res = client.post("/api/ai/image-match", files=files_missing)
    print(f"Status Code: {res.status_code}")
    print(f"Response Body: {res.json()}")
    assert res.status_code == 422 or res.status_code == 400
    print("✔ Missing image input test passed!")

    # 4. Test empty 0-byte file
    print("\n4. Testing POST /api/ai/image-match with empty 0-byte file...")
    files_empty = {
        "image1": ("empty.jpg", b"", "image/jpeg"),
        "image2": ("test_person2.png", img2_bytes, "image/png"),
    }
    res = client.post("/api/ai/image-match", files=files_empty)
    print(f"Status Code: {res.status_code}")
    print(f"Response Body: {res.json()}")
    assert res.status_code == 400
    assert "Empty image file" in res.json()["detail"]
    print("✔ Empty file validation test passed!")

    # 5. Test invalid corrupted non-image file
    print("\n5. Testing POST /api/ai/image-match with corrupted text file...")
    files_corrupt = {
        "image1": ("fake.jpg", b"This is not a real image binary file content!", "image/jpeg"),
        "image2": ("test_person2.png", img2_bytes, "image/png"),
    }
    res = client.post("/api/ai/image-match", files=files_corrupt)
    print(f"Status Code: {res.status_code}")
    print(f"Response Body: {res.json()}")
    assert res.status_code == 400
    assert "Invalid or corrupted image" in res.json()["detail"]
    print("✔ Corrupted file validation test passed!")

    print("\n==================================================")
    print("ALL STEP 1 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_all_tests()
