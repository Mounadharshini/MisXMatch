package com.misxmatch.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AadhaarVerifyOtpResponse {
    private boolean verified;
    private String verificationToken;
    private String maskedAadhaar;
    private String message;
    private AuthResponse authResponse;
}
