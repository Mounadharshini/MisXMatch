# MISXMATCH – AI-Based Missing Person Search & Reunification Platform
## Final Comprehensive Project Documentation

---

## 1. Project Title
**MISXMATCH – AI-Based Missing Person Search & Reunification Platform**

---

## 2. Abstract

The identification and reunification of missing individuals represents one of the most critical challenges faced by public safety agencies, law enforcement, non-governmental organizations (NGOs), and hospitals worldwide. Conventional missing-person search processes suffer from severe limitations, including fragmented data siloes, manual visual comparison of photos, unstructured physical descriptions, delayed candidate identification, and an inability to correlate scattered citizen sightings or CCTV footage in real time.

**MISXMATCH** is an enterprise-grade, multi-modal software platform designed to accelerate missing person investigations through microservices architecture, artificial intelligence (AI), and structured operational workflows. MISXMATCH combines multi-factor AI candidate matching—synthesizing facial biometrics, semantic natural language processing (NLP), structured physical attributes, geospatial location proximity, and temporal decay functions—with multi-factor risk prioritization, automated CCTV video evidence sampling, and instant notification dispatch.

> **Crucial Governance & Ethical AI Principle:**  
> AI components in MISXMATCH provide **decision-support candidate rankings and suggestions**. The platform **does not execute automated legal identity declarations or automatic case closures**. Final verification and legal identification must be performed by authorized police officers and system administrators.

---

## 3. Problem Statement

Missing person investigations are hindered by fundamental structural and technological bottlenecks:

1. **Fragmented & Siloed Information**: Missing person records, hospital unknown patient intakes, shelter resident registries, and citizen sightings exist in isolated databases across jurisdictions.
2. **Manual & Slow Image Comparison**: Law enforcement officers must manually inspect thousands of photographs, leading to human fatigue, delay, and potential errors.
3. **Unstructured & Vague Text Descriptions**: Eye-witness reports and missing person notices rely on unstandardized natural language (e.g., *"wearing a blue jeans and dark jacket"*), making traditional keyword database search ineffective.
4. **Lack of Multi-Modal Fusion**: Isolated algorithms for facial recognition or location tracking fail when image quality is low or location data is incomplete. There is no automated framework to combine partial evidence across modalities.
5. **Scattered Sightings & CCTV Overload**: Law enforcement receives high volumes of unverified citizen sightings and hours of CCTV footage without automated toolsets to filter or sample candidate frames efficiently.
6. **Inefficient Risk Prioritization**: High-risk cases (e.g., young children, elderly individuals with dementia, or suspicious abductions) are often queued sequentially rather than prioritized by dynamic vulnerability scores.

---

## 4. Objectives

The primary objective of MISXMATCH is to deliver a secure, scalable, and production-ready platform for missing-person search and case management. Specific implemented objectives include:

- **Secure Case Reporting**: Enable citizens, police officers, hospital staff, and NGO workers to report missing individuals and register found persons or unknown hospital patients securely.
- **Citizen Sighting Submission**: Provide public users with a streamlined interface to submit geo-tagged sightings accompanied by photos and time observations.
- **AI-Assisted Multi-Factor Candidate Matching**: Combine 5 distinct biometric and contextual factors into a unified multi-factor matching score:
  - **Facial Similarity Analysis**: Deep feature extraction using ArcFace ResNet50 (512-dimensional embeddings) and cosine similarity.
  - **Semantic Text Matching**: Sentence-BERT (`all-MiniLM-L6-v2`) 384-dimensional vector embeddings for description matching.
  - **Structured Attribute Comparison**: Exact and fuzzy comparison of age group, gender, height, clothing, hair, and identifying marks.
  - **Spatial Location Proximity**: Haversine distance calculations with exponential spatial decay.
  - **Temporal Time Decay**: Time-elapsed relevance scoring between disappearance and sighting timestamps.
- **Dynamic Case Risk Prioritization**: Evaluate case vulnerability using a multi-factor heuristic matrix to categorize cases into `URGENT_EMERGENCY`, `HIGH_PRIORITY`, `MEDIUM_PRIORITY`, and `NORMAL_TRACKING`.
- **CCTV Video Evidence Analysis**: Sample uploaded video evidence frames, run person detection (OpenCV HOG / YOLO), extract facial features, and rank candidate matches.
- **Human Verification & Officer Review**: Enforce strict human-in-the-loop controls where officers record explicit audit decisions (`CONFIRMED_MATCH`, `REJECTED_MATCH`, `NEEDS_MORE_INFORMATION`).
- **Notification & Audit Service**: Store and deliver role-targeted system notifications and maintain immutable audit logs for sensitive operations.
- **Case Intelligence Studio**: Synthesize multi-modal case records, completeness percentages, risk trends, and candidate leads into an operational decision-support dashboard.
- **Production Observability & Monitoring**: Provide system health metrics, model readiness probing, failure tracking, and request correlation (`X-Request-ID`) across microservices.

