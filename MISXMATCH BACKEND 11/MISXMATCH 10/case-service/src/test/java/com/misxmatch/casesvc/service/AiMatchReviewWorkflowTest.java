package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.entity.AiMatchResult;
import com.misxmatch.casesvc.entity.ReviewStatus;
import com.misxmatch.casesvc.repository.AiMatchResultRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AiMatchReviewWorkflowTest {

    @Mock
    private AiMatchResultRepository matchResultRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private com.misxmatch.casesvc.client.NotificationClient notificationClient;

    @InjectMocks
    private AiResultPersistenceServiceImpl resultPersistenceService;

    private AiMatchResult testMatchResult;

    @BeforeEach
    void setUp() {
        testMatchResult = AiMatchResult.builder()
                .id(100L)
                .sourceCaseId("MP-5001")
                .candidateCaseId("FP-7001")
                .faceScore(BigDecimal.valueOf(0.9500))
                .textScore(BigDecimal.valueOf(0.9100))
                .attributeScore(BigDecimal.valueOf(0.8800))
                .locationScore(BigDecimal.valueOf(0.9300))
                .timeScore(BigDecimal.valueOf(0.8900))
                .overallScore(BigDecimal.valueOf(0.9340))
                .classification("HIGH_CONFIDENCE_MATCH")
                .reviewStatus(ReviewStatus.PENDING_REVIEW)
                .analysisTimestamp(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Should successfully confirm match review decision and log audit entry while keeping AI scores immutable")
    void testUpdateMatchReview_ConfirmMatch_Success() {
        when(matchResultRepository.findById(100L)).thenReturn(Optional.of(testMatchResult));
        when(matchResultRepository.save(any(AiMatchResult.class))).thenAnswer(i -> i.getArgument(0));

        AiMatchResult updated = resultPersistenceService.updateMatchReview(
                100L,
                ReviewStatus.CONFIRMED_MATCH,
                "Officer_Sharma",
                "POLICE",
                "Identity verified via physical evidence and family photo match."
        );

        assertNotNull(updated);
        assertEquals(ReviewStatus.CONFIRMED_MATCH, updated.getReviewStatus());
        assertEquals("Officer_Sharma", updated.getReviewedBy());
        assertNotNull(updated.getReviewedAt());
        assertEquals("Identity verified via physical evidence and family photo match.", updated.getReviewComment());

        // IMPLICIT VERIFICATION: AI Scores must remain 100% untouched
        assertEquals(BigDecimal.valueOf(0.9500), updated.getFaceScore());
        assertEquals(BigDecimal.valueOf(0.9100), updated.getTextScore());
        assertEquals(BigDecimal.valueOf(0.8800), updated.getAttributeScore());
        assertEquals(BigDecimal.valueOf(0.9340), updated.getOverallScore());

        // Verify Audit Log was recorded
        verify(auditLogService, times(1)).logEvent(
                eq("Officer_Sharma"),
                eq("POLICE"),
                eq("AI_MATCH_REVIEW"),
                eq("MATCH:100"),
                contains("CONFIRMED_MATCH")
        );
    }

    @Test
    @DisplayName("Should fail review submission if comment is missing when status is REJECTED_MATCH")
    void testUpdateMatchReview_RejectMatch_RequiresComment() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                resultPersistenceService.updateMatchReview(
                        100L,
                        ReviewStatus.REJECTED_MATCH,
                        "Officer_Sharma",
                        "POLICE",
                        "   " // Empty/whitespace comment
                )
        );

        assertTrue(ex.getMessage().contains("Review comment is required"));
        verifyNoInteractions(auditLogService);
    }

    @Test
    @DisplayName("Should reject match review when match ID is not found in MySQL")
    void testUpdateMatchReview_NotFound() {
        when(matchResultRepository.findById(999L)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                resultPersistenceService.updateMatchReview(
                        999L,
                        ReviewStatus.CONFIRMED_MATCH,
                        "Officer_Sharma",
                        "POLICE",
                        "Valid comment"
                )
        );

        assertTrue(ex.getMessage().contains("AI Match Result not found"));
    }
}
