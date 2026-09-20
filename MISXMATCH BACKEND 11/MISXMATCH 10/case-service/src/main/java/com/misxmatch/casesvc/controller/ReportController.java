package com.misxmatch.casesvc.controller;

import com.misxmatch.casesvc.dto.FoundPersonRequest;
import com.misxmatch.casesvc.dto.MissingPersonRequest;
import com.misxmatch.casesvc.dto.SightingRequest;
import com.misxmatch.casesvc.dto.UnifiedReportRequest;
import com.misxmatch.casesvc.service.CaseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/reports")
@Tag(name = "Reports Management", description = "User reports submission and authenticated query endpoints")
public class ReportController {

    private final CaseService caseService;

    public ReportController(CaseService caseService) {
        this.caseService = caseService;
    }

    private String resolveAuthenticatedUserId(String headerUserId) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getName() != null && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
            return auth.getName().trim();
        }
        if (headerUserId != null && !headerUserId.isBlank() && !"CITIZEN".equalsIgnoreCase(headerUserId) && !"ANONYMOUS".equalsIgnoreCase(headerUserId) && !"anonymousUser".equalsIgnoreCase(headerUserId)) {
            return headerUserId.trim();
        }
        return null;
    }

    @GetMapping(value = {"/my", "/my-reports"})
    @Operation(summary = "Get all reports (missing, found, sightings) filed strictly by the authenticated user")
    public ResponseEntity<?> getMyReports(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        String currentUserId = resolveAuthenticatedUserId(userId);
        if (currentUserId == null || currentUserId.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", 401,
                    "error", "Unauthorized",
                    "message", "Authentication required to view your personal reports"));
        }
        return ResponseEntity.ok(caseService.getMyReports(currentUserId));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Unified endpoint to submit any report (Missing Person, Found Person, Sighting) as JSON")
    public ResponseEntity<?> submitReportJson(@RequestHeader(value = "X-User-Id", required = false) String userId,
                                             @RequestBody UnifiedReportRequest request) {
        String currentUserId = resolveAuthenticatedUserId(userId);
        if (currentUserId == null || currentUserId.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", 401,
                    "error", "Unauthorized",
                    "message", "Authentication required. You must be logged in to submit a report."));
        }
        return ResponseEntity.ok(caseService.submitUnifiedReport(currentUserId, request, null));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Unified endpoint to submit report with optional multipart photo file")
    public ResponseEntity<?> submitReportMultipart(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestParam(value = "photo", required = false) MultipartFile photo,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam Map<String, String> allParams,
            @RequestPart(value = "data", required = false) UnifiedReportRequest requestPart) {
        String currentUserId = resolveAuthenticatedUserId(userId);
        if (currentUserId == null || currentUserId.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", 401,
                    "error", "Unauthorized",
                    "message", "Authentication required. You must be logged in to submit a report."));
        }
        MultipartFile uploadFile = photo != null ? photo : file;
        UnifiedReportRequest req = requestPart != null ? requestPart : UnifiedReportRequest.fromMap(allParams);
        return ResponseEntity.ok(caseService.submitUnifiedReport(currentUserId, req, uploadFile));
    }

    @PostMapping("/missing")
    @Operation(summary = "Report a missing person linked to authenticated user")
    public ResponseEntity<?> reportMissing(@RequestHeader(value = "X-User-Id", required = false) String userId,
                                           @Valid @RequestBody MissingPersonRequest request) {
        String authenticatedUser = resolveAuthenticatedUserId(userId);
        if (authenticatedUser == null || authenticatedUser.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", 401,
                    "error", "Unauthorized",
                    "message", "Authentication required. You must be logged in to submit a missing person report."));
        }
        return ResponseEntity.ok(caseService.reportMissing(authenticatedUser, request));
    }

    @PostMapping("/found")
    @Operation(summary = "Report a found person linked to authenticated user")
    public ResponseEntity<?> reportFound(@RequestHeader(value = "X-User-Id", required = false) String userId,
                                         @Valid @RequestBody FoundPersonRequest request) {
        String authenticatedUser = resolveAuthenticatedUserId(userId);
        if (authenticatedUser == null || authenticatedUser.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", 401,
                    "error", "Unauthorized",
                    "message", "Authentication required. You must be logged in to submit a found person report."));
        }
        return ResponseEntity.ok(caseService.reportFound(authenticatedUser, request));
    }

    @PostMapping("/sighting")
    @Operation(summary = "Submit a sighting report linked to authenticated user")
    public ResponseEntity<?> reportSighting(@RequestHeader(value = "X-User-Id", required = false) String userId,
                                            @Valid @RequestBody SightingRequest request) {
        String authenticatedUser = resolveAuthenticatedUserId(userId);
        if (authenticatedUser == null || authenticatedUser.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", 401,
                    "error", "Unauthorized",
                    "message", "Authentication required. You must be logged in to submit a sighting report."));
        }
        caseService.reportSighting(authenticatedUser, request);
        return ResponseEntity.ok(Map.of("message", "Sighting recorded successfully", "status", "SUCCESS"));
    }
}
