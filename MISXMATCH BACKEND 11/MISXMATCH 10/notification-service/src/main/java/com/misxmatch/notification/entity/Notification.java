package com.misxmatch.notification.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_user_id", nullable = false, length = 64)
    private String recipientUserId;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String message;

    @Column(length = 32)
    @Builder.Default
    private String type = "INFO"; // INFO, MATCH_ALERT, SIGHTING, SYSTEM

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean read = false;

    @Column(name = "case_number", length = 64)
    private String caseNumber;

    @Column(name = "match_id")
    private Long matchId;

    @Column(length = 255)
    private String location;

    @Column(name = "dedup_key", length = 128)
    private String dedupKey;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
