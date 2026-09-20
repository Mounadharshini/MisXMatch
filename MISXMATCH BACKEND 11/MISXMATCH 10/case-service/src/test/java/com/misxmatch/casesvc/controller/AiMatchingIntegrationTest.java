package com.misxmatch.casesvc.controller;

import com.misxmatch.casesvc.entity.AiMatch;
import com.misxmatch.casesvc.repository.AiMatchRepository;
import com.misxmatch.casesvc.repository.AuditLogRepository;
import com.misxmatch.casesvc.service.AiMatchingProvider;
import com.misxmatch.casesvc.service.SmartAiMatchingProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class AiMatchingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AiMatchRepository aiMatchRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private AiMatchingProvider aiMatchingProvider;

    private Long savedMatchId;

    @BeforeEach
    void setUp() {
        aiMatchRepository.deleteAll();

        AiMatch match = AiMatch.builder()
                .missingCaseNumber("MP-99001")
                .foundCaseNumber("FP-99001")
                .sourceCaseNumber("MP-99001")
                .targetCaseNumber("FP-99001")
                .sourceReportType("MISSING")
                .targetReportType("FOUND")
                .targetName("John Doe Candidate")
                .targetLocation("Mumbai, Maharashtra")
                .similarityScore(0.85)
                .finalScore(88.5)
                .confidenceLevel("HIGH")
                .faceScore(0.88)
                .textScore(0.82)
                .clothingScore(0.80)
                .locationScore(0.75)
                .timelineScore(0.90)
                .explanation("High similarity candidate")
                .matchStatus("PENDING_REVIEW")
                .matchSource(aiMatchingProvider.getProviderName())
                .requestedBy("POLICE_TEST")
                .build();

        AiMatch saved = aiMatchRepository.save(match);
        savedMatchId = saved.getId();
    }

    @Test
    @DisplayName("Verify Real AI Provider (SmartAiMatchingProvider) is selected as @Primary when profile is not test")
    void testRealProviderSelectedWhenProfileNotTest() {
        assertNotNull(aiMatchingProvider, "AiMatchingProvider bean should be present");
        assertTrue(aiMatchingProvider instanceof SmartAiMatchingProvider,
                "SmartAiMatchingProvider should be injected as @Primary when profile != test");
        assertTrue(aiMatchingProvider.getProviderName().contains("RealAiProvider"),
                "Provider name should indicate real AI provider engine");
    }

    @Test
    @DisplayName("GET /ai/health - Should return healthy status and active provider capabilities")
    void testGetHealth() throws Exception {
        mockMvc.perform(get("/ai/health")
                        .header("X-User-Id", "OFFICER_007")
                        .header("X-User-Role", "POLICE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("HEALTHY")))
                .andExpect(jsonPath("$.activeProvider", notNullValue()))
                .andExpect(jsonPath("$.capabilities", hasSize(greaterThan(3))));
    }

    @Test
    @DisplayName("POST /ai/analyze-case/{caseId} - Should trigger async AI analysis job")
    void testAnalyzeCase() throws Exception {
        mockMvc.perform(post("/ai/analyze-case/MP-99001")
                        .header("X-User-Id", "OFFICER_007")
                        .header("X-User-Role", "POLICE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUCCESS")))
                .andExpect(jsonPath("$.jobId", startsWith("JOB-")))
                .andExpect(jsonPath("$.caseId", is("MP-99001")));
    }

    @Test
    @DisplayName("POST /ai/analyze-upload - Validation reject empty or bad files")
    void testAnalyzeUploadValidationFailure() throws Exception {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "test.txt", "text/plain", new byte[0]);

        mockMvc.perform(multipart("/ai/analyze-upload")
                        .file(emptyFile)
                        .header("X-User-Id", "OFFICER_007")
                        .header("X-User-Role", "POLICE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is("FAILED")));
    }

    @Test
    @DisplayName("GET /ai/matches/{caseId} - Police role should receive full match breakdown")
    void testGetMatchesForPolice() throws Exception {
        mockMvc.perform(get("/ai/matches/MP-99001")
                        .header("X-User-Id", "OFFICER_007")
                        .header("X-User-Role", "POLICE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].targetLocation", is("Mumbai, Maharashtra")))
                .andExpect(jsonPath("$[0].componentScores", notNullValue()));
    }

    @Test
    @DisplayName("POST /ai/matches/{matchId}/review - Police approval should update status and create audit log")
    void testReviewMatchApproval() throws Exception {
        String reviewJson = "{\"action\":\"APPROVE\",\"notes\":\"Facial features and clothing match confirmed by field unit.\"}";

        mockMvc.perform(post("/ai/matches/" + savedMatchId + "/review")
                        .header("X-User-Id", "OFFICER_007")
                        .header("X-User-Role", "POLICE")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUCCESS")))
                .andExpect(jsonPath("$.matchStatus", is("APPROVED")));

        // Verify Audit Log persisted
        assertTrue(auditLogRepository.findAll().stream().anyMatch(l -> "AI_MATCH_REVIEWED".equals(l.getAction())));
    }

    @Test
    @DisplayName("POST /ai/matches/{matchId}/manual-verification - Police request field verification")
    void testRequestManualVerification() throws Exception {
        String reqJson = "{\"notes\":\"Officer dispatched to local shelter for identity check.\"}";

        mockMvc.perform(post("/ai/matches/" + savedMatchId + "/manual-verification")
                        .header("X-User-Id", "OFFICER_007")
                        .header("X-User-Role", "POLICE")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reqJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUCCESS")))
                .andExpect(jsonPath("$.matchStatus", is("MANUAL_VERIFICATION_REQUESTED")));
    }

    @Test
    @DisplayName("GET /ai/case-priority/{caseId} - Should return risk priority level and reasons")
    void testGetCasePriority() throws Exception {
        mockMvc.perform(get("/ai/case-priority/MP-99001")
                        .header("X-User-Id", "OFFICER_007")
                        .header("X-User-Role", "POLICE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUCCESS")))
                .andExpect(jsonPath("$.priorityLevel", notNullValue()))
                .andExpect(jsonPath("$.reasons", notNullValue()));
    }
}
