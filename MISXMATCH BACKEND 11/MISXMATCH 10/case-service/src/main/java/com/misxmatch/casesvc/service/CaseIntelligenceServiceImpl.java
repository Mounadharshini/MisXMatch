package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.dto.ai.CaseIntelligenceResponse;
import com.misxmatch.casesvc.entity.*;
import org.springframework.security.access.AccessDeniedException;
import com.misxmatch.casesvc.repository.AiMatchResultRepository;
import com.misxmatch.casesvc.repository.CctvAnalysisSessionRepository;
import com.misxmatch.casesvc.repository.MissingPersonRepository;
import com.misxmatch.casesvc.repository.SightingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CaseIntelligenceServiceImpl implements CaseIntelligenceService {

    private final MissingPersonRepository missingPersonRepository;
    private final AiMatchResultRepository matchResultRepository;
    private final SightingRepository sightingRepository;
    private final CctvAnalysisSessionRepository cctvSessionRepository;
    private final AiResultPersistenceService resultPersistenceService;

    @Override
    public CaseIntelligenceResponse getCaseIntelligence(String caseNumber, String username, String userRole) {
        log.info("Generating decision-support case intelligence for caseNumber={} (requestedBy={}, role={})",
                caseNumber, username, userRole);

        // 1. Fetch MissingPerson case record
        MissingPerson missingPerson = missingPersonRepository.findByCaseNumber(caseNumber)
                .orElseThrow(() -> new IllegalArgumentException("Missing person case not found with caseNumber: " + caseNumber));

        // 2. Security & IDOR Authorization Enforcement
        validateAccessPermissions(missingPerson, username, userRole);

        // 3. Calculate Days Missing
        long daysMissing = 0;
        if (missingPerson.getLastSeenDate() != null) {
            daysMissing = Math.max(0, ChronoUnit.DAYS.between(missingPerson.getLastSeenDate(), LocalDate.now()));
        } else if (missingPerson.getCreatedAt() != null) {
            daysMissing = Math.max(0, ChronoUnit.DAYS.between(missingPerson.getCreatedAt().toLocalDate(), LocalDate.now()));
        }

        // 4. Fetch Stored AI Risk Assessment
        AiRiskResult riskResult = resultPersistenceService.getLatestRiskForCase(caseNumber).orElse(null);
        double riskScore = riskResult != null && riskResult.getRiskScore() != null
                ? riskResult.getRiskScore().doubleValue()
                : (missingPerson.getRiskScore() != null ? missingPerson.getRiskScore() : 0.50);
        String riskLevel = riskResult != null && riskResult.getRiskLevel() != null
                ? riskResult.getRiskLevel()
                : (missingPerson.getRiskLevel() != null ? missingPerson.getRiskLevel() : "MEDIUM");

        List<String> riskFactorsList = parseRiskFactors(riskResult != null ? (riskResult.getFactorDetailsJson() != null ? riskResult.getFactorDetailsJson() : riskResult.getReason()) : missingPerson.getRiskFactors());

        CaseIntelligenceResponse.RiskSummary riskSummary = CaseIntelligenceResponse.RiskSummary.builder()
                .riskLevel(riskLevel)
                .riskScore(Math.round(riskScore * 100.0) / 100.0)
                .riskFactors(riskFactorsList)
                .build();

        // 5. Fetch Persisted AI Matches & Rank Candidates
        List<AiMatchResult> rawMatches = matchResultRepository.findBySourceCaseIdOrderByOverallScoreDesc(caseNumber);
        if (rawMatches.isEmpty()) {
            rawMatches = matchResultRepository.findByCandidateCaseIdOrderByOverallScoreDesc(caseNumber);
        }

        List<CaseIntelligenceResponse.CandidateMatchSummary> topCandidates = rawMatches.stream()
                .limit(5)
                .map(m -> mapToCandidateSummary(m, caseNumber))
                .collect(Collectors.toList());

        // 6. Fetch Sightings Intelligence
        List<Sighting> sightings = sightingRepository.findByMissingCaseNumberOrderBySightedAtDesc(caseNumber);
        long totalSightings = sightings.size();
        long unverifiedSightings = sightings.stream().filter(s -> !s.isVerified()).count();
        String latestSightingLoc = sightings.isEmpty() ? "No sightings reported" : sightings.get(0).getLocation();
        String latestSightingTime = sightings.isEmpty() ? "N/A" : sightings.get(0).getSightedAt().toString();

        CaseIntelligenceResponse.SightingsSummary sightingsSummary = CaseIntelligenceResponse.SightingsSummary.builder()
                .totalSightingsCount(totalSightings)
                .unverifiedSightingsCount(unverifiedSightings)
                .latestSightingLocation(latestSightingLoc)
                .latestSightingTimestamp(latestSightingTime)
                .build();

        // 7. Fetch CCTV Evidence Intelligence
        List<CctvAnalysisSession> cctvSessions = cctvSessionRepository.findByTopMatchedCaseNumber(caseNumber);
        if (cctvSessions.isEmpty()) {
            cctvSessions = cctvSessionRepository.findAll();
        }

        long totalCctvSessions = cctvSessions.size();
        long totalDetections = cctvSessions.stream().mapToLong(s -> s.getCandidatesFound() != null ? s.getCandidatesFound() : 0).sum();
        double topCctvScore = cctvSessions.stream()
                .mapToDouble(s -> s.getTopSimilarityScore() != null ? s.getTopSimilarityScore() : 0.0)
                .max().orElse(0.0);
        String latestCctvTime = cctvSessions.isEmpty() ? "N/A" : cctvSessions.get(0).getCreatedAt().toString();

        CaseIntelligenceResponse.CctvSummary cctvSummary = CaseIntelligenceResponse.CctvSummary.builder()
                .totalSessionsCount(totalCctvSessions)
                .totalDetectionsCount(totalDetections)
                .topSimilarityScore(Math.round(topCctvScore * 100.0) / 100.0)
                .latestAnalysisTimestamp(latestCctvTime)
                .build();

        // 8. Compute Operational Priority
        CaseIntelligenceResponse.PrioritySummary prioritySummary = calculateOperationalPriority(
                riskScore, daysMissing, unverifiedSightings, rawMatches, missingPerson.getAge()
        );

        // 9. Compute Case Completeness
        CaseIntelligenceResponse.CompletenessSummary completenessSummary = calculateCaseCompleteness(missingPerson);

        // 10. Generate Officer Pending Actions
        List<String> pendingActions = generatePendingActions(
                riskLevel, topCandidates, unverifiedSightings, totalCctvSessions, completenessSummary
        );

        // 11. Generate Explainable Recommendations
        List<String> explainableRecommendations = generateExplainableRecommendations(topCandidates, riskLevel);

        // 12. Build Real Chronological Event Timeline
        List<CaseIntelligenceResponse.TimelineEventSummary> timeline = buildChronologicalTimeline(
                missingPerson, sightings, rawMatches, cctvSessions
        );

        return CaseIntelligenceResponse.builder()
                .caseNumber(missingPerson.getCaseNumber())
                .personName(missingPerson.getName())
                .caseStatus(missingPerson.getStatus() != null ? missingPerson.getStatus().name() : "OPEN")
                .reportedBy(missingPerson.getReportedBy())
                .createdAt(missingPerson.getCreatedAt() != null ? missingPerson.getCreatedAt().toString() : "N/A")
                .daysMissing(daysMissing)
                .riskAssessment(riskSummary)
                .operationalPriority(prioritySummary)
                .topCandidates(topCandidates)
                .explainableRecommendations(explainableRecommendations)
                .sightingsIntelligence(sightingsSummary)
                .cctvIntelligence(cctvSummary)
                .caseCompleteness(completenessSummary)
                .pendingActions(pendingActions)
                .chronologicalTimeline(timeline)
                .disclaimerNotice("AI Decision-Support System: Candidate suggestions require officer field verification before legal identification.")
                .build();
    }

    private void validateAccessPermissions(MissingPerson caseRecord, String username, String userRole) {
        if (userRole == null) userRole = "PUBLIC_USER";
        String roleUpper = userRole.toUpperCase();

        // POLICE, ADMIN, HOSPITAL, NGO authorized across cases
        if (roleUpper.contains("POLICE") || roleUpper.contains("ADMIN") || roleUpper.contains("HOSPITAL") || roleUpper.contains("NGO")) {
            return;
        }

        // Public user can only view their own reported cases
        if (caseRecord.getReportedBy() != null && !caseRecord.getReportedBy().equalsIgnoreCase(username)) {
            log.warn("IDOR Access Denied: User {} attempted to access restricted case {}", username, caseRecord.getCaseNumber());
            throw new AccessDeniedException("Unauthorized: You do not have permission to view intelligence for this case.");
        }
    }

    private CaseIntelligenceResponse.PrioritySummary calculateOperationalPriority(
            double riskScore, long daysMissing, long unverifiedSightings, List<AiMatchResult> matches, Integer age) {

        long pendingHighConfidenceMatches = matches.stream()
                .filter(m -> m.getOverallScore() != null && m.getOverallScore().doubleValue() >= 0.80)
                .filter(m -> m.getReviewStatus() == null || m.getReviewStatus() == ReviewStatus.PENDING_REVIEW)
                .count();

        if (riskScore >= 0.75 || (age != null && (age <= 12 || age >= 65) && daysMissing >= 1)) {
            return CaseIntelligenceResponse.PrioritySummary.builder()
                    .priorityLevel("URGENT_EMERGENCY")
                    .priorityRationale("Vulnerable individual (high risk score >= 0.75 or extreme age bracket) missing.")
                    .build();
        } else if (riskScore >= 0.60 || unverifiedSightings > 0 || pendingHighConfidenceMatches > 0) {
            return CaseIntelligenceResponse.PrioritySummary.builder()
                    .priorityLevel("HIGH_PRIORITY")
                    .priorityRationale("High similarity AI candidate pending review or unverified citizen sighting reported.")
                    .build();
        } else if (riskScore >= 0.45 || daysMissing >= 3) {
            return CaseIntelligenceResponse.PrioritySummary.builder()
                    .priorityLevel("MEDIUM_PRIORITY")
                    .priorityRationale("Active missing case requiring routine field verification and cross-service monitoring.")
                    .build();
        } else {
            return CaseIntelligenceResponse.PrioritySummary.builder()
                    .priorityLevel("NORMAL_TRACKING")
                    .priorityRationale("Standard operational case tracking.")
                    .build();
        }
    }

    private CaseIntelligenceResponse.CandidateMatchSummary mapToCandidateSummary(AiMatchResult match, String currentCaseNumber) {
        String targetCase = match.getSourceCaseId().equalsIgnoreCase(currentCaseNumber)
                ? match.getCandidateCaseId()
                : match.getSourceCaseId();

        double overall = toDouble(match.getOverallScore());
        double face = toDouble(match.getFaceScore());
        double text = toDouble(match.getTextScore());
        double attr = toDouble(match.getAttributeScore());
        double loc = toDouble(match.getLocationScore());
        double time = toDouble(match.getTimeScore());

        StringBuilder explanation = new StringBuilder();
        if (face >= 0.80) explanation.append(String.format("High visual face similarity (%.1f%%). ", face * 100));
        if (text >= 0.65) explanation.append(String.format("Semantic description match (%.1f%%). ", text * 100));
        if (loc >= 0.70) explanation.append("Location is geographically close. ");
        if (explanation.length() == 0) explanation.append("Probabilistic multi-factor candidate match.");

        return CaseIntelligenceResponse.CandidateMatchSummary.builder()
                .matchId(match.getId())
                .candidateCaseId(targetCase)
                .overallScore(overall)
                .classification(match.getClassification() != null ? match.getClassification() : "POSSIBLE_MATCH")
                .faceScore(face)
                .textScore(text)
                .attributeScore(attr)
                .locationScore(loc)
                .timeScore(time)
                .reviewStatus(match.getReviewStatus() != null ? match.getReviewStatus().name() : "PENDING_REVIEW")
                .reviewedBy(match.getReviewedBy())
                .explainableReasoning(explanation.toString().trim())
                .build();
    }

    private CaseIntelligenceResponse.CompletenessSummary calculateCaseCompleteness(MissingPerson p) {
        List<String> available = new ArrayList<>();
        List<String> missing = new ArrayList<>();

        checkField(p.getName(), "Name", available, missing);
        checkField(p.getPhotoUrl(), "Primary Photo", available, missing);
        checkField(p.getDescription(), "Physical Description", available, missing);
        checkField(p.getLastSeenLocation(), "Last Known Location", available, missing);
        checkField(p.getLastSeenDate(), "Last Known Date", available, missing);
        checkField(p.getAge(), "Age", available, missing);
        checkField(p.getGender(), "Gender", available, missing);
        checkField(p.getIdentifyingMarks(), "Identifying Marks / Scars", available, missing);
        checkField(p.getContactPhone(), "Reporter Contact Phone", available, missing);

        int total = available.size() + missing.size();
        int pct = total > 0 ? (int) Math.round(((double) available.size() / total) * 100.0) : 0;

        return CaseIntelligenceResponse.CompletenessSummary.builder()
                .completenessPercentage(pct)
                .availableFields(available)
                .missingFields(missing)
                .build();
    }

    private void checkField(Object val, String fieldName, List<String> avail, List<String> miss) {
        if (val != null && !val.toString().trim().isEmpty() && !val.toString().equalsIgnoreCase("UNKNOWN")) {
            avail.add(fieldName);
        } else {
            miss.add(fieldName);
        }
    }

    private List<String> generatePendingActions(
            String riskLevel,
            List<CaseIntelligenceResponse.CandidateMatchSummary> candidates,
            long unverifiedSightings,
            long cctvSessions,
            CaseIntelligenceResponse.CompletenessSummary completeness) {

        List<String> actions = new ArrayList<>();
        if ("HIGH".equalsIgnoreCase(riskLevel) || "CRITICAL".equalsIgnoreCase(riskLevel)) {
            actions.add("HIGH RISK URGENCY: Expedite field search and issue multi-agency broadcast alert.");
        }

        long pendingMatches = candidates.stream().filter(c -> "PENDING_REVIEW".equalsIgnoreCase(c.getReviewStatus())).count();
        if (pendingMatches > 0) {
            actions.add(String.format("Review %d pending AI candidate match(es) in decision-support feed.", pendingMatches));
        }

        if (unverifiedSightings > 0) {
            actions.add(String.format("Verify %d recent citizen sighting report(s) submitted by public.", unverifiedSightings));
        }

        if (!completeness.getMissingFields().isEmpty()) {
            actions.add(String.format("Update missing case details: %s.", String.join(", ", completeness.getMissingFields())));
        }

        if (actions.isEmpty()) {
            actions.add("Routine monitoring: Continue cross-referencing incoming found person reports.");
        }
        return actions;
    }

    private List<String> generateExplainableRecommendations(List<CaseIntelligenceResponse.CandidateMatchSummary> candidates, String riskLevel) {
        List<String> recs = new ArrayList<>();
        if (!candidates.isEmpty()) {
            CaseIntelligenceResponse.CandidateMatchSummary top = candidates.get(0);
            recs.add(String.format("Top candidate match #%s has an overall similarity of %.1f%% (%s).",
                    top.getCandidateCaseId(), top.getOverallScore() * 100, top.getClassification()));
            recs.add(top.getExplainableReasoning());
        } else {
            recs.add("No high-confidence AI candidate matches found in database yet.");
        }
        recs.add("AI similarity outputs are decision-support suggestions for law enforcement; official human officer verification is mandatory.");
        return recs;
    }

    private List<CaseIntelligenceResponse.TimelineEventSummary> buildChronologicalTimeline(
            MissingPerson p, List<Sighting> sightings, List<AiMatchResult> matches, List<CctvAnalysisSession> cctvSessions) {

        List<CaseIntelligenceResponse.TimelineEventSummary> events = new ArrayList<>();

        if (p.getCreatedAt() != null) {
            events.add(CaseIntelligenceResponse.TimelineEventSummary.builder()
                    .eventType("CASE_CREATED")
                    .eventTitle("Missing Person Case Registered")
                    .description("Case #" + p.getCaseNumber() + " registered by " + p.getReportedBy())
                    .timestamp(p.getCreatedAt().toString())
                    .actor(p.getReportedBy())
                    .build());
        }

        for (Sighting s : sightings) {
            events.add(CaseIntelligenceResponse.TimelineEventSummary.builder()
                    .eventType("SIGHTING_SUBMITTED")
                    .eventTitle("Citizen Sighting Reported")
                    .description("Sighting reported at location: " + s.getLocation())
                    .timestamp(s.getSightedAt().toString())
                    .actor(s.getReportedBy())
                    .build());
        }

        for (AiMatchResult m : matches) {
            events.add(CaseIntelligenceResponse.TimelineEventSummary.builder()
                    .eventType("AI_MATCH_GENERATED")
                    .eventTitle("AI Match Candidate Generated")
                    .description(String.format("AI match evaluated with case %s (Score: %.1f%%, Review: %s)",
                            m.getCandidateCaseId(), toDouble(m.getOverallScore()) * 100, m.getReviewStatus()))
                    .timestamp(m.getAnalysisTimestamp() != null ? m.getAnalysisTimestamp().toString() : "N/A")
                    .actor("MISXMATCH AI Engine")
                    .build());
        }

        for (CctvAnalysisSession c : cctvSessions) {
            events.add(CaseIntelligenceResponse.TimelineEventSummary.builder()
                    .eventType("CCTV_ANALYSIS_EXECUTED")
                    .eventTitle("Forensic CCTV Analysis Completed")
                    .description(String.format("Camera %s analyzed: %d person detections recorded",
                            c.getCameraCode(), c.getCandidatesFound() != null ? c.getCandidatesFound() : 0))
                    .timestamp(c.getCreatedAt() != null ? c.getCreatedAt().toString() : "N/A")
                    .actor(c.getInvestigatorUserId() != null ? c.getInvestigatorUserId() : "System Officer")
                    .build());
        }

        events.sort((e1, e2) -> e2.getTimestamp().compareTo(e1.getTimestamp()));
        return events;
    }

    private double toDouble(BigDecimal bd) {
        return bd != null ? bd.doubleValue() : 0.0;
    }

    private List<String> parseRiskFactors(String jsonOrStr) {
        if (jsonOrStr == null || jsonOrStr.trim().isEmpty()) {
            return List.of("Standard age vulnerability");
        }
        return List.of(jsonOrStr.replaceAll("[\\[\\]\"]", "").split(","));
    }
}
