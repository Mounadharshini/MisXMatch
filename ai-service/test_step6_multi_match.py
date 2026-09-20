import os
import sys
import base64
import cv2
import numpy as np
from fastapi.testclient import TestClient

# Ensure app package is importable from ai-service root directory
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app

client = TestClient(app)

def print_separator(title):
    print("\n" + "="*60)
    print(f" {title}")
    print("="*60)

def generate_test_face_b64(seed_color=(140, 180, 230)):
    """Generates a valid synthetic face image and encodes as Base64 data string."""
    img = np.full((128, 128, 3), 240, dtype=np.uint8)
    # Draw face oval
    cv2.ellipse(img, (64, 64), (36, 46), 0, 0, 360, seed_color, -1)
    # Draw eyes
    cv2.circle(img, (48, 52), 6, (40, 20, 10), -1)
    cv2.circle(img, (80, 52), 6, (40, 20, 10), -1)
    # Draw mouth
    cv2.ellipse(img, (64, 85), (16, 6), 0, 0, 180, (40, 20, 10), 2)
    _, buffer = cv2.imencode('.jpg', img)
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

# Sample Base64 Images for testing
TEST_FACE_B64_1 = generate_test_face_b64((140, 180, 230))
TEST_FACE_B64_2 = generate_test_face_b64((135, 175, 225))


def test_health_check():
    print_separator("1. Testing GET /health...")
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    print(f"✔ Health Check Passed: {data}")

def test_all_five_factors_available():
    print_separator("2. Test 1 — All 5 Factors Available...")
    payload = {
        "person1": {
            "image": TEST_FACE_B64_1,
            "description": "15 year old boy wearing blue shirt and black pants, last seen near bus stand.",
            "attributes": {
                "age": 17,
                "gender": "male",
                "height": 165,
                "clothing": "blue shirt and black pants",
                "hair": "short black hair",
                "skinTone": "medium"
            },
            "location": {"latitude": 11.0168, "longitude": 76.9558},
            "timestamp": "2026-09-01T10:00:00Z"
        },
        "person2": {
            "image": TEST_FACE_B64_2,
            "description": "Teenage male wearing blue top and dark trousers, found near bus station.",
            "attributes": {
                "age": 16,
                "gender": "male",
                "height": 167,
                "clothing": "blue top and dark trousers",
                "hair": "short dark hair",
                "skinTone": "medium"
            },
            "location": {"latitude": 11.0180, "longitude": 76.9570},
            "timestamp": "2026-09-01T13:00:00Z"
        }
    }
    response = client.post("/api/ai/multi-match", json=payload)
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Multi-match failed: {response.text}"
    data = response.json()
    print(f"Overall Score: {data['overallScore']}")
    print(f"Classification: {data['classification']}")
    print(f"Available Factors: {data['availableFactorsCount']}")
    print(f"Factor Details: {data['factors']}")
    
    assert data["success"] is True
    assert data["availableFactorsCount"] == 5
    assert data["overallScore"] > 0.70
    assert data["classification"] in ["HIGH_CONFIDENCE_MATCH", "POSSIBLE_MATCH"]
    print("✔ All 5 factors test passed!")

def test_only_face_and_attributes():
    print_separator("3. Test 2 — Only Face + Attributes Available...")
    payload = {
        "person1": {
            "image": TEST_FACE_B64_1,
            "attributes": {"age": 20, "gender": "female", "height": 160}
        },
        "person2": {
            "image": TEST_FACE_B64_2,
            "attributes": {"age": 21, "gender": "female", "height": 161}
        }
    }
    response = client.post("/api/ai/multi-match", json=payload)
    assert response.status_code == 200
    data = response.json()
    print(f"Available Factors: {data['availableFactorsCount']}")
    print(f"Face Factor: {data['factors']['face']}")
    print(f"Attributes Factor: {data['factors']['attributes']}")
    print(f"Text Factor: {data['factors']['text']}")
    
    assert data["availableFactorsCount"] == 2
    assert data["factors"]["face"]["available"] is True
    assert data["factors"]["attributes"]["available"] is True
    assert data["factors"]["text"]["available"] is False
    assert data["factors"]["location"]["available"] is False
    assert data["factors"]["time"]["available"] is False
    print("✔ Only face + attributes test passed!")

