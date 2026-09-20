package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_audit_events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiAuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true, length = 100)
    private String eventId;

    @Column(name = "principal_id", nullable = false, length = 100)
    private String principalId;

    @Column(name = "principal_role", nullable = false, length = 50)
    private String principalRole;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "case_id", length = 100)
    private String caseId;

    @Column(name = "evidence_id_hash", length = 128)
    private String evidenceIdHash;

    @Column(name = "model_versions", length = 255)
    private String modelVersions;

    @Column(name = "reviewer_decision", length = 500)
    private String reviewerDecision;

    @Column(name = "denial_reason", columnDefinition = "TEXT")
    private String denialReason;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
