package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * AiRiskResult Entity
 * ===================
 * Persists the detailed AI risk score and case prioritization assessment result
 * returned by the Python AI microservice.
 * Stores numeric risk score, risk urgency level, reasoning, explainability factor breakdown JSON, and AI model version.
 */
@Entity
@Table(name = "ai_risk_results", indexes = {
    @Index(name = "idx_risk_case", columnList = "case_id"),
    @Index(name = "idx_risk_score", columnList = "risk_score"),
    @Index(name = "idx_risk_level", columnList = "risk_level")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiRiskResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_id", nullable = false, length = 64)
    private String caseId;

    @Column(name = "risk_score", nullable = false, precision = 6, scale = 4)
    private BigDecimal riskScore;

    @Column(name = "risk_level", nullable = false, length = 32)
    private String riskLevel;

    @Column(name = "available_factors_count")
    private Integer availableFactorsCount;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "factor_details_json", columnDefinition = "TEXT")
    private String factorDetailsJson;

    @Column(name = "ai_model_version", length = 64)
    @Builder.Default
    private String aiModelVersion = "v1.0-Python-RiskEngine";

    @Column(name = "analysis_timestamp", nullable = false)
    private LocalDateTime analysisTimestamp;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        if (analysisTimestamp == null) {
            analysisTimestamp = LocalDateTime.now();
        }
    }
}
