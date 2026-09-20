package com.misxmatch.casesvc.feed;

import com.misxmatch.casesvc.dto.*;
import com.misxmatch.casesvc.entity.CctvCamera;

public interface CctvFeedSource {
    /**
     * Unique source type descriptor (e.g., "SIMULATED", "RTSP_ONVIF", "HLS_STREAM").
     */
    String getSourceType();

    /**
     * Indicates whether this feed source operates in simulation mode.
     */
    boolean isSimulated();

    /**
     * Captures or retrieves the current image frame URL for the target CCTV camera.
     */
    String captureCurrentFrame(CctvCamera camera);

    /**
     * Performs AI-assisted frame scan on the CCTV feed.
     */
    CctvScanResponse scanFeed(String requestedBy, CctvScanRequest request, CctvCamera camera);

    /**
     * Analyzes a cropped person frame against the missing persons database.
     */
    CctvCropAnalysisResponse analyzeCrop(CctvCropAnalysisRequest request, CctvCamera camera);

    /**
     * Performs multi-object timeline track search across historical feed segments.
     */
    CctvTimelineSearchResponse searchTimeline(CctvTimelineSearchRequest request, CctvCamera camera);
}
