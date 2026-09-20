package com.misxmatch.casesvc.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.misxmatch.casesvc.dto.ai.AiMultiMatchResponse;
import com.misxmatch.casesvc.dto.ai.AiRiskScoreResponse;
import com.misxmatch.casesvc.entity.AiMatchResult;
import com.misxmatch.casesvc.entity.AiRiskResult;
import com.misxmatch.casesvc.entity.MissingPerson;
import com.misxmatch.casesvc.entity.AiMatch;
import com.misxmatch.casesvc.repository.AiMatchRepository;
import com.misxmatch.casesvc.repository.AiMatchResultRepository;
import com.misxmatch.casesvc.repository.AiRiskResultRepository;
import com.misxmatch.casesvc.repository.MissingPersonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiResultPersistenceServiceImpl implements AiResultPersistenceService {

    private final AiMatchResultRepository matchResultRepository;
    private final AiMatchRepository aiMatchRepository;
    private final AiRiskResultRepository riskResultRepository;
    private final MissingPersonRepository missingPersonRepository;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;
    private final com.misxmatch.casesvc.client.NotificationClient notificationClient;

    @Override
    @Transactional
    public AiMatchResult saveMatchResult(String sourceCaseId, String candidateCaseId, AiMultiMatchResponse response) {
        if (response == null || response.getOverallScore() == null) {
            throw new IllegalArgumentException("Cannot persist invalid or empty AI match response.");
        }

        BigDecimal overall = toBigDecimal(response.getOverallScore());

        // Extract individual factor scores from factors breakdown map
        BigDecimal face = extractFactorScore(response.getFactors(), "face");
        BigDecimal text = extractFactorScore(response.getFactors(), "text");
        BigDecimal attr = extractFactorScore(response.getFactors(), "attributes");
        BigDecimal loc = extractFactorScore(response.getFactors(), "location");
        BigDecimal time = extractFactorScore(response.getFactors(), "time");

        String jsonDetails = null;
        try {
            if (response.getFactors() != null) {
                jsonDetails = objectMapper.writeValueAsString(response.getFactors());
            }
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize factor breakdown JSON for match {} -> {}: {}", sourceCaseId, candidateCaseId, e.getMessage());
        }

        // Deduplication check: if a match result for the same source/candidate pair exists
        // and overall score is identical (within 0.0001), update analysis timestamp instead of duplicating
        Optional<AiMatchResult> existingOpt = matchResultRepository
                .findTopBySourceCaseIdAndCandidateCaseIdOrderByAnalysisTimestampDesc(sourceCaseId, candidateCaseId);

        AiMatchResult entity;
        if (existingOpt.isPresent()) {
            AiMatchResult existing = existingOpt.get();
            if (existing.getOverallScore() != null && existing.getOverallScore().compareTo(overall) == 0) {
                log.info("Duplicate match analysis detected for {} -> {}. Updating analysis timestamp.", sourceCaseId, candidateCaseId);
                existing.setAnalysisTimestamp(LocalDateTime.now());
                existing.setClassification(response.getClassification() != null ? response.getClassification() : existing.getClassification());
                existing.setFactorDetailsJson(jsonDetails != null ? jsonDetails : existing.getFactorDetailsJson());
                return matchResultRepository.save(existing);
            }
        }

        entity = AiMatchResult.builder()
                .sourceCaseId(sourceCaseId)
                .candidateCaseId(candidateCaseId)
                .faceScore(face)
                .textScore(text)
                .attributeScore(attr)
                .locationScore(loc)
                .timeScore(time)
                .overallScore(overall)
                .classification(response.getClassification() != null ? response.getClassification() : "UNKNOWN")
                .availableFactorsCount(response.getAvailableFactorsCount())
                .factorDetailsJson(jsonDetails)
                .aiModelVersion("v2.0-Python-Multimodal")
                .analysisTimestamp(LocalDateTime.now())
                .reviewStatus(com.misxmatch.casesvc.entity.ReviewStatus.PENDING_REVIEW)
                .build();

        AiMatchResult saved = matchResultRepository.save(entity);
        log.info("Persisted AiMatchResult ID {} into MySQL: {} -> {} (Score: {}, Classification: {})",
                saved.getId(), sourceCaseId, candidateCaseId, overall, saved.getClassification());
        return saved;
    }

    @Override
    @Transactional
    public AiRiskResult saveRiskResult(String caseId, AiRiskScoreResponse response) {
        if (response == null || response.getRiskScore() == null) {
            throw new IllegalArgumentException("Cannot persist invalid or empty AI risk response.");
        }

        BigDecimal riskScoreDecimal = toBigDecimal(response.getRiskScore());
        String riskLevel = response.getRiskLevel() != null ? response.getRiskLevel() : "MEDIUM";

        String jsonDetails = null;
        try {
            if (response.getFactors() != null) {
                jsonDetails = objectMapper.writeValueAsString(response.getFactors());
            }
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize risk factor breakdown JSON for case {}: {}", caseId, e.getMessage());
        }

        AiRiskResult entity = AiRiskResult.builder()
                .caseId(caseId)
                .riskScore(riskScoreDecimal)
                .riskLevel(riskLevel)
                .availableFactorsCount(response.getAvailableFactorsCount())
                .reason(response.getReason())
                .factorDetailsJson(jsonDetails)
                .aiModelVersion("v1.0-Python-RiskEngine")
                .analysisTimestamp(LocalDateTime.now())
                .build();

        AiRiskResult saved = riskResultRepository.save(entity);
        log.info("Persisted AiRiskResult ID {} into MySQL for case {}: score={}, level={}",
                saved.getId(), caseId, riskScoreDecimal, riskLevel);

        // Synchronize risk score on MissingPerson entity if present
        Optional<MissingPerson> mpOpt = missingPersonRepository.findByCaseNumber(caseId);
        if (mpOpt.isPresent()) {
            MissingPerson mp = mpOpt.get();
            mp.setRiskScore(response.getRiskScore());
            mp.setRiskLevel(riskLevel);
            missingPersonRepository.save(mp);
            log.info("Updated MissingPerson entity risk score for case {}: score={}, level={}", caseId, response.getRiskScore(), riskLevel);
        }

        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiMatchResult> getMatchesForCase(String caseId) {
        List<AiMatchResult> results = matchResultRepository.findBySourceCaseIdOrCandidateCaseIdOrderByOverallScoreDesc(caseId, caseId);
        if (results == null || results.isEmpty()) {
            List<AiMatch> aiMatches = aiMatchRepository.findBySourceCaseNumberOrTargetCaseNumber(caseId, caseId);
            if (aiMatches.isEmpty()) {
                aiMatches = aiMatchRepository.findByMissingCaseNumberOrFoundCaseNumber(caseId, caseId);
            }
            results = aiMatches.stream().map(this::mapAiMatchToResult).toList();
        }
        return results;
    }

    private AiMatchResult mapAiMatchToResult(AiMatch m) {
        String src = m.getSourceCaseNumber() != null ? m.getSourceCaseNumber() : m.getMissingCaseNumber();
        String tgt = m.getTargetCaseNumber() != null ? m.getTargetCaseNumber() : m.getFoundCaseNumber();
        BigDecimal overall = m.getFinalScore() != null
                ? BigDecimal.valueOf(m.getFinalScore() / 100.0).setScale(4, RoundingMode.HALF_UP)
                : (m.getSimilarityScore() != null ? BigDecimal.valueOf(m.getSimilarityScore()).setScale(4, RoundingMode.HALF_UP) : BigDecimal.ZERO);

        return AiMatchResult.builder()
                .id(m.getId())
                .sourceCaseId(src)
                .candidateCaseId(tgt)
                .faceScore(m.getFaceScore() != null ? BigDecimal.valueOf(m.getFaceScore()).setScale(4, RoundingMode.HALF_UP) : null)
                .textScore(m.getTextScore() != null ? BigDecimal.valueOf(m.getTextScore()).setScale(4, RoundingMode.HALF_UP) : null)
                .attributeScore(m.getAttributeScore() != null ? BigDecimal.valueOf(m.getAttributeScore()).setScale(4, RoundingMode.HALF_UP) : (m.getClothingScore() != null ? BigDecimal.valueOf(m.getClothingScore()).setScale(4, RoundingMode.HALF_UP) : null))
                .locationScore(m.getLocationScore() != null ? BigDecimal.valueOf(m.getLocationScore()).setScale(4, RoundingMode.HALF_UP) : null)
                .timeScore(m.getTimelineScore() != null ? BigDecimal.valueOf(m.getTimelineScore()).setScale(4, RoundingMode.HALF_UP) : null)
                .overallScore(overall)
                .classification(m.getConfidenceLevel() != null ? m.getConfidenceLevel() : "HIGH")
                .availableFactorsCount(5)
                .aiModelVersion(m.getMatchSource() != null ? m.getMatchSource() : "AI_BIOMETRIC_VISION_ENGINE")
                .analysisTimestamp(m.getCreatedAt() != null ? m.getCreatedAt() : LocalDateTime.now())
                .reviewStatus(com.misxmatch.casesvc.entity.ReviewStatus.PENDING_REVIEW)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiMatchResult> getMatchesForCaseFiltered(String caseId, com.misxmatch.casesvc.entity.ReviewStatus status) {
        List<AiMatchResult> all = getMatchesForCase(caseId);
        if (status == null) return all;
        return all.stream()
                .filter(m -> m.getReviewStatus() == status)
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AiMatchResult> getTopMatchForCase(String caseId) {
        List<AiMatchResult> matches = getMatchesForCase(caseId);
        return matches.isEmpty() ? Optional.empty() : Optional.of(matches.get(0));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AiRiskResult> getLatestRiskForCase(String caseId) {
        return riskResultRepository.findTopByCaseIdOrderByAnalysisTimestampDesc(caseId);
    }

    @Override
    @Transactional(readOnly = true)
    public AiMatchResult getMatchById(Long matchId) {
        return matchResultRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("AI Match Result not found for ID: " + matchId));
    }

    @Override
    @Transactional
    public AiMatchResult updateMatchReview(Long matchId, com.misxmatch.casesvc.entity.ReviewStatus status, String reviewerUsername, String reviewerRole, String comment) {
        if (status == null) {
            throw new IllegalArgumentException("Review status must not be null.");
        }

        if ((status == com.misxmatch.casesvc.entity.ReviewStatus.REJECTED_MATCH || status == com.misxmatch.casesvc.entity.ReviewStatus.NEEDS_MORE_INFORMATION)
                && (comment == null || comment.trim().isEmpty())) {
            throw new IllegalArgumentException("Review comment is required when rejecting a match or requesting more information.");
        }

        AiMatchResult match = getMatchById(matchId);
        com.misxmatch.casesvc.entity.ReviewStatus previousStatus = match.getReviewStatus() != null
                ? match.getReviewStatus()
                : com.misxmatch.casesvc.entity.ReviewStatus.PENDING_REVIEW;

        // Update human decision fields (AI factor scores remain 100% immutable!)
        match.setReviewStatus(status);
        match.setReviewedBy(reviewerUsername != null ? reviewerUsername : "OFFICER");
        match.setReviewedAt(LocalDateTime.now());
        match.setReviewComment(comment != null ? comment.trim() : null);

        AiMatchResult updated = matchResultRepository.save(match);

        // Record Audit Log Entry
        String details = String.format("SourceCase: %s, CandidateCase: %s, PreviousStatus: %s, NewStatus: %s, Comment: %s",
                match.getSourceCaseId(), match.getCandidateCaseId(), previousStatus, status, comment != null ? comment.trim() : "None");
        auditLogService.logEvent(reviewerUsername, reviewerRole, "AI_MATCH_REVIEW", "MATCH:" + matchId, details);

        // Dispatch S2S Notification Event
        notificationClient.sendAiMatchReviewedNotificationAsync(match.getSourceCaseId(), matchId, status.name(), reviewerUsername, comment);

        log.info("Updated AI match review ID {}: {} -> {} by user {} ({})",
                matchId, previousStatus, status, reviewerUsername, reviewerRole);

        return updated;
    }

    private BigDecimal toBigDecimal(Double val) {
        if (val == null) return null;
        return BigDecimal.valueOf(val).setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal extractFactorScore(java.util.Map<String, ?> factorsMap, String factorKey) {
        if (factorsMap == null || !factorsMap.containsKey(factorKey)) return null;
        Object factorObj = factorsMap.get(factorKey);
        if (factorObj instanceof AiMultiMatchResponse.FactorDetail) {
            AiMultiMatchResponse.FactorDetail detail = (AiMultiMatchResponse.FactorDetail) factorObj;
            if (Boolean.TRUE.equals(detail.getAvailable()) && detail.getScore() != null) {
                return toBigDecimal(detail.getScore());
            }
            return null;
        } else if (factorObj instanceof java.util.Map) {
            java.util.Map<?, ?> detail = (java.util.Map<?, ?>) factorObj;
            Object availObj = detail.get("available");
            if (availObj instanceof Boolean && !((Boolean) availObj)) return null;
            Object scoreObj = detail.get("score");
            if (scoreObj instanceof Number) {
                return toBigDecimal(((Number) scoreObj).doubleValue());
            }
        }
        return null;
    }
}
