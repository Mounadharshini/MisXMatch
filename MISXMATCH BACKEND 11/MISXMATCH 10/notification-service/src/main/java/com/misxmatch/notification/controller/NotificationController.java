package com.misxmatch.notification.controller;

import com.misxmatch.notification.dto.NotificationRequest;
import com.misxmatch.notification.dto.PageResponse;
import com.misxmatch.notification.entity.Notification;
import com.misxmatch.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/notifications")
@Tag(name = "Notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final com.misxmatch.notification.service.EmailService emailService;

    public NotificationController(NotificationService notificationService,
                                  com.misxmatch.notification.service.EmailService emailService) {
        this.notificationService = notificationService;
        this.emailService = emailService;
    }

    @GetMapping
    @Operation(summary = "List notifications with dynamic pagination, category, and read status filter")
    public ResponseEntity<PageResponse<Notification>> list(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean read,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(notificationService.listForUserPaginated(userId, page, size, q, type, read, sortBy, sortDir));
    }

    @PostMapping
    @Operation(summary = "Create a notification for a recipient")
    public ResponseEntity<Notification> create(@RequestHeader(value = "X-User-Id", required = false) String actorId,
                                                @RequestHeader(value = "X-User-Role", required = false) String actorRole,
                                                @Valid @RequestBody NotificationRequest request) {
        Notification created = notificationService.create(request);
        notificationService.logAction(actorId, actorRole, "NOTIFICATION_CREATED", "To " + request.getRecipientUserId() + ": " + request.getTitle());
        return ResponseEntity.ok(created);
    }

    @PostMapping("/email/send")
    @Operation(summary = "Send an email message (supports plain text or HTML)")
    public ResponseEntity<java.util.Map<String, Object>> sendEmail(
            @RequestHeader(value = "X-User-Id", required = false) String actorId,
            @RequestHeader(value = "X-User-Role", required = false) String actorRole,
            @Valid @RequestBody com.misxmatch.notification.dto.EmailRequest request) {
        boolean isHtml = Boolean.TRUE.equals(request.getHtml());
        emailService.sendEmail(request.getTo(), request.getSubject(), request.getBody(), isHtml);
        notificationService.logAction(actorId, actorRole, "EMAIL_DISPATCHED", "To: " + request.getTo() + " | Subject: " + request.getSubject());
        return ResponseEntity.ok(java.util.Map.of("status", "SUCCESS", "to", request.getTo(), "subject", request.getSubject()));
    }

    @PostMapping("/broadcast-emergency")
    @Operation(summary = "Broadcast high-priority Amber / Emergency Alert across police, hospitals, shelters, and citizen patrol")
    public ResponseEntity<java.util.Map<String, Object>> broadcastEmergency(
            @RequestHeader(value = "X-User-Id", required = false) String actorId,
            @RequestHeader(value = "X-User-Role", required = false) String actorRole,
            @Valid @RequestBody com.misxmatch.notification.dto.EmergencyBroadcastRequest request) {
        return ResponseEntity.ok(notificationService.broadcastEmergencyAlert(actorId, actorRole, request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Mark a notification as read")
    public ResponseEntity<Notification> markRead(@PathVariable Long id,
                                                   @RequestHeader(value = "X-User-Id", required = false) String actorId,
                                                   @RequestHeader(value = "X-User-Role", required = false) String actorRole) {
        Notification updated = notificationService.markRead(id);
        notificationService.logAction(actorId, actorRole, "NOTIFICATION_READ", "Notification #" + id);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a notification")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                        @RequestHeader(value = "X-User-Id", required = false) String actorId,
                                        @RequestHeader(value = "X-User-Role", required = false) String actorRole) {
        notificationService.delete(id);
        notificationService.logAction(actorId, actorRole, "NOTIFICATION_DELETED", "Notification #" + id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @Operation(summary = "Clear all notifications for the authenticated user")
    public ResponseEntity<Void> clearAll(@RequestHeader(value = "X-User-Id", required = false) String actorId,
                                         @RequestHeader(value = "X-User-Role", required = false) String actorRole) {
        notificationService.clearAllForUser(actorId);
        notificationService.logAction(actorId, actorRole, "NOTIFICATIONS_CLEARED", "Cleared all notifications for user: " + actorId);
        return ResponseEntity.noContent().build();
    }
}
