package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.AiMatchResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiMatchResultRepository extends JpaRepository<AiMatchResult, Long> {
    
    Optional<AiMatchResult> findTopBySourceCaseIdAndCandidateCaseIdOrderByAnalysisTimestampDesc(String sourceCaseId, String candidateCaseId);
    
    List<AiMatchResult> findBySourceCaseIdOrderByOverallScoreDesc(String sourceCaseId);
    
    List<AiMatchResult> findByCandidateCaseIdOrderByOverallScoreDesc(String candidateCaseId);

    List<AiMatchResult> findBySourceCaseIdOrCandidateCaseIdOrderByOverallScoreDesc(String sourceCaseId, String candidateCaseId);

    List<AiMatchResult> findByReviewStatus(String reviewStatus);

    long countByReviewStatus(String reviewStatus);
}
