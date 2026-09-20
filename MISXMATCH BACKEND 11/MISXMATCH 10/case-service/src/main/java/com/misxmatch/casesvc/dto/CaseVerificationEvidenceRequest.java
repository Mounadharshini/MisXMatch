package com.misxmatch.casesvc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseVerificationEvidenceRequest {
    private String caseNumber;
    private Long matchId;
    private String evidenceType;
    private String title;
    private String description;
    private String verificationNotes;
    private String officerName;
    private String badgeNumber;
    private String verificationDate;
}
