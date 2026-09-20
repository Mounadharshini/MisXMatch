package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.entity.AuditLog;
import com.misxmatch.casesvc.repository.AuditLogRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public AuditLog logEvent(String actorUserId, String actorRole, String action, String targetResource, String details) {
        AuditLog entry = AuditLog.builder()
                .actorUserId(actorUserId != null ? actorUserId : "SYSTEM")
                .actorRole(actorRole != null ? actorRole : "SYSTEM")
                .action(action)
                .targetResource(targetResource)
                .details(details)
                .build();
        AuditLog saved = auditLogRepository.save(entry);
        log.info("AUDIT_LOG_PERSISTED: id={}, actor={}, role={}, action={}, resource={}",
                saved.getId(), saved.getActorUserId(), saved.getActorRole(), saved.getAction(), saved.getTargetResource());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsForResource(String resource) {
        return auditLogRepository.findByTargetResource(resource);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAllAuditLogs() {
        return auditLogRepository.findAll();
    }
}
