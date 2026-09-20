package com.misxmatch.notification.service;

import java.util.List;

public interface EmailService {
    void sendEmail(String to, String subject, String body, boolean isHtml);
    void sendEmergencyBroadcast(String caseNumber, String personName, String priority, String location, String details, List<String> recipients);
}
