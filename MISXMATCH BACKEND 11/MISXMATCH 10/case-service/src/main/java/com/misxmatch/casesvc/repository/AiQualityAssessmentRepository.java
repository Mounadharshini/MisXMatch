package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.AiQualityAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiQualityAssessmentRepository extends JpaRepository<AiQualityAssessment, Long> {
    List<AiQualityAssessment> findByCaseId(String caseId);
    Optional<AiQualityAssessment> findByEvidenceId(String evidenceId);
}
