package com.misxmatch.auth.aadhaar;

import com.misxmatch.auth.dto.AadhaarSendOtpResponse;
import com.misxmatch.auth.dto.AadhaarVerifyOtpResponse;

/**
 * Provider interface for Aadhaar OTP delivery and e-KYC verification.
 * Adheres to UIDAI security guidelines:
 * - Minimum data principle: No raw Aadhaar numbers or OTPs logged or stored.
 * - Mobile privacy: No attempt to discover or expose full mobile numbers.
 */
public interface AadhaarOtpProvider {

    /**
     * Dispatch OTP to the mobile number registered with the provided Aadhaar number.
     *
     * @param aadhaarNumber 12-digit Aadhaar number
     * @return AadhaarSendOtpResponse with secure txnId, masked confirmation, and status
     */
    AadhaarSendOtpResponse sendOtp(String aadhaarNumber);

    /**
     * Verify the entered OTP against the transaction.
     *
     * @param txnId         Optional transaction ID
     * @param aadhaarNumber 12-digit Aadhaar number
     * @param otp           6-digit OTP code
     * @return AadhaarVerifyOtpResponse with verificationToken upon success
     */
    AadhaarVerifyOtpResponse verifyOtp(String txnId, String aadhaarNumber, String otp);

    /**
     * Returns the active provider mode identifier ("demo" or "authorized UIDAI provider").
     */
    String getProviderMode();
}
