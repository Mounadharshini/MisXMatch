package com.misxmatch.casesvc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskAssessmentResponse {
    private String caseNumber;
    private String riskLevel; // CRITICAL, HIGH, MEDIUM, LOW
    private Double riskScore;
    @Builder.Default
    private List<String> identifiedRiskFactors = new ArrayList<>();
    @Builder.Default
    private List<String> recommendedProtocols = new ArrayList<>();
}
