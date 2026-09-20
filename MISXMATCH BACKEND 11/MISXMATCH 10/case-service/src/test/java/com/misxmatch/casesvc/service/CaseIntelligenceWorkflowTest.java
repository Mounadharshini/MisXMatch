package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.dto.ai.CaseIntelligenceResponse;
import com.misxmatch.casesvc.entity.*;
import org.springframework.security.access.AccessDeniedException;
import com.misxmatch.casesvc.repository.AiMatchResultRepository;
import com.misxmatch.casesvc.repository.CctvAnalysisSessionRepository;
import com.misxmatch.casesvc.repository.MissingPersonRepository;
import com.misxmatch.casesvc.repository.SightingRepository;
import org.junit.jupiter.api.BeforeEach;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class CaseIntelligenceWorkflowTest {

    @Mock
    private MissingPersonRepository missingPersonRepository;

    @Mock
    private AiMatchResultRepository matchResultRepository;

    @Mock
    private SightingRepository sightingRepository;

    @Mock
    private CctvAnalysisSessionRepository cctvSessionRepository;

    @Mock
    private AiResultPersistenceService resultPersistenceService;

    @InjectMocks
    private CaseIntelligenceServiceImpl intelligenceService;

    private MissingPerson missingPerson;
    private AiMatchResult aiMatch;
    private Sighting sighting;

    @BeforeEach
    void setUp() {
        missingPerson = MissingPerson.builder()
                .id(1L)
                .caseNumber("MP-1001")
                .name("Rohan Sharma")
                .age(10)
                .gender("MALE")
                .lastSeenLocation("New Delhi Railway Station")
                .lastSeenDate(LocalDate.now().minusDays(2))
                .photoUrl("https://example.com/photo.jpg")
                .description("Wearing blue sweatshirt")
                .reportedBy("Parent_User")
                .status(CaseStatus.OPEN)
                .riskScore(0.85)
                .riskLevel("HIGH")
                .createdAt(LocalDateTime.now().minusDays(2))
                .build();

        aiMatch = AiMatchResult.builder()
                .id(100L)
                .sourceCaseId("MP-1001")
                .candidateCaseId("FP-2001")
                .overallScore(BigDecimal.valueOf(0.91))
                .faceScore(BigDecimal.valueOf(0.95))
                .textScore(BigDecimal.valueOf(0.85))
                .classification("HIGH_CONFIDENCE_MATCH")
                .reviewStatus(ReviewStatus.PENDING_REVIEW)
                .analysisTimestamp(LocalDateTime.now().minusHours(4))
                .build();

        sighting = Sighting.builder()
                .id(5L)
                .missingCaseNumber("MP-1001")
                .reportedBy("Citizen_Karan")
                .location("Platform 4, New Delhi Station")
                .verified(false)
                .sightedAt(LocalDateTime.now().minusHours(2))
                .build();
    }

    @Test
    void testGetCaseIntelligenceSuccessForPolice() {
        lenient().when(missingPersonRepository.findByCaseNumber("MP-1001")).thenReturn(Optional.of(missingPerson));
        lenient().when(matchResultRepository.findBySourceCaseIdOrderByOverallScoreDesc("MP-1001")).thenReturn(List.of(aiMatch));
        lenient().when(sightingRepository.findByMissingCaseNumberOrderBySightedAtDesc("MP-1001")).thenReturn(List.of(sighting));
        lenient().when(cctvSessionRepository.findByTopMatchedCaseNumber("MP-1001")).thenReturn(List.of());
        lenient().when(cctvSessionRepository.findAll()).thenReturn(List.of());

        CaseIntelligenceResponse intel = intelligenceService.getCaseIntelligence("MP-1001", "Officer_Verma", "POLICE");

        assertNotNull(intel);
        assertEquals("MP-1001", intel.getCaseNumber());
        assertEquals("Rohan Sharma", intel.getPersonName());
        assertEquals("URGENT_EMERGENCY", intel.getOperationalPriority().getPriorityLevel()); // Age 10 + High Risk = Emergency
        assertEquals(1, intel.getTopCandidates().size());
        assertEquals("FP-2001", intel.getTopCandidates().get(0).getCandidateCaseId());
        assertEquals(1, intel.getSightingsIntelligence().getTotalSightingsCount());
        assertTrue(intel.getCaseCompleteness().getCompletenessPercentage() > 60);
        assertFalse(intel.getPendingActions().isEmpty());
        assertFalse(intel.getChronologicalTimeline().isEmpty());
    }

    @Test
    void testGetCaseIntelligenceIdorProtectionForOtherPublicUser() {
        when(missingPersonRepository.findByCaseNumber("MP-1001")).thenReturn(Optional.of(missingPerson));

        assertThrows(AccessDeniedException.class, () -> {
            intelligenceService.getCaseIntelligence("MP-1001", "Unauthorized_User", "PUBLIC_USER");
        });
    }

    @Test
    void testGetCaseIntelligenceNonexistentCaseThrowsNotFound() {
        when(missingPersonRepository.findByCaseNumber("MP-9999")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> {
            intelligenceService.getCaseIntelligence("MP-9999", "Officer_Verma", "POLICE");
        });
    }
}