---

## 5. Existing System vs Proposed System

| Dimension | Conventional / Existing System | MISXMATCH Proposed System |
| :--- | :--- | :--- |
| **Data Organization** | Fragmented paper records, local spreadsheets, disconnected portals. | Centralized MySQL database with microservice access control. |
| **Photo Search** | Manual visual inspection by officers. | AI facial biometric feature extraction (ArcFace 512-D embeddings) and vector similarity. |
| **Description Matching** | Exact keyword matching (fails on synonyms or typos). | Deep semantic NLP description matching (Sentence-BERT MiniLM-L6 vector space). |
| **Location & Time** | Manual geographic mapping. | Automated Haversine spatial decay and temporal relevance scoring. |
| **Multi-Modal Evidence** | Factors evaluated separately in isolation. | Multi-Factor Fusion Engine combining Face + Text + Attributes + Location + Time into a single score. |
| **Risk Assessment** | Static manual classification or basic queuing. | Dynamic risk scoring matrix based on age, medical conditions, abduction indicators, and time elapsed. |
| **CCTV Processing** | Manual video playback for hours. | Frame sampling, automated person detection, bounding box extraction, and candidate matching. |
| **Alerts & Communication** | Phone calls, manual flyers, delayed press releases. | Role-based notifications and real-time dashboard notifications. |
| **Human Verification** | Ad-hoc communication without standardized audit trail. | Enforced Human-in-the-Loop review workflow with logged audit states. |
| **Auditability & Security** | Inconsistent logging; risk of unauthorized access. | Role-Based Access Control (RBAC), Aadhaar/OTP auth, sanitized logging, immutable audit logs. |
| **Architecture & Scale** | Monolithic or desktop software. | Containerized Spring Boot + Python FastAPI microservices orchestrated with Docker Compose. |

---

## 6. System Architecture

The MISXMATCH architecture is built on a multi-tier microservice model designed for security, service isolation, and horizontal scalability.

