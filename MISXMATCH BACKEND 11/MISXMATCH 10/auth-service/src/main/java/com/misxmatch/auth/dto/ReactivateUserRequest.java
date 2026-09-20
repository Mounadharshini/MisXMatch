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
public class ReactivateUserRequest {

    @NotBlank(message = "Reactivation reason is mandatory.")
    @Size(min = 5, max = 1000, message = "Reactivation reason must be between 5 and 1000 characters.")
    private String reason;
}
