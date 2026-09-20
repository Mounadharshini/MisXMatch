package com.misxmatch.casesvc.service;

import java.util.Map;

public interface SystemHealthMonitoringService {

    Map<String, Object> getDetailedSystemHealth();

    Map<String, Object> getPublicSystemHealth();
}
