package com.misxmatch.auth.dto;

import lombok.Data;

@Data
public class ProfileRequest {
    private String fullName;
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
}
