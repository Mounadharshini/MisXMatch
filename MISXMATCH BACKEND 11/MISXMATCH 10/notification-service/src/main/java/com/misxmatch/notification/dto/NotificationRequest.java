package com.misxmatch.notification.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class NotificationRequest {
    @NotBlank
    private String recipientUserId;
    @NotBlank
    private String title;
    private String message;
    private String type;
    private String caseNumber;
    private Long matchId;
    private String location;
    private String dedupKey;
}
