package com.misxmatch.casesvc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CctvScanResponse {
    private String cameraCode;
    private String cameraLabel;
    private String city;
    private LocalDateTime scannedAt;
    private boolean matchDetected;
    private int facesDetectedInFrame;
    @Builder.Default
    private boolean simulated = true;
    @Builder.Default
    private String feedSourceType = "SIMULATED";
    @Builder.Default
    private List<DetectedBoundingBox> boundingBoxes = new ArrayList<>();
    @Builder.Default
    private List<MatchResult.Candidate> candidates = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DetectedBoundingBox {
        private String boxId;
        private Double top;
        private Double left;
        private Double width;
        private Double height;
        private Double faceQualityScore;
        private String matchedPersonName;
        private Double matchSimilarity;
    }
}
