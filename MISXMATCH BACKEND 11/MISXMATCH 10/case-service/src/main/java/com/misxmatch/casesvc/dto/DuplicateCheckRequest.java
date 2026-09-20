package com.misxmatch.casesvc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DuplicateCheckRequest {
    private String name;
    private Integer age;
    private String gender;
    private String location;
    private String photoUrl;
    private String photoBase64;
    private String description;
    private String type; // MISSING or FOUND
}
