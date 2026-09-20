package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.CaseReunificationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CaseReunificationRequestRepository extends JpaRepository<CaseReunificationRequest, Long> {

    Optional<CaseReunificationRequest> findTopByCaseNumberOrderByIdDesc(String caseNumber);

    List<CaseReunificationRequest> findByCaseNumberOrderByIdDesc(String caseNumber);

    List<CaseReunificationRequest> findByStatusOrderByIdDesc(String status);

    List<CaseReunificationRequest> findByReportedByOrderByIdDesc(String reportedBy);

    Optional<CaseReunificationRequest> findTopByMatchIdOrderByIdDesc(Long matchId);
}
