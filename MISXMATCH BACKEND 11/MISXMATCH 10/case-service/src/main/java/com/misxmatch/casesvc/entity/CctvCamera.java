package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "cctv_cameras")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CctvCamera {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "camera_code", nullable = false, unique = true, length = 64)
    private String cameraCode;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private String city;

    @Column(name = "specific_location")
    private String specificLocation;

    @Column(nullable = false)
    @Builder.Default
    private String status = "live"; // "live" or "offline"

    @Column(nullable = false)
    @Builder.Default
    private String resolution = "1080p";

    @Column(nullable = false)
    @Builder.Default
    private int fps = 25;

    @Column(name = "stream_url")
    private String streamUrl;

    @Column(name = "simulated", nullable = false)
    @Builder.Default
    private boolean simulated = true;

    @Column(name = "feed_source_type", nullable = false, length = 64)
    @Builder.Default
    private String feedSourceType = "SIMULATED"; // "SIMULATED", "RTSP", "ONVIF", "HLS"

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
