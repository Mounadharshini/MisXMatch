package com.misxmatch.casesvc.controller;

import com.misxmatch.casesvc.dto.ai.CaseIntelligenceResponse;
import com.misxmatch.casesvc.service.CaseIntelligenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * CaseIntelligenceController
 * ==========================
 * Spring Boot REST Controller exposing operational AI case decision-support intelligence endpoints.
 * Endpoint: `GET /cases/{caseNumber}/intelligence` and `GET /api/cases/{caseNumber}/intelligence`.
 */
@Slf4j
@RestController
@RequestMapping({"/cases", "/api/cases"})
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CaseIntelligenceController {

    private final CaseIntelligenceService intelligenceService;

    /**
     * GET /api/cases/{caseNumber}/intelligence
     * Retrieves aggregated AI decision-support intelligence payload for a missing person case.
     * Enforces RBAC & IDOR authorization for requesting user headers.
     */
    @GetMapping("/{caseNumber}/intelligence")
    public ResponseEntity<CaseIntelligenceResponse> getCaseIntelligence(
            @PathVariable("caseNumber") String caseNumber,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "PUBLIC_USER") String username,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "PUBLIC_USER") String userRole) {

        log.info("REST request to fetch decision-support case intelligence for case {}: user={}, role={}",
                caseNumber, username, userRole);

        CaseIntelligenceResponse response = intelligenceService.getCaseIntelligence(caseNumber, username, userRole);
        return ResponseEntity.ok(response);
    }
}
