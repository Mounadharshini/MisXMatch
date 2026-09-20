package com.misxmatch.casesvc.service;

import java.util.Map;

/**
 * AiEvaluationService
 * ===================
 * Service interface for aggregating AI model evaluation metrics, threshold calibrations,
 * system performance telemetry, and MySQL human officer review decision correlations.
 */
public interface AiEvaluationService {

    /**
     * Retrieves consolidated AI system evaluation dashboard payload combining Python benchmark evaluations,
     * threshold calibration settings, model versions, and MySQL human review outcomes.
     */
    Map<String, Object> getConsolidatedEvaluationDashboard(double faceThreshold, double textThreshold);

    /**
     * Retrieves officer review vs AI match correlation telemetry from MySQL database.
     */
    Map<String, Object> getHumanReviewFeedbackCorrelation();
}
