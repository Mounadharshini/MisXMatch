package com.misxmatch.casesvc.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiLocationMatchResponse {
    private Boolean success;
    private Boolean available;
    private Double distanceKm;
    private Double distanceMeters;
    private Double locationRelevanceScore;
    private String matchStatus;
    private String status;
    private Double threshold;
    private String explanation;
    private String message;
}
