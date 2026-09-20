package com.misxmatch.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeactivateUserRequest {

    @NotBlank(message = "Deactivation reason is mandatory.")
    @Size(min = 5, max = 1000, message = "Deactivation reason must be between 5 and 1000 characters.")
    private String reason;

    @NotBlank(message = "Evidence reference is mandatory (complaint ID, FIR number, audit reference, or evidence log).")
    @Size(min = 3, max = 255, message = "Evidence reference must be between 3 and 255 characters.")
    private String evidenceRef;
}
