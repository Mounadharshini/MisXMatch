package com.misxmatch.casesvc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReunificationRejectionRequest {
    private String rejectionReason;
    private String rejectionNotes;
    private Long matchId;
}
