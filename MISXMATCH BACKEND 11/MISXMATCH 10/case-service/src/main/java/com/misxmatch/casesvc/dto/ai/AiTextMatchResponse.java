package com.misxmatch.casesvc.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiTextMatchResponse {
    private Boolean success;
    private Double similarityScore;
    private Boolean possibleMatch;
    private String matchStatus;
    private Double threshold;
    private Integer text1Length;
    private Integer text2Length;
    private String message;
}
