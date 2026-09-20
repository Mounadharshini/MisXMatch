package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.CctvAnalysisSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CctvAnalysisSessionRepository extends JpaRepository<CctvAnalysisSession, Long> {
    List<CctvAnalysisSession> findByCameraCode(String cameraCode);
    List<CctvAnalysisSession> findByInvestigatorUserId(String investigatorUserId);
    List<CctvAnalysisSession> findByTopMatchedCaseNumber(String topMatchedCaseNumber);
    List<CctvAnalysisSession> findAllByOrderByAnalyzedAtDesc();
}
