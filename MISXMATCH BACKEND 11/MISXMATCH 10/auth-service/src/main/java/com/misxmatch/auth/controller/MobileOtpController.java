package com.misxmatch.auth.controller;

import com.misxmatch.auth.dto.MobileOtpRequest;
import com.misxmatch.auth.dto.VerifyOtpRequest;
import com.misxmatch.auth.service.OtpService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Mobile-number OTP verification — separate from AuthController /
 * AadhaarController on purpose (single responsibility, and so this can be
 * dropped/replaced independently without touching login/register/Aadhaar
 * logic). Sits under the same /auth base path so it's reachable at
 * /api/auth/send-otp, /api/auth/verify-otp, /api/auth/resend-otp through
 * the gateway, exactly like every other auth-service endpoint.
 */
@RestController
@RequestMapping("/auth")
@Tag(name = "Mobile OTP", description = "Development-mode mobile number OTP verification")
public class MobileOtpController {

    private final OtpService otpService;

    public MobileOtpController(OtpService otpService) {
        this.otpService = otpService;
    }

    @PostMapping("/send-otp")
    @Operation(summary = "Generate and send a 6-digit OTP to a mobile number")
    public ResponseEntity<Map<String, Object>> sendOtp(@Valid @RequestBody MobileOtpRequest request) {
        otpService.sendOtp(request.getMobile());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "OTP generated successfully"
        ));
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Verify a mobile number using the OTP sent to it")
    public ResponseEntity<Map<String, Object>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        otpService.verifyOtp(request.getMobile(), request.getOtp());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Mobile number verified successfully"
        ));
    }

    @PostMapping("/resend-otp")
    @Operation(summary = "Resend a fresh OTP, subject to a 60-second cooldown")
    public ResponseEntity<Map<String, Object>> resendOtp(@Valid @RequestBody MobileOtpRequest request) {
        otpService.resendOtp(request.getMobile());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "OTP resent successfully"
        ));
    }
}
