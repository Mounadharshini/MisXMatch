package com.misxmatch.casesvc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OcrExtractRequest {
    private String fileUrl;
    private String rawBase64;
    private String documentBase64OrText;
    private String documentBase64;
    private String imageBase64;
    private String documentType;
    private String caseNumber;
}
