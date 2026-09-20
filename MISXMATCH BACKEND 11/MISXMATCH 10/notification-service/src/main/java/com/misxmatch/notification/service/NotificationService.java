package com.misxmatch.notification.service;

import com.misxmatch.notification.dto.EmergencyBroadcastRequest;
import com.misxmatch.notification.dto.NotificationRequest;
import com.misxmatch.notification.dto.PageResponse;
import com.misxmatch.notification.entity.AuditLog;
import com.misxmatch.notification.entity.Notification;

import java.util.List;
import java.util.Map;

public interface NotificationService {
    Notification create(NotificationRequest request);
    List<Notification> listForUser(String userId);
    PageResponse<Notification> listForUserPaginated(String userId, int page, int size, String q, String type, Boolean read, String sortBy, String sortDir);
    Notification markRead(Long id);
    void delete(Long id);
    void clearAllForUser(String userId);
    void logAction(String actorUserId, String actorRole, String action, String details);
    Map<String, Object> dashboardFor(String role);
    List<AuditLog> listAuditLogs();
    PageResponse<AuditLog> listAuditLogsPaginated(int page, int size, String q, String action, String sortBy, String sortDir);
    Map<String, Object> broadcastEmergencyAlert(String actorId, String actorRole, EmergencyBroadcastRequest req);
}
