package com.misxmatch.auth.controller;

import com.misxmatch.auth.dto.OrganizationRequest;
import com.misxmatch.auth.dto.PageResponse;
import com.misxmatch.auth.entity.Organization;
import com.misxmatch.auth.service.OrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "Organizations", description = "Org registration for POLICE/HOSPITAL/NGO/SHELTER accounts and admin approval")
public class OrganizationController {

    private final OrganizationService organizationService;

    public OrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @PostMapping("/users/organization")
    @Operation(summary = "Submit or update this account's organization details (goes to PENDING review)")
    public ResponseEntity<Organization> submit(@RequestHeader("X-User-Id") String userId,
                                                @Valid @RequestBody OrganizationRequest request) {
        return ResponseEntity.ok(organizationService.submit(userId, request));
    }

    @GetMapping("/users/organization")
    @Operation(summary = "Get this account's organization submission and its verification status")
    public ResponseEntity<Organization> mine(@RequestHeader("X-User-Id") String userId) {
        Organization org = organizationService.getMine(userId);
        return org != null ? ResponseEntity.ok(org) : ResponseEntity.noContent().build();
    }

    @GetMapping("/users/organizations")
    @Operation(summary = "List all organizations with dynamic pagination, search, and orgType filter")
    public ResponseEntity<PageResponse<Organization>> listAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String orgType,
            @RequestParam(required = false) String verificationStatus,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(organizationService.listAllPaginated(page, size, q, orgType, verificationStatus, sortBy, sortDir));
    }

    @GetMapping("/admin/organizations/pending")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "List organizations awaiting verification with dynamic pagination")
    public ResponseEntity<PageResponse<Organization>> pending(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(organizationService.listPendingPaginated(page, size, q, sortBy, sortDir));
    }

    @PostMapping("/admin/organizations/{userId}/approve")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Approve a pending organization")
    public ResponseEntity<Organization> approve(@PathVariable String userId,
                                                 @RequestHeader("X-User-Id") String approverId) {
        return ResponseEntity.ok(organizationService.approve(userId, approverId));
    }

    @PostMapping("/admin/organizations/{userId}/reject")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Reject a pending organization")
    public ResponseEntity<Organization> reject(@PathVariable String userId,
                                                @RequestHeader("X-User-Id") String approverId) {
        return ResponseEntity.ok(organizationService.reject(userId, approverId));
    }
}
