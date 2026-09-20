package com.misxmatch.auth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "aadhaar")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Aadhaar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true, length = 64)
    private String userId;

    // Only the last 4 digits + a hash are stored; the raw number is never
    // persisted, matching how a real Aadhaar/eKYC integration should behave.
    @Column(name = "aadhaar_last4", length = 4)
    private String aadhaarLast4;

    @Column(name = "aadhaar_hash")
    private String aadhaarHash;

    @Column(name = "verification_status")
    @Builder.Default
    private String verificationStatus = "PENDING";

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
