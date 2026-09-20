package com.misxmatch.casesvc.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SightingRequest {

    @JsonAlias({"caseNumber", "missingCaseNumber", "caseNo"})
    private String missingCaseNumber;

    @JsonAlias({"location", "sightingLocation", "city", "place"})
    private String location;

    @JsonAlias({"description", "notes", "remarks"})
    private String description;

    @JsonAlias({"photoUrl", "photo", "imageUrl", "image"})
    private String photoUrl;

    @JsonAlias({"reportType", "type"})
    private String reportType;

    @JsonAlias({"sightedAt", "sightingDate", "date", "when"})
    private LocalDateTime sightedAt;

    @com.fasterxml.jackson.annotation.JsonSetter("sightingDate")
    public void setSightingDate(String dateStr) {
        parseAndSetSightedAt(dateStr);
    }

    @com.fasterxml.jackson.annotation.JsonSetter("sightedAt")
    public void setSightedAtValue(Object val) {
        if (val == null) return;
        if (val instanceof LocalDateTime ldt) {
            this.sightedAt = ldt;
        } else {
            parseAndSetSightedAt(val.toString());
        }
    }

    private void parseAndSetSightedAt(String str) {
        if (str == null || str.isBlank()) return;
        try {
            String clean = str.trim();
            if (clean.length() == 10) {
                this.sightedAt = java.time.LocalDate.parse(clean).atStartOfDay();
            } else if (clean.contains("Z")) {
                this.sightedAt = java.time.Instant.parse(clean).atZone(java.time.ZoneId.systemDefault()).toLocalDateTime();
            } else {
                this.sightedAt = LocalDateTime.parse(clean.replace(" ", "T"));
            }
        } catch (Exception e) {
            this.sightedAt = LocalDateTime.now();
        }
    }

    private String reporterName;
    private String reporterPhone;
    private Boolean verified;

    @JsonAlias({"reportedBy", "reporter", "userId", "createdBy"})
    private String reportedBy;

    public String getMissingCaseNumber() {
        if (missingCaseNumber != null && !missingCaseNumber.isBlank()) return missingCaseNumber;
        return "GENERAL_SIGHTING";
    }

    public String getLocation() {
        if (location != null && !location.isBlank()) return location;
        return "Recorded Field Location";
    }
}
