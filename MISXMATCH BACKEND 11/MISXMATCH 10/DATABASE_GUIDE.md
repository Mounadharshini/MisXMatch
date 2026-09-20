# 🗄️ MISXMATCH — Complete Database Architecture & Setup Guide

This guide details the database architecture for the **MISXMATCH** AI-Based Missing Person Search & Reunification Platform. The platform exclusively uses **MySQL 8.0** with strict **Database-per-Service Isolation**.

---

## 📌 1. Primary Database: MySQL 8.0

| Feature | Specification |
| :--- | :--- |
| **Database Engine** | **MySQL 8.0** |
| **Driver Class** | `com.mysql.cj.jdbc.Driver` |
| **Default Port** | `3306` |
| **Charset / Collation** | `utf8mb4` / `utf8mb4_unicode_ci` |
| **ORM / Data Layer** | Spring Data JPA + Hibernate ORM |
| **Schema Generation** | `hibernate.ddl-auto: update` (Auto-creates all tables & relationships) |

---

## 🏗️ 2. Database-Per-Service Architecture

Each microservice manages its own dedicated MySQL database schema. Services do not share tables directly:

```
                  ┌─────────────────────────────────┐
                  │      Spring Cloud Gateway       │
                  │           (Port 8080)           │
                  └───────────────┬─────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   auth-service   │    │   case-service   │    │ notification-svc │
│   (Port 8081)    │    │   (Port 8083)    │    │   (Port 8084)    │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│     auth_db      │    │     case_db      │    │ notification_db  │
│ (Users, Aadhaar, │    │ (Missing/Found,  │    │  (Notifications, │
│   Orgs, OTPs)    │    │ Sightings, CCTV) │    │   Audit Logs)    │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## 📊 3. Schema & Entity Mapping

### 🔐 `auth_db` (Auth & User Management)
- **`users`**: User accounts, passwords, roles (`SUPER_ADMIN`, `POLICE`, `VOLUNTEER`, `PUBLIC`, `NGO`, `HOSPITAL`, `SHELTER_HOME`).
- **`profiles`**: User metadata, avatar URLs, contact addresses, phone numbers.
- **`organizations`**: Verification status for NGOs, Hospitals, and Shelter Homes.
- **`aadhaar`**: Identity verification hashes and KYC status.
- **`refresh_tokens`**: Persistent JWT session tokens.
- **`mobile_otps` & `password_reset_otps`**: OTP verification codes, timestamps, and attempt counts.

### 📋 `case_db` (Case Investigation & AI Match)
- **`missing_persons`**: Registered missing person cases, physical description, last known location, photo URLs, status (`OPEN`, `UNDER_INVESTIGATION`, `RESOLVED`, `CLOSED`).
- **`found_persons`**: Found individuals reported by hospitals, shelter homes, police, or public.
- **`sightings`**: Public crowd-sourced sightings with GPS location, photo, and timestamps.
- **`ai_matches`**: Biometric & textual similarity scores connecting missing reports to sightings or found individuals.
- **`cctv_cameras`**: Registered CCTV feeds, streams, and geolocations for continuous scanning.
- **`uploaded_files`**: Metadata of uploaded case evidence files and photos.

### 🔔 `notification_db` (Real-Time Alerts & System Audits)
- **`notifications`**: Targeted alerts for users, police officers, and admins.
- **`audit_logs`**: Immutable security audit ledger recording cross-service write operations (user registration, logins, admin approvals/rejections, missing/found case creation, status updates, AI match reviews, and evidence uploads).

---

## 🚀 4. How to Run MySQL

### Option A: Using Docker (1 Command)
Run MySQL container with automatic database initialization:
```bash
docker-compose up -d mysql
```
*MySQL starts on port `3306` with `root`/`root` and runs `mysql-init/init.sql`.*

To run the complete platform (MySQL + all microservices):
```bash
docker-compose up --build
```

---

### Option B: Using Local MySQL Server
1. Ensure your local MySQL Server is running on port `3306`.
2. Connect to MySQL (e.g. MySQL Workbench, DBeaver, or CLI) and run:
   ```sql
   CREATE DATABASE IF NOT EXISTS auth_db CHARACTER SET utf8mb4;
   CREATE DATABASE IF NOT EXISTS case_db CHARACTER SET utf8mb4;
   CREATE DATABASE IF NOT EXISTS notification_db CHARACTER SET utf8mb4;
   ```
3. Set your MySQL credentials in `.env` (or pass via environment variables):
   ```properties
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   ```
4. Start each service:
   ```bash
   mvn -pl auth-service spring-boot:run
   mvn -pl case-service spring-boot:run
   mvn -pl notification-service spring-boot:run
   mvn -pl gateway-service spring-boot:run
   ```
