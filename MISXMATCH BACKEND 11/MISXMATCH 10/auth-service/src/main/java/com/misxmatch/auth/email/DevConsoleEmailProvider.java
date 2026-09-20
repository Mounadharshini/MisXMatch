package com.misxmatch.auth.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Default, zero-cost provider for local development: instead of relaying
 * through real SMTP, it prints the reset link / OTP to the backend console:
 *
 *   RESET LINK: http://localhost:5173/reset-password?token=...
 *
 * Active whenever otp.mode=development (the default — see application.yml).
 * Never used in production; setting OTP_MODE=production switches Spring to
 * SmtpEmailProvider instead.
 */
@Service
@ConditionalOnProperty(name = "otp.mode", havingValue = "development", matchIfMissing = true)
public class DevConsoleEmailProvider implements EmailProvider {

    private static final Logger log = LoggerFactory.getLogger(DevConsoleEmailProvider.class);

    @Value("${otp.mode:development}")
    private String otpMode;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Override
    public void sendOtp(String email, String otp) {
        sendPasswordResetOtp(email, "User", otp, 10);
    }

    @Override
    public void sendPasswordResetEmail(String email, String userName, String otp, String resetToken) {
        sendPasswordResetOtp(email, userName, otp, 10);
    }

    @Override
    public void sendPasswordResetOtp(String email, String userName, String otp, int expiryMinutes) {
        System.out.println("==================================================");
        System.out.println("Subject: MISXMATCH — Password Reset Verification Code");
        System.out.println("To: " + email + " (User: " + userName + ")");
        System.out.println("VERIFICATION CODE (OTP): " + otp);
        System.out.println("Expires in: " + expiryMinutes + " minutes");
        System.out.println("Warning: Do not share this code with anyone. MISXMATCH staff will never ask for it.");
        System.out.println("If you did not request this, you can ignore this email.");
        System.out.println("==================================================");
        log.info("[MISXMATCH EMAIL OTP] Dispatched code for {} (Expires in {}m): {}", email, expiryMinutes, otp);
    }

    @Override
    public void sendPasswordResetSuccessEmail(String email, String userName) {
        System.out.println("[DEV EMAIL] Password reset successfully completed for " + email);
    }
}
