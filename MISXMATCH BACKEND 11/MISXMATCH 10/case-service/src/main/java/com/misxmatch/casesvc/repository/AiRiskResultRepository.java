package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.AiRiskResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiRiskResultRepository extends JpaRepository<AiRiskResult, Long> {

    Optional<AiRiskResult> findTopByCaseIdOrderByAnalysisTimestampDesc(String caseId);

    List<AiRiskResult> findByCaseIdOrderByAnalysisTimestampDesc(String caseId);
}
