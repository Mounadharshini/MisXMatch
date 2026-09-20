package com.misxmatch.auth.controller;

import com.misxmatch.auth.dto.PageResponse;
import com.misxmatch.auth.dto.ProfileRequest;
import com.misxmatch.auth.dto.ProfileResponse;
import com.misxmatch.auth.dto.UserSummaryDto;
import com.misxmatch.auth.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@Tag(name = "User Profiles & Administration", description = "Profiles, KYC and administration (merged into auth-service)")
public class UserController {

    private final ProfileService profileService;

    public UserController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/users/profile")
    @Operation(summary = "Get the authenticated user's profile")
    public ResponseEntity<ProfileResponse> getMyProfile(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(profileService.getProfile(userId));
    }

    @PutMapping("/users/profile")
    @Operation(summary = "Update the authenticated user's profile")
    public ResponseEntity<ProfileResponse> updateMyProfile(@RequestHeader("X-User-Id") String userId,
                                                             @RequestHeader(value = "X-User-Role", required = false, defaultValue = "PUBLIC_USER") String role,
                                                             @Valid @RequestBody ProfileRequest request) {
        return ResponseEntity.ok(profileService.updateProfile(userId, role, request));
    }

    @GetMapping("/users/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN','ROLE_POLICE')")
    @Operation(summary = "Get any user's profile by userId (admin/police only)")
    public ResponseEntity<ProfileResponse> getById(@PathVariable("id") String id) {
        return ResponseEntity.ok(profileService.getProfileById(id));
    }

    @GetMapping("/admin/users")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "List registered platform users with verification status and dynamic pagination (admin only)")
    public ResponseEntity<PageResponse<UserSummaryDto>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(profileService.listAllUsersPaginated(page, size, q, role, enabled, sortBy, sortDir));
    }

    @PutMapping("/admin/users/{userId}/status")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    @Operation(summary = "Toggle user account status (Super Admin only)")
    public ResponseEntity<UserSummaryDto> updateUserStatus(@PathVariable String userId,
                                                           @RequestBody Map<String, Boolean> body) {
        boolean enabled = body.getOrDefault("enabled", true);
        return ResponseEntity.ok(profileService.updateUserStatus(userId, enabled));
    }

    @PostMapping("/admin/users/{userId}/deactivate")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    @Operation(summary = "Deactivate user account with mandatory reason and evidence reference (Super Admin only)")
    public ResponseEntity<UserSummaryDto> deactivateUser(
            @PathVariable String userId,
            @RequestHeader(value = "X-User-Id", defaultValue = "admin") String requestingUserId,
            @Valid @RequestBody com.misxmatch.auth.dto.DeactivateUserRequest request) {
        return ResponseEntity.ok(profileService.deactivateUser(userId, requestingUserId, request));
    }

    @PostMapping("/admin/users/{userId}/reactivate")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    @Operation(summary = "Reactivate suspended user account with mandatory reason (Super Admin only)")
    public ResponseEntity<UserSummaryDto> reactivateUser(
            @PathVariable String userId,
            @RequestHeader(value = "X-User-Id", defaultValue = "admin") String requestingUserId,
            @Valid @RequestBody com.misxmatch.auth.dto.ReactivateUserRequest request) {
        return ResponseEntity.ok(profileService.reactivateUser(userId, requestingUserId, request));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    @Operation(summary = "Delete a user's account and profile data (Super Admin only)")
    public ResponseEntity<Void> delete(
            @PathVariable("id") String id,
            @RequestHeader(value = "X-User-Id", defaultValue = "admin") String requestingUserId) {
        profileService.deleteUser(id, requestingUserId);
        return ResponseEntity.noContent().build();
    }
}
