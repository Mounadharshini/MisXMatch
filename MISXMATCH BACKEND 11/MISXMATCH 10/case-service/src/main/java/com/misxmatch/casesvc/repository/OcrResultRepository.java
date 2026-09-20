package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.OcrResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OcrResultRepository extends JpaRepository<OcrResult, Long> {
    List<OcrResult> findByCaseNumber(String caseNumber);
}
