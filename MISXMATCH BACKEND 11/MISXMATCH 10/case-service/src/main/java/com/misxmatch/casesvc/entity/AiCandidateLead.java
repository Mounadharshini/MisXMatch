package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_candidate_leads")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiCandidateLead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lead_id", nullable = false, unique = true, length = 100)
    private String leadId;

    @Column(name = "source_case_number", nullable = false, length = 100)
    private String sourceCaseNumber;

    @Column(name = "target_case_number", nullable = false, length = 100)
    private String targetCaseNumber;

    @Column(name = "decision_status", nullable = false, length = 50)
    @Builder.Default
    private String decisionStatus = "REVIEW_REQUIRED";

    @Column(name = "calibrated_confidence")
    private Double calibratedConfidence;

    @Column(name = "face_score")
    private Double faceScore;

    @Column(name = "reid_score")
    private Double reidScore;

    @Column(name = "text_score")
    private Double textScore;

    @Column(name = "location_score")
    private Double locationScore;

    @Column(name = "timeline_score")
    private Double timelineScore;

    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "quality_warnings_json", columnDefinition = "TEXT")
    private String qualityWarningsJson;

    @Column(name = "model_versions_json", columnDefinition = "TEXT")
    private String modelVersionsJson;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_notes", columnDefinition = "TEXT")
    private String reviewNotes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
