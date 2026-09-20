-- MISXMATCH Additive AI Safety & Intelligence Module Database Migration
-- All tables are created in case_db with strict ai_ prefix.

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
