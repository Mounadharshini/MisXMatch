package com.misxmatch.casesvc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CctvCropAnalysisRequest {
    private String cameraCode;
    private String cameraLabel;
    private String location;
    private String timestamp;
    private String frameImageUrl;
    private String croppedPersonImageUrl;
    private CropCoordinates cropCoordinates;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CropCoordinates {
        private Double x;
        private Double y;
        private Double width;
        private Double height;
    }
}
