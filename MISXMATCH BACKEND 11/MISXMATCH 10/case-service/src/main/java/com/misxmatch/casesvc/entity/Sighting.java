package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "sightings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sighting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "missing_case_number", nullable = false, length = 32)
    private String missingCaseNumber;

    @Column(name = "user_id", length = 64)
    private String userId;

    @Column(name = "reported_by", nullable = false, length = 64)
    private String reportedBy;

    @Column(nullable = false)
    private String location;

    @Column(length = 2000)
    private String description;

    @Column(name = "photo_url", columnDefinition = "LONGTEXT")
    private String photoUrl;

    @Column(name = "sighted_at")
    private LocalDateTime sightedAt;

    @Column(name = "verified")
    @Builder.Default
    private boolean verified = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        if (sightedAt == null) sightedAt = LocalDateTime.now();
    }
}
