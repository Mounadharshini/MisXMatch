package com.misxmatch.auth.service;

public interface PasswordResetOtpService {

    /** Generates and sends (via the active EmailProvider) a fresh OTP, subject to the resend cooldown. */
    void sendOtp(String email);

    default void sendOtp(String email, String userName, String resetToken) {
        sendOtp(email);
    }

    /**
     * Verifies the OTP for the given email. Returns normally on success
     * (marks it verified so it can't be replayed); throws
     * BadRequestException with a specific message on any failure (wrong
     * code, expired, already used, too many attempts).
     */
    void verifyOtp(String email, String otp);
}
