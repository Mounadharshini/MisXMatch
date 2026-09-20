# MISXMATCH Platform — Complete Postman API Guide & Workflow Documentation

Welcome to the **MISXMATCH** production-ready REST API documentation. This platform uses an **API Gateway (Port 8080)** fronting **3 specialized microservices** with dedicated MySQL schemas:

- **API Gateway**: `http://localhost:8080/api` (Central entry point for all requests)
- **Auth & Identity Service**: `http://localhost:8081` (Port 8081 direct / `/api/auth/**`, `/api/users/**`, `/api/admin/**`)
- **Case Management & AI Vision Service**: `http://localhost:8083` (Port 8083 direct / `/api/cases/**`)
- **Notification & Audit Service**: `http://localhost:8084` (Port 8084 direct / `/api/notifications/**`, `/api/dashboard/**`)

---

## 🚀 1. Quick Import into Postman

1. Open Postman.
2. Click **Import** (Top left corner).
3. Drag & drop the two files located in your project root:
   - `MISXMATCH_API_Collection.postman_collection.json`
   - `MISXMATCH_Local_Environment.postman_environment.json`
4. In the top-right environment selector in Postman, choose **MISXMATCH Local Environment**.

---

## 🔑 2. Pre-Seeded Default Accounts & Credentials

The platform automatically seeds full production-grade test accounts with pre-configured profiles, verified Aadhaar eKYC, and registered organizations on first boot:

| Role | User ID (`userId`) | Password | Full Name / Organization | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `admin` | Chief Platform Administrator | Full System & Admin Management |
| **Police Officer** | `police_officer` | `police123` | Inspector Rajesh Sharma (Delhi Police) | Case Status, AI Matches, Sightings |
| **Hospital Staff** | `hospital_staff` | `hospital123` | Dr. Priya Nair (AIIMS Trauma Centre) | Register Unknown Patients, AI Matches |
| **NGO Coordinator** | `ngo_coordinator` | `ngo123` | Sunita Rao (Bachpan Bachao Andolan) | Transit Care Intake, AI Screenings |
| **Shelter Manager** | `shelter_manager` | `shelter123` | Anil Kumar (Sneha Sadan Care Home) | Shelter Resident Intake, Reunifications |
| **Public Citizen** | `john_citizen` | `citizen123` | John Doe Citizen (New Delhi) | Report Missing, Submit Sightings |

---

## ⚡ 3. Automatic JWT Authentication in Postman

Every request in the collection is pre-configured with **Bearer Token Inheritance** (`{{authToken}}`).

1. Execute **`01. Authentication & OTP` ➔ `Login as Super Admin`** (or **`Login as Police Officer`**).
2. The Postman **Test Script** automatically captures the returned `accessToken` and sets `{{authToken}}` in your active collection/environment.
3. Every subsequent API call across all folders is immediately authenticated.

---

## 📋 4. Full API Directory (50+ Endpoints)

### `01. Authentication & OTP`

| Endpoint | Method | Path | Description | Access |
| :--- | :--- | :--- | :--- | :--- |
| **Login** | `POST` | `/api/auth/login` | Authenticate user credentials & receive JWT token pair | Public |
| **Register** | `POST` | `/api/auth/register` | Register new Citizen, Police, Hospital, NGO, or Shelter user | Public |
| **Send OTP** | `POST` | `/api/auth/send-otp` | Generate and dispatch a 6-digit verification OTP | Public |
| **Verify OTP** | `POST` | `/api/auth/verify-otp` | Verify mobile number using 6-digit OTP code | Public |
| **Resend OTP** | `POST` | `/api/auth/resend-otp` | Resend fresh OTP (subject to 60s cooldown) | Public |
| **Refresh Token** | `POST` | `/api/auth/refresh` | Exchange refresh token for fresh JWT access token | Public |
| **Forgot Password**| `POST` | `/api/auth/forgot-password` | Request password reset token by registered email | Public |
| **Reset Password** | `POST` | `/api/auth/reset-password` | Reset password using reset token | Public |
| **Logout** | `POST` | `/api/auth/logout` | Invalidate and revoke refresh token | Authenticated |

---

### `02. Super Admin & Platform Administration`

