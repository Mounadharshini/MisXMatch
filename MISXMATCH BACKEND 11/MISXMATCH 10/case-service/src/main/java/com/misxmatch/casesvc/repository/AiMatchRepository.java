package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.AiMatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiMatchRepository extends JpaRepository<AiMatch, Long>, JpaSpecificationExecutor<AiMatch> {
    List<AiMatch> findByMissingCaseNumber(String missingCaseNumber);
    List<AiMatch> findByFoundCaseNumber(String foundCaseNumber);
    List<AiMatch> findByMatchStatus(String matchStatus);
    List<AiMatch> findByMissingCaseNumberOrFoundCaseNumber(String c1, String c2);
    List<AiMatch> findBySourceCaseNumberOrTargetCaseNumber(String c1, String c2);
}
