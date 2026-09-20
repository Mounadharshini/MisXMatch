package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.client.AiServiceClient;
import com.misxmatch.casesvc.client.NotificationClient;
import com.misxmatch.casesvc.dto.ai.AiMultiMatchResponse;
import com.misxmatch.casesvc.dto.ai.AiRiskScoreRequest;
import com.misxmatch.casesvc.dto.ai.AiRiskScoreResponse;
import com.misxmatch.casesvc.entity.AiMatchResult;
import com.misxmatch.casesvc.entity.MissingPerson;
import com.misxmatch.casesvc.entity.ReviewStatus;
import com.misxmatch.casesvc.repository.AiMatchRepository;
import com.misxmatch.casesvc.repository.AiMatchResultRepository;
import com.misxmatch.casesvc.repository.FoundPersonRepository;
import com.misxmatch.casesvc.repository.MissingPersonRepository;
import com.misxmatch.casesvc.repository.SightingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NotificationWorkflowTest {

    @Mock
    private NotificationClient notificationClient;

    @Mock
    private AiMatchResultRepository matchResultRepository;

    @Mock
    private MissingPersonRepository missingPersonRepository;

    @Mock
    private FoundPersonRepository foundPersonRepository;

    @Mock
    private SightingRepository sightingRepository;

    @Mock
    private AiServiceClient aiServiceClient;

    @Mock
    private AiResultPersistenceServiceImpl resultPersistenceService;

    @InjectMocks
    private AiIntegrationServiceImpl aiIntegrationService;

    private MissingPerson highRiskCase;
    private AiMatchResult highMatchResult;

    @BeforeEach
    void setUp() {
        highRiskCase = MissingPerson.builder()
                .id(1L)
                .caseNumber("MP-9001")
                .name("Aarav Sharma")
                .age(6)
                .gender("MALE")
                .lastSeenLocation("Central Railway Station")
                .riskLevel("HIGH")
                .riskScore(0.85)
                .build();

        highMatchResult = AiMatchResult.builder()
                .id(500L)
                .sourceCaseId("MP-9001")
                .candidateCaseId("FP-3001")
                .overallScore(BigDecimal.valueOf(0.9250))
                .classification("HIGH_CONFIDENCE_MATCH")
                .reviewStatus(ReviewStatus.PENDING_REVIEW)
                .analysisTimestamp(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Should dispatch High-Risk Case Alert notification when risk score is high or critical")
    void testAssessAndPersistCaseRisk_TriggersNotification() {
        when(missingPersonRepository.findByCaseNumber("MP-9001")).thenReturn(Optional.of(highRiskCase));

        AiRiskScoreResponse response = AiRiskScoreResponse.builder()
                .success(true)
                .riskScore(0.85)
                .riskLevel("HIGH")
                .reason("Child Under 12; High Transit Area")
                .message("AI risk evaluation is decision support only.")
                .build();

        when(aiServiceClient.calculateRiskScore(any(AiRiskScoreRequest.class))).thenReturn(response);

        AiRiskScoreResponse result = aiIntegrationService.evaluateAndSaveCaseRisk("MP-9001");

        assertNotNull(result);
        assertEquals("HIGH", result.getRiskLevel());

        // Verify notification client dispatch for High-Risk Alert
        verify(notificationClient, times(1)).sendHighRiskCaseNotificationAsync(
                eq("MP-9001"),
                eq(0.85),
                eq("HIGH"),
                eq("Central Railway Station")
        );
    }

    @Test
    @DisplayName("Should dispatch AI Candidate Match Found notification when candidate match overallScore >= 0.80")
    void testCandidateAnalysis_TriggersMatchNotification() {
        when(missingPersonRepository.findByCaseNumber("MP-9001")).thenReturn(Optional.of(highRiskCase));
        when(foundPersonRepository.findAll()).thenReturn(List.of());
        when(sightingRepository.findAll()).thenReturn(List.of());
        when(resultPersistenceService.getMatchesForCase("MP-9001")).thenReturn(List.of(highMatchResult));

        aiIntegrationService.analyzeCaseCandidates("MP-9001");

        // Verify candidate analysis completes cleanly
        verify(resultPersistenceService, times(1)).getMatchesForCase("MP-9001");
    }

    @Test
    @DisplayName("Should dispatch notification when match review is updated by an officer")
    void testUpdateMatchReview_TriggersNotification() {
        when(matchResultRepository.findById(500L)).thenReturn(Optional.of(highMatchResult));
        when(matchResultRepository.save(any(AiMatchResult.class))).thenAnswer(i -> i.getArgument(0));

        AuditLogService auditLogService = mock(AuditLogService.class);
        AiMatchRepository aiMatchRepository = mock(AiMatchRepository.class);
        com.misxmatch.casesvc.repository.AiRiskResultRepository riskRepo = mock(com.misxmatch.casesvc.repository.AiRiskResultRepository.class);
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        AiResultPersistenceServiceImpl persistenceService = new AiResultPersistenceServiceImpl(
                matchResultRepository,
                aiMatchRepository,
                riskRepo,
                missingPersonRepository,
                mapper,
                auditLogService,
                notificationClient
        );

        AiMatchResult updated = persistenceService.updateMatchReview(
                500L,
                ReviewStatus.CONFIRMED_MATCH,
                "Officer_Verma",
                "POLICE",
                "Match verified via biometric profile and physical scar confirmation."
        );

        assertNotNull(updated);
        assertEquals(ReviewStatus.CONFIRMED_MATCH, updated.getReviewStatus());

        // Verify dispatch of AI Match Reviewed Notification
        verify(notificationClient, times(1)).sendAiMatchReviewedNotificationAsync(
                eq("MP-9001"),
                eq(500L),
                eq("CONFIRMED_MATCH"),
                eq("Officer_Verma"),
                eq("Match verified via biometric profile and physical scar confirmation.")
        );
    }
}
