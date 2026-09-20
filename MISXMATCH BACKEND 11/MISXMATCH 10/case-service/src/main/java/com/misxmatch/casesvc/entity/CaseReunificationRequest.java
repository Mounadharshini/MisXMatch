package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "case_reunification_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseReunificationRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_number", nullable = false, length = 64)
    private String caseNumber;

    @Column(name = "match_id")
    private Long matchId;

    @Column(name = "reported_by", length = 64)
    private String reportedBy; // Original citizen reporter user ID

    @Column(name = "reunification_status", length = 32)
    private String reunificationStatus; // REUNITED or NOT_REUNITED

    @Column(name = "reunited_with", length = 100)
    private String reunitedWith; // Family / Guardian / Authorized person

    @Column(name = "reunification_date", length = 32)
    private String reunificationDate;

    @Column(name = "reunification_location", length = 255)
    private String reunificationLocation;

    @Column(name = "confirmation_message", length = 2000)
    private String confirmationMessage;

    @Column(name = "rejection_reason", length = 64)
    private String rejectionReason; // Wrong person, Person has not been reunited, Evidence is insufficient, Information is incorrect, Other

    @Column(name = "rejection_notes", length = 2000)
    private String rejectionNotes;

    @Column(name = "consent_given")
    @Builder.Default
    private Boolean consentGiven = false;

    @Column(name = "supporting_evidence_url", length = 2000)
    private String supportingEvidenceUrl;

    @Column(name = "status", length = 32)
    @Builder.Default
    private String status = "PENDING_AUTHORITY_REVIEW"; // PENDING_AUTHORITY_REVIEW, APPROVED, REJECTED

    @Column(name = "reviewed_by", length = 64)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "admin_review_notes", length = 2000)
    private String adminReviewNotes;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
