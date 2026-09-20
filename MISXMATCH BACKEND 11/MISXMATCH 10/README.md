# MISXMATCH — AI-Based Missing Person Search & Reunification Platform

## Microservices Architecture (Step 11)

MISXMATCH is structured into a clean, practical 4-microservice architecture:

```text
                               React Frontend
                                     │
                                     ▼
                          API Gateway (Port 8080)
                                     │
             ┌───────────────────────┴───────────────────────┐
             ▼                                               ▼
User & Case Service (Port 8083)                 Notification Service (Port 8084)
   (Auth + Cases + Sightings + AI Persist)          (Notifications + Audits + Dashboard)
             │
             ├──────────────────────────┐
             ▼                          ▼
Python FastAPI AI Service (Port 8000)   MySQL Database (Port 3306)
   (Real ML / Computer Vision / NLP)       (case_db)
```

---

## Service Responsibilities & Ports

### 1. API Gateway (`api-gateway` / `gateway-service` — Port 8080)
- Single entry point for the React frontend application.
- Routes incoming REST requests to internal microservices based on URL path predicates.
- Enforces JWT authorization forwarding to downstream services.

### 2. User & Case Service (`user-case-service` — Port 8083)
- Handles user registration, authentication, login, role management (`PUBLIC_USER`, `POLICE`, `HOSPITAL`, `NGO`, `SHELTER`, `ADMIN`, `SUPER_ADMIN`), Aadhaar verification, and profile management.
- Manages missing person FIRs, found person intakes, sightings, and evidence logs.
- Orchestrates multi-factor AI evaluations with `ai-service` and persists AI match & risk results into MySQL (`ai_match_results`, `ai_risk_results`).

### 3. Notification Service (`notification-service` — Port 8084)
- Dedicated microservice for emergency alerts, high-confidence match notifications, case status updates, and immutable investigation audit logs.
- Serves real-time police and admin investigation dashboard metrics.

### 4. Python AI Service (`ai-service` — Port 8000)
- Independent Python FastAPI microservice running real machine learning & computer vision models.
- Provides real endpoints for:
  - Facial embedding generation & similarity (`/api/ai/image-match`)
  - NLP sentence similarity (`/api/ai/text-match`)
  - Structured attribute matching (`/api/ai/attribute-match`)
  - Geo-spatial Haversine proximity (`/api/ai/location-match`)
  - Temporal relevance scoring (`/api/ai/time-match`)
  - Multi-factor AI fusion (`/api/ai/multi-match`)
  - Case risk prioritization scoring (`/api/ai/risk-score`)

---

## API Routing Summary

| Endpoint Path | Target Service | Responsibility |
|---|---|---|
| `/api/auth/**` | `user-case-service` (:8083) | Registration, Login, Token refresh, OTP |
| `/api/users/**` | `user-case-service` (:8083) | User profiles, role management |
| `/api/cases/**` | `user-case-service` (:8083) | Missing & Found cases, AI v2 matching & risk |
| `/api/sightings/**` | `user-case-service` (:8083) | Sighting reports |
| `/api/evidence/**` | `user-case-service` (:8083) | Case evidence files |
| `/api/notifications/**` | `notification-service` (:8084) | User alerts & notifications |
| `/api/dashboard/**` | `notification-service` (:8084) | System analytics & dashboard metrics |
| `/api/audit-logs/**` | `notification-service` (:8084) | Audit event logs |
| `/health` | `ai-service` (:8000) | Python AI health check |

---

## How to Start the System

1. **MySQL Database**:
   Ensure MySQL is running on `localhost:3306` with database `case_db`.

2. **Python AI Microservice** (Port 8000):
   ```bash
   cd ai-service
   pip install -r requirements.txt
   python main.py
   ```

3. **User & Case Service** (Port 8083):
   ```bash
   mvn -pl case-service spring-boot:run
   ```

4. **Notification Service** (Port 8084):
   ```bash
   mvn -pl notification-service spring-boot:run
   ```

5. **API Gateway** (Port 8080):
   ```bash
   mvn -pl gateway-service spring-boot:run
   ```

6. **React Frontend** (Port 5173):
   ```bash
   cd "MISXMATCH BACKEND 11/MISXMATCH_FRONTEND 12/MISXMATCH"
   npm run dev
   ```
