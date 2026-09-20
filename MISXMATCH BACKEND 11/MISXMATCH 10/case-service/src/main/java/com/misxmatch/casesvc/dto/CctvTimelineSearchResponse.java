package com.misxmatch.casesvc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CctvTimelineSearchResponse {
    private String cameraCode;
    private String cameraLabel;
    private int totalTracksDetected;
    @Builder.Default
    private boolean simulated = true;
    @Builder.Default
    private String feedSourceType = "SIMULATED";
    @Builder.Default
    private List<TrackGroup> trackGroups = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TrackGroup {
        private String trackId;
        private String entityType; // PERSON, VEHICLE, LUGGAGE
        private LocalDateTime firstSeen;
        private LocalDateTime lastSeen;
        private int durationSeconds;
        private String thumbnailFrameUrl;
        private String description;
        private Double trackConfidence;
    }
}
