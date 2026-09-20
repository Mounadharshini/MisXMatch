import io
import cv2
import numpy as np
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def create_synthetic_face():
    img = np.ones((200, 200, 3), dtype=np.uint8) * 240
    cv2.ellipse(img, (100, 100), (60, 85), 0, 0, 360, (100, 140, 200), -1)
    cv2.circle(img, (75, 80), 10, (255, 255, 255), -1)
    cv2.circle(img, (125, 80), 10, (255, 255, 255), -1)
    cv2.circle(img, (75, 80), 4, (40, 20, 10), -1)
    cv2.circle(img, (125, 80), 4, (40, 20, 10), -1)
    pts = np.array([[100, 92], [93, 115], [107, 115]], np.int32)
    cv2.polylines(img, [pts], False, (80, 50, 30), 2)
    cv2.ellipse(img, (100, 145), (25, 12), 0, 0, 180, (40, 30, 140), -1)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()

def run_step4_tests():
    print("==================================================")
    print("RUNNING STEP 4 STRUCTURED ATTRIBUTE MATCH TESTS")
    print("==================================================")

    # 1. Test GET /health
    print("\n1. Testing GET /health...")
    res = client.get("/health")
    assert res.status_code == 200
    print(f"✔ Health Check Passed: {res.json()}")

    # 2. Test 1: Highly Similar Attributes
    print("\n2. Test 1 — Highly Similar Person Attributes...")
    payload_similar = {
        "person1": {
            "age": 17,
            "gender": "male",
            "height": 165.0,
            "clothing": "blue shirt and black pants",
            "hair": "short black hair",
            "skinTone": "medium"
        },
        "person2": {
            "age": 16,
            "gender": "male",
            "height": 167.0,
            "clothing": "blue top and dark trousers",
            "hair": "short dark hair",
            "skinTone": "medium"
        }
    }
    res = client.post("/api/ai/attribute-match", json=payload_similar)
    data = res.json()
    print(f"Status Code: {res.status_code}")
    print(f"Overall Attribute Score: {data.get('overallAttributeScore')}")
    print(f"Match Status: {data.get('matchStatus')}")
    print(f"Attributes Breakdown: {data.get('attributes')}")

    assert res.status_code == 200
    assert data["success"] is True
    score_similar = data["overallAttributeScore"]
    assert score_similar >= 0.80
    assert data["matchStatus"] == "POSSIBLE_ATTRIBUTE_MATCH"
    assert data["availableAttributesCount"] == 6
    print("✔ Highly similar attribute match test passed!")

    # 3. Test 2: Clearly Different Attributes
    print("\n3. Test 2 — Clearly Different Person Attributes...")
    payload_different = {
        "person1": {
            "age": 17,
            "gender": "male",
            "height": 165.0,
            "clothing": "blue shirt and black pants",
            "hair": "short black hair",
            "skinTone": "fair"
        },
        "person2": {
            "age": 65,
            "gender": "female",
            "height": 180.0,
            "clothing": "red saree",
            "hair": "long grey hair",
            "skinTone": "dark"
        }
    }
    res = client.post("/api/ai/attribute-match", json=payload_different)
    data = res.json()
    print(f"Status Code: {res.status_code}")
    print(f"Overall Attribute Score: {data.get('overallAttributeScore')}")
    print(f"Match Status: {data.get('matchStatus')}")

    assert res.status_code == 200
    assert data["success"] is True
    score_diff = data["overallAttributeScore"]
    assert score_diff < score_similar
    assert score_diff < 0.40
    assert data["matchStatus"] == "UNLIKELY_ATTRIBUTE_MATCH"
    print("✔ Clearly different attribute test passed!")

    # 4. Test 3: Missing Attributes (UNKNOWN Handling)
    print("\n4. Test 3 — Missing Attributes Handling (UNKNOWN)...")
    payload_missing = {
        "person1": {
            "age": 17,
            "gender": "male",
            "height": 165.0,
            "clothing": "blue shirt",
            "hair": None,
            "skinTone": None
        },
        "person2": {
            "age": 17,
            "gender": "male",
            "height": 165.0,
            "clothing": "blue shirt",
            "hair": None,
            "skinTone": None
        }
    }
    res = client.post("/api/ai/attribute-match", json=payload_missing)
    data = res.json()
    print(f"Status Code: {res.status_code}")
    print(f"Overall Attribute Score: {data.get('overallAttributeScore')}")
    print(f"Available Attributes Count: {data.get('availableAttributesCount')}")
    print(f"Hair Status: {data['attributes']['hair']['status']}")

    assert res.status_code == 200
    assert data["availableAttributesCount"] == 4
    assert data["attributes"]["hair"]["status"] == "UNKNOWN"
    assert data["attributes"]["hair"]["score"] is None
    assert data["attributes"]["skinTone"]["status"] == "UNKNOWN"
    assert data["overallAttributeScore"] == 1.0  # Available attributes match 100%
    print("✔ Missing attribute UNKNOWN handling test passed!")

    # 5. Test 4: Partial Similarity Breakdown
    print("\n5. Test 4 — Partial Similarity Breakdown...")
    payload_partial = {
        "person1": {
            "age": 17,
            "gender": "male",
            "height": 165.0,
            "clothing": "blue shirt"
        },
        "person2": {
            "age": 17,
            "gender": "female",
            "height": 165.0,
            "clothing": "red jacket"
        }
    }
    res = client.post("/api/ai/attribute-match", json=payload_partial)
    data = res.json()
    print(f"Status Code: {res.status_code}")
    print(f"Age Status: {data['attributes']['age']['status']}")
    print(f"Gender Status: {data['attributes']['gender']['status']}")

    assert res.status_code == 200
    assert data["attributes"]["age"]["status"] == "MATCH"
    assert data["attributes"]["height"]["status"] == "MATCH"
    assert data["attributes"]["gender"]["status"] == "MISMATCH"
    print("✔ Partial similarity breakdown test passed!")

    # 6. Test Invalid Boundaries (Negative Age/Height)
    print("\n6. Test Invalid Age & Height Error Handling...")
    payload_invalid = {
        "person1": {"age": -5, "gender": "male"},
        "person2": {"age": 17, "gender": "male"}
    }
    res = client.post("/api/ai/attribute-match", json=payload_invalid)
    assert res.status_code in [400, 422]
    assert "Invalid" in str(res.json()["detail"]) or "greater than" in str(res.json()["detail"]) or "age" in str(res.json()["detail"])
    print("✔ Invalid age/height error handling test passed!")

    # 7. Regression Checks
    print("\n7. Regression Checks: /api/ai/text-match & /api/ai/image-match...")
    res_text = client.post("/api/ai/text-match", json={"text1": "blue shirt", "text2": "blue top"})
    assert res_text.status_code == 200

    img = create_synthetic_face()
    res_img = client.post("/api/ai/image-match", files={"image1": ("a.jpg", img, "image/jpeg"), "image2": ("b.jpg", img, "image/jpeg")})
    assert res_img.status_code == 200
    print("✔ Regression checks passed!")

    print("\n==================================================")
    print("ALL STEP 4 STRUCTURED ATTRIBUTE MATCH TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_step4_tests()
