package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.client.AuditLogClient;
import com.misxmatch.casesvc.client.NotificationClient;
import com.misxmatch.casesvc.dto.MissingPersonRequest;
import com.misxmatch.casesvc.entity.MissingPerson;
import com.misxmatch.casesvc.repository.MissingPersonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CaseEmergencyBroadcastTest {

    @Mock
    private MissingPersonRepository missingPersonRepository;
    @Mock
    private AiMatchingProvider aiMatchingProvider;
    @Mock
    private AuditLogClient auditLogClient;
    @Mock
    private NotificationClient notificationClient;

    private AiRiskAssessmentService aiRiskAssessmentService;
    private CaseServiceImpl caseService;

    @BeforeEach
    void setUp() {
        aiRiskAssessmentService = new AiRiskAssessmentService(missingPersonRepository);
        caseService = new CaseServiceImpl(
                missingPersonRepository,
                null,
                null,
                null,
                null,
                aiMatchingProvider,
                aiRiskAssessmentService,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                auditLogClient,
                notificationClient,
                null,
                null,
                null
        );
    }

    @Test
    @DisplayName("CRITICAL risk case automatically triggers emergency broadcast dispatch")
    void testCriticalRiskTriggersEmergencyBroadcast() {
        MissingPersonRequest req = new MissingPersonRequest();
        req.setName("Grandfather Joseph");
        req.setAge(85);
        req.setGender("MALE");
        req.setLastSeenLocation("Wagah Border Checkpost Zone");
        req.setLastSeenDate(LocalDate.now().minusDays(4));
        req.setDescription("Diagnosed with severe Alzheimer and dementia. Needs medical attention.");
        req.setContactPhone("9876543210");

        when(missingPersonRepository.save(any(MissingPerson.class))).thenAnswer(invocation -> {
            MissingPerson mp = invocation.getArgument(0);
            mp.setId(101L);
            mp.setCaseNumber("MP-101");
            return mp;
        });

        MissingPerson result = caseService.reportMissing("CITIZEN_REPORTER", req);

        assertNotNull(result);
        assertTrue(result.getRiskScore() >= 75);
        assertEquals("CRITICAL", result.getRiskLevel());

        // Verify that notificationClient.broadcastEmergencyAsync was triggered for the CRITICAL case
        verify(notificationClient, times(1)).broadcastEmergencyAsync(argThat(person ->
                "CRITICAL".equalsIgnoreCase(person.getRiskLevel()) && "MP-101".equals(person.getCaseNumber())
        ));
    }

    @Test
    @DisplayName("MEDIUM or LOW risk case does not trigger emergency broadcast dispatch")
    void testNonCriticalRiskDoesNotTriggerEmergencyBroadcast() {
        MissingPersonRequest req = new MissingPersonRequest();
        req.setName("Adult Traveller");
        req.setAge(35);
        req.setGender("MALE");
        req.setLastSeenLocation("Downtown Metro Station");
        req.setLastSeenDate(LocalDate.now());
        req.setDescription("Left for work in the morning.");
        req.setContactPhone("9876543210");

        when(missingPersonRepository.save(any(MissingPerson.class))).thenAnswer(invocation -> {
            MissingPerson mp = invocation.getArgument(0);
            mp.setId(102L);
            mp.setCaseNumber("MP-102");
            return mp;
        });

        MissingPerson result = caseService.reportMissing("CITIZEN_REPORTER", req);

        assertNotNull(result);
        assertEquals("MEDIUM", result.getRiskLevel());

        // Verify that notificationClient.broadcastEmergencyAsync was NOT called for non-critical/non-high risk
        verify(notificationClient, never()).broadcastEmergencyAsync(any());
    }
}
