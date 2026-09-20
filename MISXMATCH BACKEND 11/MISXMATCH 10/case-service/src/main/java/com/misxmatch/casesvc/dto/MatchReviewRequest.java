package com.misxmatch.casesvc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchReviewRequest {
    private String action; // VERIFIED_MATCH, DISMISSED, INVESTIGATING
    private boolean updateCaseStatusToReunited;
    private String reviewNotes;
}
