package com.misxmatch.casesvc.controller;

import com.misxmatch.casesvc.service.SystemHealthMonitoringService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping
public class SystemHealthController {

    private final SystemHealthMonitoringService healthMonitoringService;

    public SystemHealthController(SystemHealthMonitoringService healthMonitoringService) {
        this.healthMonitoringService = healthMonitoringService;
    }

    @GetMapping("/api/admin/system/health")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getDetailedSystemHealth() {
        return ResponseEntity.ok(healthMonitoringService.getDetailedSystemHealth());
    }

    @GetMapping({"/health", "/api/cases/health"})
    public ResponseEntity<Map<String, Object>> getPublicSystemHealth() {
        return ResponseEntity.ok(healthMonitoringService.getPublicSystemHealth());
    }
}
