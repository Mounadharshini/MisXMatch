package com.misxmatch.casesvc.controller;

import com.misxmatch.casesvc.service.AiEvaluationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AiEvaluationController
 * ======================
 * Admin-only REST Controller exposing endpoints for AI evaluation metrics, calibration thresholds,
 * model versioning metadata, and MySQL human review decision correlations.
 */
@Slf4j
@RestController
@RequestMapping({"/admin/ai/evaluation", "/api/admin/ai/evaluation"})
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AiEvaluationController {

    private final AiEvaluationService evaluationService;

    /**
     * GET /api/admin/ai/evaluation/dashboard
     * Returns consolidated evaluation dashboard metrics.
     */
    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getConsolidatedDashboard(
            @RequestParam(value = "faceThreshold", defaultValue = "0.75") double faceThreshold,
            @RequestParam(value = "textThreshold", defaultValue = "0.65") double textThreshold) {

        log.info("REST request to fetch consolidated AI evaluation dashboard for Admin");
        Map<String, Object> result = evaluationService.getConsolidatedEvaluationDashboard(faceThreshold, textThreshold);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/admin/ai/evaluation/human-review
     * Returns human officer review outcomes correlation telemetry.
     */
    @GetMapping("/human-review")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getHumanReviewFeedbackCorrelation() {
        log.info("REST request to fetch human review feedback correlation telemetry");
        Map<String, Object> result = evaluationService.getHumanReviewFeedbackCorrelation();
        return ResponseEntity.ok(result);
    }
}
