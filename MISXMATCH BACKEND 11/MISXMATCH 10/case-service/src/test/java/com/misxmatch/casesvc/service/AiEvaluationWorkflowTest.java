package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.client.AiServiceClient;
import com.misxmatch.casesvc.entity.AiMatchResult;
import com.misxmatch.casesvc.repository.AiMatchResultRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.misxmatch.casesvc.entity.ReviewStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class AiEvaluationWorkflowTest {

    @Mock
    private AiServiceClient aiServiceClient;

    @Mock
    private AiMatchResultRepository matchResultRepository;

    @InjectMocks
    private AiEvaluationServiceImpl evaluationService;

    private AiMatchResult matchConfirmed;
    private AiMatchResult matchRejected;
    private AiMatchResult matchPending;

    @BeforeEach
    void setUp() {
        matchConfirmed = AiMatchResult.builder()
                .id(1L)
                .sourceCaseId("MP-101")
                .candidateCaseId("FP-201")
                .overallScore(BigDecimal.valueOf(0.92))
                .reviewStatus(ReviewStatus.CONFIRMED_MATCH)
                .reviewedBy("Officer_Kumar")
                .build();

        matchRejected = AiMatchResult.builder()
                .id(2L)
                .sourceCaseId("MP-101")
                .candidateCaseId("FP-202")
                .overallScore(BigDecimal.valueOf(0.62))
                .reviewStatus(ReviewStatus.REJECTED_MATCH)
                .reviewedBy("Officer_Singh")
                .build();

        matchPending = AiMatchResult.builder()
                .id(3L)
                .sourceCaseId("MP-102")
                .candidateCaseId("FP-203")
                .overallScore(BigDecimal.valueOf(0.75))
                .reviewStatus(ReviewStatus.PENDING_REVIEW)
                .build();
    }

    @Test
    void testGetHumanReviewFeedbackCorrelation() {
        when(matchResultRepository.findAll()).thenReturn(List.of(matchConfirmed, matchRejected, matchPending));

        Map<String, Object> result = evaluationService.getHumanReviewFeedbackCorrelation();

        assertNotNull(result);
        assertEquals(3L, result.get("total_ai_matches_persisted"));
        assertEquals(1L, result.get("confirmed_matches"));
        assertEquals(1L, result.get("rejected_matches"));
        assertEquals(1L, result.get("pending_review_matches"));
        assertEquals(50.0, result.get("officer_confirmation_rate")); // 1 confirmed out of 2 reviewed = 50%
        assertEquals(0.92, result.get("avg_score_confirmed_matches"));
        assertEquals(0.62, result.get("avg_score_rejected_matches"));
        assertEquals(0.3, result.get("separation_gap"));
    }

    @Test
    void testGetConsolidatedEvaluationDashboard() {
        when(aiServiceClient.getFullEvaluationReport(anyDouble(), anyDouble()))
                .thenReturn(Map.of("status", "SUCCESS", "face_accuracy", 0.985));
        when(aiServiceClient.getCalibrationMetadata())
                .thenReturn(Map.of("status", "SUCCESS", "version", "1.0.0"));
        when(matchResultRepository.findAll()).thenReturn(List.of(matchConfirmed));

        Map<String, Object> dashboard = evaluationService.getConsolidatedEvaluationDashboard(0.75, 0.65);

        assertNotNull(dashboard);
        assertEquals("ACTIVE", dashboard.get("service_status"));
        assertTrue(dashboard.containsKey("python_model_evaluation"));
        assertTrue(dashboard.containsKey("calibration_metadata"));
        assertTrue(dashboard.containsKey("human_review_correlation"));
    }
}
