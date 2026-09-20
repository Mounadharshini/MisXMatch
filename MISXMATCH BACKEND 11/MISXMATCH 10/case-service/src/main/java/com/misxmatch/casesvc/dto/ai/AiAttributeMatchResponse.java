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
public class AiAttributeMatchResponse {
    private Boolean success;
    private Double overallAttributeScore;
    private String matchStatus;
    private Double threshold;
    private Integer availableAttributesCount;
    private Integer totalAttributesEvaluated;
    private Map<String, AttributeDetail> attributes;
    private String message;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttributeDetail {
        private Double score;
        private String status;
        private String explanation;
    }
}
