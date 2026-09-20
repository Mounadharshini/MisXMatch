package com.misxmatch.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileResponse {
    private String userId;
    private String fullName;
    private String email;
    private String phone;
    private String address;
    private String city;
    private String state;
    private String pincode;
    private String gender;
    private String dateOfBirth;
    private String bio;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String profilePhotoUrl;
    private String role;
    private boolean aadhaarVerified;
}
