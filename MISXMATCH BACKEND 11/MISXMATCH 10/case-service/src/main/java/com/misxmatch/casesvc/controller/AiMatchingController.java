package com.misxmatch.casesvc.controller;

import com.misxmatch.casesvc.dto.MatchResult;
import com.misxmatch.casesvc.entity.AiMatch;
import com.misxmatch.casesvc.entity.MissingPerson;
import com.misxmatch.casesvc.repository.AiMatchRepository;
import com.misxmatch.casesvc.repository.MissingPersonRepository;
import com.misxmatch.casesvc.service.AiMatchingProvider;
import com.misxmatch.casesvc.service.AiScoreCalculatorService;
import com.misxmatch.casesvc.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@Tag(name = "AI Integration Service", description = "Biometric Face/Text Similarity, Asynchronous Matching, Risk Prioritization & Review Workflows")
public class AiMatchingController {

    private final AiMatchingProvider aiMatchingProvider;
    private final AiScoreCalculatorService scoreCalculatorService;
    private final AuditLogService auditLogService;
    private final AiMatchRepository aiMatchRepository;
    private final MissingPersonRepository missingPersonRepository;
    private final com.misxmatch.casesvc.client.AuditLogClient auditLogClient;

    public AiMatchingController(AiMatchingProvider aiMatchingProvider,
                                AiScoreCalculatorService scoreCalculatorService,
                                AuditLogService auditLogService,
                                AiMatchRepository aiMatchRepository,
                                MissingPersonRepository missingPersonRepository,
                                com.misxmatch.casesvc.client.AuditLogClient auditLogClient) {
        this.aiMatchingProvider = aiMatchingProvider;
        this.scoreCalculatorService = scoreCalculatorService;
        this.auditLogService = auditLogService;
        this.aiMatchRepository = aiMatchRepository;
        this.missingPersonRepository = missingPersonRepository;
        this.auditLogClient = auditLogClient;
    }

