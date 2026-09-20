package com.misxmatch.casesvc.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CctvCameraRequest {
    private String cameraCode;
    @NotBlank
    private String label;
    @NotBlank
    private String city;
    private String specificLocation;
    private String status; // "live" or "offline"
    private String resolution;
    private Integer fps;
    private String streamUrl;
    private Boolean simulated;
    private String feedSourceType;
}
