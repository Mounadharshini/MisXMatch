# Step 19 — Real AI / Microservice Monitoring, Health Checks & Failure Tracking

## 1. Overview & Architecture

The **MISXMATCH Monitoring & Observability Architecture** provides real-time health checks, dependency probes, processing performance metrics, and error classification across all distributed microservices without relying on synthetic or fake data.

### Distributed Monitoring Architecture Diagram

```text
  React Web Client (System Analytics UI)
                    │
                    ▼
     GET /api/admin/system/health
                    │
                    ▼
   API Gateway (Request correlation header: X-Request-ID)
                    │
                    ▼
  Spring Boot User & Case Service (SystemHealthController)
                    │
        ┌───────────┼───────────┬───────────┐
        │           │           │           │
        ▼           ▼           ▼           ▼
     MySQL      Python AI  Notification  Gateway
    Database     Service     Service     Probing
  (SELECT 1)    (/health)   (/health)    (/health)
```

---

## 2. Microservice Health Endpoints

| Microservice | Health Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `GET /health` | Public | Status check (`UP` / `DEGRADED` / `DOWN`) |
| **Notification Service** | `GET /api/notifications/health` | Public / Internal | Service and MySQL database connection status |
| **Python AI Microservice** | `GET /health` | Internal / Public | Returns status, version, and model readiness map (`face`, `text`, `cctv`, `attribute`, `location`, `time`) |
| **User & Case Service** | `GET /health` | Public | Lightweight status check |
| **Aggregated System Health** | `GET /api/admin/system/health` | **ADMIN Role Only** | Detailed multi-service grid, model states, and AI metrics summary |

---

## 3. Python AI Microservice Model Readiness Response

The Python AI service exposes actual model initialization states via `GET /health`:

```json
{
  "status": "UP",
  "service": "ai-service",
  "version": "1.0.0",
  "models": {
    "face": "READY",
    "text": "READY",
    "cctv": "READY",
    "attribute": "READY",
    "location": "READY",
    "time": "READY"
  }
}
```

If a specific model fails to initialize, it is marked `"UNAVAILABLE"` and overall status switches to `"DEGRADED"`.

---

## 4. Empirical AI Metrics & Failure Tracking

Real AI operation execution times, success/failure flags, and error categories are persisted in MySQL (`system_health_metrics` table) and tracked in memory:

### Tracked AI Feature Categories
1. `FACE_MATCH`
2. `TEXT_MATCH`
3. `ATTRIBUTE_MATCH`
4. `LOCATION_MATCH`
5. `TIME_MATCH`
6. `MULTI_MATCH`
7. `RISK_SCORE`
8. `CCTV_ANALYSIS`

### Real Failure Categories
* `AI_SERVICE_UNAVAILABLE`
* `AI_TIMEOUT`
* `INVALID_IMAGE`
* `NO_FACE_DETECTED`
* `INVALID_TEXT`
* `MODEL_ERROR`
* `INVALID_LOCATION`
* `INVALID_TIMESTAMP`
* `CCTV_PROCESSING_ERROR`

---

## 5. Request Correlation ID Tracing (`X-Request-ID`)

Every incoming HTTP request is tagged with a unique correlation identifier:
- **API Gateway**: `RequestLoggingFilter.java` checks for `X-Request-ID` or generates a UUID (`req-xxxxxxxxxxxx`).
- **Spring Boot**: `CorrelationIdFilter.java` puts `X-Request-ID` into SLF4J `MDC.put("requestId", correlationId)`.
- **Python AI**: `app/main.py` middleware extracts `X-Request-ID` and returns it in response headers.

This allows tracing a request end-to-end across `React` $\rightarrow$ `Gateway` $\rightarrow$ `Spring Boot` $\rightarrow$ `Python AI` $\rightarrow$ `MySQL`.

---

## 6. Security & Data Protection Policies

1. **RBAC Restriction**: Detailed system health (`GET /api/admin/system/health`) requires `ADMIN` or `SUPER_ADMIN` authority. Public endpoints expose only minimal status (`UP` / `DOWN`).
2. **Sanitized Logging**: Loggers strictly prohibit logging sensitive data (passwords, JWT tokens, Aadhaar numbers, API keys, database connection credentials, raw CCTV frames, or biometric face vectors).
3. **Clean Exception Responses**: User-facing responses return structured JSON messages (`"AI analysis temporarily unavailable. Please try again later."`) without exposing stack traces or internal exception details.

---

## 7. Verification & Automated Test Suite

- **Unit Test Class**: `com.misxmatch.casesvc.service.SystemMonitoringWorkflowTest`
- **Execution Command**:
  ```bash
  mvn test -Dtest=SystemMonitoringWorkflowTest
  ```
- **Vite Frontend Build**:
  ```bash
  npm run build
  ```