| Endpoint | Method | Path | Description | Access |
| :--- | :--- | :--- | :--- | :--- |
| **User Role Counts** | `GET` | `/api/auth/admin/stats` | Get count of registered users categorized by role | Admin / Super Admin |
| **List Admins** | `GET` | `/api/auth/super-admin/admins` | List all secondary administrator accounts | Super Admin |
| **Create Admin** | `POST` | `/api/auth/super-admin/create-admin` | Create new secondary administrator account | Super Admin |
| **Reset Admin Pwd** | `POST` | `/api/auth/super-admin/admin/{id}/reset-password` | Generate temporary password for administrator | Super Admin |
| **Delete Admin** | `DELETE` | `/api/auth/super-admin/admin/{id}` | Remove administrator privileges and delete admin | Super Admin |
| **List All Users** | `GET` | `/api/admin/users` | List all platform users with KYC and active status | Admin / Super Admin |
| **Toggle Status** | `PUT` | `/api/admin/users/{id}/status` | Suspend or reactivate user account access | Admin / Super Admin |

---

### `03. User Profiles & Aadhaar eKYC`

| Endpoint | Method | Path | Description | Access |
| :--- | :--- | :--- | :--- | :--- |
| **Get My Profile** | `GET` | `/api/users/profile` | Get authenticated user's profile | Authenticated |
| **Update Profile** | `PUT` | `/api/users/profile` | Update contact, address, and profile photo | Authenticated |
| **Get User by ID** | `GET` | `/api/users/{id}` | Retrieve profile of specific user | Police / Admin |
| **Verify Aadhaar** | `POST` | `/api/aadhaar/verify` | Submit 12-digit Aadhaar for SHA-256 eKYC verification | Authenticated |

---

### `04. Organization Management`

| Endpoint | Method | Path | Description | Access |
| :--- | :--- | :--- | :--- | :--- |
| **Submit Org Details** | `POST` | `/api/users/organization` | Submit institutional details (Police/Hospital/NGO) | Authenticated |
| **Get My Org** | `GET` | `/api/users/organization` | Get status of submitted organization review | Authenticated |
| **Pending Reviews** | `GET` | `/api/admin/organizations/pending` | List all organizations awaiting verification | Admin |
| **Approve Org** | `POST` | `/api/admin/organizations/{id}/approve` | Approve institutional account credentials | Admin |
| **Reject Org** | `POST` | `/api/admin/organizations/{id}/reject` | Reject institutional submission | Admin |

---

### `05. Missing Person Case Management`

| Endpoint | Method | Path | Description | Access |
| :--- | :--- | :--- | :--- | :--- |
| **Report Missing** | `POST` | `/api/cases/missing` | File new missing person case | Authenticated |
| **List All Missing** | `GET` | `/api/cases/missing` | List all public missing person cases | Public |
| **Filter by Reporter**| `GET` | `/api/cases/missing?reportedBy={id}` | List cases reported by specific user | Public |
| **Get Case by ID** | `GET` | `/api/cases/missing/{id}` | Get detailed missing case record by numeric ID | Public |
| **Update Case** | `PUT` | `/api/cases/missing/{id}` | Update missing person details and attributes | Case Reporter / Police |
| **Update Status** | `PUT` | `/api/cases/missing/{id}/status` | Change case status (`UNDER_INVESTIGATION`, `REUNITED`, `CLOSED`) | Police / Admin |
| **Case Status** | `GET` | `/api/cases/status/{caseNumber}` | Check investigation status by case number | Public |
| **Platform Stats** | `GET` | `/api/cases/stats` | Aggregated case, resolution, and camera statistics | Public |
| **Delete Case** | `DELETE` | `/api/cases/missing/{id}` | Remove missing person case | Police / Admin |

---

### `06. Found Person Reports (Hospital / Shelter / NGO / General)`

| Endpoint | Method | Path | Description | Access |
| :--- | :--- | :--- | :--- | :--- |
| **Report Found** | `POST` | `/api/cases/found` | Report found individual with category & metadata | Public / Stakeholder |
| **List All Found** | `GET` | `/api/cases/found` | List all found person reports | Public |
| **Hospital Intake** | `GET` | `/api/cases/found?category=HOSPITAL` | Filter unidentified hospital trauma patients | Hospital / Police |
| **Shelter Residents** | `GET` | `/api/cases/found?category=SHELTER` | Filter shelter intake residents | Shelter / Police |
| **NGO Intakes** | `GET` | `/api/cases/found?category=NGO` | Filter NGO transit care cases | NGO / Police |
| **General Found** | `GET` | `/api/cases/found?category=GENERAL` | Filter citizen-reported found individuals | Public |

---

### `07. Sighting Reports`

