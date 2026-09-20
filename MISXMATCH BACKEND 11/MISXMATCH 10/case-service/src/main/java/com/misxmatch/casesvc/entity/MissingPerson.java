package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "missing_person")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MissingPerson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_number", unique = true, nullable = false, length = 32)
    private String caseNumber;

    @Column(name = "user_id", length = 64)
    private String userId;

    @Column(name = "reported_by", nullable = false, length = 64)
    private String reportedBy;

    @Column(nullable = false)
    private String name;

    private Integer age;
    private String gender;
    private String height;
    private String complexion;

    @Column(name = "identifying_marks", length = 1000)
    private String identifyingMarks;

    @Column(name = "last_seen_location")
    private String lastSeenLocation;

    @Column(name = "last_seen_date")
    private LocalDate lastSeenDate;

    @Column(name = "photo_url", columnDefinition = "LONGTEXT")
    private String photoUrl;

    @Column(length = 2000)
    private String description;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CaseStatus status = CaseStatus.OPEN;

    @Column(name = "risk_level", length = 32)
    @Builder.Default
    private String riskLevel = "MEDIUM"; // CRITICAL, HIGH, MEDIUM, LOW

    @Column(name = "risk_score")
    private Double riskScore;

    @Column(name = "risk_factors", length = 1000)
    private String riskFactors;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (caseNumber == null) {
            caseNumber = "MP-" + System.currentTimeMillis();
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
