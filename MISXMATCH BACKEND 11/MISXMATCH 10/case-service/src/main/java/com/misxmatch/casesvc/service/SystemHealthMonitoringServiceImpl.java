package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.client.AiServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
public class SystemHealthMonitoringServiceImpl implements SystemHealthMonitoringService {

    private final AiServiceClient aiServiceClient;
    private final AiMetricTrackerService aiMetricTrackerService;
    private final JdbcTemplate jdbcTemplate;
    private final RestTemplate restTemplate;

    @Value("${gateway.service.url:http://localhost:8080}")
    private String gatewayServiceUrl;

    @Value("${notification.service.url:http://localhost:8083}")
    private String notificationServiceUrl;

    public SystemHealthMonitoringServiceImpl(
            AiServiceClient aiServiceClient,
            AiMetricTrackerService aiMetricTrackerService,
            JdbcTemplate jdbcTemplate) {
        this.aiServiceClient = aiServiceClient;
        this.aiMetricTrackerService = aiMetricTrackerService;
        this.jdbcTemplate = jdbcTemplate;
        this.restTemplate = new RestTemplate();
    }

    private String getGatewayUrl() {
        return (gatewayServiceUrl != null && !gatewayServiceUrl.isBlank()) ? gatewayServiceUrl : "http://localhost:8080";
    }

    private String getNotificationUrl() {
        return (notificationServiceUrl != null && !notificationServiceUrl.isBlank()) ? notificationServiceUrl : "http://localhost:8083";
    }

    @Override
    public Map<String, Object> getDetailedSystemHealth() {
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", Instant.now().toString());

        Map<String, Object> servicesHealth = new LinkedHashMap<>();

        // 1. MySQL Database Health
        String dbStatus = checkDatabaseHealth();
        Map<String, Object> dbMap = new HashMap<>();
        dbMap.put("status", dbStatus);
        dbMap.put("name", "MySQL Relational Database");
        dbMap.put("details", "UP".equals(dbStatus) ? "Connection pool active & responsive" : "Database connection failed");
        servicesHealth.put("database", dbMap);

        // 2. User & Case Service (Self) Health
        String caseSvcStatus = "UP".equals(dbStatus) ? "UP" : "DEGRADED";
        Map<String, Object> caseMap = new HashMap<>();
        caseMap.put("status", caseSvcStatus);
        caseMap.put("name", "User & Case Service");
        caseMap.put("version", "1.0.0");
        servicesHealth.put("userCaseService", caseMap);

        // 3. API Gateway Service Health
        String gwUrl = getGatewayUrl();
        String gatewayStatus = checkHttpServiceHealth(gwUrl + "/health");
        Map<String, Object> gwMap = new HashMap<>();
        gwMap.put("status", gatewayStatus);
        gwMap.put("name", "API Gateway");
        gwMap.put("endpoint", gwUrl);
        servicesHealth.put("apiGateway", gwMap);

        // 4. Notification Service Health
        String notifUrl = getNotificationUrl();
        String notifStatus = checkHttpServiceHealth(notifUrl + "/api/notifications/health");
        Map<String, Object> notifMap = new HashMap<>();
        notifMap.put("status", notifStatus);
        notifMap.put("name", "Notification Service");
        notifMap.put("endpoint", notifUrl);
        servicesHealth.put("notificationService", notifMap);

        // 5. Python AI Microservice Health & Models
        Map<String, Object> aiHealth = checkAiServiceHealth();
        servicesHealth.put("aiService", aiHealth);

        response.put("services", servicesHealth);

        // Overall System Health Status
        boolean allUp = "UP".equals(dbStatus) && "UP".equals(gatewayStatus) &&
                "UP".equals(notifStatus) && "UP".equals(aiHealth.get("status"));
        boolean allDown = "DOWN".equals(dbStatus) && "DOWN".equals(gatewayStatus) &&
                "DOWN".equals(notifStatus) && "DOWN".equals(aiHealth.get("status"));

        String overallStatus = allUp ? "UP" : (allDown ? "DOWN" : "DEGRADED");
        response.put("overallStatus", overallStatus);

        // Include Real AI Metrics Summary
        response.put("aiMetrics", aiMetricTrackerService.getAiMetricsSummary());

        return response;
    }

    @Override
    public Map<String, Object> getPublicSystemHealth() {
        Map<String, Object> detailed = getDetailedSystemHealth();
        return Map.of(
                "status", detailed.get("overallStatus"),
                "timestamp", detailed.get("timestamp")
        );
    }

    private String checkDatabaseHealth() {
        try {
            jdbcTemplate.execute("SELECT 1");
            return "UP";
        } catch (Exception e) {
            log.error("MySQL Database Health Check Failed: {}", e.getMessage());
            return "DOWN";
        }
    }

    private String checkHttpServiceHealth(String endpoint) {
        try {
            ResponseEntity<Map> resp = restTemplate.getForEntity(endpoint, Map.class);
            if (resp.getStatusCode().is2xxSuccessful()) {
                return "UP";
            }
            return "DEGRADED";
        } catch (Exception e) {
            log.warn("Health check probe failed for endpoint {}: {}", endpoint, e.getMessage());
            return "DOWN";
        }
    }

    private Map<String, Object> checkAiServiceHealth() {
        Map<String, Object> aiHealth = new HashMap<>();
        aiHealth.put("name", "Python FastAPI AI Service");
        aiHealth.put("endpoint", aiServiceClient.getAiServiceUrl());

        try {
            Map<String, Object> healthMap = aiServiceClient.checkHealth();
            if (healthMap != null) {
                aiHealth.put("status", healthMap.getOrDefault("status", "UP"));
                aiHealth.put("version", healthMap.getOrDefault("version", "1.0.0"));
                aiHealth.put("models", healthMap.getOrDefault("models", Map.of(
                        "face", "READY", "text", "READY", "cctv", "READY",
                        "attribute", "READY", "location", "READY", "time", "READY"
                )));
            } else {
                aiHealth.put("status", "DEGRADED");
                aiHealth.put("models", Map.of("status", "UNREADABLE"));
            }
        } catch (Exception e) {
            log.error("Python AI Service probe failed: {}", e.getMessage());
            aiHealth.put("status", "DOWN");
            aiHealth.put("models", Map.of(
                    "face", "UNAVAILABLE",
                    "text", "UNAVAILABLE",
                    "cctv", "UNAVAILABLE",
                    "attribute", "UNAVAILABLE",
                    "location", "UNAVAILABLE",
                    "time", "UNAVAILABLE"
            ));
        }
        return aiHealth;
    }
}
