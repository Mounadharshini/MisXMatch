package com.misxmatch.casesvc.dto;

import com.misxmatch.casesvc.entity.MissingPerson;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NlpSearchResponse {
    private String originalQuery;
    private ExtractedEntities extractedEntities;
    @Builder.Default
    private List<RankedResult> results = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExtractedEntities {
        private String ageRange;
        private String gender;
        private String location;
        @Builder.Default
        private List<String> clothingKeywords = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RankedResult {
        private MissingPerson person;
        private Double matchConfidence;
        private String matchRationale;
    }
}
