# MISXMATCH Platform — Final Architecture Specification

## 1. System Architecture Overview

**MISXMATCH** is a multi-modal, enterprise-grade platform designed for missing person search, biometric candidate matching, officer decision support, and family reunification.

```text
                               ┌───────────────────────────────────────────────┐
                               │             React Web Application             │
                               │          (Vite + Tailwind + Nginx)            │
                               └──────────────────────┬────────────────────────┘
                                                      │ HTTP /api/ (Bearer JWT)
                                                      ▼
                               ┌───────────────────────────────────────────────┐
                               │             Central API Gateway               │
                               │           (Spring Cloud Gateway)              │
                               │   Header Forwarding: X-Request-ID, X-User-Id  │
                               └──────────────────────┬────────────────────────┘
                                                      │ (Private Docker Network)
                                 ┌────────────────────┴────────────────────┐
                                 ▼                                         ▼
┌────────────────────────────────────────────────────────┐ ┌───────────────────────────────────────┐
│              User & Case Microservice                  │ │         Notification Microservice     │
│                (Java 21 Spring Boot)                   │ │          (Java 21 Spring Boot)       │
│ ├── Auth & User Management (JWT, RBAC, Aadhaar)        │ │ ├── Notification Dispatch & WebSockets│
│ ├── Case Management (Missing, Found, Sightings)        │ │ └── System Audit Logs                 │
│ ├── File Storage (MinIO S3 / Local Fallback)           │ └───────────────────┬───────────────────┘
│ ├── Case Intelligence & Operational Priority           │                     │
│ └── System Health & AI Performance Tracker             │                     │
└───────────────┬────────────────────────┬───────────────┘                     │
                │ Internal HTTP          │                                     │
                ▼ (X-Internal-Service)   └───────────────────┬─────────────────┘
┌────────────────────────────────────────┐                   │
│      Python FastAPI AI Microservice    │                   │
│ ├── ArcFace Deep Feature Embeddings    │                   │
│ ├── Sentence-BERT Semantic Matching    │                   │
│ ├── Attribute & Spatial-Temporal AI    │                   │
│ └── CCTV Computer Vision (OpenCV/YOLO) │                   │
└────────────────────────────────────────┘                   │
                                                             ▼
                                             ┌───────────────────────────────┐
                                             │    MySQL 8.0 Relational DB    │
                                             │     Schema: misxmatch_db      │
                                             └───────────────────────────────┘
```

---

## 2. Microservice Responsibilities & Inter-Service Protocol

### A. React Frontend
* Built using Vite, React 18, and TailwindCSS.
* Communicates **exclusively** through the Central API Gateway (`/api/`).
* Handles JWT token storage, role-based UI rendering (`PUBLIC_USER`, `POLICE`, `HOSPITAL`, `NGO`, `ADMIN`), and real-time Toast/Notification subscriptions.

### B. Central API Gateway (`gateway-service`)
* Public entry point bound to port `8080`.
* Enforces JWT signature verification, CORS origin restrictions, and request rate limiting.
* Generates and injects `X-Request-ID` correlation header into all downstream microservice calls.

### C. User & Case Service (`case-service`)
* Core domain engine handling case lifecycles (`REPORTED`, `UNDER_INVESTIGATION`, `CLOSURE_REQUESTED`, `REUNITED`, `CLOSED`).
* Communicates with `ai-service` via internal HTTP client (`AiServiceClient`).
* Persists AI match results, risk evaluations, CCTV sessions, and performance metrics in MySQL.
* Computes zero-latency **Case Intelligence Studio** analytics and **System Health Telemetry**.

### D. Notification Service (`notification-service`)
* Dispatches targeted notifications to reporting citizens, ground police officers, and hospital/shelter administrators.
* Handles emergency Amber broadcast alerts and immutable audit logging.

### E. Python FastAPI AI Service (`ai-service`)
* Standalone Python microservice handling computationally heavy biometric and deep learning inference.
* Protected by internal service header verification (`X-Internal-Service-Key`).
* Exposes `/health` endpoint with model readiness states (`face`, `text`, `cctv`, `attribute`, `location`, `time`).

---

## 3. Real AI Architecture & Algorithmic Design

| AI Module | Underlying Technology | Method & Mathematical Rationale |
| :--- | :--- | :--- |
| **Facial Similarity** | ArcFace (Additive Angular Margin Loss) | Extracts 512-dimensional facial geometry embeddings. Calculates cosine similarity $S_{\text{face}} = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$. |
| **Text Semantic Matching** | Sentence-BERT / SciBERT | Generates dense sentence embeddings for descriptions. Calculates semantic cosine distance. |
| **Attribute Matching** | Structured Vector Matcher | Compares discrete physical attributes (age group, gender, clothing color, identifying marks). |
| **Location Relevance** | Haversine Geospatial Proximity | Computes distance $d$ in kilometers: $d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$. Distance penalty decays score exponentially. |
| **Time Relevance** | Temporal Decay Curve | Evaluates time elapsed between disappearance and sighting timestamp using a smooth decay function. |
| **Multi-Factor Matching** | Weighted Fusion Formula | $S_{\text{total}} = w_1 S_{\text{face}} + w_2 S_{\text{text}} + w_3 S_{\text{attr}} + w_4 S_{\text{loc}} + w_5 S_{\text{time}}$ ($w_1=0.40, w_2=0.25, w_3=0.15, w_4=0.10, w_5=0.10$). |
| **Risk Scoring** | Multi-Factor Vulnerability Rule Engine | Evaluates age (< 18 or > 65), medical conditions, abduction indicators, and time elapsed to calculate risk score $[0, 100]$. |
| **CCTV Analysis** | OpenCV Frame Sampler + Person Detection | Samples video frames at configurable intervals, detects candidate bounding boxes, extracts facial embeddings, and tracks temporal continuity. |

---

## 4. Human Verification & Officer Protocol

* **Decision-Support Protocol Statement**:  
  > *"AI Decision-Support System: Candidate suggestions require officer field verification before legal identification."*
* AI candidate match outputs are stored in `PENDING_REVIEW` state.
* Authorized Police/Admin users review matches and record official human decisions:
  - `CONFIRMED_MATCH`
  - `REJECTED_MATCH`
  - `NEEDS_MORE_INFORMATION`
* Automated legal identification or automatic case closure by AI is explicitly forbidden.

---

## 5. Security Controls & RBAC Enforcement

1. **Authentication**: Form-based authentication with bcrypt password hashing + OTP verification + 12-digit Aadhaar verification.
2. **Authorization**: Spring Security `@PreAuthorize` enforcing role-level authority (`ROLE_POLICE`, `ROLE_ADMIN`, `ROLE_PUBLIC_USER`, `ROLE_HOSPITAL`, `ROLE_NGO`).
3. **IDOR Protection**: Case intelligence, match detail, and report endpoints verify that non-admin public users can access only their own reported cases.
4. **Sanitized Logging**: Strict prohibition of logging passwords, JWT tokens, Aadhaar numbers, API keys, or raw facial images.

---

## 6. Docker Deployment Topology

* Orchestrated via `docker-compose.yml` on private bridge network `misxmatch-net`.
* Persistent volumes:
  - `mysql_data`: MySQL relational tables.
  - `case_uploads`: Local evidence/photo file storage.
  - `minio_data`: S3-compatible attachment storage.
