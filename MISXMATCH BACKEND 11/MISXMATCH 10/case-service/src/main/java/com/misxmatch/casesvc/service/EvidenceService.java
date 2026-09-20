package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.dto.EvidenceRequest;
import com.misxmatch.casesvc.dto.PageResponse;
import com.misxmatch.casesvc.entity.UploadedFile;

import java.util.List;

public interface EvidenceService {
    UploadedFile upload(String uploadedBy, EvidenceRequest request);
    UploadedFile uploadMultipart(String uploadedBy, String caseNumber, String title, String category, String location, String seizureDate, String description, String officerName, String badgeNumber, org.springframework.web.multipart.MultipartFile file);
    UploadedFile uploadVerificationEvidence(String uploadedBy, String caseNumber, Long matchId, String evidenceType, String title, String description, String verificationNotes, String officerName, String badgeNumber, org.springframework.web.multipart.MultipartFile file);
    List<UploadedFile> listAll();
    PageResponse<UploadedFile> listAllPaginated(int page, int size, String q, String category, String fileType, String sortBy, String sortDir);
    List<UploadedFile> listByCase(String caseNumber);
    PageResponse<UploadedFile> listByCasePaginated(String caseNumber, int page, int size, String q, String sortBy, String sortDir);
    void delete(Long id);
}
