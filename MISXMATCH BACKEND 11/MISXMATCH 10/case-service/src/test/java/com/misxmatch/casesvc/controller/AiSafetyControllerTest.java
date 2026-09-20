package com.misxmatch.casesvc.controller;

import com.misxmatch.casesvc.service.AiSafetyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

class AiSafetyControllerTest {

    @Mock
    private AiSafetyService aiSafetyService;

    @InjectMocks
    private AiSafetyController aiSafetyController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testAssessQuality_Success() {
        Map<String, Object> mockRes = new HashMap<>();
        mockRes.put("usableForMatching", true);
        mockRes.put("imageQualityScore", 85.0);

        when(aiSafetyService.assessQuality(any(), any(), any(), any(), any(), any()))
                .thenReturn(mockRes);

        Map<String, Object> body = new HashMap<>();
        body.put("caseId", "MP-20260001");
        body.put("evidenceId", "EVD-001");
        body.put("imageBase64", "base64data...");

        ResponseEntity<Map<String, Object>> response = aiSafetyController.assessQuality(body, "POLICE_OFFICER", "POLICE");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue((Boolean) response.getBody().get("usableForMatching"));
    }

    @Test
    void testAssessQuality_MissingBase64_BadRequest() {
        Map<String, Object> body = new HashMap<>();
        body.put("caseId", "MP-20260001");

        ResponseEntity<Map<String, Object>> response = aiSafetyController.assessQuality(body, "USER1", "USER");
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void testGenerateCandidateLead_Success() {
        Map<String, Object> mockLead = new HashMap<>();
        mockLead.put("leadId", "LEAD-MP-01-FP-02");
        mockLead.put("decisionStatus", "REVIEW_REQUIRED");
        mockLead.put("calibratedConfidence", 88.5);

        when(aiSafetyService.generateCandidateLead(anyString(), anyString(), any(), any(), any(), any(), any(), any(), anyString(), anyString()))
                .thenReturn(mockLead);

        Map<String, Object> body = new HashMap<>();
        body.put("sourceCaseNumber", "MP-01");
        body.put("targetCaseNumber", "FP-02");
        body.put("faceScore", 0.85);

        ResponseEntity<Map<String, Object>> response = aiSafetyController.generateCandidateLead(body, "POLICE1", "POLICE");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("REVIEW_REQUIRED", response.getBody().get("decisionStatus"));
    }

    @Test
    void testReviewLead_Success() {
        Map<String, Object> mockRes = Map.of("status", "SUCCESS", "decisionStatus", "APPROVED");
        when(aiSafetyService.reviewLead(eq("LEAD-001"), eq("APPROVED"), anyString(), anyString(), anyString()))
                .thenReturn(mockRes);

        Map<String, String> body = Map.of("leadId", "LEAD-001", "action", "APPROVED", "notes", "Verified");
        ResponseEntity<Map<String, Object>> response = aiSafetyController.reviewLead(body, "POLICE1", "POLICE");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("APPROVED", response.getBody().get("decisionStatus"));
    }
}
