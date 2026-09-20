package com.misxmatch.casesvc.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvidenceRequest {
    private String caseNumber;
    private String title;
    private String category;
    private String location;
    private String seizureDate;
    private String format;
    private String fileSize;

    @NotBlank(message = "File URL or content is required")
    private String fileUrl;

    private String fileType;
    private String description;
    private String officerName;
    private String badgeNumber;
    private String sha256;
}
