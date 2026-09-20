package com.misxmatch.casesvc.controller;

import com.misxmatch.casesvc.entity.AiAuditEvent;
import com.misxmatch.casesvc.service.AiSafetyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@Tag(name = "AI Safety & Intelligence Module", description = "Evidence quality gate, calibrated lead cards, CCTV temporal tracking, and audit logging")
public class AiSafetyController {

    private final AiSafetyService aiSafetyService;

    public AiSafetyController(AiSafetyService aiSafetyService) {
        this.aiSafetyService = aiSafetyService;
    }

    // --- 1. Evidence Quality & Uncertainty Gate ---
    @PostMapping(path = {"/cases/ai/safety/quality-assessment", "/ai/safety/quality-assessment"})
    @Operation(summary = "Capability A: Evidence-quality and uncertainty gate for uploaded case media")
    public ResponseEntity<Map<String, Object>> assessQuality(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "SYSTEM") String userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "USER") String role) {

        String caseId = (String) body.get("caseId");
        String evidenceId = (String) body.getOrDefault("evidenceId", "EVD-" + System.currentTimeMillis());
        String imageBase64 = (String) body.get("imageBase64");
        List<Map<String, Object>> detectedFaces = (List<Map<String, Object>>) body.get("detectedFaces");

        if (imageBase64 == null || imageBase64.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "FAILED",
                    "code", "INVALID_INPUT",
                    "message", "imageBase64 image data is required."
            ));
        }

        try {
            Map<String, Object> result = aiSafetyService.assessQuality(caseId, evidenceId, imageBase64, detectedFaces, userId, role);
            return ResponseEntity.ok(result);
        } catch (SecurityException se) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "status", "FAILED",
                    "code", "UNAUTHORIZED_CASE_ACCESS",
                    "message", se.getMessage()
            ));
        } catch (Exception e) {
            log.error("Quality assessment error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "FAILED",
                    "code", "SERVER_ERROR",
                    "message", e.getMessage()
            ));
        }
    }

    // --- 2. Calibrated Multimodal Candidate Card ---
    @GetMapping(path = {"/cases/ai/safety/candidate-explanation", "/ai/safety/candidate-explanation"})
    @Operation(summary = "Get candidate lead explanation for a case pair")
    public ResponseEntity<?> getCandidateLead(
            @RequestParam(required = false) String sourceCaseNumber,
            @RequestParam(required = false) String targetCaseNumber,
            @RequestParam(required = false) String caseId) {

        String src = sourceCaseNumber != null ? sourceCaseNumber : caseId;
        String tgt = targetCaseNumber;
        if (src == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "sourceCaseNumber or caseId is required"));
        }
        return aiSafetyService.getCandidateLead(src, tgt)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping(path = {"/cases/ai/safety/quality-assessment/{caseId}", "/ai/safety/quality-assessment/{caseId}"})
    @Operation(summary = "Get evidence quality assessment for a case")
    public ResponseEntity<?> getQualityAssessment(@PathVariable String caseId) {
        return aiSafetyService.getQualityAssessment(caseId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping(path = {"/cases/ai/safety/matches", "/ai/safety/matches"})
    @Operation(summary = "Get all AI candidate safety review leads")
    public ResponseEntity<List<com.misxmatch.casesvc.entity.AiCandidateLead>> getAllMatches() {
        return ResponseEntity.ok(aiSafetyService.getAllCandidateLeads());
    }

    @PostMapping(path = {"/cases/ai/safety/candidate-explanation", "/ai/safety/candidate-explanation"})
    @Operation(summary = "Capability B: Generate explainable lead card with calibrated confidence bands")
    public ResponseEntity<Map<String, Object>> generateCandidateLead(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "SYSTEM") String userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "USER") String role) {

        String sourceCaseId = (String) body.get("sourceCaseNumber");
        String targetCaseId = (String) body.get("targetCaseNumber");

        Double faceScore = asDouble(body.get("faceScore"));
        Double reidScore = asDouble(body.get("reidScore"));
        Double textScore = asDouble(body.get("textScore"));
        Double locationScore = asDouble(body.get("locationScore"));
        Double timelineScore = asDouble(body.get("timelineScore"));
        Map<String, Object> qualityAssessment = (Map<String, Object>) body.get("qualityAssessment");

        try {
            Map<String, Object> result = aiSafetyService.generateCandidateLead(
                    sourceCaseId, targetCaseId, faceScore, reidScore, textScore, locationScore, timelineScore, qualityAssessment, userId, role
            );
            return ResponseEntity.ok(result);
        } catch (SecurityException se) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "status", "FAILED",
                    "code", "UNAUTHORIZED_CASE_ACCESS",
                    "message", se.getMessage()
            ));
        } catch (Exception e) {
            log.error("Candidate explanation error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "FAILED",
                    "code", "SERVER_ERROR",
                    "message", e.getMessage()
            ));
        }
    }

    // --- 3. CCTV Temporal Continuity Lead ---
    @PostMapping(path = {"/cases/ai/safety/temporal-track", "/ai/safety/temporal-track"})
    @Operation(summary = "Capability C: Time-bounded CCTV temporal tracking across sampled frames")
    public ResponseEntity<Map<String, Object>> computeTemporalTrack(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "SYSTEM") String userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "USER") String role) {

        String caseId = (String) body.get("caseId");
        String cameraId = (String) body.getOrDefault("cameraId", "CAM-DEFAULT");
        String videoBase64 = (String) body.get("videoBase64");
        String startTimeIso = (String) body.get("startTimeIso");

        if (videoBase64 == null || videoBase64.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "FAILED",
                    "code", "INVALID_INPUT",
                    "message", "videoBase64 video payload is required."
            ));
        }

        try {
            Map<String, Object> result = aiSafetyService.processTemporalTrack(caseId, cameraId, videoBase64, startTimeIso, userId, role);
            return ResponseEntity.ok(result);
        } catch (SecurityException se) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "status", "FAILED",
                    "code", "UNAUTHORIZED_CASE_ACCESS",
                    "message", se.getMessage()
            ));
        } catch (Exception e) {
            log.error("Temporal track error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "FAILED",
                    "code", "SERVER_ERROR",
                    "message", e.getMessage()
            ));
        }
    }

    // --- 4. Review Lead Decision ---
    @PostMapping(path = {"/cases/ai/safety/review", "/ai/safety/review"})
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_HOSPITAL','ROLE_NGO')")
    @Operation(summary = "Review investigative lead (Confirm, Reject, or Request More Evidence)")
    public ResponseEntity<Map<String, Object>> reviewLead(
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "POLICE_OFFICER") String userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "POLICE") String role) {

        String leadId = body.get("leadId");
        String action = body.get("action");
        String notes = body.get("notes");

        if (leadId == null || action == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "FAILED",
                    "code", "INVALID_INPUT",
                    "message", "leadId and action parameters are required."
            ));
        }

        try {
            Map<String, Object> result = aiSafetyService.reviewLead(leadId, action, notes, userId, role);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException iae) {
            return ResponseEntity.badRequest().body(Map.of("status", "FAILED", "message", iae.getMessage()));
        } catch (Exception e) {
            log.error("Lead review error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("status", "FAILED", "message", e.getMessage()));
        }
    }

    // --- 5. Submit Human Feedback ---
    @PostMapping(path = {"/cases/ai/safety/feedback", "/ai/safety/feedback"})
    @Operation(summary = "Opt-in human reviewer feedback submission for offline model calibration")
    public ResponseEntity<Map<String, Object>> submitFeedback(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "USER") String userId) {

        String leadId = (String) body.get("leadId");
        String caseId = (String) body.get("caseId");
        String reviewerAction = (String) body.get("reviewerAction");
        Boolean optIn = body.get("optInForCalibration") instanceof Boolean ? (Boolean) body.get("optInForCalibration") : true;
        String notes = (String) body.get("feedbackNotes");

        Map<String, Object> result = aiSafetyService.submitFeedback(leadId, caseId, reviewerAction, optIn, notes, userId);
        return ResponseEntity.ok(result);
    }

    // --- 6. Immutable Audit Trail ---
    @GetMapping(path = {"/cases/ai/safety/audit-trail/{caseId}", "/ai/safety/audit-trail/{caseId}"})
    @Operation(summary = "Get immutable AI safety & decision audit records for a case")
    public ResponseEntity<List<AiAuditEvent>> getAuditTrail(
            @PathVariable String caseId,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "SYSTEM") String userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "USER") String role) {

        try {
            List<AiAuditEvent> auditEvents = aiSafetyService.getAuditTrail(caseId, userId, role);
            return ResponseEntity.ok(auditEvents);
        } catch (SecurityException se) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    private Double asDouble(Object val) {
        if (val instanceof Number) return ((Number) val).doubleValue();
        return null;
    }
}
