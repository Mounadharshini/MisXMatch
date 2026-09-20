package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.UploadedFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface UploadedFileRepository extends JpaRepository<UploadedFile, Long>, JpaSpecificationExecutor<UploadedFile> {
    List<UploadedFile> findByCaseNumber(String caseNumber);
    List<UploadedFile> findByMatchId(Long matchId);
}
