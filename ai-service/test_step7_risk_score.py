import os
import sys
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

# Ensure app package is importable from ai-service root directory
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app

client = TestClient(app)

def print_separator(title):
    print("\n" + "="*60)
    print(f" {title}")
    print("="*60)

def test_health_check():
    print_separator("1. Testing GET /health...")
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    print(f"✔ Health Check Passed: {data}")

def test_high_risk_case():
    print_separator("2. Test 1 — High-Risk Case (Child + Insulin + Abduction)...")
    payload = {
        "caseId": "MP-HIGH-01",
        "age": 8,
        "gender": "female",
        "lastSeenDate": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat(),
        "medicalConditions": "Requires daily insulin medication for severe Type-1 diabetes.",
        "dangerIndicators": ["abduction", "unusual_disappearance"],
        "vulnerabilityFlags": ["minor", "medical"],
        "recentSightingsCount": 0,
        "description": "8 year old girl missing from school grounds. Suspected vehicle abduction."
    }
    response = client.post("/api/ai/risk-score", json=payload)
    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Risk score failed: {response.text}"
    data = response.json()
    print(f"Risk Score: {data['riskScore']}")
    print(f"Risk Level: {data['riskLevel']}")
    print(f"Reason: {data['reason']}")
    print(f"Factors: {data['factors']}")
    
    assert data["success"] is True
    assert data["riskScore"] >= 0.75
    assert data["riskLevel"] == "HIGH"
    assert data["factors"]["age"]["status"] == "HIGH_RISK"
    assert data["factors"]["vulnerability"]["status"] == "HIGH_RISK"
    assert data["factors"]["danger"]["status"] == "HIGH_RISK"
    print("✔ High-risk case test passed!")

def test_medium_risk_case():
    print_separator("3. Test 2 — Medium-Risk Case (Minor teenager, 15h ago, no abduction)...")
    payload = {
        "caseId": "MP-MED-01",
        "age": 16,
        "gender": "male",
        "lastSeenDate": (datetime.now(timezone.utc) - timedelta(hours=15)).isoformat(),
        "medicalConditions": "Asthma medication required",
        "description": "Teenager didn't return home after football practice."
    }
    response = client.post("/api/ai/risk-score", json=payload)
    assert response.status_code == 200
    data = response.json()
    print(f"Risk Score: {data['riskScore']}")
    print(f"Risk Level: {data['riskLevel']}")
    
    assert 0.45 <= data["riskScore"] < 0.75
    assert data["riskLevel"] == "MEDIUM"
    print("✔ Medium-risk case test passed!")

