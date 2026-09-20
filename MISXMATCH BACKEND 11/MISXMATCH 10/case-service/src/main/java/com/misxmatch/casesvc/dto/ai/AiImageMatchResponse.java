package com.misxmatch.casesvc.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiImageMatchResponse {
    private Boolean success;
    private Boolean faceDetectedInImage1;
    private Boolean faceDetectedInImage2;
    private Integer facesCountImage1;
    private Integer facesCountImage2;
    private Double similarityScore;
    private Boolean match;
    private String matchStatus;
    private Double threshold;
    private String message;
}
