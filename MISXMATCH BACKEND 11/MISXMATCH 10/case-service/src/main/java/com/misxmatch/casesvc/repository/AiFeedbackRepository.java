package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.AiFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiFeedbackRepository extends JpaRepository<AiFeedback, Long> {
    List<AiFeedback> findByCaseId(String caseId);
    List<AiFeedback> findByLeadId(String leadId);
}
