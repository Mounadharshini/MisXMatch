package com.misxmatch.auth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * One row per mobile number. The OTP itself is never stored in plain text —
 * only a BCrypt hash of it (via the same {@link org.springframework.security.crypto.password.PasswordEncoder}
 * bean used for user passwords) — matching how {@link Aadhaar} only ever
 * stores a hash of the Aadhaar number, never the raw value.
 *
 * A new send/resend overwrites the previous row for that mobile number
 * rather than creating a new one, so there is always at most one active OTP
 * per mobile at a time.
 */
@Entity
@Table(name = "mobile_otp")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MobileOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mobile", nullable = false, unique = true, length = 20)
    private String mobile;

    @Column(name = "otp_hash", nullable = false)
    private String otpHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    private int attemptCount = 0;

    @Column(name = "verified", nullable = false)
    @Builder.Default
    private boolean verified = false;

    // Drives the 60-second resend cooldown independently of expiresAt, so a
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
