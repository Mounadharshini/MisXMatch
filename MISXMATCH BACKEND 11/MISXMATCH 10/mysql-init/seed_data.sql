-- =========================================================================
-- MISXMATCH AI PLATFORM — COMPLETE MySQL 8.0 SEED SCRIPT
-- Contains all schemas & initial data across auth_db, case_db, and notification_db
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. AUTH SERVICE DATABASE (auth_db)
-- -------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS auth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE auth_db;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    super_admin BOOLEAN DEFAULT FALSE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    role VARCHAR(50) NOT NULL,
    photo_url VARCHAR(500),
    aadhaar_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    org_name VARCHAR(255) NOT NULL,
    org_type VARCHAR(50) NOT NULL,
    registration_number VARCHAR(100) NOT NULL,
    jurisdiction VARCHAR(255),
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    verification_status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aadhaar_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    aadhaar_hash VARCHAR(255) NOT NULL,
    aadhaar_last4 VARCHAR(4) NOT NULL,
    verification_status VARCHAR(50) DEFAULT 'VERIFIED',
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purely dynamic - no mock seed data auto-injected in SQL script



-- -------------------------------------------------------------------------
-- 2. CASE SERVICE DATABASE (case_db)
-- -------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS case_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE case_db;

CREATE TABLE IF NOT EXISTS cctv_cameras (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    camera_code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    specific_location VARCHAR(255) NOT NULL,
    resolution VARCHAR(50) DEFAULT '1080p',
    fps INT DEFAULT 25,
    status VARCHAR(50) DEFAULT 'live',
    latitude DOUBLE,
    longitude DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS missing_persons (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    case_number VARCHAR(32) UNIQUE,
    reported_by VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(50) NOT NULL,
    height VARCHAR(50),
    complexion VARCHAR(50),
    identifying_marks TEXT,
    last_seen_location VARCHAR(255) NOT NULL,
    last_seen_date DATE NOT NULL,
    photo_url VARCHAR(500),
    description TEXT,
    contact_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'OPEN',
    risk_level VARCHAR(32) DEFAULT 'MEDIUM',
    risk_score DOUBLE DEFAULT 50.0,
    risk_factors TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS found_persons (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    case_number VARCHAR(32) UNIQUE,
    reported_by VARCHAR(100) NOT NULL,
    approximate_name VARCHAR(255),
    approximate_age INT,
    gender VARCHAR(50) NOT NULL,
    found_location VARCHAR(255) NOT NULL,
    found_date DATE NOT NULL,
    photo_url VARCHAR(500),
    description TEXT,
    current_location VARCHAR(255),
    category VARCHAR(50) DEFAULT 'GENERAL',
    metadata TEXT,
    status VARCHAR(50) DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sightings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    missing_case_number VARCHAR(32),
    missing_person_id BIGINT,
    reported_by VARCHAR(100) NOT NULL,
    sighting_location VARCHAR(255) NOT NULL,
    sighting_date DATE,
    photo_url VARCHAR(500),
    description TEXT,
    contact_phone VARCHAR(50),
    verified BOOLEAN DEFAULT FALSE,
    sighted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_matches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    missing_case_number VARCHAR(32) NOT NULL,
    found_case_number VARCHAR(32),
    missing_person_id BIGINT,
    found_person_id BIGINT,
    sighting_id BIGINT,
    match_type VARCHAR(50) DEFAULT 'IMAGE',
    similarity_score DOUBLE NOT NULL,
    face_score DOUBLE,
    text_score DOUBLE,
    location_score DOUBLE,
    clothing_score DOUBLE,
    timeline_score DOUBLE,
    explanation TEXT,
    match_status VARCHAR(50) DEFAULT 'PENDING_REVIEW',
    match_source VARCHAR(50) DEFAULT 'AI_FEATURE_ENGINE',
    requested_by VARCHAR(100),
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP NULL,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploaded_files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    case_number VARCHAR(32),
    title VARCHAR(255),
    category VARCHAR(32) DEFAULT 'cctv',
    location VARCHAR(255),
    seizure_date VARCHAR(64),
    format VARCHAR(32),
    file_size VARCHAR(32),
    file_url TEXT NOT NULL,
    file_type VARCHAR(64),
    description TEXT,
    officer_name VARCHAR(100),
    badge_number VARCHAR(64),
    sha256 VARCHAR(128),
    uploaded_by VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ocr_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    case_number VARCHAR(32),
    document_type VARCHAR(64) DEFAULT 'FIR',
    extracted_name VARCHAR(255),
    extracted_age INT,
    extracted_gender VARCHAR(32),
    extracted_date DATE,
    extracted_location VARCHAR(255),
    extracted_station_or_hospital VARCHAR(255),
    extracted_fir_or_id_number VARCHAR(64),
    extracted_phone VARCHAR(50),
    confidence_score DOUBLE,
    raw_text TEXT,
    processed_by VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purely dynamic - no CCTV camera seed data auto-injected


-- Purely dynamic - no mock cases or fake seed data initialized in database tables
-- All missing, found, and sighting cases are 100% real user submissions

-- -------------------------------------------------------------------------
-- 3. NOTIFICATION SERVICE DATABASE (notification_db)
-- -------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS notification_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE notification_db;

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_user_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(32) DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id VARCHAR(64),
    actor_role VARCHAR(32),
    action VARCHAR(64) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 4. ADDITIVE AI SAFETY TABLES (case_db)
-- -------------------------------------------------------------------------
USE case_db;

CREATE TABLE IF NOT EXISTS ai_quality_assessments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    evidence_id VARCHAR(100) NOT NULL,
    case_id VARCHAR(100) NOT NULL,
    usable_for_matching BOOLEAN NOT NULL DEFAULT FALSE,
    review_required BOOLEAN NOT NULL DEFAULT TRUE,
    reasons_json TEXT,
    image_quality_score DOUBLE DEFAULT 0.0,
    detected_face_count INT DEFAULT 0,
    face_coverage DOUBLE DEFAULT 0.0,
    blur_score DOUBLE DEFAULT 0.0,
    brightness_score DOUBLE DEFAULT 0.0,
    tampering_risk_score DOUBLE DEFAULT 0.0,
    model_version VARCHAR(50) DEFAULT '1.0.0',
    limitation_notice TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_quality_case (case_id),
    INDEX idx_quality_evidence (evidence_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_candidate_leads (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lead_id VARCHAR(100) NOT NULL UNIQUE,
    source_case_number VARCHAR(100) NOT NULL,
    target_case_number VARCHAR(100) NOT NULL,
    decision_status VARCHAR(50) NOT NULL DEFAULT 'REVIEW_REQUIRED',
    calibrated_confidence DOUBLE DEFAULT 0.0,
    face_score DOUBLE DEFAULT 0.0,
    reid_score DOUBLE DEFAULT 0.0,
    text_score DOUBLE DEFAULT 0.0,
    location_score DOUBLE DEFAULT 0.0,
    timeline_score DOUBLE DEFAULT 0.0,
    explanation TEXT,
    quality_warnings_json TEXT,
    model_versions_json TEXT,
    reviewed_by VARCHAR(100),
    reviewed_at DATETIME,
    review_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_lead_source (source_case_number),
    INDEX idx_lead_target (target_case_number),
    INDEX idx_lead_status (decision_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_temporal_tracks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    track_id VARCHAR(100) NOT NULL UNIQUE,
    case_id VARCHAR(100) NOT NULL,
    camera_id VARCHAR(100) NOT NULL,
    first_timestamp DATETIME,
    last_timestamp DATETIME,
    frame_count INT DEFAULT 0,
    candidate_leads_json TEXT,
    quality_measures_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_track_case (case_id),
    INDEX idx_track_camera (camera_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_audit_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL UNIQUE,
    principal_id VARCHAR(100) NOT NULL,
    principal_role VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    case_id VARCHAR(100),
    evidence_id_hash VARCHAR(128),
    model_versions VARCHAR(255),
    reviewer_decision VARCHAR(50),
    denial_reason TEXT,
    ip_address VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_principal (principal_id),
    INDEX idx_audit_case (case_id),
    INDEX idx_audit_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    feedback_id VARCHAR(100) NOT NULL UNIQUE,
    lead_id VARCHAR(100) NOT NULL,
    case_id VARCHAR(100) NOT NULL,
    reviewer_id VARCHAR(100) NOT NULL,
    reviewer_action VARCHAR(50) NOT NULL,
    opt_in_for_calibration BOOLEAN DEFAULT TRUE,
    feedback_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_feedback_lead (lead_id),
    INDEX idx_feedback_case (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_retention_policies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    artifact_id VARCHAR(100) NOT NULL UNIQUE,
    artifact_type VARCHAR(50) NOT NULL,
    case_id VARCHAR(100) NOT NULL,
    retention_expiry DATETIME NOT NULL,
    deleted_at DATETIME,
    deletion_audit_id VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_retention_expiry (retention_expiry),
    INDEX idx_retention_case (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


