package com.misxmatch.notification.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyBroadcastRequest {
    @NotBlank
    private String caseNumber;
    @NotBlank
    private String personName;
    private Integer age;
    private String gender;
    private String lastSeenLocation;
    private String description;
    private String photoUrl;
    private String priority; // CRITICAL, HIGH, AMBER
    private String broadcastRadius; // e.g. "50km", "National"
    private List<String> targetChannels; // SMS, WHATSAPP, EMAIL, PORTAL_ALERT
}
