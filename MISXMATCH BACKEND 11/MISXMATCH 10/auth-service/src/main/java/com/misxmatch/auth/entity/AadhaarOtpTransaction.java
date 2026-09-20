package com.misxmatch.auth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity for tracking Aadhaar verification OTP transactions.
 * STRICT COMPLIANCE:
 * - Raw 12-digit Aadhaar number is NEVER stored. Only SHA-256 hash + masked last 4.
 * - Raw OTP is NEVER stored. Only BCrypt hash.
 * - Full registered mobile number is NEVER stored or discovered. Only masked indicator if returned by provider.
 */
@Entity
@Table(name = "aadhaar_otp_transactions", indexes = {
        @Index(name = "idx_aot_aadhaar_hash", columnList = "aadhaar_hash"),
        @Index(name = "idx_aot_verification_token", columnList = "verification_token")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AadhaarOtpTransaction {

    @Id
    @Column(name = "txn_id", length = 64, nullable = false, unique = true)
    private String txnId;

    @Column(name = "aadhaar_hash", length = 64, nullable = false)
    private String aadhaarHash;

    @Column(name = "aadhaar_last4", length = 4, nullable = false)
    private String aadhaarLast4;

    @Column(name = "otp_hash", length = 255)
    private String otpHash;

    @Column(name = "masked_mobile", length = 32)
    private String maskedMobile;

    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    private int attemptCount = 0;

    @Column(name = "verified", nullable = false)
    @Builder.Default
    private boolean verified = false;

    @Column(name = "verification_token", length = 128)
    private String verificationToken;

    @Column(name = "verification_token_expiry")
    private LocalDateTime verificationTokenExpiry;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "last_sent_at", nullable = false)
    private LocalDateTime lastSentAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (lastSentAt == null) {
            lastSentAt = LocalDateTime.now();
        }
    }
}