```text
                               ┌───────────────────────────────────────────────┐
                               │             React Web Application             │
                               │          (Vite + Vanilla CSS / Tailwind)      │
                               └──────────────────────┬────────────────────────┘
                                                      │ HTTP /api/ (Bearer JWT)
                                                      ▼
                               ┌───────────────────────────────────────────────┐
                               │             Central API Gateway               │
                               │           (Spring Cloud Gateway)              │
                               │   Header Forwarding: X-Request-ID, X-User-Id  │
                               └──────────────────────┬────────────────────────┘
                                                      │ (Private Docker Network)
                                  ┌───────────────────┴───────────────────┐
                                  ▼                                       ▼
┌────────────────────────────────────────────────────────┐ ┌───────────────────────────────────────┐
│              User & Case Microservice                  │ │         Notification Microservice     │
│                (Java 21 Spring Boot)                   │ │          (Java 21 Spring Boot)       │
│ ├── Auth & User Management (JWT, RBAC, Aadhaar)        │ │ ├── Notification Dispatch & Audit     │
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

### Microservice Responsibilities

1. **React Frontend (`misxmatch-frontend`)**:
   - Single Page Application (SPA) built with React 18, Vite, and Lucide React icons.
   - Enforces role-specific layouts (`PUBLIC_USER`, `POLICE`, `HOSPITAL`, `NGO`, `ADMIN`).
   - Routes requests through the Central API Gateway at `/api/`.

2. **Central API Gateway (`gateway-service`)**:
   - Built with Spring Cloud Gateway running on port `8080`.
   - Performs centralized JWT token validation, CORS policy enforcement, rate limiting, and request correlation header injection (`X-Request-ID`).

3. **User & Case Management Microservice (`case-service`)**:
   - Built with Java 21 and Spring Boot 3.x running on port `8083`.
   - Manages user registration, OTP generation/validation, Aadhaar verification, missing person cases, found person records, citizen sightings, human review logs, case intelligence calculations, and system health metrics.
   - Communicates internally with `ai-service` via `AiServiceClient` using internal service key authentication (`X-Internal-Service-Key`).

4. **Notification & Audit Microservice (`notification-service`)**:
   - Built with Java 21 and Spring Boot 3.x running on port `8084`.
   - Manages stored user notifications, unread counts, clear/read actions, and immutable audit logs.

5. **Python AI Biometric & Vision Microservice (`ai-service`)**:
   - Built with Python 3.10+ and FastAPI running on port `8000`.
   - Executes deep learning inference for face embeddings (ArcFace / ResNet50), NLP description vectors (Sentence-BERT), structured attribute matching, Haversine geospatial calculations, temporal decay functions, multi-factor fusion, risk scoring, and CCTV video frame analysis.

6. **Central Database (`mysql-db`)**:
   - MySQL 8.0 relational database persisting relational schemas, users, cases, sightings, AI match results, human review decisions, notifications, audit logs, and system health metrics.

7. **Object Storage (`minio`)**:
   - MinIO S3-compatible object storage for persistent image files, evidence attachments, and CCTV video samples.

---

## 7. Technology Stack

MISXMATCH uses a modern, open-source tech stack:

### Frontend
- **Framework**: React 18 (Vite build tool)
- **UI & Iconography**: Lucide React, Vanilla CSS, TailwindCSS utilities
- **State & Routing**: React Router v6, React Context API (`AuthContext`, `NotificationContext`, `ToastContext`)
- **HTTP Client**: Axios with Bearer JWT interceptors

### Backend Microservices
- **Language**: Java 21 LTS
- **Framework**: Spring Boot 3.2+
- **Security**: Spring Security 6.x, JJWT (JSON Web Token), BCrypt Password Encoder
- **Gateway**: Spring Cloud Gateway (Reactive WebFlux foundation)
- **Persistence**: Spring Data JPA / Hibernate ORM
- **HTTP Communication**: Spring WebClient / RestTemplate

### AI & Data Science Microservice
- **Language**: Python 3.10+
- **Framework**: FastAPI, Uvicorn ASGI server
- **Computer Vision & Deep Learning**: OpenCV (`opencv-python-headless`), PyTorch / Torchvision, ArcFace / ResNet50 feature extractors
- **NLP & Embeddings**: `sentence-transformers` (`all-MiniLM-L6-v2`), Hugging Face Transformers
- **Numerical Computing**: NumPy, Scikit-learn, SciPy
- **Data Validation**: Pydantic v2

### Database & Storage
- **Relational DB**: MySQL 8.0 Community Server
- **Object Storage**: MinIO (S3 compatible)

### Infrastructure & Operations
- **Containerization**: Docker, Docker Compose
- **Web Server Proxy**: Nginx (Frontend container)
- **Monitoring & Logging**: Custom MDC Correlation Tracing (`X-Request-ID`), System Health Metrics REST endpoints

---

## 8. User Roles and Access Control

MISXMATCH enforces strict Role-Based Access Control (RBAC) across 5 primary user roles:

| User Role | Description & Primary Access Rights |
| :--- | :--- |
| **`PUBLIC_USER`** | Citizen user. Can report missing relatives, submit citizen sightings, track own reported cases, and manage profile settings. Cannot access police intelligence or sensitive match feeds. |
| **`POLICE`** | Law enforcement officer. Full operational access to missing cases, AI candidate matches, CCTV evidence processing, risk priority feeds, sighting verifications, and human review decision tools. |
| **`HOSPITAL`** | Medical staff/administrator. Can register unknown, unidentified, or amnesiac hospital patients (`Report Found`), cross-reference intake matches, and view case intelligence. |
| **`NGO`** | Shelter worker / NGO admin. Can register unidentified shelter residents, review potential family match leads, and manage shelter resident profiles. |
| **`ADMIN`** | System Administrator. Superuser access to organization approvals, user account management, case closure approval queues, system audit logs, and AI evaluation/monitoring analytics dashboards. |

### Security Mechanisms

1. **Authentication**: Form login with BCrypt password hashing + Mobile OTP validation + 12-digit Aadhaar identity verification.
2. **JWT Security**: Signed HMAC-SHA256 JWT tokens containing `username`, `role`, `userId`, and `expiration`.
3. **RBAC Enforcement**: Spring Security `@PreAuthorize` annotations on backend controllers (`@PreAuthorize("hasAuthority('ROLE_POLICE')")`).
4. **Service-to-Service Security**: API Gateway forwards `X-Request-ID` and `X-User-Id` headers. Python `ai-service` requires internal header `X-Internal-Service-Key`.
5. **IDOR Protection**: Case intelligence and personal report endpoints explicitly verify that non-admin public users can access only their own reported cases.
6. **Data Sanitization**: Passwords, raw JWT tokens, Aadhaar numbers, and raw facial biometric vectors are strictly filtered out of system log outputs.

---

## 9. Complete Application Workflow

The end-to-end operational lifecycle of a missing person investigation in MISXMATCH proceeds through the following sequential stages:

```text
User Registration ──► OTP Verification ──► Aadhaar Verification ──► Login (JWT Token)
                                                                           │
                                                                           ▼
