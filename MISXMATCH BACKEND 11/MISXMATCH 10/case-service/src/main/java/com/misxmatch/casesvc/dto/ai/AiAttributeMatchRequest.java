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
public class AiAttributeMatchRequest {
    private PersonAttributes person1;
    private PersonAttributes person2;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PersonAttributes {
        private Integer age;
        private String gender;
        private Double height;
        private String clothing;
        private String hair;
        private String skinTone;
    }
}
