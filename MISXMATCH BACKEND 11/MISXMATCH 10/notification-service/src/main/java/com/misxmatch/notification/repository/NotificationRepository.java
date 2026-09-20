package com.misxmatch.notification.repository;

import com.misxmatch.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long>, JpaSpecificationExecutor<Notification> {
    List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(String recipientUserId);
    List<Notification> findAllByOrderByCreatedAtDesc();
    boolean existsByDedupKey(String dedupKey);
    void deleteByRecipientUserId(String recipientUserId);
}
