package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.client.AiServiceClient;
import com.misxmatch.casesvc.repository.SystemHealthMetricsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class SystemMonitoringWorkflowTest {

    @Mock
    private SystemHealthMetricsRepository metricsRepository;

    @Mock
    private AiServiceClient aiServiceClient;

    @Mock
    private JdbcTemplate jdbcTemplate;

    private AiMetricTrackerServiceImpl metricTrackerService;
    private SystemHealthMonitoringServiceImpl healthMonitoringService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        metricTrackerService = new AiMetricTrackerServiceImpl(metricsRepository);
        healthMonitoringService = new SystemHealthMonitoringServiceImpl(
                aiServiceClient, metricTrackerService, jdbcTemplate
        );
    }

    @Test
    @DisplayName("Should correctly record real AI operation metrics and calculate performance summary")
    void testRecordMetricsAndSummary() {
        // Record 2 successful operations and 1 failed operation
        metricTrackerService.recordMetric("FACE_MATCH", true, 120, "NONE", "req-101");
        metricTrackerService.recordMetric("FACE_MATCH", true, 80, "NONE", "req-102");
        metricTrackerService.recordMetric("FACE_MATCH", false, 400, "AI_TIMEOUT", "req-103");

        Map<String, Object> summary = metricTrackerService.getAiMetricsSummary();

        assertNotNull(summary);
        assertEquals(3L, summary.get("totalRequests"));
        assertEquals(2L, summary.get("successfulRequests"));
        assertEquals(1L, summary.get("failedRequests"));
        assertEquals(1L, summary.get("timeoutCount"));

        verify(metricsRepository, times(3)).save(any());
    }

    @Test
    @DisplayName("Should aggregate real microservice health statuses across dependencies")
    void testGetDetailedSystemHealth() {
        when(aiServiceClient.getAiServiceUrl()).thenReturn("http://localhost:8000");
        when(aiServiceClient.checkHealth()).thenReturn(Map.of(
                "status", "UP",
                "version", "1.0.0",
                "models", Map.of("face", "READY", "text", "READY", "cctv", "READY")
        ));

        Map<String, Object> result = healthMonitoringService.getDetailedSystemHealth();

        assertNotNull(result);
        assertTrue(result.containsKey("overallStatus"));
        assertTrue(result.containsKey("services"));

        Map<String, Object> services = (Map<String, Object>) result.get("services");
        assertTrue(services.containsKey("database"));
        assertTrue(services.containsKey("userCaseService"));
        assertTrue(services.containsKey("aiService"));

        Map<String, Object> aiSvc = (Map<String, Object>) services.get("aiService");
        assertEquals("UP", aiSvc.get("status"));
    }
}
