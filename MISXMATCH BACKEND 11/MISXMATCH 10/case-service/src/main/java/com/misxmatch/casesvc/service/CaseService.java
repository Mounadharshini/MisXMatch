package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.dto.*;
import com.misxmatch.casesvc.entity.CaseStatus;
import com.misxmatch.casesvc.entity.CctvCamera;
import com.misxmatch.casesvc.entity.FoundPerson;
import com.misxmatch.casesvc.entity.MissingPerson;

import java.util.List;
import java.util.Map;

public interface CaseService {
    MissingPerson reportMissing(String reportedBy, MissingPersonRequest request);
    List<MissingPerson> listMissing();
    List<MissingPerson> listMissingByReporter(String reportedBy);
    PageResponse<MissingPerson> listMissingPaginated(int page, int size, String q, String status, String priority, String gender, String reportedBy, String sortBy, String sortDir);
    Map<String, Object> getMyReports(String reportedBy);
    MissingPerson getMissingById(Long id);
    MissingPerson getMissingByIdOrCaseNumber(String idOrCaseNumber);
    MissingPerson updateMissing(Long id, MissingPersonRequest request);
    MissingPerson updateMissing(String idOrCaseNumber, MissingPersonRequest request);
    MissingPerson updateMissingStatus(Long id, CaseStatus status);
    MissingPerson updateMissingStatus(String idOrCaseNumber, CaseStatus status);
    void deleteMissing(Long id);
    void deleteMissing(String idOrCaseNumber);

    FoundPerson reportFound(String reportedBy, FoundPersonRequest request);
    List<FoundPerson> listFound();
    List<FoundPerson> listFoundByCategory(String category);
    PageResponse<FoundPerson> listFoundPaginated(int page, int size, String q, String category, String status, String reportedBy, String sortBy, String sortDir);
    FoundPerson getFoundByIdOrCaseNumber(String idOrCaseNumber);
    void deleteFound(String idOrCaseNumber);

    void reportSighting(String reportedBy, SightingRequest request);
    List<com.misxmatch.casesvc.entity.Sighting> listSightings();
    PageResponse<com.misxmatch.casesvc.entity.Sighting> listSightingsPaginated(int page, int size, String q, String caseNumber, Boolean verified, String reportedBy, String sortBy, String sortDir);
    com.misxmatch.casesvc.entity.Sighting verifySighting(Long id, boolean verified);
    com.misxmatch.casesvc.entity.Sighting verifySighting(String idOrCaseNumber, boolean verified);
    void dismissSighting(Long id);
    void dismissSighting(String idOrCaseNumber);

    MatchResult matchImage(String requestedBy, ImageMatchRequest request);
    MatchResult matchText(String requestedBy, TextMatchRequest request);
    List<com.misxmatch.casesvc.entity.AiMatch> listMatches();
    List<com.misxmatch.casesvc.entity.AiMatch> getMatchesForReport(String caseNumber);
    PageResponse<com.misxmatch.casesvc.entity.AiMatch> listMatchesPaginated(int page, int size, String q, String matchStatus, String sortBy, String sortDir);

    CaseStatus getStatus(String caseNumber);

    List<CctvCamera> listCctvCameras();
    PageResponse<CctvCamera> listCctvCamerasPaginated(int page, int size, String q, String status, String sortBy, String sortDir);
    CctvScanResponse scanCctv(String requestedBy, CctvScanRequest request);

    Map<String, Object> getStats();

    // AI Intelligence Modules
    NlpSearchResponse searchNlp(NlpSearchRequest request);
    OcrExtractResponse processOcr(String userId, OcrExtractRequest request);
    DuplicateCheckResponse checkDuplicate(DuplicateCheckRequest request);
    RiskAssessmentResponse assessRisk(Long missingPersonId);
    List<MissingPerson> listRiskPrioritizedQueue();
    PageResponse<MissingPerson> listRiskPrioritizedQueuePaginated(int page, int size, String sortBy, String sortDir);
    com.misxmatch.casesvc.entity.AiMatch reviewMatch(Long matchId, String reviewerUserId, MatchReviewRequest request);

    // CCTV Investigation Module
    CctvCamera createCamera(CctvCameraRequest request);
    CctvCamera updateCamera(Long id, CctvCameraRequest request);
    void deleteCamera(Long id);
    CctvCamera toggleCameraStatus(Long id, String status);
    CctvCropAnalysisResponse analyzeCctvCrop(String userId, CctvCropAnalysisRequest request);
    CctvTimelineSearchResponse searchCctvTimeline(CctvTimelineSearchRequest request);
    com.misxmatch.casesvc.entity.CctvInvestigationLead saveInvestigationLead(String userId, CctvLeadRequest request);
    List<com.misxmatch.casesvc.entity.CctvInvestigationLead> listInvestigationLeads();
    int retriggerAllMatches(String requestedBy);
    List<com.misxmatch.casesvc.entity.CctvAnalysisSession> listAnalysisHistory();

    MissingPerson updateMissingPhoto(String idOrCaseNumber, org.springframework.web.multipart.MultipartFile file);
    FoundPerson updateFoundPhoto(String idOrCaseNumber, org.springframework.web.multipart.MultipartFile file);
    String uploadFile(org.springframework.web.multipart.MultipartFile file, String folder);
    Object submitUnifiedReport(String userId, UnifiedReportRequest request, org.springframework.web.multipart.MultipartFile file);
    java.util.Map<String, Object> getActiveCases(String type, String q);

    // Evidence-Based Verification & Reunification Workflow
    com.misxmatch.casesvc.entity.UploadedFile submitVerificationEvidence(String userId, String caseNumber, Long matchId, String evidenceType, String title, String description, String verificationNotes, String officerName, String badgeNumber, org.springframework.web.multipart.MultipartFile file);
    Map<String, Object> requestReunificationConfirmation(String userId, String caseNumber, Long matchId);
    com.misxmatch.casesvc.entity.CaseReunificationRequest confirmReunification(String userId, String caseNumber, com.misxmatch.casesvc.dto.ReunificationConfirmationRequest request);
    com.misxmatch.casesvc.entity.CaseReunificationRequest rejectReunification(String userId, String caseNumber, com.misxmatch.casesvc.dto.ReunificationRejectionRequest request);
    java.util.Optional<com.misxmatch.casesvc.entity.CaseReunificationRequest> getReunificationDetails(String caseNumber);
    com.misxmatch.casesvc.entity.CaseReunificationRequest approveReunificationClosure(String adminUserId, String caseNumber, String notes);
}