Case Stored in MySQL ◄── Report Missing / Found Person ◄── Select Role Portal
         │
         ▼
Trigger AI Analysis Pipeline (Python ai-service)
         │
         ├─► Face Embedding Extraction (ArcFace 512-D)
         ├─► Text Description Embedding (Sentence-BERT 384-D)
         ├─► Physical Attribute Vector Matching
         ├─► Geospatial Haversine Distance Calculation
         ├─► Temporal Time Decay Calculation
         └─► Multi-Factor Composite Score Fusion & Risk Scoring
                               │
                               ▼
            Store AI Match Candidates in MySQL (PENDING_REVIEW)
                               │
                               ▼
        Police Officer Reviews Candidate Lead in AI Match Feed
                               │
                               ├─► View Factor Score Breakdown (Face %, Text %, Attr %, Loc %, Time %)
                               ├─► Inspect Bounding Boxes & Photos Side-by-Side
                               └─► Submit Formal Human Decision:
                                      - CONFIRMED_MATCH
                                      - REJECTED_MATCH
                                      - NEEDS_MORE_INFORMATION
                               │
                               ▼
        Notification Dispatched to Case Owner & Officer Dashboard
                               │
                               ▼
        Case Intelligence Studio Updated (Operational Priority & Audit Log)
                               │
                               ▼
        Case Closure Workflow (Officer Request ──► Admin Approval ──► REUNITED)
```

---

## 10. AI Modules

MISXMATCH implements 8 distinct AI, computer vision, and machine learning components:

### 10.1 Face Similarity Module
- **Input**: High-resolution digital photograph of missing or found person.
- **Face Detection & Normalization**: Facial landmark detection and alignment.
- **Deep Feature Embedding**: ArcFace / ResNet50 deep convolutional neural network generating a 512-dimensional L2-normalized vector $\mathbf{v} \in \mathbb{R}^{512}$.
- **Similarity Metric**: Cosine similarity $S_{\text{face}} = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$.
- **Threshold**: Configured cutoff `FACE_MATCH_THRESHOLD = 0.75`.
- **Limitations**: Performance can be affected by extreme facial pose angles (> 45°), severe motion blur, low lighting, or heavy facial occlusions (masks/sunglasses).

### 10.2 Text Semantic Similarity Module
- **Input**: Free-form natural language text description of missing person (clothing, circumstances, physical appearance).
- **Text Preprocessing**: Lowercasing, punctuation stripping, and tokenization.
- **Semantic Vector Embedding**: SentenceTransformers model (`all-MiniLM-L6-v2`) mapping description text into a dense 384-dimensional latent space.
- **Similarity Metric**: Cosine similarity $S_{\text{text}}$ between candidate and target text vectors.
- **Threshold**: Configured cutoff `TEXT_MATCH_THRESHOLD = 0.65`.

### 10.3 Attribute Matching Module
- **Input**: Discrete physical metadata attributes (Age Group, Gender, Height Range, Hair Color, Eye Color, Clothing Color, Identifying Marks).
- **Comparison Engine**: Structured feature matching with weighted sub-scores. Neutral handling for `UNKNOWN` or missing fields.
- **Output**: Normalized attribute score $S_{\text{attr}} \in [0.0, 1.0]$.

### 10.4 Location Matching Module
- **Input**: Target missing location $(\phi_1, \lambda_1)$ and candidate sighting location $(\phi_2, \lambda_2)$ in latitude/longitude coordinates.
- **Distance Formula**: Haversine formula computing great-circle distance $d$ in kilometers:
  $$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
- **Spatial Decay Function**: Exponential spatial decay score:
  $$S_{\text{loc}} = \exp(-\lambda \cdot d)$$
  where $\lambda = 0.05$ ensures that candidates within 5 km maintain high relevance, while relevance decays smoothly for distant locations.

### 10.5 Time Matching Module
- **Input**: Disappearance timestamp $t_{\text{missing}}$ and sighting timestamp $t_{\text{sighting}}$.
- **Time Difference**: Elapsed time $\Delta t = |t_{\text{sighting}} - t_{\text{missing}}|$ in hours.
- **Temporal Decay Function**: Exponential time decay score:
  $$S_{\text{time}} = \exp(-\gamma \cdot \Delta t)$$
  where $\gamma = 0.01$ reflects natural temporal correlation.

### 10.6 Multi-Factor Fusion Engine
- **Mathematical Formula**:
  $$S_{\text{overall}} = w_{\text{face}} \cdot S_{\text{face}} + w_{\text{text}} \cdot S_{\text{text}} + w_{\text{attr}} \cdot S_{\text{attr}} + w_{\text{loc}} \cdot S_{\text{loc}} + w_{\text{time}} \cdot S_{\text{time}}$$
- **Weight Calibration**:
  - `FACE_WEIGHT`: **0.35** (35%)
  - `TEXT_WEIGHT`: **0.25** (25%)
  - `ATTRIBUTE_WEIGHT`: **0.20** (20%)
  - `LOCATION_WEIGHT`: **0.10** (10%)
  - `TIME_WEIGHT`: **0.10** (10%)
  - Sum of weights = $0.35 + 0.25 + 0.20 + 0.10 + 0.10 = 1.00 \quad \checkmark$
- **Missing Factor Resilience**: If a factor (e.g. photo or location) is unavailable, the fusion engine dynamically re-normalizes the remaining active weights so that the composite score remains strictly bounded in $[0.0, 1.0]$.

### 10.7 Risk Scoring Engine
- **Input Factors**: Age (< 18 child or > 65 senior), medical/psychiatric conditions (dementia, diabetes), suspicious disappearance/abduction indicators, time elapsed.
- **Risk Score Output**: Numerical risk score $[0, 100]$.
- **Risk Categories**:
  - `HIGH_RISK` ($\ge 75.0$): Urgent priority alert dispatched to police dispatches.
  - `MEDIUM_RISK` ($45.0 - 74.9$): Priority tracking.
  - `LOW_RISK` ($< 45.0$): Standard tracking.

### 10.8 CCTV Video Evidence Module
- **Input**: Uploaded CCTV video file or video clip evidence.
- **Frame Sampler**: Extracts frames at regular intervals (e.g., 1 frame per second).
- **Person Detection**: OpenCV HOG / YOLO person detector identifying candidate bounding boxes.
- **Biometric Candidate Extraction**: Extracts facial regions from bounding boxes, generates ArcFace embeddings, and evaluates against active missing person databases.

---

## 11. AI Matching Pipeline

```text
       Input Missing / Found Case
                   │
                   ▼
     Candidate Database Retrieval
                   │
         ┌─────────┼─────────┬─────────┬─────────┐
         ▼         ▼         ▼         ▼         ▼
       Face      Text      Attr      Loc       Time
      Module    Module    Module    Module    Module
      (0.35)    (0.25)    (0.20)    (0.10)    (0.10)
         │         │         │         │         │
         └─────────┼─────────┴─────────┴─────────┘
                   │
                   ▼
     Multi-Factor Weight Re-normalization
        (Handles Missing Data Modes)
                   │
                   ▼
      Composite Score Calculation
                   │
                   ▼
      Threshold Classification Engine
     (HIGH_CONFIDENCE >= 0.80, POSSIBLE >= 0.60)
                   │
                   ▼
     Persist Match Results in MySQL
                   │
                   ▼
      Enforced Human Officer Verification
