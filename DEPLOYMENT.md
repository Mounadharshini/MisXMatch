# MISXMATCH Platform — Production & Container Deployment Guide

This document provides step-by-step instructions for containerizing, configuring, building, running, and troubleshooting the **MISXMATCH Platform** using **Docker & Docker Compose**.

---

## 1. System Architecture & Container Topology

```text
                           ┌─────────────────────────────────┐
                           │      React Web Client (Vite)    │
                           │   Container: misxmatch-frontend │
                           │       Ports: 80, 5173           │
                           └────────────────┬────────────────┘
                                            │ HTTP /api/
                                            ▼
                           ┌─────────────────────────────────┐
                           │   Central API Gateway (Spring)  │
                           │ Container: misxmatch-gateway-svc│
                           │           Port: 8080            │
                           └────────────────┬────────────────┘
                                            │ (Docker Network: misxmatch-net)
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐ ┌─────────────────────────────┐
│  User & Case Service (Java) │ │ Notification Service (Java) │ │ Python FastAPI AI Service   │
│Container: misxmatch-case-svc│ │Container: misxmatch-notif-svc│ │Container: misxmatch-ai-svc  │
│         Port: 8083          │ │         Port: 8084          │ │         Port: 8000          │
└──────────────┬──────────────┘ └──────────────┬──────────────┘ └─────────────────────────────┘
               │                               │
               └───────────────┬───────────────┘
                               ▼
               ┌─────────────────────────────┐
               │    MySQL 8.0 Relational DB  │
               │  Container: misxmatch-mysql │
               │         Port: 3306          │
               │   Volume: mysql_data        │
               └─────────────────────────────┘
```

---

## 2. Prerequisites

Ensure the following tools are installed on your host machine:

* **Docker Engine**: Version 20.10.0+
* **Docker Compose**: Version 2.0.0+ (or `docker-compose` CLI v1.29+)
* **Git**: Version 2.30+

---

## 3. Environment Configuration

1. **Clone the Repository & Navigate to Workspace Root**:
   ```bash
   cd "c:/Users/MOUNA1822/Downloads/MISXMATCH_BACKEND LAST"
   ```

2. **Generate `.env` Configuration File**:
   Copy `.env.example` to `.env` and fill in custom production secrets:
   ```bash
   cp .env.example .env
   ```

3. **Key Environment Variables**:

   | Variable Name | Default Value | Description |
   | :--- | :--- | :--- |
   | `MYSQL_ROOT_PASSWORD` | `root` | MySQL root database password |
   | `MYSQL_DATABASE` | `misxmatch_db` | Main database schema name |
   | `AI_SERVICE_KEY` | `misxmatch-internal-ai-service-secret-key-2026` | Internal service-to-service auth key |
   | `JWT_SECRET` | `misxmatch-super-secret-signing-key-change-in-prod-2026-01` | HMAC-SHA signing key for JWT tokens |
   | `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:80` | Allowed origins for React web app |
   | `VITE_API_BASE_URL` | `http://localhost:8080/api` | API Gateway endpoint |

---

## 4. Build & Deployment Commands

### A. Start All Microservices (Full Build)
Build container images and launch all services in detached mode:
```bash
docker compose up -d --build
```

### B. Verify Running Containers
Check container execution status:
```bash
docker compose ps
```

Expected Output:
```text
NAME                           STATUS                  PORTS
misxmatch-mysql                Up (healthy)            0.0.0.0:3306->3306/tcp
misxmatch-ai-service           Up (healthy)            8000/tcp
misxmatch-case-service         Up                      8083/tcp
misxmatch-notification-service Up                      8084/tcp
misxmatch-gateway-service      Up                      0.0.0.0:8080->8080/tcp
misxmatch-frontend             Up                      0.0.0.0:80->80/tcp, 0.0.0.0:5173->5173/tcp
```

### C. Stop All Services
Stop containers without deleting persistent volume data:
```bash
docker compose down
```

---

## 5. Microservice Log Inspection

View real-time correlated logs for specific microservices:

* **API Gateway Logs**:
  ```bash
  docker compose logs -f gateway-service
  ```
* **User & Case Service Logs**:
  ```bash
  docker compose logs -f case-service
  ```
* **Notification Service Logs**:
  ```bash
  docker compose logs -f notification-service
  ```
* **Python AI Microservice Logs**:
  ```bash
  docker compose logs -f ai-service
  ```
* **MySQL Database Logs**:
  ```bash
  docker compose logs -f mysql-db
  ```

---

## 6. Restarting Individual Microservices

To rebuild and restart a single modified service (e.g. after code changes in `ai-service`):
```bash
docker compose restart ai-service
```
Or force a single service rebuild:
```bash
docker compose up -d --build ai-service
```

---

## 7. Data & Storage Persistence

All persistent data survives container restarts and upgrades via named Docker volumes:

1. **`mysql_data`**: Persists relational database schemas, users, cases, sightings, AI match results, and evaluation metrics (`/var/lib/mysql`).
2. **`case_uploads`**: Persists uploaded evidence files, missing person photos, and CCTV video evidence (`/app/uploads_storage`).
3. **`minio_data`**: Persists S3 object storage attachments (`/data`).

To reset the database cleanly (Caution: deletes data):
```bash
docker compose down -v
```

---

## 8. Microservice Health Checks

Probing system health across internal services:

* **Aggregated Admin System Health**:
  ```bash
  curl -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" http://localhost:8080/api/admin/system/health
  ```
* **Python AI Microservice Direct Health Check**:
  ```bash
  curl http://localhost:8000/health
  ```

---

## 9. Troubleshooting Guide

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **`mysql-db` container stuck starting** | Database initialization in progress | `mysql-db` includes a health check (`mysqladmin ping`). Downstream services wait automatically until it is `healthy`. |
| **Python AI `UNAVAILABLE`** | Missing Python C-libraries | Ensure `Dockerfile` includes `libgl1`, `libglib2.0-0`, and `build-essential`. |
| **`Connection Refused` on Gateway** | Downstream service starting | Spring Cloud Gateway retries connections once `case-service` finishes initialization. |
| **Port 8080 / 3306 Conflict** | Local MySQL or Java process running | Stop host-level MySQL/Java services: `net stop MySQL` / `taskkill /F /IM java.exe`. |
| **High Memory Usage during CCTV run** | Heavy video decoding | Increase Docker Desktop allocated RAM to at least 4GB under Docker Settings $\rightarrow$ Resources. |
