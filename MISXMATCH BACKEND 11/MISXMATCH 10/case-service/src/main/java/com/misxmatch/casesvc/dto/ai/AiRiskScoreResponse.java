package com.misxmatch.casesvc.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRiskScoreResponse {
    private Boolean success;
    private Double riskScore;
    private String riskLevel;
    private Integer availableFactorsCount;
    private Integer totalFactorsEvaluated;
    private Map<String, RiskFactorDetail> factors;
    private String reason;
    private String message;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RiskFactorDetail {
        private Boolean available;
        private Double score;
        private Double rawWeight;
        private Double effectiveWeight;
        private String status;
        private String explanation;
    }
}
