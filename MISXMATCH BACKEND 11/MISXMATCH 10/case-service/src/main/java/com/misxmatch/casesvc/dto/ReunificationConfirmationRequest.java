package com.misxmatch.casesvc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReunificationConfirmationRequest {
    private String reunitedWith;
    private String reunificationDate;
    private String reunificationLocation;
    private String confirmationMessage;
    private Boolean consentGiven;
    private String supportingEvidenceUrl;
    private Long matchId;
}
