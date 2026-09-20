package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.CctvInvestigationLead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CctvInvestigationLeadRepository extends JpaRepository<CctvInvestigationLead, Long> {
    List<CctvInvestigationLead> findByCameraCode(String cameraCode);
    List<CctvInvestigationLead> findByMissingCaseNumber(String missingCaseNumber);
    List<CctvInvestigationLead> findByLeadStatus(String leadStatus);
    Optional<CctvInvestigationLead> findByLeadNumber(String leadNumber);
}
