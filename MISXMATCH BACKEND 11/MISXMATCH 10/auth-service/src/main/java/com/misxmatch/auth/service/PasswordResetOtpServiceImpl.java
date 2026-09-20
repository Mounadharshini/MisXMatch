package com.misxmatch.auth.service;

import com.misxmatch.auth.email.EmailProvider;
import com.misxmatch.auth.entity.PasswordResetOtp;
import com.misxmatch.auth.exception.BadRequestException;
import com.misxmatch.auth.repository.PasswordResetOtpRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class PasswordResetOtpServiceImpl implements PasswordResetOtpService {

    private final PasswordResetOtpRepository passwordResetOtpRepository;
    private final EmailProvider emailProvider;
    // Reuses the same BCryptPasswordEncoder bean SecurityConfig already
    // defines for user passwords — one hashing strategy for the whole
    // service, same as mobile OTP.
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${otp.expiry-minutes:5}")
    private long expiryMinutes;

    @Value("${otp.max-attempts:5}")
    private int maxAttempts;

    @Value("${otp.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;

    public PasswordResetOtpServiceImpl(PasswordResetOtpRepository passwordResetOtpRepository,
                                        EmailProvider emailProvider,
                                        PasswordEncoder passwordEncoder) {
        this.passwordResetOtpRepository = passwordResetOtpRepository;
        this.emailProvider = emailProvider;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void sendOtp(String email) {
        sendOtp(email, "User", null);
    }

    @Override
    @Transactional
    public void sendOtp(String email, String userName, String resetToken) {
        passwordResetOtpRepository.findByEmail(email).ifPresent(existing -> {
            if (existing.getLastSentAt() != null) {
                long secondsSinceLastSend = Duration.between(existing.getLastSentAt(), LocalDateTime.now()).getSeconds();
                if (secondsSinceLastSend < resendCooldownSeconds) {
                    long wait = resendCooldownSeconds - secondsSinceLastSend;
                    throw new BadRequestException(
                            "Please wait " + wait + " more second(s) before requesting another OTP.");
                }
            }
        });

        String otp = generateSixDigitOtp();
        LocalDateTime now = LocalDateTime.now();

        PasswordResetOtp record = passwordResetOtpRepository.findByEmail(email)
                .orElseGet(() -> PasswordResetOtp.builder().email(email).build());

        record.setOtpHash(passwordEncoder.encode(otp));
        record.setExpiresAt(now.plusMinutes(expiryMinutes));
        record.setAttemptCount(0);
        record.setVerified(false);
        record.setLastSentAt(now);

        passwordResetOtpRepository.save(record);

        emailProvider.sendPasswordResetOtp(email, userName, otp, (int) expiryMinutes);
    }

    @Override
    @Transactional
    public void verifyOtp(String email, String otp) {
        PasswordResetOtp record = passwordResetOtpRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("No OTP was requested for this email."));

        if (record.isVerified()) {
            throw new BadRequestException("This OTP has already been used. Request a new one.");
        }

        if (record.getAttemptCount() >= maxAttempts) {
            throw new BadRequestException("Maximum verification attempts exceeded. Request a new OTP.");
        }

        if (LocalDateTime.now().isAfter(record.getExpiresAt())) {
            throw new BadRequestException("OTP has expired. Request a new one.");
        }

        boolean matches = passwordEncoder.matches(otp, record.getOtpHash());
        if (!matches) {
            record.setAttemptCount(record.getAttemptCount() + 1);
            passwordResetOtpRepository.save(record);
            int remaining = maxAttempts - record.getAttemptCount();
            throw new BadRequestException(
                    "Incorrect OTP." + (remaining > 0 ? " " + remaining + " attempt(s) remaining." : " Maximum attempts exceeded, request a new OTP."));
        }

        // Correct OTP: mark verified and immediately invalidate the hash so
        // it can never be replayed, even within the expiry window.
        record.setVerified(true);
        record.setOtpHash("VERIFIED_AND_CONSUMED");
        passwordResetOtpRepository.save(record);
    }

    private String generateSixDigitOtp() {
        int number = 100000 + secureRandom.nextInt(900000); // 100000-999999, always 6 digits
        return String.valueOf(number);
    }
}