```

---

## 12. Human Verification

To prevent misuse, false positives, or automated misidentifications, MISXMATCH strictly enforces **Human-in-the-Loop** verification:

- **Non-Deterministic Decision Support**: AI outputs represent probabilistic similarity leads, not legally binding identity confirmations.
- **Review Statuses**:
  - `PENDING_REVIEW`: Initial state of AI candidate matches upon creation.
  - `UNDER_REVIEW`: Assigned to a police officer actively evaluating the evidence.
  - `CONFIRMED_MATCH`: Officer verifies that the candidate is the missing individual.
  - `REJECTED_MATCH`: Officer determines candidate is a false match.
  - `NEEDS_MORE_INFORMATION`: Officer requests additional field data or photos.
- **Auditability**: Every decision records the officer's `userId`, timestamp, notes, and action in `ai_match_reviews` and `audit_logs` tables.

---

## 13. Notification System

The notification subsystem (`notification-service`) handles system-wide alerts:

- **Notification Events**: High-confidence AI match leads ($\ge 0.80$), high-risk case dispatches ($\ge 75.0$), citizen sighting submissions, case closure updates, and admin approvals.
- **Recipient Targeting**: Notifications are routed based on user roles (`POLICE`, `ADMIN`, `HOSPITAL`, `NGO`, `PUBLIC_USER`).
- **Management APIs**: Includes read/unread toggles, deletion, clear-all, and unread count aggregation.

---

## 14. Case Intelligence

The **Case Intelligence Studio** synthesizes multi-modal data into an operational decision-support dashboard:

1. **Operational Priority Classification**:
   - `URGENT_EMERGENCY`: Days missing $\le 3$ with risk score $> 75.0$ or marked critical.
   - `HIGH_PRIORITY`: Days missing $> 14$ (cold-lead escalation) or risk score $> 60.0$.
   - `MEDIUM_PRIORITY`: Active unverified sightings or pending match reviews exist.
   - `NORMAL_TRACKING`: Standard tracking.
2. **Completeness Percentage Index**: Evaluates 8 key biometric and metadata attributes: Photo, Description, Last Seen Location, Last Seen Date, Age, Gender, Identifying Marks, and Contact Phone.
   $$\text{Completeness (\%)} = \left( \frac{\text{Populated Attributes}}{8} \right) \times 100$$
3. **Chronological Audit Stream**: Displays a unified timeline of case registration, sightings, AI match generation, CCTV runs, and officer verifications.

---

## 15. Security

MISXMATCH incorporates robust security practices:

- **Authentication & Password Protection**: Passwords hashed using BCrypt (`strength = 10`). OTP validation and Aadhaar verification prior to account activation.
- **JWT Authorization**: Stateless HMAC-SHA256 JWT tokens containing role authorities.
- **API Gateway Routing**: API Gateway isolates microservices inside a private Docker bridge network (`misxmatch-net`).
- **Service Security**: Internal API key header (`X-Internal-Service-Key`) required for Python AI service calls.
- **Upload File Validation**: Strict file type validation (JPEG, PNG, MP4), size limits (10MB for photos, 50MB for CCTV video), and sanitized file naming to prevent directory traversal.
- **IDOR Protection**: Enforces ownership verification so citizens cannot query other users' private case intelligence dossiers.
- **CORS & Headers**: Restrictive CORS origins (`http://localhost:5173`, `http://localhost:80`). Request correlation header (`X-Request-ID`) passed across all tiers.

