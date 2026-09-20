package com.misxmatch.casesvc.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiCandidateAnalysisResponse {
    private String caseId;
    private String status; // e.g. "COMPLETED", "PARTIAL_SUCCESS", "NO_CANDIDATES"
    private Integer totalCandidatesChecked;
    private Integer matchesFound;
    private List<CandidateMatchSummary> matches;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CandidateMatchSummary {
        private String candidateId;
        private String candidateName;
        private String candidateType; // e.g. "FOUND_PERSON", "SIGHTING"
        private String candidatePhotoUrl;
        private String candidateLocation;
        private BigDecimal overallScore;
        private String classification;
        private BigDecimal faceScore;
        private BigDecimal textScore;
        private BigDecimal attributeScore;
        private BigDecimal locationScore;
        private BigDecimal timeScore;
        private Integer availableFactorsCount;
        private LocalDateTime analysisTimestamp;
        private String disclaimer;
    }
}
