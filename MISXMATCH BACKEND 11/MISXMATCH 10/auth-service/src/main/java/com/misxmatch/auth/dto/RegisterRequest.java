package com.misxmatch.auth.dto;

import com.misxmatch.auth.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Self-registration DTO. ADMIN and SUPER_ADMIN are deliberately not
 * reachable here — validated again server-side in AuthService so a crafted
 * request can never create an admin account this way.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {

    @NotBlank
    private String userId;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;

    @NotNull
    private Role role;

    private String fullName;
    private String phone;
    private String aadhaarNumber;
    private String aadhaarVerificationToken;
}