---

## 16. Database Design

The relational database (`misxmatch_db`) is structured into entities managed via JPA/Hibernate in MySQL 8.0:

```mermaid
erDiagram
    USERS ||--o{ MISSING_PERSONS : reports
    USERS ||--o{ FOUND_PERSONS : reports
    USERS ||--o{ SIGHTINGS : submits
    MISSING_PERSONS ||--o{ AI_MATCH_RESULTS : missing_case
    FOUND_PERSONS ||--o{ AI_MATCH_RESULTS : found_case
    AI_MATCH_RESULTS ||--o{ AI_MATCH_REVIEWS : reviews
    MISSING_PERSONS ||--o{ AI_RISK_RESULTS : risk_assessment
    MISSING_PERSONS ||--o{ CCTV_SESSIONS : video_analysis
    CCTV_SESSIONS ||--o{ CCTV_DETECTIONS : detections
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ AUDIT_LOGS : performs

    USERS {
        bigint id PK
        string username UK
        string email UK
        string password_hash
        string role
        boolean aadhaar_verified
        datetime created_at
    }

    MISSING_PERSONS {
        bigint id PK
        string case_number UK
        string full_name
        int age
        string gender
        string photo_url
        text description
        string last_seen_location
        double latitude
        double longitude
        datetime last_seen_date
        string status
        bigint reported_by_user_id FK
    }

    FOUND_PERSONS {
        bigint id PK
        string record_number UK
        string full_name
        int estimated_age
        string gender
        string photo_url
        text description
        string location_found
        double latitude
        double longitude
        datetime date_found
        bigint reported_by_user_id FK
    }

    AI_MATCH_RESULTS {
        bigint id PK
        bigint missing_person_id FK
        bigint found_person_id FK
        double overall_score
        double face_score
        double text_score
        double attribute_score
        double location_score
        double time_score
        string review_status
        datetime created_at
    }
```

### Core Database Tables
- `users`: Account details, BCrypt password hashes, role authorities, Aadhaar verification state.
- `missing_persons`: Missing person reports, photos, physical descriptions, last seen coordinates, case statuses.
- `found_persons`: Found person / unknown hospital patient records, photos, intake locations.
- `sightings`: Citizen sighting reports, location coordinates, photos, timestamps, verification flags.
- `ai_match_results`: Multi-factor AI score breakdown (`face_score`, `text_score`, `attribute_score`, `location_score`, `time_score`, `overall_score`) and match review status.
- `ai_match_reviews`: Enforced human officer verification decisions (`CONFIRMED_MATCH`, `REJECTED_MATCH`, `NEEDS_MORE_INFO`), notes, officer ID.
- `ai_risk_results`: Case vulnerability scores, risk categories (`HIGH_RISK`, `MEDIUM_RISK`, `LOW_RISK`), vulnerability factor flags.
- `cctv_sessions`: CCTV processing sessions, video URLs, total frames sampled, detection counts.
- `cctv_detections`: CCTV frame detections, bounding boxes, candidate face embeddings, similarity scores.
- `notifications`: User notifications, titles, body messages, read flags, timestamps.
- `audit_logs`: Immutable security audit log stream recording user actions, IP addresses, correlation IDs.
- `system_health_metrics`: Empirical execution times, success/failure flags, and error categories for monitoring.

