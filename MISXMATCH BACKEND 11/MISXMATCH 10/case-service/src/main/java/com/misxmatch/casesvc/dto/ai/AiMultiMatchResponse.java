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
public class AiMultiMatchResponse {
    private Boolean success;
    private Double overallScore;
    private String classification;
    private Integer availableFactorsCount;
    private Integer totalFactorsEvaluated;
    private Map<String, FactorDetail> factors;
    private String message;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FactorDetail {
        private Boolean available;
        private Double score;
        private Double rawWeight;
        private Double effectiveWeight;
        private String status;
        private String explanation;
    }
}
