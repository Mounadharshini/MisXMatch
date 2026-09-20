package com.misxmatch.casesvc.feed;

import com.misxmatch.casesvc.dto.*;
import com.misxmatch.casesvc.entity.CctvCamera;
import com.misxmatch.casesvc.service.CctvAiInvestigationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component("simulatedFeedSource")
@Primary
public class SimulatedFeedSource implements CctvFeedSource {

    private final CctvAiInvestigationService cctvAiInvestigationService;

    public SimulatedFeedSource(CctvAiInvestigationService cctvAiInvestigationService) {
        this.cctvAiInvestigationService = cctvAiInvestigationService;
    }

    @Override
    public String getSourceType() {
        return "SIMULATED";
    }

    @Override
    public boolean isSimulated() {
        return true;
    }

    @Override
    public String captureCurrentFrame(CctvCamera camera) {
        if (camera != null && camera.getStreamUrl() != null && !camera.getStreamUrl().isBlank()) {
            return camera.getStreamUrl();
        }
        return "https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=800&auto=format&fit=crop&q=80";
    }

    @Override
    public CctvScanResponse scanFeed(String requestedBy, CctvScanRequest request, CctvCamera camera) {
        log.info("[SimulatedFeedSource] Scanning simulated feed for camera Code: {}, Label: {}",
                camera != null ? camera.getCameraCode() : request.getCameraCode(),
                camera != null ? camera.getLabel() : "Simulated Node");
        return null;
    }

    @Override
    public CctvCropAnalysisResponse analyzeCrop(CctvCropAnalysisRequest request, CctvCamera camera) {
        CctvCropAnalysisResponse response = cctvAiInvestigationService.analyzeCroppedPerson(request);
        if (response != null) {
            response.setSimulated(true);
            response.setFeedSourceType(getSourceType());
        }
        return response;
    }

    @Override
    public CctvTimelineSearchResponse searchTimeline(CctvTimelineSearchRequest request, CctvCamera camera) {
        CctvTimelineSearchResponse response = cctvAiInvestigationService.searchTimeline(request);
        if (response != null) {
            response.setSimulated(true);
            response.setFeedSourceType(getSourceType());
        }
        return response;
    }
}
