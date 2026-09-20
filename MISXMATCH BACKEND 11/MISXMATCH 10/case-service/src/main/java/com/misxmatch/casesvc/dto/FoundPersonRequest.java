package com.misxmatch.casesvc.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonSetter;
import lombok.Data;

import java.time.LocalDate;

@Data
public class FoundPersonRequest {

    @JsonAlias({"caseNumber", "caseNo"})
    private String caseNumber;

    @JsonAlias({"fullName", "approxName", "name", "personName", "approximateName"})
    private String approximateName;

    @JsonAlias({"approxAge", "age"})
    private Integer approximateAge;

    private String gender;

    @JsonAlias({"locationFound", "location", "foundLocation", "lastSeenLocation"})
    private String foundLocation;

    @JsonAlias({"dateFound", "foundDate", "lastSeenDate"})
    private LocalDate foundDate;

    @JsonSetter("foundDate")
    public void setFoundDateValue(Object val) {
        this.foundDate = parseLocalDate(val);
    }

    @JsonSetter("dateFound")
    public void setDateFoundValue(Object val) {
        this.foundDate = parseLocalDate(val);
    }

    @JsonSetter("lastSeenDate")
    public void setLastSeenDateValue(Object val) {
        this.foundDate = parseLocalDate(val);
    }

    private LocalDate parseLocalDate(Object val) {
        if (val == null) return null;
        String str = val.toString().trim();
        if (str.isBlank() || "undefined".equalsIgnoreCase(str) || "null".equalsIgnoreCase(str)) return null;
        try {
            if (str.contains("T")) {
                str = str.split("T")[0];
            }
            if (str.contains(" ")) {
                str = str.split(" ")[0];
            }
            return LocalDate.parse(str);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    @JsonAlias({"photoUrl", "photo", "imageUrl", "image"})
    private String photoUrl;

    @JsonAlias({"description", "notes", "condition"})
    private String description;

    @JsonAlias({"hospitalWard", "shelterName", "currentLocation", "ward", "shelter"})
    private String currentLocation;

    // GENERAL, HOSPITAL, NGO, SHELTER
    private String category;

    private String metadata;

    @JsonAlias({"contactNumber", "contactPhone", "phone", "emergencyContactPhone"})
    private String contactNumber;

    @JsonAlias({"reportType", "type"})
    private String reportType;

    @JsonAlias({"reportedBy", "userId", "user", "createdBy"})
    private String reportedBy;

    public String getApproximateName() {
        if (approximateName != null && !approximateName.isBlank()) return approximateName;
        return "Unidentified Individual (" + (gender != null ? gender : "Unknown") + ")";
    }

    public String getFoundLocation() {
        if (foundLocation != null && !foundLocation.isBlank()) return foundLocation;
        return currentLocation != null ? currentLocation : "Recorded Facility / Field Location";
    }

    public String getCurrentLocation() {
        if (currentLocation != null && !currentLocation.isBlank()) return currentLocation;
        return foundLocation != null ? foundLocation : "Care Facility";
    }
}
