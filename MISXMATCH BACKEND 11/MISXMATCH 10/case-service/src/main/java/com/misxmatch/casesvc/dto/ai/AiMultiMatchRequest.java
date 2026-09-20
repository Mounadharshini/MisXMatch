package com.misxmatch.casesvc.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiMultiMatchRequest {
    private PersonRecord person1;
    private PersonRecord person2;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PersonRecord {
        private String image;
        private String description;
        private AiAttributeMatchRequest.PersonAttributes attributes;
        private AiLocationMatchRequest.LocationPoint location;
        private String timestamp;
    }
}
