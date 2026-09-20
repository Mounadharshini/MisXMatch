package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.entity.MissingPerson;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

public class AiScoreCalculatorTest {

    private AiScoreCalculatorService scoreCalculatorService;

    @BeforeEach
    void setUp() {
        scoreCalculatorService = new AiScoreCalculatorService();
    }

    @Test
    @DisplayName("Should correctly calculate weighted score and map to Emergency Review confidence band")
    void testEmergencyReviewConfidenceBand() {
        AiScoreCalculatorService.ScoreResult result = scoreCalculatorService.calculateWeightedScore(0.98, 0.95, 0.95, 0.90, 0.90);

        assertNotNull(result);
        assertTrue(result.getFinalScore() >= 95.0, "Score should be >= 95.0");
        assertEquals("EMERGENCY_REVIEW", result.getConfidenceBand());
        assertTrue(result.getBandDescription().contains("Emergency Review"));
    }

    @Test
    @DisplayName("Should map score between 85-94 to Immediate Police Review band")
    void testImmediatePoliceReviewConfidenceBand() {
        AiScoreCalculatorService.ScoreResult result = scoreCalculatorService.calculateWeightedScore(0.92, 0.88, 0.85, 0.80, 0.90);

        assertNotNull(result);
        assertTrue(result.getFinalScore() >= 85.0 && result.getFinalScore() < 95.0, "Score should be 85-94");
        assertEquals("IMMEDIATE_POLICE_REVIEW", result.getConfidenceBand());
    }

    @Test
    @DisplayName("Should map score below 50 to Low Priority Lead band")
    void testLowPriorityLeadBand() {
        AiScoreCalculatorService.ScoreResult result = scoreCalculatorService.calculateWeightedScore(0.20, 0.10, 0.30, 0.10, 0.20);

        assertNotNull(result);
        assertTrue(result.getFinalScore() < 50.0);
        assertEquals("LOW_PRIORITY_LEAD", result.getConfidenceBand());
    }

    @Test
    @DisplayName("Should calculate CRITICAL risk priority for young child with medical condition and abduction indicators")
    void testCriticalRiskPriorityForChild() {
        MissingPerson mp = MissingPerson.builder()
                .caseNumber("MP-TEST-001")
                .name("Test Child")
                .age(5)
                .gender("MALE")
                .description("Young child requiring urgent medical insulin treatment, suspected kidnapped near market.")
                .riskLevel("HIGH")
                .createdAt(LocalDateTime.now().minusHours(4))
                .build();

        AiScoreCalculatorService.RiskPriorityResult risk = scoreCalculatorService.calculateCaseRiskPriority(mp);

        assertNotNull(risk);
        assertEquals("CRITICAL", risk.getPriorityLevel());
        assertTrue(risk.getRiskScore() >= 75.0);
        assertFalse(risk.getPriorityReasons().isEmpty());
    }
}
