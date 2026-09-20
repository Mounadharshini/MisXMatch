package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.dto.ai.CaseIntelligenceResponse;

/**
 * CaseIntelligenceService
 * =======================
 * Spring Boot Service interface for aggregating MySQL case records, AI match results,
 * vulnerability risk assessments, sightings, CCTV evidence sessions, and audit history
 * into a decision-support operational intelligence payload.
 */
public interface CaseIntelligenceService {

    /**
     * Generates a comprehensive decision-support intelligence summary for a missing person case.
     * Enforces RBAC & IDOR permission validation for requesting username and userRole.
     */
    CaseIntelligenceResponse getCaseIntelligence(String caseNumber, String username, String userRole);
}
