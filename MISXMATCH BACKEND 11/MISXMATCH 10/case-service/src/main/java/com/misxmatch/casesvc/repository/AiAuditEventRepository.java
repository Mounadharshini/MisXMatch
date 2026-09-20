package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.AiAuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiAuditEventRepository extends JpaRepository<AiAuditEvent, Long> {
    List<AiAuditEvent> findByCaseId(String caseId);
    List<AiAuditEvent> findByPrincipalId(String principalId);
}
