package com.misxmatch.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OrganizationRequest {
    @NotBlank
    private String orgName;
    @NotBlank
    private String orgType; // POLICE, HOSPITAL, NGO, SHELTER
    private String registrationNumber;
    private String jurisdiction;
    private String contactPerson;
    private String contactPhone;
}
