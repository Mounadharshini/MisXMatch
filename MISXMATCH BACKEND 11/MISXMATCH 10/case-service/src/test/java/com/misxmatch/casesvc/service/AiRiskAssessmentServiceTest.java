package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.dto.RiskAssessmentResponse;
import com.misxmatch.casesvc.entity.MissingPerson;
import com.misxmatch.casesvc.repository.MissingPersonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

public class AiRiskAssessmentServiceTest {

    private AiRiskAssessmentService riskAssessmentService;
    private MissingPersonRepository missingPersonRepository;

    @BeforeEach
    void setUp() {
        missingPersonRepository = Mockito.mock(MissingPersonRepository.class);
        riskAssessmentService = new AiRiskAssessmentService(missingPersonRepository);
    }

    @Test
    @DisplayName("Should return default MEDIUM risk assessment when MissingPerson is null")
    void testAssessRiskNullMissingPerson() {
        RiskAssessmentResponse response = riskAssessmentService.assessRisk(null);
        assertNotNull(response);
        assertEquals("MEDIUM", response.getRiskLevel());
        assertEquals(50.0, response.getRiskScore());
    }

    @Test
    @DisplayName("Should add risk points for child under 12 and geriatric senior citizens")
    void testAgeVulnerability() {
        MissingPerson child = MissingPerson.builder()
                .caseNumber("MP-CHILD-001")
                .name("Toddler")
                .age(5)
                .build();

        RiskAssessmentResponse childResponse = riskAssessmentService.assessRisk(child);
        assertEquals(85.0, childResponse.getRiskScore()); // 50 base + 35 child
        assertEquals("CRITICAL", childResponse.getRiskLevel());
        assertTrue(childResponse.getIdentifiedRiskFactors().stream().anyMatch(f -> f.contains("Child under 12")));
        assertTrue(childResponse.getRecommendedProtocols().stream().anyMatch(p -> p.contains("Childline")));

        MissingPerson senior = MissingPerson.builder()
                .caseNumber("MP-SENIOR-001")
                .name("Grandpa")
                .age(70)
                .build();

        RiskAssessmentResponse seniorResponse = riskAssessmentService.assessRisk(senior);
        assertEquals(80.0, seniorResponse.getRiskScore()); // 50 base + 30 senior
        assertEquals("CRITICAL", seniorResponse.getRiskLevel());
        assertTrue(seniorResponse.getIdentifiedRiskFactors().stream().anyMatch(f -> f.contains("Senior citizen")));
    }

    @Test
    @DisplayName("Should add risk points for critical medical or cognitive conditions")
    void testMedicalCondition() {
        MissingPerson mp = MissingPerson.builder()
                .caseNumber("MP-MED-001")
                .name("John Doe")
                .age(30)
                .description("Patient suffers from severe dementia and requires daily medical care.")
                .build();

        RiskAssessmentResponse response = riskAssessmentService.assessRisk(mp);
        assertEquals(75.0, response.getRiskScore()); // 50 base + 25 medical
        assertEquals("HIGH", response.getRiskLevel());
        assertTrue(response.getIdentifiedRiskFactors().stream().anyMatch(f -> f.contains("medical / cognitive")));
    }

    @Test
    @DisplayName("Should factor in time since last seen: +10 if >24h, +20 if >72h")
    void testTimeSinceLastSeen() {
        // Last seen 2 days ago (48h > 24h)
        MissingPerson mp24h = MissingPerson.builder()
                .caseNumber("MP-TIME-24H")
                .name("Alice")
                .age(30)
                .lastSeenDate(LocalDate.now().minusDays(2))
                .build();

        RiskAssessmentResponse res24 = riskAssessmentService.assessRisk(mp24h);
        assertEquals(60.0, res24.getRiskScore()); // 50 base + 10 (>24h)
        assertEquals("HIGH", res24.getRiskLevel());
        assertTrue(res24.getIdentifiedRiskFactors().stream().anyMatch(f -> f.contains("> 24 hours")));

        // Last seen 5 days ago (120h > 72h)
        MissingPerson mp72h = MissingPerson.builder()
                .caseNumber("MP-TIME-72H")
                .name("Bob")
                .age(30)
                .lastSeenDate(LocalDate.now().minusDays(5))
                .build();

        RiskAssessmentResponse res72 = riskAssessmentService.assessRisk(mp72h);
        assertEquals(70.0, res72.getRiskScore()); // 50 base + 20 (>72h)
        assertEquals("HIGH", res72.getRiskLevel());
        assertTrue(res72.getIdentifiedRiskFactors().stream().anyMatch(f -> f.contains(">72 hours")));
    }

