package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * AiMatchResult Entity
 * ====================
 * Persists the detailed multimodal AI similarity comparison result between two case records
 * (e.g. MissingPerson vs FoundPerson or MissingPerson vs Sighting).
 * Stores numeric factor scores, classification, explainability factor breakdown JSON, and AI model version.
 */
@Entity
@Table(name = "ai_match_results", indexes = {
    @Index(name = "idx_source_case", columnList = "source_case_id"),
    @Index(name = "idx_candidate_case", columnList = "candidate_case_id"),
    @Index(name = "idx_overall_score", columnList = "overall_score")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiMatchResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_case_id", nullable = false, length = 64)
    private String sourceCaseId;

    @Column(name = "candidate_case_id", nullable = false, length = 64)
    private String candidateCaseId;

    @Column(name = "face_score", precision = 6, scale = 4)
    private BigDecimal faceScore;

    @Column(name = "text_score", precision = 6, scale = 4)
    private BigDecimal textScore;

    @Column(name = "attribute_score", precision = 6, scale = 4)
    private BigDecimal attributeScore;

    @Column(name = "location_score", precision = 6, scale = 4)
    private BigDecimal locationScore;

    @Column(name = "time_score", precision = 6, scale = 4)
    private BigDecimal timeScore;

    @Column(name = "overall_score", nullable = false, precision = 6, scale = 4)
    private BigDecimal overallScore;

    @Column(name = "classification", nullable = false, length = 64)
    private String classification;

    @Column(name = "available_factors_count")
    private Integer availableFactorsCount;

    @Column(name = "factor_details_json", columnDefinition = "TEXT")
    private String factorDetailsJson;

    @Column(name = "ai_model_version", length = 64)
    @Builder.Default
    private String aiModelVersion = "v2.0-Python-Multimodal";

    @Column(name = "analysis_timestamp", nullable = false)
    private LocalDateTime analysisTimestamp;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", length = 32, nullable = false)
    @Builder.Default
    private ReviewStatus reviewStatus = ReviewStatus.PENDING_REVIEW;

    @Column(name = "reviewed_by", length = 64)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_comment", length = 1000)
    private String reviewComment;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        if (analysisTimestamp == null) {
            analysisTimestamp = LocalDateTime.now();
        }
        if (reviewStatus == null) {
            reviewStatus = ReviewStatus.PENDING_REVIEW;
        }
    }
}
