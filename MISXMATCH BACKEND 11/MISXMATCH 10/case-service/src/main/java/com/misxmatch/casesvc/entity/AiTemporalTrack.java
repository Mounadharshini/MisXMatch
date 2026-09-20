package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_temporal_tracks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiTemporalTrack {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "track_id", nullable = false, unique = true, length = 100)
    private String trackId;

    @Column(name = "case_id", nullable = false, length = 100)
    private String caseId;

    @Column(name = "camera_id", nullable = false, length = 100)
    private String cameraId;

    @Column(name = "first_timestamp")
    private LocalDateTime firstTimestamp;

    @Column(name = "last_timestamp")
    private LocalDateTime lastTimestamp;

    @Column(name = "frame_count")
    private Integer frameCount;

    @Column(name = "candidate_leads_json", columnDefinition = "TEXT")
    private String candidateLeadsJson;

    @Column(name = "quality_measures_json", columnDefinition = "TEXT")
    private String qualityMeasuresJson;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