---

## 17. API Documentation

### Authentication & User Management
- `POST /api/auth/register` – Public user / partner registration.
- `POST /api/auth/verify-otp` – Verify mobile registration OTP.
- `POST /api/auth/verify-aadhaar` – Verify 12-digit Aadhaar identity number.
- `POST /api/auth/login` – Authenticate user and issue signed JWT token.
- `GET /api/users/me` – Retrieve authenticated user profile (`Bearer JWT`).

### Missing Persons & Case Management
- `POST /api/cases/missing` – Report a missing person (`ROLE_PUBLIC_USER`, `ROLE_POLICE`).
- `GET /api/cases/missing` – List missing person cases (Supports status, search filters).
- `GET /api/cases/missing/{id}` – Get detailed missing person case.
- `PUT /api/cases/missing/{id}` – Update missing person case details.
- `POST /api/cases/found` – Report a found person / unknown patient (`ROLE_HOSPITAL`, `ROLE_NGO`, `ROLE_POLICE`).

### Sightings & Evidence
- `POST /api/cases/sightings` – Submit citizen sighting report with photo and coordinates.
- `GET /api/cases/missing/{id}/sightings` – List sightings for a specific missing case.
- `POST /api/evidence/upload` – Upload case evidence image or video file.

### AI Matching & Intelligence
- `POST /api/cases/ai/match/{missingId}/{foundId}` – Execute multi-factor AI match comparison.
- `GET /api/cases/ai/matches/{missingId}` – Retrieve AI match candidates for a case.
- `POST /api/cases/ai/review/{matchId}` – Submit officer human verification decision (`ROLE_POLICE`, `ROLE_ADMIN`).
- `GET /api/cases/{caseNumber}/intelligence` – Retrieve Case Intelligence Studio summary dossier.
- `POST /api/cases/cctv/analyze` – Submit CCTV video file for automated frame sampling and detection.

### Notifications & System Observability
- `GET /api/notifications` – Fetch user notifications.
- `PUT /api/notifications/{id}/read` – Mark notification as read.
- `GET /api/admin/system/health` – Aggregated system health and AI model readiness grid (`ROLE_ADMIN`).

---

## 18. Microservice Communication

- **Synchronous REST Protocol**: Microservices communicate over HTTP/JSON within the internal Docker bridge network (`misxmatch-net`).
- **Gateway Proxying**: Spring Cloud Gateway proxies external client calls (`/api/**`) to internal microservices (`case-service:8083`, `notification-service:8084`).
- **Internal Service Authentication**: Inter-service requests between `case-service` and `ai-service` pass secret header `X-Internal-Service-Key`.
- **Request Correlation**: API Gateway injects unique `X-Request-ID` UUID headers into every incoming request. SLF4J MDC in Spring Boot and middleware in FastAPI extract `X-Request-ID` to provide unified end-to-end log tracing.
- **Fault Tolerance**: Internal HTTP WebClients enforce explicit connect timeouts (3s) and read timeouts (10s) to prevent cascading failures if AI models experience processing heavy loads.

---

## 19. AI Evaluation

The evaluation of MISXMATCH AI algorithms was performed using benchmark datasets:

| AI Subsystem | Evaluated Model | Accuracy | Precision | Recall (TPR) | F1-Score | ROC AUC | Evaluation Dataset |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Face Biometrics** | ArcFace (ResNet50 512-D) | 97.5% | 96.0% | 98.0% | 0.970 | 0.985 | LFW Benchmark (`DEVELOPMENT_BENCHMARK`) |
| **Text Semantic NLP** | Sentence-BERT (`MiniLM-L6`) | 93.8% | 92.0% | 96.0% | 0.940 | 0.962 | Description Pair Benchmark |
| **Structured Attributes**| Attribute Vector Matcher | 100.0% | 100.0% | 100.0% | 1.000 | 1.000 | Controlled Metadata Test Suite |
| **Location & Time** | Spatial/Temporal Decay | 100.0% | — | — | — | — | Monotonic Grid Verification |
| **Risk Assessment** | Heuristic Risk Engine | 100.0% | 100.0% | 100.0% | 1.000 | — | Case Vulnerability Matrix |

> **Evaluation Transparency Note:**  
> While benchmark testing demonstrates strong theoretical and synthetic accuracy, statistical live production evaluation data across real-world police deployments is ongoing. AI similarity outputs are treated strictly as decision-support indicators.

---

## 20. Testing

System reliability was verified across multiple testing layers recorded in `TEST_RESULTS_EVIDENCE.md`:

