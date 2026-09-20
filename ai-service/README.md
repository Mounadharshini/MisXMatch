# MISXMATCH AI Microservice (Step 9: MySQL Database Persistence Integration)

Independent Python FastAPI microservice providing real computer-vision face detection, 512-dimensional image feature embeddings, 384-dimensional NLP SentenceTransformer semantic text similarity, structured person attribute matching, Haversine location distance relevance, ISO 8601 temporal time relevance, multi-factor AI matching, and a deterministic **Risk-Based Case Prioritization Engine** integrated with **Java Spring Boot `case-service`** and **MySQL database persistence**.

---

## Directory Structure

```text
ai-service/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py
│   │   ├── match.py
│   │   ├── text_match.py
│   │   ├── attribute_match.py
│   │   ├── location_match.py
│   │   ├── time_match.py
│   │   ├── multi_match.py
│   │   └── risk_score.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── face_service.py
│   │   ├── text_service.py
│   │   ├── image_service.py
│   │   ├── attribute_service.py
│   │   ├── location_service.py
│   │   ├── time_service.py
│   │   ├── multi_match_service.py
│   │   └── risk_service.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py
│   └── utils/
│       ├── __init__.py
│       └── image_validator.py
├── main.py
├── requirements.txt
├── .env
├── test_step2_face_match.py
├── test_step3_text_match.py
├── test_step4_attribute_match.py
├── test_step5_location_time_match.py
├── test_step6_multi_match.py
├── test_step7_risk_score.py
└── README.md
```

---

## 1. System Architecture (Python FastAPI $\leftrightarrow$ Spring Boot $\leftrightarrow$ MySQL)

```text
[ React Frontend / Gateway ] 
           │
           ▼
[ Java Spring Boot case-service ] (Port 8083)
  ├── AiServiceClient (RestTemplate HTTP Client)
  ├── AiIntegrationServiceImpl (Business Logic & JPA Binding)
  ├── AiResultPersistenceServiceImpl (MySQL Transactional Persistence & Deduplication)
  └── AiIntegrationController (/api/cases/ai/v2/*)
           │                                 │
           ▼ (HTTP REST API Call)            ▼ (Spring Data JPA)
[ Python FastAPI AI Microservice ]    [ MySQL Database case_db ]
  (Port 8000)                           ├── ai_match_results
  ├── Face Detection Engine             ├── ai_risk_results
  ├── 384-D NLP Vector Engine           └── missing_person
  ├── Multi-Factor Fusion Engine
  └── Risk Prioritization Engine
```

---

## 2. MySQL Persistence Tables (Step 9)

### 1. `ai_match_results`
- `id`: BigInt (PK, Auto Increment)
- `source_case_id`: VarChar(64) (Indexed)
- `candidate_case_id`: VarChar(64) (Indexed)
- `face_score`: Decimal(6, 4)
- `text_score`: Decimal(6, 4)
- `attribute_score`: Decimal(6, 4)
- `location_score`: Decimal(6, 4)
- `time_score`: Decimal(6, 4)
- `overall_score`: Decimal(6, 4) (Indexed)
- `classification`: VarChar(64)
- `available_factors_count`: Int
- `factor_details_json`: Text (Full explainability breakdown JSON)
- `ai_model_version`: VarChar(64) (`"v2.0-Python-Multimodal"`)
- `analysis_timestamp`: DateTime

### 2. `ai_risk_results`
- `id`: BigInt (PK, Auto Increment)
- `case_id`: VarChar(64) (Indexed)
- `risk_score`: Decimal(6, 4) (Indexed)
- `risk_level`: VarChar(32) (Indexed)
- `available_factors_count`: Int
- `reason`: Text
- `factor_details_json`: Text (Full explainability breakdown JSON)
- `ai_model_version`: VarChar(64) (`"v1.0-Python-RiskEngine"`)
- `analysis_timestamp`: DateTime

---

## 3. Retrieval APIs

- **Stored Matches for Case**: `GET http://localhost:8083/api/cases/ai/v2/matches/{caseId}`
- **Top Match for Case**: `GET http://localhost:8083/api/cases/ai/v2/matches/{caseId}/top`
- **Latest Risk Assessment**: `GET http://localhost:8083/api/cases/ai/v2/risk/{caseId}`

---

## 4. Verification Suites

Run the Step 9 MySQL persistence test suite:
```bash
python scratch/test_step9_persistence.py
```

All 7 test scenarios verify real case creation, multi-factor analysis, MySQL persistence, retrieval APIs, duplicate deduplication, 503 outage protection, and access control security.
