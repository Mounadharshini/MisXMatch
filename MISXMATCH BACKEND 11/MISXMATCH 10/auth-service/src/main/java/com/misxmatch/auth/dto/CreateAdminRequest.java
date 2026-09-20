package com.misxmatch.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Used exclusively by SUPER_ADMIN to create new ADMIN accounts. */
@Data
public class CreateAdminRequest {
    @NotBlank
    private String userId;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;
}
