import os
import sys
from fastapi.testclient import TestClient

# Ensure app package is importable from ai-service root directory
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app

client = TestClient(app, headers={"X-Internal-Service-Key": "misxmatch-internal-ai-service-secret-key-2026"})

def print_separator(title):
    print("\n" + "="*60)
    print(f" {title}")
    print("="*60)

def test_health_check():
    print_separator("1. Testing GET /health...")
    response = client.get("/health")
    assert response.status_code == 200, f"Health check failed: {response.text}"
    data = response.json()
    assert data["status"] == "UP"
    print(f"✔ Health Check Passed: {data}")

def test_very_close_locations():
    print_separator("2. Test 1 — Very Close Locations (~0.18 km apart)...")
    payload = {
        "location1": {
            "latitude": 11.0168,
            "longitude": 76.9558
        },
        "location2": {
            "latitude": 11.0180,
            "longitude": 76.9570
        }
    }
    response = client.post("/api/ai/location-match", json=payload)
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Location match failed: {response.text}"
    data = response.json()
    print(f"Response: {data}")
    
    assert data["success"] is True
    assert data["available"] is True
    assert data["distanceKm"] < 1.0, f"Expected distance < 1 km, got {data['distanceKm']}"
    assert data["locationRelevanceScore"] > 0.90, f"Expected score > 0.90, got {data['locationRelevanceScore']}"
    assert data["matchStatus"] == "HIGH_LOCATION_RELEVANCE"
    assert data["status"] == "MATCH"
    print("✔ Very close locations test passed!")

def test_far_locations():
    print_separator("3. Test 2 — Far Locations (Coimbatore vs Chennai ~420 km)...")
    payload = {
        "location1": {
            "latitude": 11.0168,
            "longitude": 76.9558
        },
        "location2": {
            "latitude": 13.0827,
            "longitude": 80.2707
        }
    }
    response = client.post("/api/ai/location-match", json=payload)
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Far location match failed: {response.text}"
    data = response.json()
    print(f"Response: {data}")
    
    assert data["success"] is True
    assert data["available"] is True
    assert data["distanceKm"] > 400.0, f"Expected distance > 400 km, got {data['distanceKm']}"
    assert data["locationRelevanceScore"] < 0.10, f"Expected score < 0.10, got {data['locationRelevanceScore']}"
    assert data["matchStatus"] == "LOW_LOCATION_RELEVANCE"
    assert data["status"] == "MISMATCH"
    print("✔ Far locations test passed!")

def test_very_close_timestamps():
    print_separator("4. Test 3 — Very Close Timestamps (3 hours difference)...")
    payload = {
        "time1": "2026-09-01T10:00:00Z",
        "time2": "2026-09-01T13:00:00Z"
    }
    response = client.post("/api/ai/time-match", json=payload)
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Time match failed: {response.text}"
    data = response.json()
    print(f"Response: {data}")
    
    assert data["success"] is True
    assert data["available"] is True
    assert abs(data["timeDifferenceHours"] - 3.0) < 0.01
    assert data["timeRelevanceScore"] > 0.90, f"Expected score > 0.90, got {data['timeRelevanceScore']}"
    assert data["matchStatus"] == "HIGH_TIME_RELEVANCE"
    assert data["status"] == "MATCH"
    print("✔ Very close timestamps test passed!")

def test_large_time_difference():
    print_separator("5. Test 4 — Large Time Difference (Day 1 vs Day 5, 96 hours)...")
    payload = {
        "time1": "2026-09-01T10:00:00Z",
        "time2": "2026-09-05T10:00:00Z"
    }
    response = client.post("/api/ai/time-match", json=payload)
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Large time match failed: {response.text}"
    data = response.json()
    print(f"Response: {data}")
    
    assert data["success"] is True
    assert data["available"] is True
    assert abs(data["timeDifferenceHours"] - 96.0) < 0.01
    assert data["timeRelevanceScore"] < 0.10, f"Expected score < 0.10, got {data['timeRelevanceScore']}"
    assert data["matchStatus"] == "LOW_TIME_RELEVANCE"
    assert data["status"] == "MISMATCH"
    print("✔ Large time difference test passed!")

