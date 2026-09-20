package com.misxmatch.notification.config;

import com.misxmatch.notification.entity.AuditLog;
import com.misxmatch.notification.entity.Notification;
import com.misxmatch.notification.repository.AuditLogRepository;
import com.misxmatch.notification.repository.NotificationRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class NotificationDataInitializer implements CommandLineRunner {

    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;

    public NotificationDataInitializer(NotificationRepository notificationRepository,
                                       AuditLogRepository auditLogRepository) {
        this.notificationRepository = notificationRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    public void run(String... args) {
        // Purely dynamic - no mock notifications or fake cases auto-injected
    }
}
