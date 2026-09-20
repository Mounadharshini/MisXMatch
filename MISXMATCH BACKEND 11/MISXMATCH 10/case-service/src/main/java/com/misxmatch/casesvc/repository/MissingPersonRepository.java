package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.MissingPerson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface MissingPersonRepository extends JpaRepository<MissingPerson, Long>, JpaSpecificationExecutor<MissingPerson> {
    Optional<MissingPerson> findByCaseNumber(String caseNumber);
    List<MissingPerson> findByUserIdOrderByCreatedAtDesc(String userId);
    List<MissingPerson> findByReportedBy(String reportedBy);
    List<MissingPerson> findByNameIgnoreCase(String name);
    List<MissingPerson> findByNameIgnoreCaseAndReportedByIgnoreCase(String name, String reportedBy);
}
