package com.misxmatch.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class VerifyOtpRequest {

    @NotBlank(message = "mobile is required")
    @Pattern(regexp = "^\\+?[1-9]\\d{9,14}$", message = "mobile must be a valid phone number, e.g. +919876543210")
    private String mobile;

    @NotBlank(message = "otp is required")
    @Pattern(regexp = "^\\d{6}$", message = "otp must be a 6-digit number")
    private String otp;
}
