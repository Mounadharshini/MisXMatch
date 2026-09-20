package com.misxmatch.auth.email;

/**
 * Abstraction over "however we actually deliver an OTP to an inbox".
 * {@link com.misxmatch.auth.service.PasswordResetOtpService} only ever
 * depends on this interface, never on a concrete provider — so swapping the
 * dev-console implementation for a real SMTP relay (or SES/SendGrid/Mailgun
 * later) is a matter of flipping the {@code otp.mode} property; no OTP
 * generation/hashing/expiry/attempt logic changes at all. Mirrors
 * {@link com.misxmatch.auth.sms.SmsProvider} on purpose.
 */
public interface EmailProvider {

    /**
     * Deliver a one-time password to the given email address.
     *
     * @param email recipient address
     * @param otp   the plain 6-digit OTP (never logged/stored anywhere else)
     */
    void sendOtp(String email, String otp);

    default void sendPasswordResetOtp(String email, String userName, String otp, int expiryMinutes) {
        sendOtp(email, otp);
    }

    default void sendPasswordResetEmail(String email, String userName, String otp, String resetToken) {
        sendPasswordResetOtp(email, userName, otp, 10);
    }

    default void sendPasswordResetSuccessEmail(String email, String userName) {
        // optional confirmation email
    }
}
