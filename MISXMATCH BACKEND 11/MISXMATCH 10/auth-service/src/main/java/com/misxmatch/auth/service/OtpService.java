package com.misxmatch.auth.service;

public interface OtpService {

    /** Generates and "sends" (via the active SmsProvider) a fresh OTP. */
    void sendOtp(String mobile);

    /** Same as sendOtp, but enforces the resend cooldown window first. */
    void resendOtp(String mobile);

    /**
     * Verifies the OTP. Returns normally on success (mobile is marked
     * verified); throws BadRequestException with a specific message on any
     * failure (wrong code, expired, already used, too many attempts).
     */
    void verifyOtp(String mobile, String otp);
}