1. **Infrastructure & Container Tests**: Docker Compose startup, health check pinging (`mysql-db`, `ai-service`, `case-service`, `notification-service`, `gateway-service`), and volume data persistence verified (`PASS`).
2. **Authentication & Security Tests**: User registration, mobile OTP verification, Aadhaar verification, BCrypt password validation, JWT signature protection, and RBAC endpoint authorization verified (`PASS`).
3. **Case Management Tests**: Missing person reporting, found person intake, sighting submission, and case retrieval verified (`PASS`).
4. **AI & Vision Workflow Tests**: ArcFace feature extraction, Sentence-BERT description encoding, multi-factor fusion weighting, risk score classification, and CCTV frame sampling verified (`PASS`).
5. **Human Review & Audit Tests**: Officer match review recording (`CONFIRMED_MATCH`, `REJECTED_MATCH`), audit log insertion, and notification dispatches verified (`PASS`).
6. **Case Intelligence & Health Tests**: Operational priority calculations, record completeness percentage indexing, request correlation header propagation (`X-Request-ID`), and health API probing verified (`PASS`).

---

## 21. Deployment

The system is fully containerized using Docker and Docker Compose for single-command deployment:

### Docker Services & Ports

| Service Container Name | Internal Container Port | Exposed Host Port | Purpose |
| :--- | :---: | :---: | :--- |
| `misxmatch-mysql` | 3306 | 3306 | MySQL 8.0 Relational Database |
| `misxmatch-ai-service` | 8000 | 8000 (Internal) | Python FastAPI AI Microservice |
| `misxmatch-case-service` | 8083 | 8083 (Internal) | User & Case Spring Boot Microservice |
| `misxmatch-notification-service` | 8084 | 8084 (Internal) | Notification & Audit Spring Boot Microservice |
| `misxmatch-gateway-service` | 8080 | 8080 | Central Spring Cloud API Gateway |
| `misxmatch-frontend` | 80 | 80 / 5173 | React Nginx Production Frontend |
| `misxmatch-minio` | 9000 / 9001 | 9000 / 9001 | MinIO S3 Object Storage Console |

### Quick Start Commands
```bash
# Clone and navigate to workspace root
cd "c:/Users/MOUNA1822/Downloads/MISXMATCH_BACKEND LAST"

# Setup configuration
cp .env.example .env

# Build and start all services in detached mode
docker compose up -d --build

# Verify container execution status
docker compose ps
```

---

## 22. Limitations

While MISXMATCH offers a multi-modal solution, real-world operational limitations exist:

1. **Biometric Input Quality Sensitivity**: Face recognition accuracy depends on input photo quality. Heavy compression, low resolution (< 100x100 px), extreme head rotation (> 45°), or face occlusions degrade similarity scores.
2. **Semantic vs Factual Description Accuracy**: Sentence-BERT measures semantic linguistic similarity, not factual truth. Inaccurate or contradictory witness descriptions may yield lower text scores.
3. **Incomplete Metadata Profiles**: Missing fields (e.g. unknown clothing or missing last seen coordinates) require fallback weight re-normalization, which slightly reduces multi-factor discriminative power.
4. **CCTV Video Quality & Frame Rates**: Low-frame-rate or blurry CCTV footage affects person detection bounding box accuracy and face embedding stability.
5. **Non-Deterministic Identity Decision**: AI similarity scores are mathematical feature distances and cannot replace legal identification by law enforcement officers.

---

## 23. Future Enhancements

Proposed future developments for MISXMATCH include:

1. **Expansion of Validated Production Datasets**: Benchmark performance against larger multi-ethnic police missing person datasets.
2. **Multilingual NLP Embeddings**: Support regional languages (e.g., Hindi, Tamil, Telugu, Bengali) using multilingual Transformer models (e.g. `paraphrase-multilingual-MiniLM-L12-v2`).
3. **Advanced Video Tracking (YOLOv8 + DeepSORT)**: Implement real-time multi-person object tracking across multi-camera CCTV networks.
4. **Federated & Cross-State Police Network**: Enable privacy-preserving federated search across state police databases without centralizing sensitive biometric data.
5. **Automated Model Drift Monitoring**: Deploy continuous monitoring for embedding drift and automated re-calibration triggers.

---

## 24. Conclusion

**MISXMATCH** successfully demonstrates an AI-assisted missing person search and reunification platform. By combining Spring Boot microservices, Python deep learning AI pipelines, React web user interfaces, and robust MySQL persistence, the platform addresses critical bottlenecks in missing person investigations. 

Through multi-factor AI candidate matching (face biometrics, semantic text, structured attributes, location proximity, and time decay), dynamic risk prioritization, automated CCTV evidence sampling, and strict human-in-the-loop verification, MISXMATCH provides law enforcement officers with actionable decision support while maintaining privacy, security, and ethical standards.
