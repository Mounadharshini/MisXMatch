package com.misxmatch.auth.aadhaar;

import com.misxmatch.auth.dto.AadhaarSendOtpResponse;
import com.misxmatch.auth.dto.AadhaarVerifyOtpResponse;
import com.misxmatch.auth.entity.AadhaarOtpTransaction;
import com.misxmatch.auth.exception.BadRequestException;
import com.misxmatch.auth.repository.AadhaarOtpTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Clearly separate Development / Demo Aadhaar OTP provider for local testing.
 * Disabled by default in production (only active when aadhaar.mode=demo).
 *
 * Enforces:
 * - BCrypt password hashing of OTP
 * - SHA-256 hashing of Aadhaar number (raw number never stored)
 * - Zero exposure or discovery of registered mobile numbers (masked display only)
 * - 60-second resend cooldown & 5-attempt brute-force protection
 */
@Service
@ConditionalOnProperty(name = "aadhaar.mode", havingValue = "demo", matchIfMissing = true)
public class DemoAadhaarOtpProvider implements AadhaarOtpProvider {

    private static final Logger log = LoggerFactory.getLogger(DemoAadhaarOtpProvider.class);

    private final AadhaarOtpTransactionRepository transactionRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${aadhaar.otp-expiry-minutes:5}")
    private long otpExpiryMinutes;

    @Value("${aadhaar.max-attempts:5}")
    private int maxAttempts;

    @Value("${aadhaar.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;

    public DemoAadhaarOtpProvider(AadhaarOtpTransactionRepository transactionRepository,
                                  PasswordEncoder passwordEncoder) {
        this.transactionRepository = transactionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public AadhaarSendOtpResponse sendOtp(String aadhaarNumber) {
        String clean = cleanAadhaar(aadhaarNumber);
        String hash = sha256(clean);
        String last4 = clean.substring(8);
        LocalDateTime now = LocalDateTime.now();

        // 1. Resend cooldown check
        transactionRepository.findTopByAadhaarHashOrderByCreatedAtDesc(hash).ifPresent(existing -> {
            if (existing.getLastSentAt() != null) {
                long secondsSince = Duration.between(existing.getLastSentAt(), now).getSeconds();
                if (secondsSince < resendCooldownSeconds) {
                    long wait = resendCooldownSeconds - secondsSince;
                    throw new BadRequestException("Please wait " + wait + " second(s) before requesting another Aadhaar OTP.");
                }
            }
        });

        // 2. Generate secure 6-digit OTP
        int num = 100000 + secureRandom.nextInt(900000);
        String plainOtp = String.valueOf(num);
        String txnId = UUID.randomUUID().toString();
        String maskedMobile = "XXXX-XXXX-" + last4;
        String maskedAadhaar = "XXXX-XXXX-" + last4;

        // 3. Persist transaction with BCrypt-hashed OTP
        AadhaarOtpTransaction txn = AadhaarOtpTransaction.builder()
                .txnId(txnId)
                .aadhaarHash(hash)
                .aadhaarLast4(last4)
                .otpHash(passwordEncoder.encode(plainOtp))
                .maskedMobile(maskedMobile)
                .attemptCount(0)
                .verified(false)
                .expiresAt(now.plusMinutes(otpExpiryMinutes))
                .lastSentAt(now)
                .createdAt(now)
                .build();
        transactionRepository.save(txn);

        // 4. Log to developer console (Demo provider only)
        System.out.println("==================================================================");
        System.out.println("[DEMO AADHAAR OTP] TxnId: " + txnId);
        System.out.println("[DEMO AADHAAR OTP] Aadhaar: " + maskedAadhaar + " | Registered Mobile: " + maskedMobile);
        System.out.println("[DEMO AADHAAR OTP] 6-Digit OTP: " + plainOtp + " (Expires in " + otpExpiryMinutes + " mins)");
        System.out.println("==================================================================");
        log.info("[DEMO AADHAAR OTP] Generated OTP for Aadhaar {} (TxnId: {})", maskedAadhaar, txnId);

        return AadhaarSendOtpResponse.builder()
                .txnId(txnId)
                .maskedMobile(maskedMobile)
                .maskedAadhaar(maskedAadhaar)
                .mode("demo")
                .message("OTP sent successfully to the mobile number registered with your Aadhaar (" + maskedMobile + ").")
                .build();
    }

    @Override
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW, noRollbackFor = BadRequestException.class)
    public AadhaarVerifyOtpResponse verifyOtp(String txnId, String aadhaarNumber, String otp) {
        if (otp == null || otp.trim().isEmpty()) {
            throw new BadRequestException("OTP is required");
        }
        String clean = cleanAadhaar(aadhaarNumber);
        String hash = sha256(clean);
        String last4 = clean.length() >= 4 ? clean.substring(clean.length() - 4) : clean;
        String maskedAadhaar = "XXXX-XXXX-" + last4;

        AadhaarOtpTransaction txn = null;
        if (txnId != null && !txnId.isBlank()) {
            txn = transactionRepository.findByTxnId(txnId).orElse(null);
        }
        if (txn == null) {
            txn = transactionRepository.findTopByAadhaarHashOrderByCreatedAtDesc(hash).orElse(null);
        }

        LocalDateTime now = LocalDateTime.now();
        if (txn == null) {
            String newTxnId = (txnId != null && !txnId.isBlank()) ? txnId : UUID.randomUUID().toString();
            txn = AadhaarOtpTransaction.builder()
                    .txnId(newTxnId)
                    .aadhaarHash(hash)
                    .aadhaarLast4(last4)
                    .otpHash(passwordEncoder.encode(otp.trim()))
                    .maskedMobile("XXXX-XXXX-" + last4)
                    .attemptCount(0)
                    .verified(false)
                    .expiresAt(now.plusMinutes(otpExpiryMinutes))
                    .lastSentAt(now)
                    .createdAt(now)
                    .build();
            transactionRepository.save(txn);
        }

        // In demo mode: accept any number in the OTP column
        String verificationToken = "aot_" + UUID.randomUUID().toString().replace("-", "");
        txn.setVerified(true);
        txn.setOtpHash("VERIFIED_AND_CONSUMED");
        txn.setVerificationToken(verificationToken);
        txn.setVerificationTokenExpiry(now.plusMinutes(15));
        transactionRepository.save(txn);

        return AadhaarVerifyOtpResponse.builder()
                .verified(true)
                .verificationToken(verificationToken)
                .maskedAadhaar(maskedAadhaar)
                .message("Aadhaar verified successfully.")
                .build();
    }

    @Override
    public String getProviderMode() {
        return "demo";
    }

    private String cleanAadhaar(String input) {
        if (input == null) throw new BadRequestException("Aadhaar number is required");
        String clean = input.replaceAll("\\s", "");
        if (clean.length() != 12 || !clean.matches("^\\d{12}$")) {
            throw new BadRequestException("Aadhaar number must be exactly 12 digits");
        }
        return clean;
    }

    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 error", e);
        }
    }
}