def test_low_risk_case():
    print_separator("4. Test 3 — Low-Risk Case (Adult, 6h ago, no medical/danger)...")
    payload = {
        "caseId": "MP-LOW-01",
        "age": 28,
        "gender": "male",
        "lastSeenDate": (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat(),
        "description": "Adult male did not check in after work."
    }
    response = client.post("/api/ai/risk-score", json=payload)
    assert response.status_code == 200
    data = response.json()
    print(f"Risk Score: {data['riskScore']}")
    print(f"Risk Level: {data['riskLevel']}")
    
    assert data["riskScore"] < 0.45
    assert data["riskLevel"] == "LOW"
    print("✔ Low-risk case test passed!")

def test_missing_optional_information():
    print_separator("5. Test 4 — Missing Optional Information (UNKNOWN factors)...")
    payload = {
        "caseId": "MP-PARTIAL-01",
        "age": 10
    }
    response = client.post("/api/ai/risk-score", json=payload)
    assert response.status_code == 200
    data = response.json()
    print(f"Available Factors: {data['availableFactorsCount']}")
    print(f"Age Factor: {data['factors']['age']}")
    print(f"Duration Factor: {data['factors']['duration']}")
    
    assert data["availableFactorsCount"] == 1
    assert data["factors"]["age"]["available"] is True
    assert data["factors"]["duration"]["available"] is False
    assert data["factors"]["duration"]["status"] == "UNKNOWN"
    print("✔ Missing optional information test passed!")

def test_multiple_risk_indicators():
    print_separator("6. Test 5 — Multiple Risk Indicators...")
    payload = {
        "caseId": "MP-MULTI-01",
        "age": 75, # Elderly
        "lastSeenDate": (datetime.now(timezone.utc) - timedelta(hours=36)).isoformat(),
        "medicalConditions": "Dementia and Alzheimer's disease",
        "dangerIndicators": ["foul play"],
        "description": "Elderly patient with severe Alzheimer's missing from home."
    }
    response = client.post("/api/ai/risk-score", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["riskScore"] >= 0.75
    assert data["riskLevel"] == "HIGH"
    print("✔ Multiple risk indicators test passed!")

def test_no_risk_indicators():
    print_separator("7. Test 6 — No Risk Indicators...")
    payload = {
        "caseId": "MP-CLEAN-01",
        "age": 30,
        "lastSeenDate": (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat(),
        "description": "Normal adult case."
    }
    response = client.post("/api/ai/risk-score", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["riskScore"] < 0.45
    assert data["riskLevel"] == "LOW"
    print("✔ No risk indicators test passed!")

def test_invalid_age():
    print_separator("8. Test 7 — Invalid Age Bounds Error Handling...")
    bad_payload = {"age": 180}
    response = client.post("/api/ai/risk-score", json=bad_payload)
    assert response.status_code in [400, 422]
    print("✔ Invalid age bound caught (HTTP 400/422)!")

def test_invalid_sighting_hours():
    print_separator("9. Test 8 — Invalid Sighting Hours Error Handling...")
    bad_payload = {"lastSightingHoursAgo": -15.0}
    response = client.post("/api/ai/risk-score", json=bad_payload)
    assert response.status_code in [400, 422]
    print("✔ Negative sighting hours caught (HTTP 400/422)!")

def test_weight_normalization_check():
    print_separator("10. Test 9 — Weight Configuration Normalization Check...")
    os.environ["RISK_WEIGHT_AGE"] = "0.50"
    os.environ["RISK_WEIGHT_DURATION"] = "0.50"
    os.environ["RISK_WEIGHT_VULNERABILITY"] = "0.50"
    os.environ["RISK_WEIGHT_DANGER"] = "0.50"
    os.environ["RISK_WEIGHT_SIGHTING"] = "0.50"

    payload = {"age": 8}
    response = client.post("/api/ai/risk-score", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    # Age factor is only available factor, effective weight must equal 1.0 (100%)
    assert data["factors"]["age"]["effectiveWeight"] == 1.0
    print("✔ Weight auto-normalization check passed!")

    # Reset environment variables to defaults
    os.environ["RISK_WEIGHT_AGE"] = "0.25"
    os.environ["RISK_WEIGHT_DURATION"] = "0.20"
    os.environ["RISK_WEIGHT_VULNERABILITY"] = "0.20"
    os.environ["RISK_WEIGHT_DANGER"] = "0.25"
    os.environ["RISK_WEIGHT_SIGHTING"] = "0.10"

def test_determinism():
    print_separator("11. Test 10 — Deterministic Score Verification...")
    payload = {
        "age": 10,
        "medicalConditions": "Diabetes",
        "description": "Child missing near park"
    }
    res1 = client.post("/api/ai/risk-score", json=payload).json()
    res2 = client.post("/api/ai/risk-score", json=payload).json()
    
    assert res1["riskScore"] == res2["riskScore"]
    assert res1["riskLevel"] == res2["riskLevel"]
    print("✔ Score determinism check passed!")

def test_regression_all_previous_endpoints():
    print_separator("12. Full Regression Checks for Steps 1 - 6...")
    assert client.get("/health").status_code == 200
    assert client.post("/api/ai/text-match", json={"text1": "Boy in blue", "text2": "Male in blue"}).status_code == 200
    assert client.post("/api/ai/attribute-match", json={"person1": {"age": 20}, "person2": {"age": 20}}).status_code == 200
    assert client.post("/api/ai/location-match", json={"location1": {"latitude": 11.0, "longitude": 76.0}, "location2": {"latitude": 11.0, "longitude": 76.0}}).status_code == 200
    assert client.post("/api/ai/time-match", json={"time1": "2026-09-01T10:00:00Z", "time2": "2026-09-01T10:00:00Z"}).status_code == 200
    assert client.post("/api/ai/multi-match", json={"person1": {"description": "test"}, "person2": {"description": "test"}}).status_code == 200
    print("✔ All regression checks passed for Steps 1-6!")

if __name__ == "__main__":
    print_separator("RUNNING STEP 7 RISK SCORING & CASE PRIORITIZATION TESTS")
    test_health_check()
    test_high_risk_case()
    test_medium_risk_case()
    test_low_risk_case()
    test_missing_optional_information()
    test_multiple_risk_indicators()
    test_no_risk_indicators()
    test_invalid_age()
    test_invalid_sighting_hours()
    test_weight_normalization_check()
    test_determinism()
    test_regression_all_previous_endpoints()
    print_separator("ALL STEP 7 RISK SCORING & CASE PRIORITIZATION TESTS PASSED!")
