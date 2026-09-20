package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_feedback")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "feedback_id", nullable = false, unique = true, length = 100)
    private String feedbackId;

    @Column(name = "lead_id", nullable = false, length = 100)
    private String leadId;

    @Column(name = "case_id", nullable = false, length = 100)
    private String caseId;

    @Column(name = "reviewer_id", nullable = false, length = 100)
    private String reviewerId;

    @Column(name = "reviewer_action", nullable = false, length = 50)
    private String reviewerAction;

    @Column(name = "opt_in_for_calibration")
    @Builder.Default
    private Boolean optInForCalibration = true;

    @Column(name = "feedback_notes", columnDefinition = "TEXT")
    private String feedbackNotes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
