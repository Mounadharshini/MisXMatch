package com.misxmatch.auth.service;

import com.misxmatch.auth.entity.MobileOtp;
import com.misxmatch.auth.exception.BadRequestException;
import com.misxmatch.auth.repository.MobileOtpRepository;
import com.misxmatch.auth.sms.SmsProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class OtpServiceImpl implements OtpService {

    private final MobileOtpRepository mobileOtpRepository;
    private final SmsProvider smsProvider;
    // Reuses the same BCryptPasswordEncoder bean SecurityConfig already
    // defines for user passwords — one hashing strategy for the whole
    // service, and no new dependency needed.
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${otp.expiry-minutes:5}")
    private long expiryMinutes;

    @Value("${otp.max-attempts:5}")
    private int maxAttempts;

    @Value("${otp.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;

    public OtpServiceImpl(MobileOtpRepository mobileOtpRepository,
                           SmsProvider smsProvider,
                           PasswordEncoder passwordEncoder) {
        this.mobileOtpRepository = mobileOtpRepository;
        this.smsProvider = smsProvider;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void sendOtp(String mobile) {
        issueOtp(mobile, false);
    }

    @Override
    @Transactional
    public void resendOtp(String mobile) {
        mobileOtpRepository.findByMobile(mobile).ifPresent(existing -> {
            long secondsSinceLastSend = Duration.between(existing.getLastSentAt(), LocalDateTime.now()).getSeconds();
            if (secondsSinceLastSend < resendCooldownSeconds) {
                long wait = resendCooldownSeconds - secondsSinceLastSend;
                throw new BadRequestException(
                        "Please wait " + wait + " more second(s) before requesting another OTP.");
            }
        });
        issueOtp(mobile, true);
    }

    private void issueOtp(String mobile, boolean isResend) {
        String otp = generateSixDigitOtp();
        LocalDateTime now = LocalDateTime.now();

        MobileOtp record = mobileOtpRepository.findByMobile(mobile)
                .orElseGet(() -> MobileOtp.builder().mobile(mobile).build());

        record.setOtpHash(passwordEncoder.encode(otp));
        record.setExpiresAt(now.plusMinutes(expiryMinutes));
        record.setAttemptCount(0);
        record.setVerified(false);
        record.setLastSentAt(now);

        mobileOtpRepository.save(record);

        // The only place the plain-text OTP ever exists outside this method
        // is inside the SmsProvider call — never persisted, never returned
        // to the caller/API response.
        smsProvider.sendOtp(mobile, otp);
    }

    @Override
    @Transactional
    public void verifyOtp(String mobile, String otp) {
        MobileOtp record = mobileOtpRepository.findByMobile(mobile)
                .orElseThrow(() -> new BadRequestException("No OTP was requested for this mobile number."));

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
            mobileOtpRepository.save(record);
            int remaining = maxAttempts - record.getAttemptCount();
            throw new BadRequestException(
                    "Incorrect OTP." + (remaining > 0 ? " " + remaining + " attempt(s) remaining." : " Maximum attempts exceeded, request a new OTP."));
        }

        // Correct OTP: mark verified and immediately invalidate the hash so
        // it can never be replayed, even within the expiry window.
        record.setVerified(true);
        record.setOtpHash(null);
        mobileOtpRepository.save(record);
    }

    private String generateSixDigitOtp() {
        int number = 100000 + secureRandom.nextInt(900000); // 100000-999999, always 6 digits
        return String.valueOf(number);
    }
}
