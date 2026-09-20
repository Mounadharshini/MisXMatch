package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.Sighting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SightingRepository extends JpaRepository<Sighting, Long>, JpaSpecificationExecutor<Sighting> {
    java.util.List<Sighting> findByUserIdOrderByCreatedAtDesc(String userId);
    java.util.List<Sighting> findByReportedBy(String reportedBy);
    java.util.List<Sighting> findByMissingCaseNumberOrderBySightedAtDesc(String missingCaseNumber);
}
