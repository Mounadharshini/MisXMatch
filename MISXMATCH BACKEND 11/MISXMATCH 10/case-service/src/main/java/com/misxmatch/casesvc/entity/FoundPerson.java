package com.misxmatch.casesvc.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "found_person")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoundPerson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_number", unique = true, nullable = false, length = 32)
    private String caseNumber;

    @Column(name = "user_id", length = 64)
    private String userId;

    @Column(name = "reported_by", nullable = false, length = 64)
    private String reportedBy;

    private String approximateName;
    private Integer approximateAge;
    private String gender;

    @Column(name = "found_location")
    private String foundLocation;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(name = "found_date")
    private LocalDate foundDate;

    @Column(name = "photo_url", columnDefinition = "LONGTEXT")
    private String photoUrl;

    @Column(length = 2000)
    private String description;

    @Column(name = "current_location")
    private String currentLocation;

    // Which kind of facility/flow created this record: GENERAL (public
    // report), HOSPITAL (unknown/unidentified patient), NGO or SHELTER
    // (resident intake). Lets one entity + one set of endpoints serve all
    // three "found person" flows instead of three near-identical tables.
    @Column(name = "category", length = 16)
    @Builder.Default
    private String category = "GENERAL";

    // Free-form JSON blob for category-specific fields (department,
    // condition, admittedAt, bed, referredBy, etc.) that don't need to be
    // first-class relational columns. The frontend reads/writes this as a
    // plain object; the backend just stores and returns the JSON string.
    @Column(name = "metadata", length = 4000)
    private String metadata;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CaseStatus status = CaseStatus.OPEN;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        if (caseNumber == null) {
            caseNumber = "FP-" + System.currentTimeMillis();
        }
    }
}