def test_missing_location_unknown():
    print_separator("6. Test 5 — Missing Location Coordinates (UNKNOWN)...")
    payload = {
        "location1": {
            "latitude": 11.0168,
            "longitude": 76.9558
        },
        "location2": {
            "latitude": None,
            "longitude": None
        }
    }
    response = client.post("/api/ai/location-match", json=payload)
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Missing location failed: {response.text}"
    data = response.json()
    print(f"Response: {data}")
    
    assert data["success"] is True
    assert data["available"] is False
    assert data["distanceKm"] is None
    assert data["locationRelevanceScore"] is None
    assert data["matchStatus"] == "UNKNOWN_LOCATION"
    assert data["status"] == "UNKNOWN"
    print("✔ Missing location UNKNOWN handling test passed!")

def test_missing_timestamp_unknown():
    print_separator("7. Test 6 — Missing Timestamp (UNKNOWN)...")
    payload = {
        "time1": "2026-09-01T10:00:00Z",
        "time2": None
    }
    response = client.post("/api/ai/time-match", json=payload)
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Missing time failed: {response.text}"
    data = response.json()
    print(f"Response: {data}")
    
    assert data["success"] is True
    assert data["available"] is False
    assert data["timeDifferenceHours"] is None
    assert data["timeRelevanceScore"] is None
    assert data["matchStatus"] == "UNKNOWN_TIME"
    assert data["status"] == "UNKNOWN"
    print("✔ Missing timestamp UNKNOWN handling test passed!")

def test_error_handling_validation():
    print_separator("8. Testing Validation & Out-of-Bounds Handling...")
    
    # Out of bounds latitude (> 90)
    bad_lat = {
        "location1": {"latitude": 150.0, "longitude": 76.9558},
        "location2": {"latitude": 11.0180, "longitude": 76.9570}
    }
    res1 = client.post("/api/ai/location-match", json=bad_lat)
    assert res1.status_code in [400, 422]
    print("✔ Bad latitude error caught (HTTP 400/422)")

    # Out of bounds longitude (> 180)
    bad_lon = {
        "location1": {"latitude": 11.0168, "longitude": -200.0},
        "location2": {"latitude": 11.0180, "longitude": 76.9570}
    }
    res2 = client.post("/api/ai/location-match", json=bad_lon)
    assert res2.status_code in [400, 422]
    print("✔ Bad longitude error caught (HTTP 400/422)")

    # Invalid timestamp format
    bad_time = {
        "time1": "invalid-date-string",
        "time2": "2026-09-01T10:00:00Z"
    }
    res3 = client.post("/api/ai/time-match", json=bad_time)
    assert res3.status_code in [400, 422]
    print("✔ Malformed timestamp error caught (HTTP 400/422)")

def test_regression_all_endpoints():
    print_separator("9. Regression Checks for Steps 1 - 4 Endpoints...")
    
    # Step 3 Text Match
    text_res = client.post("/api/ai/text-match", json={
        "text1": "15 year old boy wearing blue shirt",
        "text2": "Teenage male wearing blue top"
    })
    assert text_res.status_code == 200
    print("✔ Step 3 /api/ai/text-match working properly.")

    # Step 4 Attribute Match
    attr_res = client.post("/api/ai/attribute-match", json={
        "person1": {"age": 17, "gender": "male"},
        "person2": {"age": 16, "gender": "male"}
    })
    assert attr_res.status_code == 200
    print("✔ Step 4 /api/ai/attribute-match working properly.")

if __name__ == "__main__":
    print_separator("RUNNING STEP 5 LOCATION RELEVANCE & TIME RELEVANCE TESTS")
    test_health_check()
    test_very_close_locations()
    test_far_locations()
    test_very_close_timestamps()
    test_large_time_difference()
    test_missing_location_unknown()
    test_missing_timestamp_unknown()
    test_error_handling_validation()
    test_regression_all_endpoints()
    print_separator("ALL STEP 5 LOCATION & TIME RELEVANCE TESTS PASSED!")
