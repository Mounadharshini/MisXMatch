package com.misxmatch.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryDto {
    private Long id;
    private String userId;
    private String email;
    private String role;
    private boolean superAdmin;
    private boolean enabled;
    private String fullName;
    private String phone;
    private String city;
    private boolean aadhaarVerified;
    private LocalDateTime createdAt;
    private String deactivationReason;
    private String deactivationEvidenceRef;
    private String deactivatedBy;
    private LocalDateTime deactivatedAt;
    private String reactivationReason;
    private String reactivatedBy;
    private LocalDateTime reactivatedAt;
}
