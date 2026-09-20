package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "uploaded_files")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadedFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_number", length = 32)
    private String caseNumber;

    @Column(name = "title", length = 255)
    private String title;

    @Column(name = "category", length = 32)
    @Builder.Default
    private String category = "cctv"; // cctv, photo, audio, doc, biometric, gps

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "seizure_date", length = 64)
    private String seizureDate;

    @Column(name = "format", length = 32)
    private String format;

    @Column(name = "file_size", length = 32)
    private String fileSize;

    @Column(name = "file_url", nullable = false, length = 4000)
    private String fileUrl;

    @Column(name = "file_type", length = 64)
    private String fileType;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "officer_name", length = 100)
    private String officerName;

    @Column(name = "badge_number", length = 64)
    private String badgeNumber;

    @Column(name = "sha256", length = 128)
    private String sha256;

    @Column(name = "uploaded_by", length = 64)
    private String uploadedBy;

    @Column(name = "match_id")
    private Long matchId;

    @Column(name = "evidence_type", length = 64)
    private String evidenceType;

    @Column(name = "verification_notes", length = 2000)
    private String verificationNotes;

    @Column(name = "verification_status", length = 32)
    @Builder.Default
    private String verificationStatus = "SUBMITTED";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
