package com.misxmatch.casesvc.controller;

import com.misxmatch.casesvc.dto.*;
import com.misxmatch.casesvc.entity.CaseStatus;
import com.misxmatch.casesvc.entity.CctvCamera;
import com.misxmatch.casesvc.entity.FoundPerson;
import com.misxmatch.casesvc.entity.MissingPerson;
import com.misxmatch.casesvc.entity.CaseReunificationRequest;
import com.misxmatch.casesvc.entity.UploadedFile;
import com.misxmatch.casesvc.service.CaseService;
import com.misxmatch.casesvc.service.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/cases")
@Tag(name = "Case Management", description = "Missing/found person reports, sightings, AI matching, CCTV surveillance and case tracking")
public class CaseController {

    private final CaseService caseService;
    private final FileStorageService fileStorageService;
    private final com.misxmatch.casesvc.service.CctvAiInvestigationService cctvAiInvestigationService;

    public CaseController(CaseService caseService,
                          FileStorageService fileStorageService,
                          com.misxmatch.casesvc.service.CctvAiInvestigationService cctvAiInvestigationService) {
        this.caseService = caseService;
        this.fileStorageService = fileStorageService;
        this.cctvAiInvestigationService = cctvAiInvestigationService;
    }

    private String resolveAuthenticatedUserId(String headerUserId) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getName() != null && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
            return auth.getName();
        }
        if (headerUserId != null && !headerUserId.isBlank() && !"CITIZEN".equalsIgnoreCase(headerUserId) && !"ANONYMOUS".equalsIgnoreCase(headerUserId)) {
            return headerUserId.trim();
        }
        return null;
    }

    @PostMapping("/missing")
    @Operation(summary = "Report a missing person (authenticated citizens)")
    public ResponseEntity<?> reportMissing(@RequestHeader(value = "X-User-Id", required = false) String userId,
                                           @Valid @RequestBody MissingPersonRequest request) {
        String authenticatedUser = resolveAuthenticatedUserId(userId);
        if (authenticatedUser == null || authenticatedUser.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("status", 401, "error", "Unauthorized", "message", "Authentication required to report a missing person"));
        }
        return ResponseEntity.ok(caseService.reportMissing(authenticatedUser, request));
    }

    @GetMapping("/missing")
    @Operation(summary = "List missing-person cases with dynamic database pagination, search, filter, and sorting")
    public ResponseEntity<PageResponse<MissingPerson>> listMissing(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String reportedBy,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(caseService.listMissingPaginated(page, size, q, status, priority, gender, reportedBy, sortBy, sortDir));
    }

    @GetMapping(value = {"/my-reports", "/my"})
    @Operation(summary = "Get all reports (missing, found, sightings) filed by the authenticated user")
    public ResponseEntity<?> getMyReports(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        String currentUserId = resolveAuthenticatedUserId(userId);
        if (currentUserId == null || currentUserId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized", "message", "Authentication required to view your personal reports"));
        }
        return ResponseEntity.ok(caseService.getMyReports(currentUserId));
    }

    @GetMapping("/missing/{id}")
    @Operation(summary = "Get a single missing-person case by its numeric id or caseNumber")
    public ResponseEntity<MissingPerson> getMissing(@PathVariable String id) {
        return ResponseEntity.ok(caseService.getMissingByIdOrCaseNumber(id));
    }

    @PutMapping("/missing/{id}")
    @Operation(summary = "Update a missing-person case")
    public ResponseEntity<MissingPerson> updateMissing(@PathVariable String id,
                                                         @Valid @RequestBody MissingPersonRequest request) {
        return ResponseEntity.ok(caseService.updateMissing(id, request));
    }

    @PutMapping("/missing/{id}/status")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_POLICE')")
    @Operation(summary = "Change a case's status (e.g. admin closure sign-off)")
    public ResponseEntity<MissingPerson> updateStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        CaseStatus status = CaseStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(caseService.updateMissingStatus(id, status));
    }

    @DeleteMapping("/missing/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_POLICE')")
    @Operation(summary = "Delete a missing-person case (admin/police only)")
    public ResponseEntity<Void> deleteMissing(@PathVariable String id) {
        caseService.deleteMissing(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/found")
    @Operation(summary = "Report a found person (authenticated citizens)")
    public ResponseEntity<?> reportFound(@RequestHeader(value = "X-User-Id", required = false) String userId,
                                         @Valid @RequestBody FoundPersonRequest request) {
        String authenticatedUser = resolveAuthenticatedUserId(userId);
        if (authenticatedUser == null || authenticatedUser.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("status", 401, "error", "Unauthorized", "message", "Authentication required to report a found person"));
        }
        return ResponseEntity.ok(caseService.reportFound(authenticatedUser, request));
    }

    @GetMapping("/found")
    @Operation(summary = "List found-person records with dynamic pagination, category, status, and search filters")
    public ResponseEntity<PageResponse<FoundPerson>> listFound(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String reportedBy,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(caseService.listFoundPaginated(page, size, q, category, status, reportedBy, sortBy, sortDir));
    }

    @GetMapping("/found/{id}")
    @Operation(summary = "Get a found-person record by numeric ID or caseNumber (FP-XXXXXX)")
    public ResponseEntity<FoundPerson> getFound(@PathVariable String id) {
        return ResponseEntity.ok(caseService.getFoundByIdOrCaseNumber(id));
    }

    @DeleteMapping("/found/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_POLICE')")
    @Operation(summary = "Delete a found-person record (admin/police only)")
    public ResponseEntity<Void> deleteFound(@PathVariable String id) {
        caseService.deleteFound(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sighting")
    @Operation(summary = "Submit a sighting report for a missing person (authenticated citizens)")
    public ResponseEntity<?> reportSighting(@RequestHeader(value = "X-User-Id", required = false) String userId,
                                            @Valid @RequestBody SightingRequest request) {
        String authenticatedUser = resolveAuthenticatedUserId(userId);
        if (authenticatedUser == null || authenticatedUser.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("status", 401, "error", "Unauthorized", "message", "Authentication required to report a sighting"));
        }
        caseService.reportSighting(authenticatedUser, request);
        return ResponseEntity.ok(Map.of("message", "Sighting recorded successfully", "status", "SUCCESS"));
    }

    @PostMapping("/reports")
    @Operation(summary = "Submit a unified case report (Missing, Found, or Sighting)")
    public ResponseEntity<?> submitUnifiedReport(@RequestHeader(value = "X-User-Id", required = false) String userId,
                                                 @RequestBody UnifiedReportRequest request) {
        String authenticatedUser = resolveAuthenticatedUserId(userId);
        if (authenticatedUser == null || authenticatedUser.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("status", 401, "error", "Unauthorized", "message", "Authentication required to submit a report"));
        }
        return ResponseEntity.ok(caseService.submitUnifiedReport(authenticatedUser, request, null));
    }

    @GetMapping("/sightings")
    @Operation(summary = "List sighting reports with dynamic pagination, reportedBy and verification filters")
    public ResponseEntity<PageResponse<com.misxmatch.casesvc.entity.Sighting>> listSightings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String caseNumber,
            @RequestParam(required = false) Boolean verified,
            @RequestParam(required = false) String reportedBy,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(caseService.listSightingsPaginated(page, size, q, caseNumber, verified, reportedBy, sortBy, sortDir));
    }

    @PutMapping("/sightings/{id}/verify")
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Mark a sighting report as verified")
    public ResponseEntity<com.misxmatch.casesvc.entity.Sighting> verifySighting(@PathVariable String id) {
        return ResponseEntity.ok(caseService.verifySighting(id, true));
    }

    @DeleteMapping("/sightings/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Dismiss (delete) a sighting report")
    public ResponseEntity<Void> dismissSighting(@PathVariable String id) {
        caseService.dismissSighting(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/match/image")
    @Operation(summary = "Run intelligent AI image and attribute similarity matching for a missing-person case")
    public ResponseEntity<MatchResult> matchImage(@RequestHeader(value = "X-User-Id", required = false) String userId,
                                                    @Valid @RequestBody ImageMatchRequest request) {
        return ResponseEntity.ok(caseService.matchImage(userId, request));
    }

    @PostMapping("/match/text")
    @Operation(summary = "Run intelligent AI text, physical description and NLP similarity matching")
    public ResponseEntity<MatchResult> matchText(@RequestHeader(value = "X-User-Id", required = false) String userId,
                                                   @Valid @RequestBody TextMatchRequest request) {
        return ResponseEntity.ok(caseService.matchText(userId, request));
    }

    @GetMapping("/status/{caseNumber}")
    @Operation(summary = "Get the current status of a case by case number")
    public ResponseEntity<Map<String, CaseStatus>> getStatus(@PathVariable String caseNumber) {
        return ResponseEntity.ok(Map.of("status", caseService.getStatus(caseNumber)));
    }

    @GetMapping("/matches")
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_NGO','ROLE_SHELTER','ROLE_HOSPITAL')")
    @Operation(summary = "List persisted AI match candidates across cases with dynamic pagination")
    public ResponseEntity<PageResponse<com.misxmatch.casesvc.entity.AiMatch>> listMatches(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String matchStatus,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(caseService.listMatchesPaginated(page, size, q, matchStatus, sortBy, sortDir));
    }

    @GetMapping("/matches/report/{caseNumber}")
    @Operation(summary = "Get Top 3-5 AI candidate matches for a specific report (Missing, Found, or Sighting)")
    public ResponseEntity<List<com.misxmatch.casesvc.entity.AiMatch>> getMatchesForReport(@PathVariable String caseNumber) {
        return ResponseEntity.ok(caseService.getMatchesForReport(caseNumber));
    }

    @PostMapping("/matches/retrigger-all")
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Retrigger automated AI multimodal matching across all active cases, found dossiers, and sightings")
    public ResponseEntity<Map<String, Object>> retriggerAllMatches(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        int count = caseService.retriggerAllMatches(userId != null ? userId : "POLICE_COMMAND_CENTER");
        return ResponseEntity.ok(Map.of("message", "AI Matching Engine re-executed across all stored reports", "totalMatchesCount", count));
    }

    @GetMapping("/cctv/cameras")
    @Operation(summary = "List connected CCTV surveillance cameras with dynamic pagination")
    public ResponseEntity<PageResponse<CctvCamera>> listCameras(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        return ResponseEntity.ok(caseService.listCctvCamerasPaginated(page, size, q, status, sortBy, sortDir));
    }

    @PostMapping("/cctv/scan")
    @Operation(summary = "Perform an AI surveillance frame scan on a CCTV camera feed against missing persons")
    public ResponseEntity<CctvScanResponse> scanCctv(@RequestHeader(value = "X-User-Id", required = false) String userId,
                                                     @Valid @RequestBody CctvScanRequest request) {
        return ResponseEntity.ok(caseService.scanCctv(userId, request));
    }

    @PostMapping("/ai/search-nlp")
    @Operation(summary = "Perform AI natural language semantic search across cases")
    public ResponseEntity<NlpSearchResponse> searchNlp(@Valid @RequestBody NlpSearchRequest request) {
        return ResponseEntity.ok(caseService.searchNlp(request));
    }

    @PostMapping("/ai/ocr")
    @Operation(summary = "Extract structured entities (names, dates, FIR numbers) from documents via AI OCR")
    public ResponseEntity<OcrExtractResponse> extractOcr(@RequestHeader(value = "X-User-Id", required = false) String userId,
                                                          @Valid @RequestBody OcrExtractRequest request) {
        return ResponseEntity.ok(caseService.processOcr(userId, request));
    }

    @PostMapping("/ai/detect-duplicate")
    @Operation(summary = "Detect potential duplicate missing or found case reports")
    public ResponseEntity<DuplicateCheckResponse> detectDuplicate(@Valid @RequestBody DuplicateCheckRequest request) {
        return ResponseEntity.ok(caseService.checkDuplicate(request));
    }

    @GetMapping("/ai/assess-risk/{id}")
    @Operation(summary = "Evaluate AI risk level and priority protocols for a missing person case")
    public ResponseEntity<RiskAssessmentResponse> assessRisk(@PathVariable Long id) {
        return ResponseEntity.ok(caseService.assessRisk(id));
    }

    @GetMapping("/ai/risk-queue")
    @Operation(summary = "Get missing person cases prioritized by risk level with dynamic pagination")
    public ResponseEntity<PageResponse<MissingPerson>> getRiskQueue(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "riskScore") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(caseService.listRiskPrioritizedQueuePaginated(page, size, sortBy, sortDir));
    }

    @PutMapping("/matches/{id}/review")
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Human authority review for AI biometric matches (VERIFIED_MATCH, DISMISSED, INVESTIGATING)")
    public ResponseEntity<com.misxmatch.casesvc.entity.AiMatch> reviewMatch(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Valid @RequestBody MatchReviewRequest request) {
        return ResponseEntity.ok(caseService.reviewMatch(id, userId, request));
    }

    // Evidence-Based Verification & Multi-Stage Reunification Workflow
    @PostMapping(value = "/{caseNumber}/verification/evidence", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Submit real evidence (photos, official docs, biometric proof) for match verification")
    public ResponseEntity<UploadedFile> submitVerificationEvidence(
            @PathVariable String caseNumber,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestParam(value = "matchId", required = false) Long matchId,
            @RequestParam(value = "evidenceType", required = false, defaultValue = "Identity confirmation") String evidenceType,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "verificationNotes", required = false) String verificationNotes,
            @RequestParam(value = "officerName", required = false) String officerName,
            @RequestParam(value = "badgeNumber", required = false) String badgeNumber,
            @RequestParam("file") MultipartFile file) {
        com.misxmatch.casesvc.util.FileValidationUtil.validateFileUpload(file);
        return ResponseEntity.ok(caseService.submitVerificationEvidence(userId, caseNumber, matchId, evidenceType, title, description, verificationNotes, officerName, badgeNumber, file));
    }

    @PostMapping("/{caseNumber}/reunification/request")
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Request safe reunification confirmation from the reporting family/guardian")
    public ResponseEntity<Map<String, Object>> requestReunificationConfirmation(
            @PathVariable String caseNumber,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestParam(value = "matchId", required = false) Long matchId,
            @RequestBody(required = false) Map<String, Object> body) {
        Long resolvedMatchId = matchId;
        if (resolvedMatchId == null && body != null && body.get("matchId") != null) {
            try {
                resolvedMatchId = Long.valueOf(body.get("matchId").toString());
            } catch (Exception ignored) {}
        }
        return ResponseEntity.ok(caseService.requestReunificationConfirmation(userId, caseNumber, resolvedMatchId));
    }

    @PostMapping("/{caseNumber}/reunification/confirm")
    @Operation(summary = "Original reporting citizen confirms safe reunification with details")
    public ResponseEntity<CaseReunificationRequest> confirmReunification(
            @PathVariable String caseNumber,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Valid @RequestBody ReunificationConfirmationRequest request) {
        return ResponseEntity.ok(caseService.confirmReunification(userId, caseNumber, request));
    }

    @PostMapping("/{caseNumber}/reunification/reject")
    @Operation(summary = "Original reporting citizen reports candidate as incorrect match (case remains active)")
    public ResponseEntity<CaseReunificationRequest> rejectReunification(
            @PathVariable String caseNumber,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Valid @RequestBody ReunificationRejectionRequest request) {
        return ResponseEntity.ok(caseService.rejectReunification(userId, caseNumber, request));
    }

    @GetMapping("/{caseNumber}/reunification")
    @Operation(summary = "Get latest reunification verification record for a case")
    public ResponseEntity<?> getReunificationDetails(@PathVariable String caseNumber) {
        return caseService.getReunificationDetails(caseNumber)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(null));
    }

    @PostMapping("/{caseNumber}/reunification/approve-closure")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Final administrative sign-off to formally close and archive a reunited case")
    public ResponseEntity<CaseReunificationRequest> approveReunificationClosure(
            @PathVariable String caseNumber,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null ? body.get("notes") : "Administrative sign-off granted following verified family reunification.";
        return ResponseEntity.ok(caseService.approveReunificationClosure(userId, caseNumber, notes));
    }

    @GetMapping("/stats")
    @Operation(summary = "Aggregate case statistics for dashboards/analytics")
    public ResponseEntity<Map<String, Object>> stats() {
        return ResponseEntity.ok(caseService.getStats());
    }

    @GetMapping("/active")
    @Operation(summary = "Get all active reports across missing, found, and sightings directly from database")
    public ResponseEntity<Map<String, Object>> getActiveCases(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(caseService.getActiveCases(type, q));
    }

    // CCTV Investigation Module Endpoints
    @PostMapping("/cctv/cameras")
    @Operation(summary = "Register a new CCTV camera node")
    public ResponseEntity<CctvCamera> createCamera(@Valid @RequestBody CctvCameraRequest request) {
        return ResponseEntity.ok(caseService.createCamera(request));
    }

    @PutMapping("/cctv/cameras/{id}")
    @Operation(summary = "Update an existing CCTV camera node")
    public ResponseEntity<CctvCamera> updateCamera(@PathVariable Long id, @RequestBody CctvCameraRequest request) {
        return ResponseEntity.ok(caseService.updateCamera(id, request));
    }

    @DeleteMapping("/cctv/cameras/{id}")
    @Operation(summary = "Delete a CCTV camera node")
    public ResponseEntity<Void> deleteCamera(@PathVariable Long id) {
        caseService.deleteCamera(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/cctv/cameras/{id}/status")
    @Operation(summary = "Toggle CCTV camera stream status (live / offline)")
    public ResponseEntity<CctvCamera> toggleCameraStatus(@PathVariable Long id, @RequestParam(required = false) String status) {
        return ResponseEntity.ok(caseService.toggleCameraStatus(id, status));
    }

    @PostMapping(value = "/cctv/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Real Computer Vision CCTV / Video Evidence AI Analysis Endpoint")
    public ResponseEntity<Map<String, Object>> analyzeCctvMedia(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "cameraCode", required = false) String cameraCode,
            @RequestParam(value = "sampleIntervalSec", required = false, defaultValue = "1.0") Float sampleIntervalSec,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "POLICE_OFFICER") String userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "POLICE") String userRole) {
        return ResponseEntity.ok(cctvAiInvestigationService.analyzeCctvMedia(file, cameraCode, userId, userRole, sampleIntervalSec));
    }

    @PostMapping("/cctv/analyze-crop")
    @Operation(summary = "Analyze manually cropped person from CCTV frame against missing persons database")
    public ResponseEntity<CctvCropAnalysisResponse> analyzeCrop(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody CctvCropAnalysisRequest request) {
        return ResponseEntity.ok(caseService.analyzeCctvCrop(userId, request));
    }

    @PostMapping("/cctv/timeline-search")
    @Operation(summary = "Search CCTV timeline tracks grouped across multi-frame detections")
    public ResponseEntity<CctvTimelineSearchResponse> searchTimeline(@RequestBody CctvTimelineSearchRequest request) {
        return ResponseEntity.ok(caseService.searchCctvTimeline(request));
    }

    @PostMapping("/cctv/leads")
    @Operation(summary = "Save confirmed CCTV investigation lead")
    public ResponseEntity<com.misxmatch.casesvc.entity.CctvInvestigationLead> saveLead(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody CctvLeadRequest request) {
        return ResponseEntity.ok(caseService.saveInvestigationLead(userId, request));
    }

    @GetMapping("/cctv/leads")
    @Operation(summary = "List all saved CCTV investigation leads")
    public ResponseEntity<List<com.misxmatch.casesvc.entity.CctvInvestigationLead>> listLeads() {
        return ResponseEntity.ok(caseService.listInvestigationLeads());
    }

    @GetMapping("/cctv/history")
    @Operation(summary = "List CCTV investigation session history")
    public ResponseEntity<List<com.misxmatch.casesvc.entity.CctvAnalysisSession>> listHistory() {
        return ResponseEntity.ok(caseService.listAnalysisHistory());
    }

    @PostMapping(value = "/missing/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload photo for a missing person case to S3/MinIO storage")
    public ResponseEntity<MissingPerson> uploadMissingPhoto(@PathVariable String id,
                                                             @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(caseService.updateMissingPhoto(id, file));
    }

    @PostMapping(value = "/found/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload photo for a found person record to S3/MinIO storage")
    public ResponseEntity<FoundPerson> uploadFoundPhoto(@PathVariable String id,
                                                         @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(caseService.updateFoundPhoto(id, file));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Generic S3/MinIO file upload endpoint returning storage URL and metadata")
    public ResponseEntity<Map<String, Object>> uploadFile(@RequestParam("file") MultipartFile file,
                                                           @RequestParam(value = "folder", required = false, defaultValue = "uploads") String folder) {
        String url = caseService.uploadFile(file, folder);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "fileUrl", url,
                "originalFilename", file.getOriginalFilename() != null ? file.getOriginalFilename() : "file.bin",
                "contentType", file.getContentType() != null ? file.getContentType() : "application/octet-stream",
                "size", file.getSize()
        ));
    }

    @GetMapping("/files/**")
    @Operation(summary = "Stream stored file from S3/MinIO or local fallback storage")
    public ResponseEntity<Resource> getStoredFile(HttpServletRequest request) {
        String path = request.getRequestURI();
        String objectKey = path.substring(path.indexOf("/files/") + 7);
        Resource resource = fileStorageService.loadAsResource(objectKey);
        String contentType = "application/octet-stream";
        String lowerKey = objectKey.toLowerCase();
        if (lowerKey.endsWith(".png")) contentType = "image/png";
        else if (lowerKey.endsWith(".jpg") || lowerKey.endsWith(".jpeg")) contentType = "image/jpeg";
        else if (lowerKey.endsWith(".gif")) contentType = "image/gif";
        else if (lowerKey.endsWith(".pdf")) contentType = "application/pdf";
        else if (lowerKey.endsWith(".mp4")) contentType = "video/mp4";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}
