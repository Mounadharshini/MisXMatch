package com.misxmatch.casesvc.client;

import com.misxmatch.casesvc.entity.MissingPerson;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Component
public class NotificationClient {

    private final RestTemplate restTemplate;

    @Value("${notification.service.url:http://${NOTIFICATION_SERVICE_HOST:localhost}:${NOTIFICATION_SERVICE_PORT:8084}}")
    private String notificationServiceUrl;

    @Value("${notification.service.key:misxmatch-internal-secret-key-2026}")
    private String notificationServiceKey;

    public NotificationClient() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Non-blocking / fire-and-forget call to create a real notification in notification-service.
     */
    public void sendNotificationAsync(String recipientUserId, String title, String message, String type, String caseNumber, Long matchId, String location, String dedupKey) {
        CompletableFuture.runAsync(() -> {
            try {
                String targetUrl = notificationServiceUrl + "/notifications";

                Map<String, Object> payload = new HashMap<>();
                payload.put("recipientUserId", recipientUserId != null ? recipientUserId : "police_officer");
                payload.put("title", title);
                payload.put("message", message);
                payload.put("type", type != null ? type.toUpperCase() : "INFO");
                if (caseNumber != null) payload.put("caseNumber", caseNumber);
                if (matchId != null) payload.put("matchId", matchId);
                if (location != null) payload.put("location", location);
                if (dedupKey != null) payload.put("dedupKey", dedupKey);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("X-Internal-Service-Key", notificationServiceKey);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

                restTemplate.postForEntity(targetUrl, entity, Object.class);
                log.info("Dispatched notification event '{}' to {} for case #{}", type, recipientUserId, caseNumber);
            } catch (Exception e) {
                log.warn("Failed to dispatch notification event '{}' to {}: {}", type, recipientUserId, e.getMessage());
            }
        });
    }

    /**
     * Dispatch notification for AI candidate match detection.
     */
    public void sendAiMatchFoundNotificationAsync(String caseNumber, Long matchId, Double overallScore, String recipient) {
        String title = "🚨 AI Candidate Match Found: Case #" + caseNumber;
        int scorePct = overallScore != null ? (int) Math.round(overallScore > 1 ? overallScore : overallScore * 100) : 80;
        String msg = String.format("New AI candidate match found for Case #%s. AI Match Score: %d%%. Human verification required.", caseNumber, scorePct);
        String dedupKey = "AI_MATCH_FOUND_" + caseNumber + "_" + matchId;
        String targetRecipient = recipient != null ? recipient : "police_officer";

        sendNotificationAsync(targetRecipient, title, msg, "AI_MATCH_FOUND", caseNumber, matchId, null, dedupKey);
        // Also dispatch to admin oversight
        sendNotificationAsync("admin", title, msg, "AI_MATCH_FOUND", caseNumber, matchId, null, dedupKey + "_ADMIN");
    }

    /**
     * Dispatch notification when human officer submits a match review decision.
     */
    public void sendAiMatchReviewedNotificationAsync(String caseNumber, Long matchId, String reviewStatus, String reviewer, String comment) {
        String title = "AI Match Reviewed: Case #" + caseNumber + " (" + reviewStatus + ")";
        String msg = String.format("AI candidate match for Case #%s was reviewed as %s by officer %s. Notes: %s",
                caseNumber, reviewStatus, reviewer, comment != null ? comment : "Review completed");
        String dedupKey = "AI_MATCH_REVIEW_" + caseNumber + "_" + matchId + "_" + reviewStatus;

        sendNotificationAsync("police_officer", title, msg, "AI_MATCH_" + reviewStatus, caseNumber, matchId, null, dedupKey);
        sendNotificationAsync("admin", title, msg, "AI_MATCH_" + reviewStatus, caseNumber, matchId, null, dedupKey + "_ADMIN");
    }

    /**
     * Dispatch notification for high-risk case score.
     */
    public void sendHighRiskCaseNotificationAsync(String caseNumber, Double riskScore, String riskLevel, String location) {
        String title = "⚠️ High-Risk Case Priority Alert: #" + caseNumber;
        int scorePct = riskScore != null ? (int) Math.round(riskScore > 1 ? riskScore : riskScore * 100) : 85;
        String msg = String.format("High-risk missing-person case requires attention. Case #%s, Risk Score: %d%%, Level: %s. Decision-support disclaimers apply.",
                caseNumber, scorePct, riskLevel);
        String dedupKey = "HIGH_RISK_CASE_" + caseNumber + "_" + riskLevel;

        sendNotificationAsync("police_officer", title, msg, "HIGH_RISK_CASE", caseNumber, null, location, dedupKey);
        sendNotificationAsync("admin", title, msg, "HIGH_RISK_CASE", caseNumber, null, location, dedupKey + "_ADMIN");
    }

