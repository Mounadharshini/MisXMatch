package com.misxmatch.casesvc.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonSetter;
import lombok.Data;

import java.time.LocalDate;

@Data
public class MissingPersonRequest {

    @JsonAlias({"fullName", "personName", "name"})
    private String name;

    private Integer age;
    private String gender;

    private String height;
    private String complexion;

    @JsonAlias({"physicalMarks", "marks", "identifyingMarks"})
    private String identifyingMarks;

    @JsonAlias({"lastSeenLocation", "location", "city"})
    private String lastSeenLocation;

    @JsonAlias({"dateMissing", "missingDate", "lastSeenDate"})
    private LocalDate lastSeenDate;

    @JsonSetter("lastSeenDate")
    public void setLastSeenDateValue(Object val) {
        this.lastSeenDate = parseLocalDate(val);
    }

    @JsonSetter("dateMissing")
    public void setDateMissingValue(Object val) {
        this.lastSeenDate = parseLocalDate(val);
    }

    @JsonSetter("missingDate")
    public void setMissingDateValue(Object val) {
        this.lastSeenDate = parseLocalDate(val);
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

    @JsonAlias({"description", "clothing", "clothingDescription", "medical"})
    private String description;

    @JsonAlias({"contactPhone", "contactNumber", "guardianPhone", "phone", "emergencyContactPhone"})
    private String contactPhone;

    @JsonAlias({"priority", "priorityLevel", "riskLevel"})
    private String priority;

    private String bloodGroup;
    private String medicalConditions;

    @JsonAlias({"reportType", "type"})
    private String reportType;

    @JsonAlias({"reportedBy", "reporter", "userId", "createdBy"})
    private String reportedBy;

    public String getName() {
        if (name != null && !name.isBlank()) return name;
        return "Missing Individual";
    }

    public String getContactPhone() {
        if (contactPhone != null && !contactPhone.isBlank()) return contactPhone;
        return "N/A";
    }

    public String getLastSeenLocation() {
        if (lastSeenLocation != null && !lastSeenLocation.isBlank()) return lastSeenLocation;
        return "Location Not Specified";
    }
}
