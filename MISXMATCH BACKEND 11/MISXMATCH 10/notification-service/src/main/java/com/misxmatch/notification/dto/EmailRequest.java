package com.misxmatch.notification.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailRequest {
    @NotBlank
    private String to;
    @NotBlank
    private String subject;
    @NotBlank
    private String body;
    private Boolean html;
}
