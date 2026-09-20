package com.misxmatch.notification.controller;

import com.misxmatch.notification.dto.AuditLogRequest;
import com.misxmatch.notification.dto.PageResponse;
import com.misxmatch.notification.entity.AuditLog;
import com.misxmatch.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/notifications/audit-logs")
@Tag(name = "Audit Logs", description = "Actions logged across microservices (creations, authentication, status changes, reviews)")
public class AuditLogController {

    private final NotificationService notificationService;

    public AuditLogController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "List all audit log entries with dynamic pagination and action filters (admin only)")
    public ResponseEntity<PageResponse<AuditLog>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String action,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(notificationService.listAuditLogsPaginated(page, size, q, action, sortBy, sortDir));
    }

    @PostMapping
    @Operation(summary = "Record an audit log entry from any system component or microservice")
    public ResponseEntity<AuditLog> create(
            @RequestHeader(value = "X-User-Id", required = false) String headerActorId,
            @RequestHeader(value = "X-User-Role", required = false) String headerActorRole,
            @RequestBody AuditLogRequest request) {
        String actorId = request.getActorUserId() != null && !request.getActorUserId().isBlank()
                ? request.getActorUserId() : (headerActorId != null ? headerActorId : "SYSTEM");
        String actorRole = request.getActorRole() != null && !request.getActorRole().isBlank()
                ? request.getActorRole() : (headerActorRole != null ? headerActorRole : "SYSTEM");

        notificationService.logAction(actorId, actorRole, request.getAction(), request.getDetails());

        AuditLog saved = AuditLog.builder()
                .actorUserId(actorId)
                .actorRole(actorRole)
                .action(request.getAction())
                .details(request.getDetails())
                .build();
        return ResponseEntity.ok(saved);
    }
}
