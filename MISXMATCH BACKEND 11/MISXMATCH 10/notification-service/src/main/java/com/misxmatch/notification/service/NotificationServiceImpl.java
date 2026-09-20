package com.misxmatch.notification.service;

import com.misxmatch.notification.dto.NotificationRequest;
import com.misxmatch.notification.dto.PageResponse;
import com.misxmatch.notification.entity.AuditLog;
import com.misxmatch.notification.entity.Notification;
import com.misxmatch.notification.repository.AuditLogRepository;
import com.misxmatch.notification.repository.NotificationRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;
    private final EmailService emailService;

    public NotificationServiceImpl(NotificationRepository notificationRepository,
                                    AuditLogRepository auditLogRepository,
                                    EmailService emailService) {
        this.notificationRepository = notificationRepository;
        this.auditLogRepository = auditLogRepository;
        this.emailService = emailService;
    }

    private Pageable createPageable(int page, int size, String sortBy, String sortDir, String defaultSort) {
        int p = Math.max(0, page);
        int s = size > 0 ? size : 10;
        String field = (sortBy != null && !sortBy.isBlank()) ? sortBy : defaultSort;
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PageRequest.of(p, s, Sort.by(direction, field));
    }

    @Override
    @Transactional
    public Notification create(NotificationRequest request) {
        if (request.getDedupKey() != null && !request.getDedupKey().isBlank()) {
            if (notificationRepository.existsByDedupKey(request.getDedupKey())) {
                log.info("Duplicate notification creation suppressed for dedupKey: {}", request.getDedupKey());
                return Notification.builder()
                        .recipientUserId(request.getRecipientUserId())
                        .title(request.getTitle())
                        .message(request.getMessage())
                        .type(request.getType() != null ? request.getType() : "INFO")
                        .caseNumber(request.getCaseNumber())
                        .matchId(request.getMatchId())
                        .location(request.getLocation())
                        .dedupKey(request.getDedupKey())
                        .read(false)
                        .build();
            }
        }

        Notification n = Notification.builder()
                .recipientUserId(request.getRecipientUserId())
                .title(request.getTitle())
                .message(request.getMessage())
                .type(request.getType() != null ? request.getType() : "INFO")
                .caseNumber(request.getCaseNumber())
                .matchId(request.getMatchId())
                .location(request.getLocation())
                .dedupKey(request.getDedupKey())
                .read(false)
                .build();
        return notificationRepository.save(n);
    }

    @Override
    public List<Notification> listForUser(String userId) {
        if ("admin".equalsIgnoreCase(userId) || "SUPER_ADMIN".equalsIgnoreCase(userId)) {
            return notificationRepository.findAllByOrderByCreatedAtDesc();
        }
        if (userId == null || userId.isBlank()) {
            return notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc("all");
        }
        return notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public PageResponse<Notification> listForUserPaginated(String userId, int page, int size, String q, String type, Boolean read, String sortBy, String sortDir) {
        Pageable pageable = createPageable(page, size, sortBy, sortDir, "createdAt");
        Specification<Notification> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if ("admin".equalsIgnoreCase(userId) || "SUPER_ADMIN".equalsIgnoreCase(userId)) {
                // Admin can see all notifications
            } else if (userId != null && !userId.isBlank()) {
                Predicate userMatch = cb.equal(root.get("recipientUserId"), userId);
                Predicate broadcastMatch = cb.equal(root.get("recipientUserId"), "all");
                predicates.add(cb.or(userMatch, broadcastMatch));
            } else {
                // Unauthenticated / guest caller gets broadcast alerts only
                predicates.add(cb.equal(root.get("recipientUserId"), "all"));
            }

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                Predicate titleMatch = cb.like(cb.lower(root.get("title")), pattern);
                Predicate msgMatch = cb.like(cb.lower(root.get("message")), pattern);
                Predicate typeMatch = cb.like(cb.lower(root.get("type")), pattern);
                predicates.add(cb.or(titleMatch, msgMatch, typeMatch));
            }

            if (type != null && !type.isBlank() && !"ALL".equalsIgnoreCase(type)) {
                predicates.add(cb.equal(cb.upper(root.get("type")), type.trim().toUpperCase()));
            }

            if (read != null) {
                predicates.add(cb.equal(root.get("read"), read));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Notification> resultPage = notificationRepository.findAll(spec, pageable);
        return PageResponse.from(resultPage);
    }

    @Override
    @Transactional
    public Notification markRead(Long id) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found: " + id));
        n.setRead(true);
        return notificationRepository.save(n);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        notificationRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void clearAllForUser(String userId) {
        if ("admin".equalsIgnoreCase(userId) || "SUPER_ADMIN".equalsIgnoreCase(userId)) {
            notificationRepository.deleteAll();
        } else if (userId != null && !userId.isBlank()) {
            notificationRepository.deleteByRecipientUserId(userId);
        } else {
            notificationRepository.deleteByRecipientUserId("all");
        }
    }

    @Override
    @Transactional
    public void logAction(String actorUserId, String actorRole, String action, String details) {
        auditLogRepository.save(AuditLog.builder()
                .actorUserId(actorUserId)
                .actorRole(actorRole)
                .action(action)
                .details(details)
                .build());
    }

    @Override
    public List<AuditLog> listAuditLogs() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc();
    }

    @Override
    public PageResponse<AuditLog> listAuditLogsPaginated(int page, int size, String q, String action, String sortBy, String sortDir) {
        Pageable pageable = createPageable(page, size, sortBy, sortDir, "createdAt");
        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                Predicate actorMatch = cb.like(cb.lower(root.get("actorUserId")), pattern);
                Predicate actionMatch = cb.like(cb.lower(root.get("action")), pattern);
                Predicate detailsMatch = cb.like(cb.lower(root.get("details")), pattern);
                predicates.add(cb.or(actorMatch, actionMatch, detailsMatch));
            }

            if (action != null && !action.isBlank() && !"ALL".equalsIgnoreCase(action)) {
                predicates.add(cb.equal(cb.upper(root.get("action")), action.trim().toUpperCase()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<AuditLog> resultPage = auditLogRepository.findAll(spec, pageable);
        return PageResponse.from(resultPage);
    }

    @Override
    public Map<String, Object> dashboardFor(String role) {
        Map<String, Object> stats = new HashMap<>();
        stats.put("role", role);
        stats.put("totalNotifications", notificationRepository.count());
        stats.put("totalAuditEntries", auditLogRepository.count());
        stats.put("generatedAt", java.time.LocalDateTime.now().toString());
        return stats;
    }

    @Override
    @Transactional
    public Map<String, Object> broadcastEmergencyAlert(String actorId, String actorRole, com.misxmatch.notification.dto.EmergencyBroadcastRequest req) {
        String actor = actorId != null ? actorId : "POLICE_HQ";
        String caseNum = req.getCaseNumber() != null ? req.getCaseNumber() : "AMBER-" + System.currentTimeMillis();
        String radius = req.getBroadcastRadius() != null ? req.getBroadcastRadius() : "50km Regional Radius";

        String title = "🚨 AMBER EMERGENCY ALERT: #" + caseNum + " (" + req.getPersonName() + ")";
        String msg = String.format("URGENT: Missing %s (Age: %s, Gender: %s). Last seen: %s. %s. Jurisdiction units on high alert.",
                req.getPersonName(),
                req.getAge() != null ? req.getAge() : "Unknown",
                req.getGender() != null ? req.getGender() : "Unknown",
                req.getLastSeenLocation() != null ? req.getLastSeenLocation() : "Local Area",
                req.getDescription() != null ? req.getDescription() : "Active search underway");

        // 1. Broadcast to Police units
        notificationRepository.save(Notification.builder()
                .recipientUserId("police_officer")
                .title(title)
                .message(msg)
                .type("EMERGENCY")
                .read(false)
                .build());

        // 2. Broadcast to Hospital ER rosters
        notificationRepository.save(Notification.builder()
                .recipientUserId("hospital_staff")
                .title(title)
                .message(msg)
                .type("EMERGENCY")
                .read(false)
                .build());

        // 3. Broadcast to NGO / Shelter coordinators
        notificationRepository.save(Notification.builder()
                .recipientUserId("ngo_coordinator")
                .title(title)
                .message(msg)
                .type("EMERGENCY")
                .read(false)
                .build());

        // 4. Broadcast to Public / Citizen patrol feed
        notificationRepository.save(Notification.builder()
                .recipientUserId("all")
                .title(title)
                .message(msg)
                .type("EMERGENCY")
                .read(false)
                .build());

        // 5. Dispatch real Email/SMS notification to verified authority role (Police/Admin)
        emailService.sendEmergencyBroadcast(caseNum, req.getPersonName(), req.getPriority() != null ? req.getPriority() : "CRITICAL", req.getLastSeenLocation(), req.getDescription(), List.of("police_hq@misxmatch.org", "admin@misxmatch.org"));

        // Log in immutable audit ledger
        logAction(actor, actorRole != null ? actorRole : "ROLE_POLICE", "EMERGENCY_AMBER_DISPATCHED",
                "Case #" + caseNum + " (" + req.getPersonName() + ") dispatched across " + radius);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("caseNumber", caseNum);
        response.put("personName", req.getPersonName());
        response.put("broadcastRadius", radius);
        response.put("dispatchedChannels", req.getTargetChannels() != null ? req.getTargetChannels() : List.of("PORTAL_ALERT", "SMS_GATEWAY", "WHATSAPP_DISPATCH"));
        response.put("respondersAlerted", 4);
        response.put("timestamp", java.time.LocalDateTime.now().toString());

        return response;
    }
}