| Endpoint | Method | Path | Description | Access |
| :--- | :--- | :--- | :--- | :--- |
| **Submit Sighting** | `POST` | `/api/cases/sighting` | Report citizen sighting of a missing person | Public / Anonymous |
| **List Sightings** | `GET` | `/api/cases/sightings` | List all submitted sightings across cases | Police / Admin |
| **Verify Sighting** | `PUT` | `/api/cases/sightings/{id}/verify` | Mark sighting as verified credible lead | Police / Admin |
| **Dismiss Sighting**| `DELETE` | `/api/cases/sightings/{id}` | Dismiss inaccurate or duplicate sighting | Police / Admin |

---

### `08. AI Matching & CCTV Surveillance`

| Endpoint | Method | Path | Description | Access |
| :--- | :--- | :--- | :--- | :--- |
| **AI Image Match** | `POST` | `/api/cases/match/image` | Multi-attribute image & facial similarity matching | Authenticated |
| **AI Text Match** | `POST` | `/api/cases/match/text` | NLP description, clothing & physical attribute match | Authenticated |
| **List AI Matches** | `GET` | `/api/cases/matches` | View all persisted high-confidence AI match records | Police / Admin |
| **List CCTV Cameras**| `GET` | `/api/cases/cctv/cameras` | List connected transit surveillance camera nodes | Public / Stakeholder |
| **CCTV Frame Scan** | `POST` | `/api/cases/cctv/scan` | Trigger real-time AI scan on CCTV camera frame | Authenticated |

---

### `09. Case Evidence & Attachments`

| Endpoint | Method | Path | Description | Access |
| :--- | :--- | :--- | :--- | :--- |
| **Upload Evidence** | `POST` | `/api/cases/evidence` | Attach photo, CCTV video or document to a case | Police / Admin |
| **List All Evidence**| `GET` | `/api/cases/evidence` | List all evidence records across cases | Police / Admin |
| **Evidence by Case** | `GET` | `/api/cases/evidence/case/{caseNumber}` | List attachments for a specific case | Public / Stakeholder |
| **Delete Evidence** | `DELETE` | `/api/cases/evidence/{id}` | Delete evidence record | Police / Admin |

---

### `10. Notifications`

| Endpoint | Method | Path | Description | Access |
| :--- | :--- | :--- | :--- | :--- |
| **List My Alerts** | `GET` | `/api/notifications` | Get notifications for authenticated user | Authenticated |
| **Send Notification**| `POST` | `/api/notifications` | Dispatch notification to recipient user | Authenticated |
| **Mark as Read** | `PUT` | `/api/notifications/{id}` | Mark notification as read | Authenticated |
| **Delete Alert** | `DELETE` | `/api/notifications/{id}` | Delete notification | Authenticated |

---

### `11. Role-Based Dashboards & Analytics`

| Endpoint | Method | Path | Description | Access |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Dashboard** | `GET` | `/api/dashboard/admin` | Platform health, pending orgs, total audits | Admin |
| **Police Dashboard** | `GET` | `/api/dashboard/police` | Active cases, verified sightings, high-confidence AI matches | Police |
| **Public Dashboard** | `GET` | `/api/dashboard/public` | Community reports, verified sightings, active cases | Public |
| **Hospital Dashboard**| `GET` | `/api/dashboard/hospital` | Unidentified patient statistics and admissions | Hospital |
| **NGO Dashboard** | `GET` | `/api/dashboard/ngo` | Shelter intakes, transit care statistics | NGO / Shelter |

---

### `12. Immutable Audit Logs`

| Endpoint | Method | Path | Description | Access |
| :--- | :--- | :--- | :--- | :--- |
| **List Audit Trail**| `GET` | `/api/notifications/audit-logs` | Tamper-proof platform audit history | Admin / Super Admin |

---

## 🛠 5. Example cURL Commands

### 1. Login as Super Admin
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "admin", "password": "admin"}'
```

### 2. Run Intelligent AI Image Match
```bash
curl -X POST http://localhost:8080/api/cases/match/image \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "missingCaseNumber": "MP-20260001",
    "imageUrl": "https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400"
  }'
```

### 3. Scan CCTV Camera Feed
```bash
curl -X POST http://localhost:8080/api/cases/cctv/scan \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "cameraCode": "CAM-401",
    "frameImageUrl": "https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400",
    "missingCaseNumber": "MP-20260001"
  }'
```

### 4. Fetch Live Aggregated Platform Statistics
```bash
curl -X GET http://localhost:8080/api/cases/stats
```
