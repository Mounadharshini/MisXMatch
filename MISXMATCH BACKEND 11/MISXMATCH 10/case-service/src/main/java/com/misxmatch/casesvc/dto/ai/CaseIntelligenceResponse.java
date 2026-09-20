package com.misxmatch.casesvc.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * CaseIntelligenceResponse DTO
 * ============================
 * Aggregated operational decision-support intelligence payload for a specific missing person case.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseIntelligenceResponse {

    private String caseNumber;
    private String personName;
    private String caseStatus;
    private String reportedBy;
    private String createdAt;
    private long daysMissing;

    // Risk Assessment Summary
    private RiskSummary riskAssessment;

    // Calculated Operational Priority
    private PrioritySummary operationalPriority;

    // Top Candidate Matches from persisted AiMatchResult records
    private List<CandidateMatchSummary> topCandidates;

    // Explainable AI Recommendations
    private List<String> explainableRecommendations;

    // Sightings Telemetry Summary
    private SightingsSummary sightingsIntelligence;

    // CCTV Evidence Telemetry Summary
    private CctvSummary cctvIntelligence;

    // Case Information Completeness Indicator
    private CompletenessSummary caseCompleteness;

    // Decision-Support Officer Pending Actions
    private List<String> pendingActions;

    // Real Chronological Event Timeline
    private List<TimelineEventSummary> chronologicalTimeline;

    private String disclaimerNotice;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RiskSummary {
        private String riskLevel;
        private Double riskScore;
        private List<String> riskFactors;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PrioritySummary {
        private String priorityLevel; // URGENT_EMERGENCY, HIGH_PRIORITY, MEDIUM_PRIORITY, NORMAL_TRACKING
        private String priorityRationale;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CandidateMatchSummary {
        private Long matchId;
        private String candidateCaseId;
        private Double overallScore;
        private String classification;
        private Double faceScore;
        private Double textScore;
        private Double attributeScore;
        private Double locationScore;
        private Double timeScore;
        private String reviewStatus;
        private String reviewedBy;
        private String explainableReasoning;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SightingsSummary {
        private long totalSightingsCount;
        private long unverifiedSightingsCount;
        private String latestSightingLocation;
        private String latestSightingTimestamp;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CctvSummary {
        private long totalSessionsCount;
        private long totalDetectionsCount;
        private Double topSimilarityScore;
        private String latestAnalysisTimestamp;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CompletenessSummary {
        private int completenessPercentage;
        private List<String> availableFields;
        private List<String> missingFields;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TimelineEventSummary {
        private String eventType;
        private String eventTitle;
        private String description;
        private String timestamp;
        private String actor;
    }
}
