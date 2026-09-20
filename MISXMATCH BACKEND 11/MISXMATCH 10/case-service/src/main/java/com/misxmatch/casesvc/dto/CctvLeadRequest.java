package com.misxmatch.casesvc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CctvLeadRequest {
    private String cameraCode;
    private String cameraLabel;
    private String location;
    private String timestamp;
    private String capturedFrameUrl;
    private String croppedPersonUrl;
    private String missingCaseNumber;
    private String missingPersonName;
    private Double overallSimilarityScore;
    private Double faceScore;
    private Double clothingScore;
    private Double appearanceScore;
    private Double accessoryScore;
    private String rationale;
    private String investigatorNotes;
}
