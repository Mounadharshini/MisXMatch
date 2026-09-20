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
public class TextMatchRequest {
    @NotBlank
    private String missingCaseNumber;
    private String description;
}
