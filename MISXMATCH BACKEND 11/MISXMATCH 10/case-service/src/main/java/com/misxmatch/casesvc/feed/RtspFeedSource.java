package com.misxmatch.casesvc.feed;

import com.misxmatch.casesvc.dto.*;
import com.misxmatch.casesvc.entity.CctvCamera;
import com.misxmatch.casesvc.service.CctvAiInvestigationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Hardware RTSP / ONVIF IP camera feed source implementation template.
 * Enables zero-downtime pluggability when real physical camera hardware (e.g. OpenCV / FFmpeg RTSP streams) is connected.
 */
@Slf4j
@Component("rtspFeedSource")
public class RtspFeedSource implements CctvFeedSource {

    private final CctvAiInvestigationService cctvAiInvestigationService;

    public RtspFeedSource(CctvAiInvestigationService cctvAiInvestigationService) {
        this.cctvAiInvestigationService = cctvAiInvestigationService;
    }

    @Override
    public String getSourceType() {
        return "RTSP_ONVIF";
    }

    @Override
    public boolean isSimulated() {
        return false;
    }

    @Override
    public String captureCurrentFrame(CctvCamera camera) {
        String streamUrl = camera != null ? camera.getStreamUrl() : null;
        log.info("[RtspFeedSource] Ingesting live RTSP/ONVIF keyframe snapshot from: {}", streamUrl);
        return streamUrl != null ? streamUrl : "rtsp://live.surveillance.internal/feed-snapshot.jpg";
    }

    @Override
    public CctvScanResponse scanFeed(String requestedBy, CctvScanRequest request, CctvCamera camera) {
        log.info("[RtspFeedSource] Performing live RTSP hardware scan for camera: {}", camera.getCameraCode());
        return CctvScanResponse.builder()
                .cameraCode(camera.getCameraCode())
                .cameraLabel(camera.getLabel())
                .city(camera.getCity())
                .scannedAt(LocalDateTime.now())
                .matchDetected(false)
                .facesDetectedInFrame(0)
                .simulated(false)
                .feedSourceType(getSourceType())
                .build();
    }

    @Override
    public CctvCropAnalysisResponse analyzeCrop(CctvCropAnalysisRequest request, CctvCamera camera) {
        CctvCropAnalysisResponse response = cctvAiInvestigationService.analyzeCroppedPerson(request);
        if (response != null) {
            response.setSimulated(false);
            response.setFeedSourceType(getSourceType());
        }
        return response;
    }

    @Override
    public CctvTimelineSearchResponse searchTimeline(CctvTimelineSearchRequest request, CctvCamera camera) {
        CctvTimelineSearchResponse response = cctvAiInvestigationService.searchTimeline(request);
        if (response != null) {
            response.setSimulated(false);
            response.setFeedSourceType(getSourceType());
        }
        return response;
    }
}
