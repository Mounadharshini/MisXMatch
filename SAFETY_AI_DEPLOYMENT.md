# MISXMATCH Additive AI Safety & Intelligence Module
## Deployment, Security, and Rollback Guide

### Overview
This document outlines deployment procedures, security configurations, database migration steps, and rollback mechanisms for the **Additive AI Safety & Intelligence Module** in MISXMATCH.

The design guarantees **100% backward compatibility** with existing REST endpoints, database schemas, authentication workflows, and React interfaces. All new functionality resides under `/cases/ai/safety/*` (Gateway / Case Service) and `/ai/safety/*` (Python FastAPI AI Service), utilizing isolated database tables prefixed `ai_`.

---

## 1. Safety & Security Requirements Verification

1. **Human-in-the-Loop Constraint**:
   - AI candidate leads output state `REVIEW_REQUIRED`.
   - The platform never auto-identifies individuals, auto-closes missing person cases, sends public alerts, or triggers enforcement actions.
   - An authorized officer (Police / Admin) must explicitly review and confirm or reject every candidate lead.

2. **No Protected Sensitive Attribute Profiling**:
   - Explicitly disables predicting, logging, or displaying race, ethnicity, religion, caste, disability, health, age, gender identity, emotion, or criminality.
   - UTKFace demographic labels are disabled for inference.

3. **Network & Port Isolation**:
   - In production Docker deployment (`docker-compose.yml`), `ai-service` port `8001` is restricted to `misxmatch-net` internal container networking using `expose: - "8001"`. External host binding (`8001:8001`) is removed.
   - Service-to-service calls require secret `X-Internal-API-Key` headers.

4. **Restrictive CORS**:
   - Wildcard CORS (`*`) is replaced by configured origins (`ALLOWED_CORS_ORIGINS`).

5. **Biometric Data & Zero Retention**:
   - Raw video frames and decoded biometric vectors are discarded immediately after inference in `try/finally` blocks.
   - Embeddings and evidence pointers in database tables are access-controlled.

---

## 2. Deployment Steps

### Step A: Apply Database Migrations (`case_db`)
Run the migration script to create `ai_*` tables:
```bash
mysql -h localhost -P 3306 -u root -proot case_db < "MISXMATCH BACKEND 11/MISXMATCH 10/mysql-init/ai_safety_schema.sql"
```

### Step B: Build & Deploy Container Services
Set environment variables or copy `.env.example` to `.env`:
```bash
cp .env.example .env
docker-compose down
docker-compose build ai-service case-service frontend
docker-compose up -d
```

### Step C: Execute Evaluation & Safety Tests
Run safety tests and validation harness:
```bash
# Python AI Service Pytest Unit Tests
python -m pytest ai-service/tests/test_safety_gate.py

# Run Safety Evaluation Harness
python ai-service/eval_safety.py
```

---

## 3. Rollback Instructions

If a rollback of the Additive AI Safety Module is required:

1. **Zero Impact Guarantee**:
   - Since all APIs are additive (`/cases/ai/safety/*`), existing case management endpoints (`/cases/*`) remain unaffected even if the safety endpoints are disabled.

2. **Backend API Fallback**:
   - The original endpoints (`/cases/ai/matches/{caseId}`, `/cases/ai/analyze-upload`) remain intact and continue operating without downtime.

3. **Database Rollback**:
   To drop additive `ai_*` tables without impacting core database schemas:
   ```sql
   USE case_db;
   DROP TABLE IF EXISTS ai_quality_assessments;
   DROP TABLE IF EXISTS ai_candidate_leads;
   DROP TABLE IF EXISTS ai_temporal_tracks;
   DROP TABLE IF EXISTS ai_audit_events;
   DROP TABLE IF EXISTS ai_feedback;
   DROP TABLE IF EXISTS ai_retention_policies;
   ```
