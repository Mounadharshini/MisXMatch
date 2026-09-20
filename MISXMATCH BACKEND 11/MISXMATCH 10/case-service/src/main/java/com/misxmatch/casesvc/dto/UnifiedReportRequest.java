package com.misxmatch.casesvc.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UnifiedReportRequest {

    // Report Type: MISSING_PERSON, FOUND_PERSON, SIGHTING (or MISSING, FOUND, SIGHTING)
    @JsonAlias({"reportType", "type", "category_type"})
    private String reportType;

    // Person name
    @JsonAlias({"personName", "fullName", "name", "approximateName", "approxName"})
    private String personName;

    private Integer age;
    private String gender;

    // Dates
    @JsonAlias({"lastSeenDate", "dateMissing", "missingDate", "foundDate", "dateFound", "sightedAt", "sightingDate", "date"})
    private String lastSeenDate;

    // Location
    @JsonAlias({"lastSeenLocation", "location", "city", "foundLocation", "sightingLocation", "place"})
    private String lastSeenLocation;

    // Description
    @JsonAlias({"description", "notes", "clothing", "clothingDescription", "identifyingDetails", "remarks"})
    private String description;

    // Identifying marks
    @JsonAlias({"identifyingMarks", "physicalMarks", "marks"})
    private String identifyingMarks;

    // Contact
    @JsonAlias({"emergencyContactPhone", "contactPhone", "contactNumber", "phone", "guardianPhone"})
    private String emergencyContactPhone;

    // Priority
    @JsonAlias({"priorityLevel", "priority", "riskLevel"})
    private String priorityLevel;

    // Photo / Image
    @JsonAlias({"photo", "photoUrl", "imageUrl", "image"})
    private String photo;

    // Sighting specific
    @JsonAlias({"missingCaseNumber", "caseNumber", "caseNo"})
    private String missingCaseNumber;

    // Category for found person: GENERAL, HOSPITAL, NGO, SHELTER
    private String category;

    // Additional optional fields
    private String currentLocation;
    private String hospitalWard;
    private String shelterName;
    private String height;
    private String complexion;
    private String bloodGroup;
    private String medicalConditions;
    private String status;

    public static UnifiedReportRequest fromMap(Map<String, String> map) {
        if (map == null) return new UnifiedReportRequest();
        return UnifiedReportRequest.builder()
                .reportType(getAny(map, "reportType", "type"))
                .personName(getAny(map, "personName", "fullName", "name", "approximateName", "approxName"))
                .age(parseInteger(getAny(map, "age", "approxAge")))
                .gender(getAny(map, "gender"))
                .lastSeenDate(getAny(map, "lastSeenDate", "dateMissing", "missingDate", "foundDate", "dateFound", "sightedAt", "sightingDate", "date"))
                .lastSeenLocation(getAny(map, "lastSeenLocation", "location", "city", "foundLocation", "sightingLocation"))
                .description(getAny(map, "description", "notes", "clothing", "identifyingDetails", "remarks"))
                .identifyingMarks(getAny(map, "identifyingMarks", "physicalMarks", "marks"))
                .emergencyContactPhone(getAny(map, "emergencyContactPhone", "contactPhone", "contactNumber", "phone", "guardianPhone"))
                .priorityLevel(getAny(map, "priorityLevel", "priority", "riskLevel"))
                .photo(getAny(map, "photo", "photoUrl", "imageUrl", "image"))
                .missingCaseNumber(getAny(map, "missingCaseNumber", "caseNumber", "caseNo"))
                .category(getAny(map, "category"))
                .currentLocation(getAny(map, "currentLocation", "hospitalWard", "shelterName"))
                .height(getAny(map, "height"))
                .complexion(getAny(map, "complexion"))
                .bloodGroup(getAny(map, "bloodGroup"))
                .medicalConditions(getAny(map, "medicalConditions", "medical"))
                .status(getAny(map, "status"))
                .build();
    }

    private static String getAny(Map<String, String> map, String... keys) {
        for (String k : keys) {
            if (map.containsKey(k) && map.get(k) != null && !map.get(k).isBlank()) {
                return map.get(k).trim();
            }
        }
        return null;
    }

    private static Integer parseInteger(String str) {
        if (str == null || str.isBlank()) return null;
        try {
            return Integer.parseInt(str.trim());
        } catch (Exception e) {
            return null;
        }
    }
}
