package com.misxmatch.casesvc.controller;

import com.misxmatch.casesvc.dto.EvidenceRequest;
import com.misxmatch.casesvc.dto.PageResponse;
import com.misxmatch.casesvc.entity.UploadedFile;
import com.misxmatch.casesvc.service.EvidenceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/cases/evidence")
@Tag(name = "Evidence", description = "File attachments tied to a case (CCTV clips, documents, photos)")
public class EvidenceController {

    private final EvidenceService evidenceService;

    public EvidenceController(EvidenceService evidenceService) {
        this.evidenceService = evidenceService;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Attach a file (already uploaded elsewhere) to a case as evidence")
    public ResponseEntity<UploadedFile> upload(@RequestHeader(value = "X-User-Id", required = false) String userId,
                                                @Valid @RequestBody EvidenceRequest request) {
        return ResponseEntity.ok(evidenceService.upload(userId, request));
    }

    @PostMapping(value = "/upload", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Upload evidence file directly to S3/MinIO storage and link to case")
    public ResponseEntity<UploadedFile> uploadMultipart(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam("caseNumber") String caseNumber,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "category", required = false, defaultValue = "cctv") String category,
            @RequestParam(value = "location", required = false) String location,
            @RequestParam(value = "seizureDate", required = false) String seizureDate,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "officerName", required = false) String officerName,
            @RequestParam(value = "badgeNumber", required = false) String badgeNumber) {
        com.misxmatch.casesvc.util.FileValidationUtil.validateFileUpload(file);
        return ResponseEntity.ok(evidenceService.uploadMultipart(userId, caseNumber, title, category, location, seizureDate, description, officerName, badgeNumber, file));
    }

    @PostMapping(value = "/{caseNumber}/file", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Upload evidence file directly to S3/MinIO storage by case number")
    public ResponseEntity<UploadedFile> uploadMultipartByCase(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @PathVariable String caseNumber,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "category", required = false, defaultValue = "cctv") String category,
            @RequestParam(value = "location", required = false) String location,
            @RequestParam(value = "seizureDate", required = false) String seizureDate,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "officerName", required = false) String officerName,
            @RequestParam(value = "badgeNumber", required = false) String badgeNumber) {
        com.misxmatch.casesvc.util.FileValidationUtil.validateFileUpload(file);
        return ResponseEntity.ok(evidenceService.uploadMultipart(userId, caseNumber, title, category, location, seizureDate, description, officerName, badgeNumber, file));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "List evidence files across cases with dynamic pagination and category filters")
    public ResponseEntity<PageResponse<UploadedFile>> listAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String fileType,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(evidenceService.listAllPaginated(page, size, q, category, fileType, sortBy, sortDir));
    }

    @GetMapping("/case/{caseNumber}")
    @Operation(summary = "List evidence files for a specific case with dynamic pagination")
    public ResponseEntity<PageResponse<UploadedFile>> listByCase(
            @PathVariable String caseNumber,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(evidenceService.listByCasePaginated(caseNumber, page, size, q, sortBy, sortDir));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_POLICE','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Delete an evidence file record")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        evidenceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