def test_text_and_location_available():
    print_separator("4. Test 3 — Only Text + Location Available...")
    payload = {
        "person1": {
            "description": "Child wearing yellow raincoat near railway station",
            "location": {"latitude": 11.0168, "longitude": 76.9558}
        },
        "person2": {
            "description": "Young kid with yellow waterproof jacket near train tracks",
            "location": {"latitude": 11.0180, "longitude": 76.9570}
        }
    }
    response = client.post("/api/ai/multi-match", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["availableFactorsCount"] == 2
    assert data["factors"]["text"]["available"] is True
    assert data["factors"]["location"]["available"] is True
    assert data["factors"]["face"]["available"] is False
    print("✔ Text + location test passed!")

def test_missing_image():
    print_separator("5. Test 4 — Missing Image...")
    payload = {
        "person1": {
            "description": "Lost teenager wearing black sweater",
            "attributes": {"age": 16, "gender": "male"},
            "location": {"latitude": 11.0168, "longitude": 76.9558},
            "timestamp": "2026-09-01T10:00:00Z"
        },
        "person2": {
            "description": "Spotted teenage male in dark sweater",
            "attributes": {"age": 16, "gender": "male"},
            "location": {"latitude": 11.0180, "longitude": 76.9570},
            "timestamp": "2026-09-01T11:00:00Z"
        }
    }
    response = client.post("/api/ai/multi-match", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["availableFactorsCount"] == 4
    assert data["factors"]["face"]["available"] is False
    assert data["factors"]["face"]["score"] is None
    print("✔ Missing image test passed!")

def test_missing_location():
    print_separator("6. Test 5 — Missing Location...")
    payload = {
        "person1": {
            "image": TEST_FACE_B64_1,
            "description": "Missing person report",
            "timestamp": "2026-09-01T10:00:00Z"
        },
        "person2": {
            "image": TEST_FACE_B64_2,
            "description": "Found person report",
            "timestamp": "2026-09-01T11:00:00Z"
        }
    }
    response = client.post("/api/ai/multi-match", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["factors"]["location"]["available"] is False
    assert data["factors"]["location"]["score"] is None
    print("✔ Missing location test passed!")

def test_missing_timestamp():
    print_separator("7. Test 6 — Missing Timestamp...")
    payload = {
        "person1": {
            "description": "Missing person report",
            "location": {"latitude": 11.0168, "longitude": 76.9558}
        },
        "person2": {
            "description": "Found person report",
            "location": {"latitude": 11.0180, "longitude": 76.9570}
        }
    }
    response = client.post("/api/ai/multi-match", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["factors"]["time"]["available"] is False
    assert data["factors"]["time"]["score"] is None
    print("✔ Missing timestamp test passed!")

def test_all_factors_missing():
    print_separator("8. Test 7 — All Factors Missing...")
    payload = {
        "person1": {},
        "person2": {}
    }
    response = client.post("/api/ai/multi-match", json=payload)
    assert response.status_code == 200
    data = response.json()
    print(f"Response for empty records: {data}")
    
    assert data["availableFactorsCount"] == 0
    assert data["overallScore"] is None
    assert data["classification"] == "INSUFFICIENT_DATA"
    print("✔ All factors missing test passed!")

def test_highly_similar_records():
    print_separator("9. Test 8 — Highly Similar Records...")
    payload = {
        "person1": {
            "image": TEST_FACE_B64_1,
            "description": "15 year old boy wearing blue shirt and black pants, last seen near bus stand.",
            "attributes": {"age": 17, "gender": "male", "height": 165, "clothing": "blue shirt", "skinTone": "medium"},
            "location": {"latitude": 11.0168, "longitude": 76.9558},
            "timestamp": "2026-09-01T10:00:00Z"
        },
        "person2": {
            "image": TEST_FACE_B64_1,  # Same image for maximum face similarity
            "description": "Teenage male wearing blue top and dark trousers, found near bus station.",
            "attributes": {"age": 17, "gender": "male", "height": 165, "clothing": "blue shirt", "skinTone": "medium"},
            "location": {"latitude": 11.0170, "longitude": 76.9560},
            "timestamp": "2026-09-01T10:15:00Z"
        }
    }
    response = client.post("/api/ai/multi-match", json=payload)
    assert response.status_code == 200
    data = response.json()
    print(f"Overall Score: {data['overallScore']}")
    print(f"Classification: {data['classification']}")
    
    assert data["overallScore"] >= 0.85
    assert data["classification"] == "HIGH_CONFIDENCE_MATCH"
    print("✔ Highly similar records test passed!")

def test_clearly_different_records():
    print_separator("10. Test 9 — Clearly Different Records...")
    payload = {
        "person1": {
            "description": "15 year old boy wearing blue shirt",
            "attributes": {"age": 15, "gender": "male", "height": 160, "clothing": "blue shirt"},
            "location": {"latitude": 11.0168, "longitude": 76.9558},
            "timestamp": "2026-09-01T10:00:00Z"
        },
        "person2": {
            "description": "70 year old woman wearing a red saree",
            "attributes": {"age": 70, "gender": "female", "height": 145, "clothing": "red saree"},
            "location": {"latitude": 13.0827, "longitude": 80.2707}, # Chennai ~420km away
            "timestamp": "2026-09-10T10:00:00Z" # 9 days later
        }
    }
    response = client.post("/api/ai/multi-match", json=payload)
    assert response.status_code == 200
    data = response.json()
    print(f"Overall Score: {data['overallScore']}")
    print(f"Classification: {data['classification']}")
    
    assert data["overallScore"] < 0.30
    assert data["classification"] == "LOW_CONFIDENCE"
    print("✔ Clearly different records test passed!")

def test_invalid_input_validation():
    print_separator("11. Test 10 — Invalid Input Bounds Validation...")
    bad_payload = {
        "person1": {
            "location": {"latitude": 120.0, "longitude": 76.9558}  # Lat > 90
        },
        "person2": {
            "location": {"latitude": 11.0180, "longitude": 76.9570}
        }
    }
    response = client.post("/api/ai/multi-match", json=bad_payload)
    assert response.status_code in [400, 422]
    print("✔ Invalid latitude bound caught (HTTP 400)!")

def test_weight_configuration_normalization():
    print_separator("12. Test 11 — Weight Configuration Normalization Check...")
    # Change env variables temporarily
    os.environ["MULTI_MATCH_WEIGHT_FACE"] = "0.50"
    os.environ["MULTI_MATCH_WEIGHT_TEXT"] = "0.50"
    os.environ["MULTI_MATCH_WEIGHT_ATTRIBUTE"] = "0.50"
    os.environ["MULTI_MATCH_WEIGHT_LOCATION"] = "0.50"
    os.environ["MULTI_MATCH_WEIGHT_TIME"] = "0.50"  # Total raw sum = 2.50

    payload = {
        "person1": {"description": "Boy wearing blue shirt"},
        "person2": {"description": "Male in blue top"}
    }
    response = client.post("/api/ai/multi-match", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    # Text factor is the only available factor, effective weight must be 1.0 (100%)
    assert data["factors"]["text"]["effectiveWeight"] == 1.0
    print("✔ Weight auto-normalization check passed!")

    # Reset environment variables to default
    os.environ["MULTI_MATCH_WEIGHT_FACE"] = "0.35"
    os.environ["MULTI_MATCH_WEIGHT_TEXT"] = "0.20"
    os.environ["MULTI_MATCH_WEIGHT_ATTRIBUTE"] = "0.20"
    os.environ["MULTI_MATCH_WEIGHT_LOCATION"] = "0.15"
    os.environ["MULTI_MATCH_WEIGHT_TIME"] = "0.10"

def test_regression_all_previous_endpoints():
    print_separator("13. Full Regression Checks for Steps 1 - 5...")
    assert client.get("/health").status_code == 200
    assert client.post("/api/ai/text-match", json={"text1": "Boy in blue", "text2": "Male in blue"}).status_code == 200
    assert client.post("/api/ai/attribute-match", json={"person1": {"age": 20}, "person2": {"age": 20}}).status_code == 200
    assert client.post("/api/ai/location-match", json={"location1": {"latitude": 11.0, "longitude": 76.0}, "location2": {"latitude": 11.0, "longitude": 76.0}}).status_code == 200
    assert client.post("/api/ai/time-match", json={"time1": "2026-09-01T10:00:00Z", "time2": "2026-09-01T10:00:00Z"}).status_code == 200
    print("✔ All regression checks passed for Steps 1-5!")

if __name__ == "__main__":
    print_separator("RUNNING STEP 6 MULTI-FACTOR MATCHING ENGINE TESTS")
    test_health_check()
    test_all_five_factors_available()
    test_only_face_and_attributes()
    test_text_and_location_available()
    test_missing_image()
    test_missing_location()
    test_missing_timestamp()
    test_all_factors_missing()
    test_highly_similar_records()
    test_clearly_different_records()
    test_invalid_input_validation()
    test_weight_configuration_normalization()
    test_regression_all_previous_endpoints()
    print_separator("ALL STEP 6 MULTI-FACTOR MATCHING ENGINE TESTS PASSED!")
