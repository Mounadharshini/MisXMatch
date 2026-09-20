package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.client.AiServiceClient;
import com.misxmatch.casesvc.dto.ai.AiCandidateAnalysisResponse;
import com.misxmatch.casesvc.dto.ai.AiMultiMatchRequest;
import com.misxmatch.casesvc.dto.ai.AiMultiMatchResponse;
import com.misxmatch.casesvc.entity.AiMatchResult;
import com.misxmatch.casesvc.entity.CaseStatus;
import com.misxmatch.casesvc.entity.FoundPerson;
import com.misxmatch.casesvc.entity.MissingPerson;
import com.misxmatch.casesvc.entity.Sighting;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AiCandidateOrchestrationTest {

    @Mock
    private AiServiceClient aiServiceClient;

    @Mock
    private AiResultPersistenceService resultPersistenceService;

    @Mock
    private MissingPersonRepository missingPersonRepository;

    @Mock
    private FoundPersonRepository foundPersonRepository;

    @Mock
    private SightingRepository sightingRepository;

    @InjectMocks
    private AiIntegrationServiceImpl aiIntegrationService;

    private MissingPerson testMissingPerson;
    private FoundPerson testFoundPersonEligible;
    private FoundPerson testFoundPersonIneligible;
    private Sighting testSighting;

    @BeforeEach
    void setUp() {
        testMissingPerson = MissingPerson.builder()
                .id(1L)
                .caseNumber("MP-1001")
                .name("Alex Mercer")
                .age(25)
                .gender("Male")
                .description("Wearing blue denim jacket and black boots")
                .lastSeenLocation("Central Station, Cityville")
                .lastSeenDate(LocalDate.now().minusDays(2))
                .status(CaseStatus.OPEN)
                .build();

        testFoundPersonEligible = FoundPerson.builder()
                .id(10L)
                .caseNumber("FP-2001")
                .approximateName("Unidentified Male")
                .approximateAge(26)
                .gender("Male")
                .description("Found wearing dark denim jacket")
                .foundLocation("North Terminal, Cityville")
                .foundDate(LocalDate.now().minusDays(1))
                .status(CaseStatus.OPEN)
                .build();

        testFoundPersonIneligible = FoundPerson.builder()
                .id(11L)
                .caseNumber("FP-2002")
                .approximateName("Senior Female")
                .approximateAge(75) // Age diff > 25 -> pre-filtered
                .gender("Female")
                .status(CaseStatus.OPEN)
                .build();

        testSighting = Sighting.builder()
                .id(5L)
                .missingCaseNumber("MP-1001")
                .location("Downtown Plaza")
                .description("Person matching description spotted near cafe")
                .sightedAt(LocalDateTime.now().minusHours(5))
                .build();
    }

    @Test
    @DisplayName("Should orchestrate candidate retrieval, pre-filter, call AI multi-match, persist and rank results")
    void testAnalyzeCaseCandidates_Success() {
        when(missingPersonRepository.findByCaseNumber("MP-1001")).thenReturn(Optional.of(testMissingPerson));
        when(foundPersonRepository.findAll()).thenReturn(List.of(testFoundPersonEligible, testFoundPersonIneligible));
        when(sightingRepository.findAll()).thenReturn(List.of(testSighting));

        AiMultiMatchResponse responseFp = AiMultiMatchResponse.builder()
                .success(true)
                .overallScore(0.94)
                .classification("HIGH_CONFIDENCE_MATCH")
                .availableFactorsCount(3)
                .build();

        AiMultiMatchResponse responseSighting = AiMultiMatchResponse.builder()
                .success(true)
                .overallScore(0.81)
                .classification("MODERATE_CONFIDENCE_MATCH")
                .availableFactorsCount(2)
                .build();

        when(aiServiceClient.compareMultiFactor(any(AiMultiMatchRequest.class)))
                .thenReturn(responseFp)
                .thenReturn(responseSighting);

        AiMatchResult resultFp = AiMatchResult.builder()
                .id(100L)
                .sourceCaseId("MP-1001")
                .candidateCaseId("FP-2001")
                .overallScore(BigDecimal.valueOf(0.9400))
                .classification("HIGH_CONFIDENCE_MATCH")
                .faceScore(BigDecimal.valueOf(0.9600))
                .textScore(BigDecimal.valueOf(0.9100))
                .availableFactorsCount(3)
                .analysisTimestamp(LocalDateTime.now())
                .build();

        AiMatchResult resultSighting = AiMatchResult.builder()
                .id(101L)
                .sourceCaseId("MP-1001")
                .candidateCaseId("SIGHTING-5")
                .overallScore(BigDecimal.valueOf(0.8100))
                .classification("MODERATE_CONFIDENCE_MATCH")
                .textScore(BigDecimal.valueOf(0.8500))
                .availableFactorsCount(2)
                .analysisTimestamp(LocalDateTime.now())
                .build();

        when(resultPersistenceService.saveMatchResult(eq("MP-1001"), eq("FP-2001"), any())).thenReturn(resultFp);
        when(resultPersistenceService.saveMatchResult(eq("MP-1001"), eq("SIGHTING-5"), any())).thenReturn(resultSighting);
        when(resultPersistenceService.getMatchesForCase("MP-1001")).thenReturn(List.of(resultFp, resultSighting));
        when(foundPersonRepository.findByCaseNumber("FP-2001")).thenReturn(Optional.of(testFoundPersonEligible));
        when(sightingRepository.findById(5L)).thenReturn(Optional.of(testSighting));

        AiCandidateAnalysisResponse response = aiIntegrationService.analyzeCaseCandidates("MP-1001");

        assertNotNull(response);
        assertEquals("MP-1001", response.getCaseId());
        assertEquals("COMPLETED", response.getStatus());
        assertEquals(2, response.getTotalCandidatesChecked());
        assertEquals(2, response.getMatchesFound());
        assertEquals(2, response.getMatches().size());

        // Verify ranking order (0.94 score candidate must be first)
        assertEquals("FP-2001", response.getMatches().get(0).getCandidateId());
        assertEquals(BigDecimal.valueOf(0.9400), response.getMatches().get(0).getOverallScore());
        assertEquals("SIGHTING-5", response.getMatches().get(1).getCandidateId());
        assertEquals(BigDecimal.valueOf(0.8100), response.getMatches().get(1).getOverallScore());

        // Verify human verification disclaimer is attached
        assertTrue(response.getMatches().get(0).getDisclaimer().contains("Human verification is required"));
    }

    @Test
    @DisplayName("Should handle single candidate AI failure gracefully without aborting batch")
    void testAnalyzeCaseCandidates_CandidateAiFailure_DoesNotFailBatch() {
        when(missingPersonRepository.findByCaseNumber("MP-1001")).thenReturn(Optional.of(testMissingPerson));
        when(foundPersonRepository.findAll()).thenReturn(List.of(testFoundPersonEligible));
        when(sightingRepository.findAll()).thenReturn(List.of(testSighting));

        // FP-2001 fails AI call, SIGHTING-5 succeeds
        when(aiServiceClient.compareMultiFactor(any(AiMultiMatchRequest.class)))
                .thenThrow(new RuntimeException("AI Microservice timeout"))
                .thenReturn(AiMultiMatchResponse.builder().success(true).overallScore(0.85).classification("HIGH").build());

        AiMatchResult resultSighting = AiMatchResult.builder()
                .id(101L)
                .sourceCaseId("MP-1001")
                .candidateCaseId("SIGHTING-5")
                .overallScore(BigDecimal.valueOf(0.8500))
                .classification("HIGH")
                .analysisTimestamp(LocalDateTime.now())
                .build();

        when(resultPersistenceService.saveMatchResult(eq("MP-1001"), eq("SIGHTING-5"), any())).thenReturn(resultSighting);
        when(resultPersistenceService.getMatchesForCase("MP-1001")).thenReturn(List.of(resultSighting));
        when(sightingRepository.findById(5L)).thenReturn(Optional.of(testSighting));

        AiCandidateAnalysisResponse response = aiIntegrationService.analyzeCaseCandidates("MP-1001");

        assertNotNull(response);
        assertEquals(2, response.getTotalCandidatesChecked());
        assertEquals(1, response.getMatchesFound());
        assertEquals(1, response.getMatches().size());
        assertEquals("SIGHTING-5", response.getMatches().get(0).getCandidateId());
    }
}
