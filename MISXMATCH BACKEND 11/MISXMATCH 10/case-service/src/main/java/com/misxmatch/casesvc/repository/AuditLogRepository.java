package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {
    List<AuditLog> findByActorUserId(String actorUserId);
    List<AuditLog> findByAction(String action);
    List<AuditLog> findByTargetResource(String targetResource);
}
