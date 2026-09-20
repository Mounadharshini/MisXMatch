package com.misxmatch.casesvc.service;

import java.util.Map;

public interface AiMetricTrackerService {

    void recordMetric(String operationType, boolean success, long durationMs, String errorCategory, String requestId);

    Map<String, Object> getAiMetricsSummary();
}
