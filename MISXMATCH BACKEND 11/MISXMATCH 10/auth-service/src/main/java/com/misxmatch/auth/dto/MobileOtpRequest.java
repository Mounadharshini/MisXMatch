package com.misxmatch.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * Shared body for POST /auth/send-otp and POST /auth/resend-otp — both only
 * need the mobile number. E.164-ish format (e.g. +919876543210) is enforced
 * so the pluggable {@link com.misxmatch.auth.sms.SmsProvider} always
 * receives a consistently formatted number.
 */
@Data
public class MobileOtpRequest {

    @NotBlank(message = "mobile is required")
    @Pattern(regexp = "^\\+?[1-9]\\d{9,14}$", message = "mobile must be a valid phone number, e.g. +919876543210")
    private String mobile;
}
