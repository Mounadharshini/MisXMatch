package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.AiCandidateLead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiCandidateLeadRepository extends JpaRepository<AiCandidateLead, Long> {
    Optional<AiCandidateLead> findByLeadId(String leadId);
    List<AiCandidateLead> findBySourceCaseNumberOrTargetCaseNumber(String sourceCaseNumber, String targetCaseNumber);
    List<AiCandidateLead> findByDecisionStatus(String decisionStatus);
}
