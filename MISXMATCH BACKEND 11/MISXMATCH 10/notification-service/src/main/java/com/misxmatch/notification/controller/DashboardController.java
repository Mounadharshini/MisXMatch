package com.misxmatch.notification.controller;

import com.misxmatch.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/dashboard")
@Tag(name = "Dashboards")
public class DashboardController {

    private final NotificationService notificationService;

    public DashboardController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Admin dashboard statistics")
    public ResponseEntity<Map<String, Object>> admin() {
        return ResponseEntity.ok(notificationService.dashboardFor("ADMIN"));
    }

    @GetMapping("/police")
    @PreAuthorize("hasAuthority('ROLE_POLICE')")
    @Operation(summary = "Police dashboard statistics")
    public ResponseEntity<Map<String, Object>> police() {
        return ResponseEntity.ok(notificationService.dashboardFor("POLICE"));
    }

    @GetMapping("/public")
    @Operation(summary = "Public dashboard statistics")
    public ResponseEntity<Map<String, Object>> publicDashboard() {
        return ResponseEntity.ok(notificationService.dashboardFor("PUBLIC_USER"));
    }

    @GetMapping("/hospital")
    @PreAuthorize("hasAuthority('ROLE_HOSPITAL')")
    @Operation(summary = "Hospital dashboard statistics")
    public ResponseEntity<Map<String, Object>> hospital() {
        return ResponseEntity.ok(notificationService.dashboardFor("HOSPITAL"));
    }

    @GetMapping("/ngo")
    @PreAuthorize("hasAnyAuthority('ROLE_NGO','ROLE_SHELTER')")
    @Operation(summary = "NGO/Shelter dashboard statistics")
    public ResponseEntity<Map<String, Object>> ngo() {
        return ResponseEntity.ok(notificationService.dashboardFor("NGO"));
    }
}