    // --- 1. POST /ai/analyze-case/{caseId}, /api/cases/{caseId}/ai/face-match & /api/cases/{caseId}/ai/analyze ---
    @PostMapping(path = {"/ai/analyze-case/{caseId}", "/cases/ai/analyze-case/{caseId}", "/api/cases/{caseId}/ai/face-match", "/api/cases/{caseId}/ai/analyze"})
    @Operation(summary = "Initiate real multi-source AI face similarity analysis for a missing person case")
    public ResponseEntity<Map<String, Object>> analyzeCase(
            @PathVariable String caseId,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "SYSTEM") String userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "USER") String role) {

        String jobId = "JOB-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        auditLogService.logEvent(userId, role, "AI_FACE_MATCH_STARTED", "CASE:" + caseId, "Job ID: " + jobId);

        int persistedCount = 0;
        // Execute matching via provider
        try {
            MatchResult matchResult = aiMatchingProvider.matchByImage(caseId, null);
            if (matchResult != null && matchResult.getCandidates() != null) {
                for (MatchResult.Candidate cand : matchResult.getCandidates()) {
                    Double simScore = cand.getSimilarityScore();
                    if (simScore == null && cand.getFaceScore() != null) {
                        simScore = cand.getFaceScore();
                    }
                    if (simScore == null) {
                        simScore = (cand.getFinalScore() != null) ? Math.round((cand.getFinalScore() / 100.0) * 100.0) / 100.0 : 0.0;
                    }

                    String tgtCase = cand.getTargetCaseNumber();
                    String srcPhoto = cand.getSourcePhotoUrl();
                    if (srcPhoto == null || srcPhoto.isBlank()) {
                        srcPhoto = missingPersonRepository.findByCaseNumber(caseId).map(MissingPerson::getPhotoUrl).orElse(null);
                    }

                    Optional<AiMatch> existingOpt = aiMatchRepository.findAll().stream()
                            .filter(m -> ((caseId.equalsIgnoreCase(m.getMissingCaseNumber()) || caseId.equalsIgnoreCase(m.getSourceCaseNumber())) &&
                                          (tgtCase != null && (tgtCase.equalsIgnoreCase(m.getFoundCaseNumber()) || tgtCase.equalsIgnoreCase(m.getTargetCaseNumber())))))
                            .findFirst();

                    AiMatch match = existingOpt.orElseGet(() -> AiMatch.builder()
                            .missingCaseNumber(caseId)
                            .sourceCaseNumber(caseId)
                            .targetCaseNumber(tgtCase)
                            .foundCaseNumber(tgtCase)
                            .matchStatus("PENDING_REVIEW")
                            .build());

                    match.setMissingCaseNumber(caseId);
                    match.setSourceCaseNumber(caseId);
                    match.setTargetCaseNumber(tgtCase);
                    match.setFoundCaseNumber(tgtCase);
                    match.setSourceReportType("MISSING");
                    match.setTargetReportType(cand.getTargetReportType());
                    match.setSourcePhotoUrl(srcPhoto);
                    match.setTargetName(cand.getPersonName());
                    match.setTargetPhotoUrl(cand.getPhotoUrl());
                    match.setTargetLocation(cand.getCurrentLocation());
                    match.setMatchType("IMAGE");
                    match.setSimilarityScore(simScore);
                    match.setFinalScore(cand.getFinalScore());
                    match.setConfidenceLevel(cand.getConfidenceLevel());
                    match.setFaceScore(cand.getFaceScore());
                    match.setTextScore(cand.getTextScore());
                    match.setLocationScore(cand.getLocationScore());
                    match.setClothingScore(cand.getClothingScore());
                    match.setTimelineScore(cand.getTimelineScore());
                    match.setExplanation(cand.getReason());
                    match.setDisclaimer("AI-assisted / Possible Match — Requires Human Verification");
                    match.setMatchSource(aiMatchingProvider.getProviderName());
                    match.setRequestedBy(userId);

                    aiMatchRepository.save(match);
                    persistedCount++;
                }
            }
            auditLogService.logEvent(userId, role, "AI_FACE_MATCH_COMPLETED", "CASE:" + caseId, "Matches persisted: " + persistedCount);
        } catch (Exception e) {
            log.warn("AI face matching execution warning for case {}: {}", caseId, e.getMessage());
            auditLogService.logEvent(userId, role, "AI_FACE_MATCH_FAILED", "CASE:" + caseId, "Error: " + e.getMessage());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("jobId", jobId);
        response.put("caseId", caseId);
        response.put("jobStatus", "COMPLETED");
        response.put("message", "AI Analysis job completed successfully. Matches persisted for review.");
        response.put("provider", aiMatchingProvider.getProviderName());
        return ResponseEntity.ok(response);
    }

    // --- 2. POST /ai/analyze-upload & /cases/ai/analyze-upload ---
    @PostMapping(path = {"/ai/analyze-upload", "/cases/ai/analyze-upload"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Analyze uploaded photograph for face detection, image validity, and candidates")
    public ResponseEntity<Map<String, Object>> analyzeUpload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "allowMultipleFaces", defaultValue = "false") boolean allowMultipleFaces,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "SYSTEM") String userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "USER") String role) {

        try {
            com.misxmatch.casesvc.util.FileValidationUtil.validateFileUpload(file);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("status", "FAILED", "code", "INVALID_FILE_PAYLOAD", "message", e.getMessage()));
        }

        try {
            byte[] bytes = file.getBytes();
            Map<String, Object> faceDetectRes = aiMatchingProvider.detectFaces(bytes);

            int faceCount = 0;
            if (faceDetectRes.get("face_count") instanceof Number) {
                faceCount = ((Number) faceDetectRes.get("face_count")).intValue();
            }

            if (faceCount == 0) {
                auditLogService.logEvent(userId, role, "AI_UPLOAD_REJECTED", file.getOriginalFilename(), "Reason: No clear face detected");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "status", "FAILED",
                        "code", "NO_FACE_DETECTED",
                        "message", "No clear human face was detected in the uploaded image. Please provide a clear facial photograph."
                ));
            }

            if (faceCount > 1 && !allowMultipleFaces) {
                auditLogService.logEvent(userId, role, "AI_UPLOAD_REJECTED", file.getOriginalFilename(), "Reason: Multiple faces detected");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "status", "FAILED",
                        "code", "MULTIPLE_FACES_DETECTED",
                        "message", "Multiple faces detected (" + faceCount + "). Please upload an image with a single subject or select allowMultipleFaces.",
                        "detected_face_count", faceCount
                ));
            }

            auditLogService.logEvent(userId, role, "AI_UPLOAD_ANALYZED", file.getOriginalFilename(), "Face count: " + faceCount);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "SUCCESS");
            response.put("filename", file.getOriginalFilename());
            response.put("fileSize", file.getSize());
            response.put("faceCount", faceCount);
            response.put("faceDetails", faceDetectRes.get("faces"));
            response.put("provider", aiMatchingProvider.getProviderName());
            response.put("disclaimer", "AI-assisted / Possible Match — Requires Human Verification");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error analyzing uploaded file: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("status", "FAILED", "code", "SERVER_ERROR", "message", e.getMessage()));
        }
    }

    // --- 3. GET /ai/matches/{caseId} & /cases/ai/matches/{caseId} ---
    @GetMapping(path = {"/ai/matches/{caseId}", "/cases/ai/matches/{caseId}"})
    @Operation(summary = "Get candidate matches for a case with strict RBAC visibility and location masking")
    public ResponseEntity<List<Map<String, Object>>> getMatches(
            @PathVariable String caseId,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "GUEST") String userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "USER") String role) {

        auditLogService.logEvent(userId, role, "AI_MATCHES_VIEWED", "CASE:" + caseId, "Role: " + role);

        List<AiMatch> matches = aiMatchRepository.findBySourceCaseNumberOrTargetCaseNumber(caseId, caseId);
        if (matches.isEmpty()) {
            matches = aiMatchRepository.findByMissingCaseNumberOrFoundCaseNumber(caseId, caseId);
        }

        boolean isPoliceOrAdmin = "POLICE".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role) || "SUPER_ADMIN".equalsIgnoreCase(role);
        boolean isHospitalOrNgo = "HOSPITAL".equalsIgnoreCase(role) || "NGO".equalsIgnoreCase(role);

        // Fetch case to verify reporter ownership for public users
        Optional<MissingPerson> mpOpt = missingPersonRepository.findByCaseNumber(caseId);
        boolean isOwner = mpOpt.isPresent() && userId.equalsIgnoreCase(mpOpt.get().getReportedBy());

        List<Map<String, Object>> responseList = new ArrayList<>();

        for (AiMatch m : matches) {
            // RBAC Filtering Logic:
            // 1. Police/Admin see all matches.
            // 2. Hospital/NGO see matches with summary statement.
            // 3. Public User sees matches ONLY if owner AND match is APPROVED by police/admin.
            if (!isPoliceOrAdmin && !isHospitalOrNgo) {
                if (!isOwner || !"APPROVED".equalsIgnoreCase(m.getMatchStatus()) && !"VERIFIED_MATCH".equalsIgnoreCase(m.getMatchStatus())) {
                    continue; // Skip unauthorized match display for citizen
                }
            }

            Map<String, Object> dto = new HashMap<>();
            dto.put("id", m.getId());
            dto.put("matchId", m.getId());
            dto.put("missingCaseNumber", m.getMissingCaseNumber());
            dto.put("foundCaseNumber", m.getFoundCaseNumber());
            dto.put("sourceCaseNumber", m.getSourceCaseNumber());
            dto.put("targetCaseNumber", m.getTargetCaseNumber());
            dto.put("targetReportType", m.getTargetReportType());
            dto.put("targetName", m.getTargetName());
            dto.put("targetPhotoUrl", m.getTargetPhotoUrl());
            dto.put("matchStatus", m.getMatchStatus());

            // Mask exact location for public users
            if (isPoliceOrAdmin) {
                dto.put("targetLocation", m.getTargetLocation());
                dto.put("explanation", m.getExplanation());
                dto.put("reviewNotes", m.getReviewNotes());
                dto.put("reviewedBy", m.getReviewedBy());
            } else {
                dto.put("targetLocation", maskLocation(m.getTargetLocation()));
                dto.put("explanation", "Possible match submitted for police verification.");
            }

            // Score breakdown
            dto.put("similarityScore", m.getSimilarityScore());
            dto.put("finalScore", m.getFinalScore());
            dto.put("overallScore", m.getFinalScore());
            dto.put("confidenceLevel", m.getConfidenceLevel());

            AiScoreCalculatorService.ScoreResult scoreRes = scoreCalculatorService.calculateWeightedScore(
                    m.getFaceScore(), m.getTextScore(), m.getClothingScore(), m.getLocationScore(), m.getTimelineScore()
            );
            dto.put("confidenceBand", scoreRes.getConfidenceBand());
            dto.put("bandDescription", scoreRes.getBandDescription());

            Map<String, Object> scoresMap = new HashMap<>();
            scoresMap.put("faceSimilarity", scoreRes.getFaceScore());
            scoresMap.put("textSimilarity", scoreRes.getTextScore());
            scoresMap.put("clothingSimilarity", scoreRes.getClothingScore());
            scoresMap.put("locationSimilarity", scoreRes.getLocationScore());
            scoresMap.put("timelineSimilarity", scoreRes.getTimelineScore());
            dto.put("componentScores", scoresMap);

            dto.put("disclaimer", "Possible Match — Requires Human Verification");
            dto.put("createdAt", m.getCreatedAt());
            responseList.add(dto);
        }

        return ResponseEntity.ok(responseList);
    }

    // --- 4. GET /ai/matches/{caseId}/{matchId} ---
    @GetMapping(path = {"/ai/matches/{caseId}/{matchId}", "/cases/ai/matches/{caseId}/{matchId}"})
    @Operation(summary = "Get single candidate match detail")
    public ResponseEntity<Map<String, Object>> getMatchDetail(
            @PathVariable String caseId,
            @PathVariable Long matchId,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "GUEST") String userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "USER") String role) {

        auditLogService.logEvent(userId, role, "AI_MATCH_DETAIL_VIEWED", "MATCH:" + matchId, "Case: " + caseId);
        Optional<AiMatch> opt = aiMatchRepository.findById(matchId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        AiMatch m = opt.get();
        return ResponseEntity.ok(Map.of("matchId", m.getId(), "matchStatus", m.getMatchStatus(), "finalScore", m.getFinalScore(), "explanation", m.getExplanation()));
    }

    // --- 5. POST /ai/matches/{matchId}/review ---
    @PostMapping(path = {"/ai/matches/{matchId}/review", "/cases/ai/matches/{matchId}/review"})
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Review a possible match (Police/Admin only)")
    public ResponseEntity<Map<String, Object>> reviewMatch(
            @PathVariable Long matchId,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "POLICE_OFFICER") String userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "POLICE") String role) {

        Optional<AiMatch> opt = aiMatchRepository.findById(matchId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        AiMatch match = opt.get();
        String action = body.get("action"); // APPROVE or REJECT
        String notes = body.get("notes") != null ? body.get("notes") : body.get("reviewNotes");

        if ("APPROVE".equalsIgnoreCase(action) || "APPROVED".equalsIgnoreCase(action)) {
            match.setMatchStatus("APPROVED");
        } else if ("REJECT".equalsIgnoreCase(action) || "REJECTED".equalsIgnoreCase(action)) {
            match.setMatchStatus("REJECTED");
        } else {
            return ResponseEntity.badRequest().body(Map.of("status", "FAILED", "message", "Invalid action. Use APPROVE or REJECT."));
        }

        match.setReviewedBy(userId);
        match.setReviewedAt(LocalDateTime.now());
        match.setReviewNotes(notes);
        aiMatchRepository.save(match);

        // Immutable Audit Log
        auditLogService.logEvent(userId, role, "AI_MATCH_REVIEWED", "MATCH:" + matchId, "Action: " + action + ", Notes: " + notes);
        auditLogClient.logAsync(userId, role, "AI_MATCH_REVIEWED", "Match #" + matchId + " reviewed: " + action + " (Notes: " + (notes != null ? notes : "None") + ")");

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "matchId", matchId,
                "matchStatus", match.getMatchStatus(),
                "reviewedBy", userId,
                "disclaimer", "Possible Match Review Updated — Does not automatically confirm legal identity"
        ));
    }

    // --- 6. POST /ai/matches/{matchId}/manual-verification ---
    @PostMapping(path = {"/ai/matches/{matchId}/manual-verification", "/cases/ai/matches/{matchId}/manual-verification"})
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Request manual field verification for a match (Police/Admin only)")
    public ResponseEntity<Map<String, Object>> requestManualVerification(
            @PathVariable Long matchId,
            @RequestBody(required = false) Map<String, String> body,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "POLICE_OFFICER") String userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "POLICE") String role) {

        Optional<AiMatch> opt = aiMatchRepository.findById(matchId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        AiMatch match = opt.get();
        match.setMatchStatus("MANUAL_VERIFICATION_REQUESTED");
        match.setReviewedBy(userId);
        match.setReviewedAt(LocalDateTime.now());
        if (body != null && body.containsKey("notes")) {
            match.setReviewNotes(body.get("notes"));
        }
        aiMatchRepository.save(match);

        auditLogService.logEvent(userId, role, "AI_MATCH_MANUAL_VERIFICATION_REQUESTED", "MATCH:" + matchId, "Officer: " + userId);
        auditLogClient.logAsync(userId, role, "MANUAL_VERIFICATION_REQUESTED", "Requested manual field verification for AI match #" + matchId);

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "matchId", matchId,
                "matchStatus", "MANUAL_VERIFICATION_REQUESTED",
                "message", "Manual field verification request registered."
        ));
    }

    // --- 7. GET /ai/case-priority/{caseId} & /cases/ai/case-priority/{caseId} ---
    @GetMapping(path = {"/ai/case-priority/{caseId}", "/cases/ai/case-priority/{caseId}"})
    @Operation(summary = "Calculate explainable case risk priority score")
    public ResponseEntity<Map<String, Object>> getCasePriority(
            @PathVariable String caseId,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "SYSTEM") String userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "USER") String role) {

        auditLogService.logEvent(userId, role, "AI_CASE_PRIORITY_ACCESSED", "CASE:" + caseId, "Accessed case priority");

        Optional<MissingPerson> mpOpt = missingPersonRepository.findByCaseNumber(caseId);
        MissingPerson mp = mpOpt.orElse(null);

        AiScoreCalculatorService.RiskPriorityResult riskRes = scoreCalculatorService.calculateCaseRiskPriority(mp);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("caseId", caseId);
        response.put("priorityLevel", riskRes.getPriorityLevel());
        response.put("riskScore", riskRes.getRiskScore());
        response.put("reasons", riskRes.getPriorityReasons());
        response.put("disclaimer", "Risk priority strictly categorizes lead urgency for human review.");
        return ResponseEntity.ok(response);
    }

    // --- 8. GET /ai/health & /cases/ai/health ---
    @GetMapping(path = {"/ai/health", "/cases/ai/health"})
    @Operation(summary = "Get AI integration service health and provider capabilities")
    public ResponseEntity<Map<String, Object>> getHealth() {
        return ResponseEntity.ok(Map.of(
                "status", "HEALTHY",
                "service", "misxmatch-case-service-ai-integration",
                "activeProvider", aiMatchingProvider.getProviderName(),
                "timestamp", LocalDateTime.now().toString(),
                "capabilities", List.of(
                        "face_similarity_matching",
                        "text_similarity_matching",
                        "location_timeline_distance",
                        "configurable_weighted_confidence_bands",
                        "risk_priority_assessment",
                        "immutable_audit_logging",
                        "rbac_match_review"
                ),
                "disclaimer", "AI-assisted predictions — strictly for human review prioritization"
        ));
    }

    private String maskLocation(String location) {
        if (location == null || location.isBlank()) return "Protected Jurisdiction";
        String[] parts = location.split(",");
        if (parts.length > 1) {
            return parts[parts.length - 1].trim(); // Return state/city level only
        }
        return location.replaceAll("(?i)\\b\\d+\\s+[^,]+", "Area"); // Mask street numbers
    }
}
