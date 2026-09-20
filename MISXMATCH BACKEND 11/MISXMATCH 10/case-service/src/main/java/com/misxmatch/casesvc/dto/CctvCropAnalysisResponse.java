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
public class CctvCropAnalysisResponse {
    private String cameraCode;
    private String cameraLabel;
    private String location;
    private String frameImageUrl;
    private String croppedPersonImageUrl;
    private int totalCandidatesEvaluated;
    @Builder.Default
    private boolean simulated = true;
    @Builder.Default
    private String feedSourceType = "SIMULATED";
    @Builder.Default
    private List<RankedCandidate> candidates = new ArrayList<>();
    private String disclaimer;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RankedCandidate {
        private String missingCaseNumber;
        private String personName;
        private Integer age;
        private String gender;
        private String lastSeenLocation;
        private String photoUrl;
        private Double overallSimilarityScore;
        private Double faceScore;
        private Double clothingScore;
        private Double appearanceScore;
        private Double accessoryScore;
        private String confidenceLevel; // "HIGH", "MEDIUM", "LOW"
        private String matchReason;
        private ExtractedFeatures extractedFeatures;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExtractedFeatures {
        private String clothingColors;
        private String upperLowerAttire;
        private String estimatedAgeRange;
        private String accessoriesDetected;
        private String bodyBuild;
        private String reidMethod; // "MULTIMODAL_LANDMARK_AND_APPEARANCE_REID"
    }
}
