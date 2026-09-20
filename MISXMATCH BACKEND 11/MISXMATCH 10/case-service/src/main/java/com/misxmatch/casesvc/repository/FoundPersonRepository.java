package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.FoundPerson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface FoundPersonRepository extends JpaRepository<FoundPerson, Long>, JpaSpecificationExecutor<FoundPerson> {
    Optional<FoundPerson> findByCaseNumber(String caseNumber);
    List<FoundPerson> findByUserIdOrderByCreatedAtDesc(String userId);
    List<FoundPerson> findByCategory(String category);
    List<FoundPerson> findByReportedBy(String reportedBy);
}
