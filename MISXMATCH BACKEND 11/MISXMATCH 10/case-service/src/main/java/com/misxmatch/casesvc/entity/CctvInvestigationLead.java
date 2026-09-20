package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "cctv_investigation_leads")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CctvInvestigationLead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lead_number", nullable = false, unique = true, length = 64)
    private String leadNumber;

    @Column(name = "camera_code", length = 64)
    private String cameraCode;

    @Column(name = "camera_label")
    private String cameraLabel;

    @Column(length = 255)
    private String location;

    @Column(name = "detection_timestamp")
    private LocalDateTime detectionTimestamp;

    @Column(name = "captured_frame_url", columnDefinition = "LONGTEXT")
    private String capturedFrameUrl;

    @Column(name = "cropped_person_url", columnDefinition = "LONGTEXT")
    private String croppedPersonUrl;

    @Column(name = "missing_case_number", length = 64)
    private String missingCaseNumber;

    @Column(name = "missing_person_name")
    private String missingPersonName;

    @Column(name = "overall_similarity_score")
    private Double overallSimilarityScore;

    @Column(name = "face_score")
    private Double faceScore;

    @Column(name = "clothing_score")
    private Double clothingScore;

    @Column(name = "appearance_score")
    private Double appearanceScore;

    @Column(name = "accessory_score")
    private Double accessoryScore;

    @Column(length = 2000)
    private String rationale;

    @Column(name = "lead_status", length = 32)
    @Builder.Default
    private String leadStatus = "OPEN_LEAD"; // OPEN_LEAD, VERIFIED, DISMISSED, ESCALATED

    @Column(name = "investigator_user_id", length = 64)
    private String investigatorUserId;

    @Column(name = "investigator_notes", length = 2000)
    private String investigatorNotes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        if (leadNumber == null) {
            leadNumber = "LEAD-" + System.currentTimeMillis();
        }
    }
}
