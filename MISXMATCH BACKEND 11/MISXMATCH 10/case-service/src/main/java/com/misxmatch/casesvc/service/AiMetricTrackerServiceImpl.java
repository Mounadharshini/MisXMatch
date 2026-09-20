package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.entity.SystemHealthMetrics;
import com.misxmatch.casesvc.repository.SystemHealthMetricsRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
public class AiMetricTrackerServiceImpl implements AiMetricTrackerService {

    private final SystemHealthMetricsRepository repository;

    private final AtomicLong totalRequests = new AtomicLong(0);
    private final AtomicLong successfulRequests = new AtomicLong(0);
    private final AtomicLong failedRequests = new AtomicLong(0);
    private final AtomicLong timeoutRequests = new AtomicLong(0);
    private final AtomicLong totalDurationMs = new AtomicLong(0);
    private final AtomicLong maxDurationMs = new AtomicLong(0);

    private final Map<String, AtomicLong> operationCounts = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> operationSuccesses = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> operationFailures = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> operationDurations = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> errorCategoryCounts = new ConcurrentHashMap<>();

    public AiMetricTrackerServiceImpl(SystemHealthMetricsRepository repository) {
        this.repository = repository;
    }

    @Override
    public void recordMetric(String operationType, boolean success, long durationMs, String errorCategory, String requestId) {
        String op = (operationType != null && !operationType.isBlank()) ? operationType.toUpperCase() : "UNKNOWN";
        String err = (errorCategory != null && !errorCategory.isBlank()) ? errorCategory.toUpperCase() : (success ? "NONE" : "MODEL_ERROR");

        totalRequests.incrementAndGet();
        if (success) {
            successfulRequests.incrementAndGet();
        } else {
            failedRequests.incrementAndGet();
            if ("AI_TIMEOUT".equals(err)) {
                timeoutRequests.incrementAndGet();
            }
        }

        totalDurationMs.addAndGet(Math.max(0, durationMs));
        maxDurationMs.accumulateAndGet(durationMs, Math::max);

        operationCounts.computeIfAbsent(op, k -> new AtomicLong(0)).incrementAndGet();
        if (success) {
            operationSuccesses.computeIfAbsent(op, k -> new AtomicLong(0)).incrementAndGet();
        } else {
            operationFailures.computeIfAbsent(op, k -> new AtomicLong(0)).incrementAndGet();
        }
        operationDurations.computeIfAbsent(op, k -> new AtomicLong(0)).addAndGet(Math.max(0, durationMs));

        if (!"NONE".equals(err)) {
            errorCategoryCounts.computeIfAbsent(err, k -> new AtomicLong(0)).incrementAndGet();
        }

        try {
            SystemHealthMetrics entity = SystemHealthMetrics.builder()
                    .operationType(op)
                    .success(success)
                    .durationMs(durationMs)
                    .errorCategory(err)
                    .requestId(requestId)
                    .createdAt(LocalDateTime.now())
                    .build();
            repository.save(entity);
        } catch (Exception e) {
            log.warn("Failed to persist AI metric to MySQL database: {}", e.getMessage());
        }
    }

    @Override
    public Map<String, Object> getAiMetricsSummary() {
        Map<String, Object> summary = new HashMap<>();

        long total = totalRequests.get();
        long success = successfulRequests.get();
        long failed = failedRequests.get();
        long timeouts = timeoutRequests.get();
        long dur = totalDurationMs.get();
        double avgDur = total > 0 ? (double) dur / total : 0.0;

        summary.put("totalRequests", total);
        summary.put("successfulRequests", success);
        summary.put("failedRequests", failed);
        summary.put("timeoutCount", timeouts);
        summary.put("averageProcessingDurationMs", Math.round(avgDur * 10.0) / 10.0);
        summary.put("slowestRequestMs", maxDurationMs.get());

        Map<String, Map<String, Object>> featureBreakdown = new HashMap<>();
        List<String> knownOps = List.of(
                "FACE_MATCH", "TEXT_MATCH", "ATTRIBUTE_MATCH",
                "LOCATION_MATCH", "TIME_MATCH", "MULTI_MATCH",
                "RISK_SCORE", "CCTV_ANALYSIS"
        );

        for (String op : knownOps) {
            long opTotal = operationCounts.getOrDefault(op, new AtomicLong(0)).get();
            long opSucc = operationSuccesses.getOrDefault(op, new AtomicLong(0)).get();
            long opFail = operationFailures.getOrDefault(op, new AtomicLong(0)).get();
            long opDur = operationDurations.getOrDefault(op, new AtomicLong(0)).get();
            double opAvg = opTotal > 0 ? (double) opDur / opTotal : 0.0;

            Map<String, Object> opMap = new HashMap<>();
            opMap.put("total", opTotal);
            opMap.put("successful", opSucc);
            opMap.put("failed", opFail);
            opMap.put("avgDurationMs", Math.round(opAvg * 10.0) / 10.0);

            featureBreakdown.put(op, opMap);
        }
        summary.put("featureBreakdown", featureBreakdown);

        Map<String, Long> failuresMap = new HashMap<>();
        errorCategoryCounts.forEach((k, v) -> failuresMap.put(k, v.get()));
        summary.put("failureCategoryCounts", failuresMap);

        return summary;
    }
}
