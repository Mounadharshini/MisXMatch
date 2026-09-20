package com.misxmatch.auth.controller;

import com.misxmatch.auth.dto.AadhaarVerifyRequest;
import com.misxmatch.auth.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@Tag(name = "Aadhaar Verification")
public class AadhaarController {

    private final ProfileService profileService;

    public AadhaarController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @PostMapping("/aadhaar/verify")
    @Operation(summary = "Submit Aadhaar number for verification")
    public ResponseEntity<Map<String, Object>> verify(@RequestHeader(value = "X-User-Id", required = false, defaultValue = "anonymous") String userId,
                                                        @Valid @RequestBody AadhaarVerifyRequest request) {
        String status = profileService.verifyAadhaar(userId, request);
        boolean isVerified = "VERIFIED".equalsIgnoreCase(status);
        String message = isVerified
                ? "Aadhaar verified successfully."
                : "Aadhaar verification service is not configured.";
        return ResponseEntity.ok(Map.of(
                "status", status,
                "verified", isVerified,
                "message", message
        ));
    }
}
