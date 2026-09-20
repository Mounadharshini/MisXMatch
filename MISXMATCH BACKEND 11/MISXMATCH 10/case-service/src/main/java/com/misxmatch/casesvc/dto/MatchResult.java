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
public class MatchResult {
    private String missingCaseNumber;
    private String sourceCaseNumber;
    private String sourceReportType;
    private String matchType;
    @Builder.Default
    private String matchSource = "AI_FEATURE_ENGINE";
    @Builder.Default
    private List<Candidate> candidates = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Candidate {
        private String foundCaseNumber;
        private String targetCaseNumber;
        private String targetReportType;
        private String personName;
        private Double similarityScore;
        private Double finalScore;
        @Builder.Default
        private String confidenceLevel = "MEDIUM";
        @Builder.Default
        private String matchPairType = "Missing ↔ Found";
        private Double faceScore;
        private Double textScore;
        private Double locationScore;
        private Double attributeScore;
        private Double clothingScore;
        private Double timelineScore;
        private String reason;
        private String sourcePhotoUrl;
        private String photoUrl;
        private String currentLocation;
        @Builder.Default
        private String priority = "MEDIUM";
        @Builder.Default
        private String disclaimer = "AI-assisted / Requires Human Verification — not definitive identification";
    }
}