    @Test
    @DisplayName("Should bump risk score if last seen location matches high-risk zone")
    void testLocationRisk() {
        MissingPerson mp = MissingPerson.builder()
                .caseNumber("MP-LOC-001")
                .name("Charlie")
                .age(25)
                .lastSeenLocation("Near National Highway Border Checkpoint")
                .build();

        RiskAssessmentResponse response = riskAssessmentService.assessRisk(mp);
        assertEquals(70.0, response.getRiskScore()); // 50 base + 20 location
        assertEquals("HIGH", response.getRiskLevel());
        assertTrue(response.getIdentifiedRiskFactors().stream().anyMatch(f -> f.contains("High-risk location match")));
        assertTrue(response.getRecommendedProtocols().stream().anyMatch(p -> p.contains("border checkpoints")));
    }

    @Test
    @DisplayName("Should increase risk score if person has repeat disappearance history in DB")
    void testRepeatDisappearanceHistory() {
        MissingPerson priorCase = MissingPerson.builder()
                .id(1L)
                .caseNumber("MP-PRIOR-001")
                .name("Dave Repeat")
                .reportedBy("Guardian Smith")
                .build();

        when(missingPersonRepository.findByNameIgnoreCaseAndReportedByIgnoreCase(anyString(), anyString()))
                .thenReturn(List.of(priorCase));

        MissingPerson currentMp = MissingPerson.builder()
                .id(2L)
                .caseNumber("MP-CURR-002")
                .name("Dave Repeat")
                .reportedBy("Guardian Smith")
                .age(16)
                .build();

        RiskAssessmentResponse response = riskAssessmentService.assessRisk(currentMp);
        assertEquals(70.0, response.getRiskScore()); // 50 base + 20 repeat history
        assertEquals("HIGH", response.getRiskLevel());
        assertTrue(response.getIdentifiedRiskFactors().stream().anyMatch(f -> f.contains("Repeat disappearance history")));
    }

    @Test
    @DisplayName("Should factor in extreme weather conditions via flag or description keywords")
    void testWeatherEnvironmentalRisk() {
        MissingPerson mpFlag = MissingPerson.builder()
                .caseNumber("MP-WX-001")
                .name("Eve")
                .age(30)
                .build();

        RiskAssessmentResponse resFlag = riskAssessmentService.assessRisk(mpFlag, true);
        assertEquals(65.0, resFlag.getRiskScore()); // 50 base + 15 weather
        assertTrue(resFlag.getIdentifiedRiskFactors().stream().anyMatch(f -> f.contains("Extreme weather")));

        MissingPerson mpDesc = MissingPerson.builder()
                .caseNumber("MP-WX-002")
                .name("Frank")
                .age(30)
                .description("Person went missing during a severe blizzard and heavy snow storm.")
                .build();

        RiskAssessmentResponse resDesc = riskAssessmentService.assessRisk(mpDesc);
        assertEquals(65.0, resDesc.getRiskScore()); // 50 base + 15 weather keyword
        assertTrue(resDesc.getIdentifiedRiskFactors().stream().anyMatch(f -> f.contains("Extreme weather")));
    }

    @Test
    @DisplayName("Should clamp total risk score to maximum 99.0 and map to CRITICAL risk level")
    void testScoreClampingAndCriticalLevel() {
        MissingPerson highRiskMp = MissingPerson.builder()
                .caseNumber("MP-MAX-999")
                .name("Max Risk Person")
                .age(4) // +35
                .description("Dementia patient missing during extreme weather blizzard.") // +25 medical +15 weather
                .lastSeenLocation("International Border Crossing Terminal") // +20 location
                .lastSeenDate(LocalDate.now().minusDays(4)) // +20 (>72h)
                .build();

        RiskAssessmentResponse response = riskAssessmentService.assessRisk(highRiskMp, true);
        assertEquals(99.0, response.getRiskScore()); // Clamped to 99.0
        assertEquals("CRITICAL", response.getRiskLevel());
    }

    @Test
    @DisplayName("Should support custom high-risk zones configuration")
    void testCustomHighRiskZones() {
        riskAssessmentService.setHighRiskZones(List.of("CustomZoneA", "CustomZoneB"));

        MissingPerson mp = MissingPerson.builder()
                .caseNumber("MP-CUSTOM-LOC")
                .name("Grace")
                .age(30)
                .lastSeenLocation("Corner of CustomZoneA Street")
                .build();

        RiskAssessmentResponse response = riskAssessmentService.assessRisk(mp);
        assertEquals(70.0, response.getRiskScore()); // 50 base + 20 location
        assertTrue(response.getIdentifiedRiskFactors().stream().anyMatch(f -> f.contains("High-risk location match")));
    }
}
