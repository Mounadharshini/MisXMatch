package com.misxmatch.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AadhaarSendOtpResponse {
    private String txnId;
    private String maskedMobile;
    private String maskedAadhaar;
    private String mode;
    private String message;
}
