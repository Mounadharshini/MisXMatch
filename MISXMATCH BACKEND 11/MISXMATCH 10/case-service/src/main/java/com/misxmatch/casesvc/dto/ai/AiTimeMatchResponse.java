package com.misxmatch.casesvc.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiTimeMatchResponse {
    private Boolean success;
    private Boolean available;
    private Double timeDifferenceHours;
    private Double timeDifferenceMinutes;
    private Double timeDifferenceDays;
    private Double timeRelevanceScore;
    private String matchStatus;
    private String status;
    private Double threshold;
    private String explanation;
    private String message;
}
