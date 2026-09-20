# Step 18 — AI Case Intelligence & Decision-Support System

## 1. Executive Summary & Architectural Overview

The **MISXMATCH AI Case Intelligence Studio** introduces a real-time operational decision-support layer for law enforcement officers, administrators, and authorized stakeholders. It synthesizes multi-modal intelligence stored within MySQL without re-executing computationally expensive Python AI pipelines during page load.

### Core Architectural Flow

```text
React AI Case Intelligence Studio
               │
               ▼
    GET /api/cases/{caseNumber}/intelligence
               │
               ▼
  CaseIntelligenceController (RBAC & IDOR Enforcement)
               │
               ▼
  CaseIntelligenceServiceImpl (Java Spring Boot)
   ├── 1. Fetch MissingPerson & Days Missing Calculation
   ├── 2. Calculate Completeness % (8 Data Attributes)
   ├── 3. Retrieve Latest Risk Score & Category (AiRiskResultRepository)
   ├── 4. Retrieve Sightings & CCTV Detections (SightingRepository & CctvRepository)
   ├── 5. Extract Top AI Candidate Matches & Factor Breakdown (AiMatchResultRepository)
   ├── 6. Build Chronological Investigation Audit Stream
   └── 7. Compute Operational Priority & Generate Pending Action Checklist
               │
               ▼
  MySQL Database (Persistent Ledger)
```

---

## 2. Key Intelligence Components & Rules

### A. Operational Priority Classification Engine
The system dynamically computes operational case priority based on multi-factor risk logic:
* **`URGENT_EMERGENCY`**: Days missing $\le 3$ with risk score $> 75.0$ OR case marked as High/Critical.
* **`HIGH_PRIORITY`**: Days missing $> 14$ (cold-lead escalation) OR risk score $> 60.0$.
* **`MEDIUM_PRIORITY`**: Active unverified citizen sightings or pending AI match reviews exist.
* **`NORMAL_TRACKING`**: Standard operational tracking.

### B. Case Record Completeness Index
Evaluates 8 key attributes required for optimal AI biometric matching:
1. `Photo URL`
2. `Detailed Description`
3. `Last Seen Location`
4. `Last Seen Date`
5. `Age`
6. `Gender`
7. `Identifying Scars/Marks`
8. `Contact Phone Number`

$$\text{Completeness Index (\%)} = \left( \frac{\text{Populated Attributes}}{8} \right) \times 100$$

### C. Explainable AI Top Candidates & Factor Weight Rationale
Provides law enforcement officers with transparent factor breakdowns for candidate matches:
* **Facial Similarity** (ArcFace 512-d Deep Feature Embeddings)
* **Text Semantic Similarity** (Sentence-BERT / SciBERT Embeddings)
* **Attribute Match** (Structured Metadata Cosine Match)
* **Geospatial Location Relevance** (Haversine Proximity Penalty)
* **Time Relevance** (Temporal Decay Curve)

### D. Chronological Investigation Audit Stream
Consolidates all historical case events into a single unified stream:
* Case Registration
* Citizen Sightings Reported
* AI Multi-Factor Matches Generated
* AI Risk Priority Scores Computed
* CCTV Video Analysis Executed
* Officer Verification Reviews Recorded

---

## 3. Mandatory AI Decision-Support Disclaimer Protocol

> **OFFICIAL PROTOCOL STATEMENT:**  
> **"AI Decision-Support System: Candidate suggestions require officer field verification before legal identification."**

The system strictly enforces that AI scores remain decision-support suggestions. Automated legal identification is forbidden.

---

## 4. RBAC & IDOR Security Controls

Access to case intelligence endpoints is secured via Spring Security and IDOR protection:

| User Role | Access Level | Authorization Rule |
| :--- | :--- | :--- |
| `POLICE` | Full Access | All active missing person intelligence dossiers |
| `ADMIN` | Full Access | Complete system-wide case intelligence |
| `HOSPITAL` | Read Access | Case intelligence for patient cross-referencing |
| `NGO` | Read Access | Case intelligence for care center intake |
| `PUBLIC_USER` | Restricted | Only cases where `reportedBy == current_username` |

Attempting to access another user's restricted case intelligence results in an immediate `403 Forbidden` (`AccessDeniedException`) log entry.

---

## 5. Verification & Automated Test Suite

The intelligence module was validated with zero failures using JUnit 5 and Mockito:

* **Test Class**: `com.misxmatch.casesvc.service.CaseIntelligenceWorkflowTest`
* **Coverage**:
  1. Priority calculation (`URGENT_EMERGENCY`, `HIGH_PRIORITY`, `MEDIUM_PRIORITY`).
  2. Completeness percentage index calculation & missing fields detection.
  3. IDOR security enforcement for non-owner `PUBLIC_USER` roles.

```bash
# Command to execute unit test suite
mvn test -Dtest=CaseIntelligenceWorkflowTest
# Output: Tests run: 3, Failures: 0, Errors: 0, Skipped: 0 - BUILD SUCCESS
```
