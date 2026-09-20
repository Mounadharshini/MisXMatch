package com.misxmatch.casesvc.dto;

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
public class DuplicateCheckResponse {
    private boolean duplicateFound;
    private Double highestSimilarity;
    @Builder.Default
    private List<DuplicateMatch> potentialDuplicates = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DuplicateMatch {
        private String caseNumber;
        private String name;
        private String location;
        private Double similarity;
        private String reason;
    }
}
