package com.misxmatch.auth.controller;

import com.misxmatch.auth.dto.*;
import com.misxmatch.auth.entity.User;
import com.misxmatch.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@Tag(name = "Authentication", description = "Registration, login, tokens, Aadhaar verification, and password reset")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user (PUBLIC_USER, POLICE, HOSPITAL, NGO or SHELTER only)")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Login with userId or email + password")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/aadhaar/send-otp")
    @Operation(summary = "Send Aadhaar OTP via authorized provider or demo provider")
    public ResponseEntity<AadhaarSendOtpResponse> sendAadhaarOtp(@Valid @RequestBody AadhaarSendOtpRequest request) {
        return ResponseEntity.ok(authService.sendAadhaarOtp(request));
    }

    @PostMapping("/aadhaar/request-otp")
    @Operation(summary = "Request OTP for Aadhaar authentication (legacy alias)")
    public ResponseEntity<Map<String, String>> requestAadhaarOtp(@Valid @RequestBody AadhaarOtpRequest request) {
        String message = authService.requestAadhaarOtp(request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @PostMapping("/aadhaar/verify-otp")
    @Operation(summary = "Verify Aadhaar OTP for registration or login")
    public ResponseEntity<AadhaarVerifyOtpResponse> verifyAadhaarOtp(@Valid @RequestBody AadhaarVerifyOtpRequest request) {
        return ResponseEntity.ok(authService.verifyAadhaarOtp(request));
    }

    @GetMapping("/aadhaar/provider-mode")
    @Operation(summary = "Check active Aadhaar OTP provider mode (demo vs authorized UIDAI provider)")
    public ResponseEntity<Map<String, String>> getAadhaarProviderMode() {
        return ResponseEntity.ok(Map.of(
                "mode", authService.getAadhaarProviderMode(),
                "status", "ACTIVE"
        ));
    }

    @PostMapping("/aadhaar/login-password")
    @Operation(summary = "Login with Aadhaar number + password")
    public ResponseEntity<AuthResponse> loginWithAadhaarPassword(@Valid @RequestBody AadhaarLoginRequest request) {
        return ResponseEntity.ok(authService.loginWithAadhaarPassword(request));
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoke a refresh token")
    public ResponseEntity<Map<String, String>> logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Exchange a valid refresh token for a new access/refresh token pair")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request a password reset link by email (neutral anti-enumeration response)")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        String message = authService.forgotPassword(request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @PostMapping(value = {"/forgot-password/resend-otp", "/resend-reset-otp"})
    @Operation(summary = "Resend a password reset verification code to email")
    public ResponseEntity<Map<String, String>> resendResetOtp(@Valid @RequestBody ForgotPasswordRequest request) {
        String message = authService.resendResetOtp(request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @PostMapping(value = {"/forgot-password/verify-otp", "/verify-reset-otp"})
    @Operation(summary = "Verify the emailed OTP and receive a short-lived reset token")
    public ResponseEntity<Map<String, String>> verifyResetOtp(@Valid @RequestBody VerifyResetOtpRequest request) {
        String resetToken = authService.verifyResetOtp(request);
        return ResponseEntity.ok(Map.of("resetToken", resetToken, "message", "OTP verified successfully"));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password using a validated reset token and strong password rules")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    @GetMapping("/validate-reset-token")
    @Operation(summary = "Validate whether a password reset token is active and unexpired")
    public ResponseEntity<Map<String, Object>> validateResetToken(@RequestParam("token") String token) {
        boolean valid = authService.validateResetToken(token);
        return ResponseEntity.ok(Map.of("valid", valid));
    }

    // ---- Super Admin only ----

    @GetMapping("/admin/stats")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "User counts by role, for admin/system analytics")
    public ResponseEntity<Map<String, Long>> userStats(@RequestHeader("X-User-Id") String requesterId) {
        return ResponseEntity.ok(authService.getUserCountsByRole(requesterId));
    }

    @GetMapping("/super-admin/admins")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    @Operation(summary = "Super Admin: list all ADMIN accounts")
    public ResponseEntity<java.util.List<Map<String, Object>>> listAdmins(@RequestHeader("X-User-Id") String requesterId) {
        java.util.List<Map<String, Object>> admins = authService.listAdmins(requesterId).stream()
                .map(a -> Map.<String, Object>of(
                        "id", a.getUserId(),
                        "userId", a.getUserId(),
                        "email", a.getEmail(),
                        "role", a.getRole().name(),
                        "enabled", a.isEnabled(),
                        "createdAt", String.valueOf(a.getCreatedAt())
                ))
                .toList();
        return ResponseEntity.ok(admins);
    }

    @PostMapping("/super-admin/create-admin")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    @Operation(summary = "Super Admin: create a new ADMIN account")
    public ResponseEntity<Map<String, Object>> createAdmin(@Valid @RequestBody CreateAdminRequest request,
                                                           @RequestHeader("X-User-Id") String requesterId) {
        User admin = authService.createAdmin(request, requesterId);
        return ResponseEntity.ok(Map.of("userId", admin.getUserId(), "email", admin.getEmail(), "role", admin.getRole().name()));
    }

    @DeleteMapping("/super-admin/admin/{adminUserId}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    @Operation(summary = "Super Admin: delete an ADMIN account")
    public ResponseEntity<Map<String, String>> deleteAdmin(@PathVariable String adminUserId,
                                                           @RequestHeader("X-User-Id") String requesterId) {
        authService.deleteAdmin(adminUserId, requesterId);
        return ResponseEntity.ok(Map.of("message", "Admin deleted"));
    }

    @PostMapping("/super-admin/admin/{adminUserId}/reset-password")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    @Operation(summary = "Super Admin: reset an ADMIN's password to a new temporary password")
    public ResponseEntity<Map<String, String>> resetAdminPassword(@PathVariable String adminUserId,
                                                                  @RequestHeader("X-User-Id") String requesterId) {
        String tempPassword = authService.resetAdminPassword(adminUserId, requesterId);
        return ResponseEntity.ok(Map.of("temporaryPassword", tempPassword));
    }
}
