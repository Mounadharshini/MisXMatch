package com.misxmatch.casesvc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CctvTimelineSearchRequest {
    private String cameraCode;
    private LocalDate searchDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String filterType; // "ALL", "PERSON", "VEHICLE", "OBJECT"
}
