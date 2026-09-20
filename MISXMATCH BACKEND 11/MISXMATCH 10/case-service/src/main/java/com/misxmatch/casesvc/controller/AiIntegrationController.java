package com.misxmatch.casesvc.controller;

import com.misxmatch.casesvc.client.AiServiceClient;
import com.misxmatch.casesvc.dto.ai.*;
import com.misxmatch.casesvc.service.AiIntegrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.misxmatch.casesvc.entity.AiMatchResult;
import com.misxmatch.casesvc.entity.AiRiskResult;
import com.misxmatch.casesvc.service.AiResultPersistenceService;
import com.misxmatch.casesvc.service.AuditLogService;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * AiIntegrationController
 * =======================
 * Spring Boot REST Controller bridging the Java Spring Boot Backend and the independent Python AI Microservice.
 * Exposes endpoints under `/api/cases/ai/v2/*` for direct proxy calls, business-logic case integrations, and MySQL result retrieval.
 */
@Slf4j
@RestController
@RequestMapping({"/cases/ai/v2", "/api/cases/ai/v2"})
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AiIntegrationController {

    private final AiServiceClient aiServiceClient;
    private final AiIntegrationService aiIntegrationService;
    private final AiResultPersistenceService resultPersistenceService;

    /**
     * 1. Health Check Proxy Endpoint
     * GET /api/cases/ai/v2/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getAiHealth() {
        log.info("REST request to check Python AI microservice health via Spring Boot proxy");
        Map<String, Object> health = aiServiceClient.checkHealth();
        return ResponseEntity.ok(health);
    }

    /**
     * 2. Image Match Proxy Endpoint
     * POST /api/cases/ai/v2/image-match
     */
    @PostMapping(value = "/image-match", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AiImageMatchResponse> compareImages(
            @RequestParam("image1") MultipartFile image1,
            @RequestParam("image2") MultipartFile image2) throws IOException {

        log.info("REST request to compare two images via Python AI service");
        if (image1.isEmpty() || image2.isEmpty()) {
            throw new IllegalArgumentException("Both image1 and image2 files must be provided and non-empty.");
        }

        byte[] img1Bytes = image1.getBytes();
        byte[] img2Bytes = image2.getBytes();

        AiImageMatchResponse result = aiServiceClient.compareImages(
                img1Bytes, image1.getOriginalFilename(),
                img2Bytes, image2.getOriginalFilename()
        );

        return ResponseEntity.ok(result);
    }

    /**
     * 3. NLP Text Match Proxy Endpoint
     * POST /api/cases/ai/v2/text-match
     */
    @PostMapping("/text-match")
    public ResponseEntity<AiTextMatchResponse> compareTexts(@RequestBody AiTextMatchRequest request) {
        log.info("REST request to perform NLP text similarity match");
        AiTextMatchResponse result = aiServiceClient.compareTexts(request);
        return ResponseEntity.ok(result);
    }

    /**
     * 4. Attribute Match Proxy Endpoint
     * POST /api/cases/ai/v2/attribute-match
     */
    @PostMapping("/attribute-match")
    public ResponseEntity<AiAttributeMatchResponse> compareAttributes(@RequestBody AiAttributeMatchRequest request) {
        log.info("REST request to perform structured attribute match");
        AiAttributeMatchResponse result = aiServiceClient.compareAttributes(request);
        return ResponseEntity.ok(result);
    }

    /**
     * 5. Location Match Proxy Endpoint
     * POST /api/cases/ai/v2/location-match
     */
    @PostMapping("/location-match")
    public ResponseEntity<AiLocationMatchResponse> compareLocations(@RequestBody AiLocationMatchRequest request) {
        log.info("REST request to perform location distance relevance match");
        AiLocationMatchResponse result = aiServiceClient.compareLocations(request);
        return ResponseEntity.ok(result);
    }

    /**
     * 6. Time Match Proxy Endpoint
     * POST /api/cases/ai/v2/time-match
     */
    @PostMapping("/time-match")
    public ResponseEntity<AiTimeMatchResponse> compareTimes(@RequestBody AiTimeMatchRequest request) {
        log.info("REST request to perform time relevance match");
        AiTimeMatchResponse result = aiServiceClient.compareTimes(request);
        return ResponseEntity.ok(result);
    }

    /**
     * 7. Multi-Factor Match Proxy Endpoint
     * POST /api/cases/ai/v2/multi-match
     */
    @PostMapping("/multi-match")
    public ResponseEntity<AiMultiMatchResponse> compareMultiFactor(@RequestBody AiMultiMatchRequest request) {
        log.info("REST request to perform multi-factor AI similarity match");
        AiMultiMatchResponse result = aiServiceClient.compareMultiFactor(request);
        return ResponseEntity.ok(result);
    }

    /**
     * 8. Direct Risk Score Proxy Endpoint
     * POST /api/cases/ai/v2/risk-score
     */
    @PostMapping("/risk-score")
    public ResponseEntity<AiRiskScoreResponse> calculateRiskScore(@RequestBody AiRiskScoreRequest request) {
        log.info("REST request to calculate case risk score");
        AiRiskScoreResponse result = aiServiceClient.calculateRiskScore(request);
        return ResponseEntity.ok(result);
    }

    /**
     * 9. Integrated Case Risk Assessment & Persistence Endpoint
     * POST /api/cases/ai/v2/cases/{caseNumber}/risk-score
     */
    @PostMapping("/cases/{caseNumber}/risk-score")
    public ResponseEntity<AiRiskScoreResponse> evaluateAndSaveCaseRisk(@PathVariable("caseNumber") String caseNumber) {
        log.info("REST request to evaluate and save AI risk score for missing person case: {}", caseNumber);
        AiRiskScoreResponse result = aiIntegrationService.evaluateAndSaveCaseRisk(caseNumber);
        return ResponseEntity.ok(result);
    }

    /**
     * 10. Integrated Case Multi-Factor Match Endpoint
     * POST /api/cases/ai/v2/cases/{missingCaseNumber}/match/{targetCaseNumber}
     */
    @PostMapping("/cases/{missingCaseNumber}/match/{targetCaseNumber}")
    public ResponseEntity<AiMultiMatchResponse> evaluateCaseMultiMatch(
            @PathVariable("missingCaseNumber") String missingCaseNumber,
            @PathVariable("targetCaseNumber") String targetCaseNumber) {

        log.info("REST request to perform integrated AI multi-factor match between case {} and target {}", missingCaseNumber, targetCaseNumber);
        AiMultiMatchResponse result = aiIntegrationService.evaluateMultiFactorMatch(missingCaseNumber, targetCaseNumber);
        return ResponseEntity.ok(result);
    }

    /**
     * 11. Integrated End-to-End Case Candidate Analysis Endpoint
     * POST /api/cases/ai/v2/cases/{caseNumber}/analyze
     */
    @PostMapping("/cases/{caseNumber}/analyze")
    public ResponseEntity<AiCandidateAnalysisResponse> analyzeCaseCandidates(@PathVariable("caseNumber") String caseNumber) {
        log.info("REST request to run end-to-end AI candidate analysis for missing case: {}", caseNumber);
        AiCandidateAnalysisResponse result = aiIntegrationService.analyzeCaseCandidates(caseNumber);
        return ResponseEntity.ok(result);
    }

    /**
     * 12. Retrieve Stored AI Match Results Endpoint
     * GET /api/cases/ai/v2/matches/{caseId} or GET /api/cases/ai/v2/cases/{caseId}/matches
     */
    @GetMapping({"/matches/{caseId}", "/cases/{caseId}/matches"})
    public ResponseEntity<List<AiMatchResult>> getStoredMatchesForCase(@PathVariable("caseId") String caseId) {
        log.info("REST request to retrieve stored AI match results for case: {}", caseId);
        List<AiMatchResult> results = resultPersistenceService.getMatchesForCase(caseId);
        return ResponseEntity.ok(results);
    }

    /**
     * 13. Retrieve Highest Scoring AI Match Result Endpoint
     * GET /api/cases/ai/v2/matches/{caseId}/top
     */
    @GetMapping("/matches/{caseId}/top")
    public ResponseEntity<AiMatchResult> getTopMatchForCase(@PathVariable("caseId") String caseId) {
        log.info("REST request to retrieve top AI match result for case: {}", caseId);
        return resultPersistenceService.getTopMatchForCase(caseId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private final AuditLogService auditLogService;

    /**
     * 14. Retrieve Latest Stored AI Risk Assessment Endpoint
     * GET /api/cases/ai/v2/risk/{caseId}
     */
    @GetMapping("/risk/{caseId}")
    public ResponseEntity<AiRiskResult> getLatestRiskForCase(@PathVariable("caseId") String caseId) {
        log.info("REST request to retrieve latest stored AI risk assessment for case: {}", caseId);
        return resultPersistenceService.getLatestRiskForCase(caseId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 15. Retrieve Match Detail by ID Endpoint
     * GET /api/cases/ai/v2/matches/detail/{matchId}
     */
    @GetMapping("/matches/detail/{matchId}")
    public ResponseEntity<AiMatchResult> getMatchDetail(@PathVariable("matchId") Long matchId) {
        log.info("REST request to retrieve detail for AI match ID: {}", matchId);
        AiMatchResult result = resultPersistenceService.getMatchById(matchId);
        return ResponseEntity.ok(result);
    }

    /**
     * 16. Submit Human Review Decision Endpoint
     * PATCH /api/cases/ai/v2/matches/{matchId}/review
     * POST /api/cases/ai/v2/matches/{matchId}/review
     */
    @RequestMapping(value = "/matches/{matchId}/review", method = {RequestMethod.PATCH, RequestMethod.POST})
    public ResponseEntity<AiMatchResult> reviewMatch(
            @PathVariable("matchId") Long matchId,
            @RequestBody @jakarta.validation.Valid AiMatchReviewRequest request,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "OFFICER") String username,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "POLICE") String userRole) {

        log.info("REST request to submit human review for match ID {}: status={}, reviewer={}({})",
                matchId, request.getStatus(), username, userRole);

        // RBAC Enforcement: Only POLICE, ADMIN, or SUPER_ADMIN may record official human match decisions
        String roleUpper = userRole != null ? userRole.trim().toUpperCase() : "USER";
        if (!roleUpper.contains("POLICE") && !roleUpper.contains("ADMIN")) {
            log.warn("Unauthorized human match review attempt by user {} with role {}", username, userRole);
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }

        AiMatchResult updated = resultPersistenceService.updateMatchReview(
                matchId,
                request.getStatus(),
                username,
                roleUpper,
                request.getComment()
        );

        return ResponseEntity.ok(updated);
    }

    /**
     * 17. Retrieve Match Review Audit History Endpoint
     * GET /api/cases/ai/v2/matches/{matchId}/history
     */
    @GetMapping("/matches/{matchId}/history")
    public ResponseEntity<List<com.misxmatch.casesvc.entity.AuditLog>> getMatchReviewHistory(@PathVariable("matchId") Long matchId) {
        log.info("REST request to retrieve review audit history for match ID: {}", matchId);
        List<com.misxmatch.casesvc.entity.AuditLog> history = auditLogService.getAuditLogsForResource("MATCH:" + matchId);
        return ResponseEntity.ok(history);
    }
}
