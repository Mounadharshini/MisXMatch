package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_matches")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "missing_case_number", nullable = false, length = 64)
    private String missingCaseNumber;

    @Column(name = "found_case_number", length = 64)
    private String foundCaseNumber;

    @Column(name = "source_case_number", length = 64)
    private String sourceCaseNumber;

    @Column(name = "target_case_number", length = 64)
    private String targetCaseNumber;

    @Column(name = "source_report_type", length = 32)
    private String sourceReportType;

    @Column(name = "target_report_type", length = 32)
    private String targetReportType;

    @Column(name = "source_photo_url", columnDefinition = "LONGTEXT")
    private String sourcePhotoUrl;

    @Column(name = "target_name")
    private String targetName;

    @Column(name = "target_photo_url", columnDefinition = "LONGTEXT")
    private String targetPhotoUrl;

    @Column(name = "priority", length = 16)
    @Builder.Default
    private String priority = "MEDIUM";

    @Column(name = "target_location")
    private String targetLocation;

    @Column(name = "match_type", length = 32)
    @Builder.Default
    private String matchType = "IMAGE";

    @Column(name = "similarity_score", nullable = false)
    private Double similarityScore;

    @Column(name = "final_score")
    private Double finalScore;

    @Column(name = "confidence_level", length = 16)
    @Builder.Default
    private String confidenceLevel = "MEDIUM";

    @Column(name = "face_score")
    private Double faceScore;

    @Column(name = "text_score")
    private Double textScore;

    @Column(name = "location_score")
    private Double locationScore;

    @Column(name = "attribute_score")
    private Double attributeScore;

    @Column(name = "clothing_score")
    private Double clothingScore;

    @Column(name = "timeline_score")
    private Double timelineScore;

    @Column(length = 2000)
    private String explanation;

    @Column(name = "disclaimer", length = 255)
    @Builder.Default
    private String disclaimer = "AI-assisted / Requires Human Verification — not definitive identification";

    @Column(name = "match_status", length = 32)
    @Builder.Default
    private String matchStatus = "PENDING_REVIEW"; // PENDING_REVIEW, VERIFIED_MATCH, DISMISSED, INVESTIGATING

    @Column(name = "match_source", length = 64)
    @Builder.Default
    private String matchSource = "AI_FEATURE_ENGINE";

    @Column(name = "requested_by", length = 64)
    private String requestedBy;

    @Column(name = "reviewed_by", length = 64)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_notes", length = 1000)
    private String reviewNotes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public String getMissingPhotoUrl() {
        return sourcePhotoUrl;
    }

    public void setMissingPhotoUrl(String missingPhotoUrl) {
        this.sourcePhotoUrl = missingPhotoUrl;
    }

    public String getFoundPhotoUrl() {
        return targetPhotoUrl;
    }

    public void setFoundPhotoUrl(String foundPhotoUrl) {
        this.targetPhotoUrl = foundPhotoUrl;
    }

    public Double getOverallScore() {
        return finalScore;
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        if (sourceCaseNumber == null) sourceCaseNumber = missingCaseNumber;
        if (targetCaseNumber == null) targetCaseNumber = foundCaseNumber;
        if (finalScore == null) {
            finalScore = (similarityScore != null) ? Math.round(similarityScore * 100.0 * 10.0) / 10.0 : 75.0;
        }
    }
}
