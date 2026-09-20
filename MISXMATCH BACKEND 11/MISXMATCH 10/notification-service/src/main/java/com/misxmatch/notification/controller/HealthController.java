package com.misxmatch.notification.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    public HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping({"/health", "/api/notifications/health"})
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> response = new HashMap<>();
        response.put("service", "notification-service");
        response.put("version", "1.0.0");

        String dbStatus = "UP";
        try {
            jdbcTemplate.execute("SELECT 1");
        } catch (Exception e) {
            dbStatus = "DOWN";
        }

        response.put("database", dbStatus);
        response.put("status", "UP".equals(dbStatus) ? "UP" : "DEGRADED");

        return ResponseEntity.ok(response);
    }
}
