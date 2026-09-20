package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_quality_assessments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiQualityAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "evidence_id", nullable = false, length = 100)
    private String evidenceId;

    @Column(name = "case_id", nullable = false, length = 100)
    private String caseId;

    @Column(name = "usable_for_matching", nullable = false)
    @Builder.Default
    private Boolean usableForMatching = false;

    @Column(name = "review_required", nullable = false)
    @Builder.Default
    private Boolean reviewRequired = true;

    @Column(name = "reasons_json", columnDefinition = "TEXT")
    private String reasonsJson;

    @Column(name = "image_quality_score")
    private Double imageQualityScore;

    @Column(name = "detected_face_count")
    private Integer detectedFaceCount;

    @Column(name = "face_coverage")
    private Double faceCoverage;

    @Column(name = "blur_score")
    private Double blurScore;

    @Column(name = "brightness_score")
    private Double brightnessScore;

    @Column(name = "tampering_risk_score")
    private Double tamperingRiskScore;

    @Column(name = "model_version", length = 50)
    private String modelVersion;

    @Column(name = "limitation_notice", columnDefinition = "TEXT")
    private String limitationNotice;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
