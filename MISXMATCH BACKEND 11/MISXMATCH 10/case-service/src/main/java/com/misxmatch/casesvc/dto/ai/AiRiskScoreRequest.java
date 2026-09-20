package com.misxmatch.casesvc.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRiskScoreRequest {
    private String caseId;
    private Integer age;
    private String gender;
    private String lastSeenDate;
    private String createdAt;
    private String medicalConditions;

    @com.fasterxml.jackson.annotation.JsonSetter("medicalConditions")
    public void setMedicalConditionsFlexible(Object val) {
        if (val == null) {
            this.medicalConditions = null;
        } else if (val instanceof java.util.Collection<?> col) {
            this.medicalConditions = col.stream().map(Object::toString).collect(java.util.stream.Collectors.joining("; "));
        } else {
            this.medicalConditions = val.toString();
        }
    }

    private List<String> dangerIndicators;
    private List<String> vulnerabilityFlags;
    private Integer recentSightingsCount;
    private Double lastSightingHoursAgo;
    private String description;
}
