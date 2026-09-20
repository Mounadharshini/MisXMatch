package com.misxmatch.casesvc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OcrExtractResponse {
    private String documentType;
    private String extractedName;
    private Integer extractedAge;
    private String extractedGender;
    private LocalDate extractedDate;
    private String extractedLocation;
    private String extractedStationOrHospital;
    private String extractedFirOrIdNumber;
    private String extractedPhone;
    private Double confidenceScore;
    private String rawText;
}
