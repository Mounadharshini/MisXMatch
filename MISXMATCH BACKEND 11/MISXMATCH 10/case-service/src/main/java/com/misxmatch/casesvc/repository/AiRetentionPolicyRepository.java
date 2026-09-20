package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.AiRetentionPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AiRetentionPolicyRepository extends JpaRepository<AiRetentionPolicy, Long> {
    List<AiRetentionPolicy> findByCaseId(String caseId);
    List<AiRetentionPolicy> findByRetentionExpiryBeforeAndDeletedAtIsNull(LocalDateTime now);
}
