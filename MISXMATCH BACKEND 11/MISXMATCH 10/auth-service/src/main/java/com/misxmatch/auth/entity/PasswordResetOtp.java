package com.misxmatch.auth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * One row per email address. The OTP itself is never stored in plain text —
 * only a BCrypt hash of it (via the same {@link org.springframework.security.crypto.password.PasswordEncoder}
 * bean used for user passwords) — exactly matching how {@link MobileOtp}
 * handles mobile-number OTPs.
 *
 * A new send/resend overwrites the previous row for that email rather than
 * creating a new one, so there is always at most one active OTP per email
 * at a time.
 */
@Entity
@Table(name = "password_reset_otp")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "otp_hash", nullable = true)
    private String otpHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    private int attemptCount = 0;

    @Column(name = "verified", nullable = false)
    @Builder.Default
    private boolean verified = false;

    // Drives the resend cooldown independently of expiresAt, so a
    // still-valid OTP can't be re-sent on every page refresh.
    @Column(name = "last_sent_at", nullable = false)
    private LocalDateTime lastSentAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