    /**
     * Dispatch notification for missing case intake creation.
     */
    public void sendCaseCreatedNotificationAsync(String caseNumber, String personName, String location) {
        String title = "📋 New Missing Person Case Filed: #" + caseNumber;
        String msg = String.format("New missing person report registered for %s. Last seen location: %s.", personName, location != null ? location : "Local Area");
        String dedupKey = "CASE_CREATED_" + caseNumber;

        sendNotificationAsync("police_officer", title, msg, "CASE_CREATED", caseNumber, null, location, dedupKey);
        sendNotificationAsync("admin", title, msg, "CASE_CREATED", caseNumber, null, location, dedupKey + "_ADMIN");
    }

    /**
     * Dispatch notification for found person intake.
     */
    public void sendFoundPersonNotificationAsync(String caseNumber, String name, String location) {
        String title = "🔍 Found Person Intake Reported: #" + caseNumber;
        String msg = String.format("Unidentified/Found person report registered (%s). Location: %s.", name != null ? name : "Unidentified", location != null ? location : "Facility Intake");
        String dedupKey = "FOUND_PERSON_" + caseNumber;

        sendNotificationAsync("police_officer", title, msg, "FOUND_PERSON_REPORTED", caseNumber, null, location, dedupKey);
        sendNotificationAsync("ngo_coordinator", title, msg, "FOUND_PERSON_REPORTED", caseNumber, null, location, dedupKey + "_NGO");
    }

    /**
     * Dispatch notification for citizen sighting report.
     */
    public void sendSightingNotificationAsync(String missingCaseNumber, Long sightingId, String location) {
        String title = "👁️ New Citizen Sighting Submitted for Case #" + missingCaseNumber;
        String msg = String.format("Citizen sighting #%d submitted for Case #%s. Sighting location: %s.", sightingId, missingCaseNumber, location != null ? location : "Public Report");
        String dedupKey = "SIGHTING_SUBMITTED_" + missingCaseNumber + "_" + sightingId;

        sendNotificationAsync("police_officer", title, msg, "SIGHTING_SUBMITTED", missingCaseNumber, sightingId, location, dedupKey);
    }

    /**
     * Non-blocking / fire-and-forget call to notification-service's emergency broadcast endpoint.
     */
    public void broadcastEmergencyAsync(MissingPerson person) {
        if (person == null) return;
        CompletableFuture.runAsync(() -> {
            try {
                String targetUrl = notificationServiceUrl + "/notifications/broadcast-emergency";

                Map<String, Object> payload = new HashMap<>();
                payload.put("caseNumber", person.getCaseNumber() != null ? person.getCaseNumber() : "MP-" + person.getId());
                payload.put("personName", person.getName());
                payload.put("age", person.getAge());
                payload.put("gender", person.getGender() != null ? person.getGender() : "UNKNOWN");
                payload.put("lastSeenLocation", person.getLastSeenLocation());
                payload.put("description", person.getDescription());
                payload.put("photoUrl", person.getPhotoUrl());
                payload.put("priority", person.getRiskLevel() != null ? person.getRiskLevel() : "CRITICAL");
                payload.put("broadcastRadius", "50km Regional Radius");
                payload.put("targetChannels", List.of("EMAIL", "PORTAL_ALERT", "SMS"));

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("X-Internal-Service-Key", notificationServiceKey);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

                restTemplate.postForEntity(targetUrl, entity, Object.class);
                log.info("Emergency broadcast triggered for case #{} (Risk: {})", person.getCaseNumber(), person.getRiskLevel());
            } catch (Exception e) {
                log.warn("Non-blocking emergency broadcast trigger for case #{} failed: {}", person.getCaseNumber(), e.getMessage());
            }
        });
    }

    /**
     * Get live notification count from notification-service.
     */
    public long getNotificationsCount() {
        try {
            Map<?, ?> resp = restTemplate.getForObject(notificationServiceUrl + "/dashboard/public", Map.class);
            if (resp != null && resp.containsKey("totalNotifications")) {
                return ((Number) resp.get("totalNotifications")).longValue();
            }
        } catch (Exception e) {
            log.debug("Could not fetch notification count: {}", e.getMessage());
        }
        return 0L;
    }

}
