package com.misxmatch.casesvc.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Component
public class AuditLogClient {

    private final RestTemplate restTemplate;

    @Value("${notification.service.url:http://${NOTIFICATION_SERVICE_HOST:localhost}:${NOTIFICATION_SERVICE_PORT:8084}}")
    private String notificationServiceUrl;

    @Value("${notification.service.key:misxmatch-internal-secret-key-2026}")
    private String notificationServiceKey;

    public AuditLogClient() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Non-blocking / fire-and-forget call to notification-service's audit log endpoint.
     */
    public void logAsync(String actorUserId, String actorRole, String action, String details) {
        CompletableFuture.runAsync(() -> {
            try {
                String targetUrl = notificationServiceUrl + "/notifications/audit-logs";
                Map<String, String> payload = Map.of(
                        "actorUserId", actorUserId != null ? actorUserId : "SYSTEM",
                        "actorRole", actorRole != null ? actorRole : "SYSTEM",
                        "action", action != null ? action : "UNKNOWN_ACTION",
                        "details", details != null ? details : ""
                );

                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
                headers.set("X-Internal-Service-Key", notificationServiceKey);
                org.springframework.http.HttpEntity<Map<String, String>> entity = new org.springframework.http.HttpEntity<>(payload, headers);

                restTemplate.postForEntity(targetUrl, entity, Object.class);
                log.debug("Audit log posted to notification-service: action={}, actor={}", action, actorUserId);
            } catch (Exception e) {
                log.warn("Non-blocking audit log delivery to notification-service failed for action={}: {}", action, e.getMessage());
            }
        });
    }

}
