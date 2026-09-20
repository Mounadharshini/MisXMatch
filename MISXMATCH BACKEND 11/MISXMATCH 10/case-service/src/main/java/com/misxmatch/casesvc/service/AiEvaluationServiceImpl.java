package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.client.AiServiceClient;
import com.misxmatch.casesvc.entity.AiMatchResult;
import com.misxmatch.casesvc.repository.AiMatchResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiEvaluationServiceImpl implements AiEvaluationService {

    private final AiServiceClient aiServiceClient;
    private final AiMatchResultRepository matchResultRepository;

    @Override
    public Map<String, Object> getConsolidatedEvaluationDashboard(double faceThreshold, double textThreshold) {
        log.info("Aggregating consolidated AI evaluation dashboard (faceThreshold={}, textThreshold={})", faceThreshold, textThreshold);

        Map<String, Object> dashboard = new HashMap<>();

        // 1. Fetch Python benchmark evaluation suite
        Map<String, Object> pythonEvaluation = aiServiceClient.getFullEvaluationReport(faceThreshold, textThreshold);
        dashboard.put("python_model_evaluation", pythonEvaluation);

        // 2. Fetch calibration & model versions
        Map<String, Object> calibration = aiServiceClient.getCalibrationMetadata();
        dashboard.put("calibration_metadata", calibration);

        // 3. Aggregate MySQL Human Officer Review outcomes
        Map<String, Object> humanFeedback = getHumanReviewFeedbackCorrelation();
        dashboard.put("human_review_correlation", humanFeedback);

        dashboard.put("service_status", "ACTIVE");
        dashboard.put("telemetry_disclaimer", "Production similarity scores are probabilistic decision-support signals requiring human verification.");

        return dashboard;
    }

    @Override
    public Map<String, Object> getHumanReviewFeedbackCorrelation() {
        log.info("Calculating human officer review vs AI prediction correlation from MySQL...");

        List<AiMatchResult> allMatches = matchResultRepository.findAll();
        long totalMatches = allMatches.size();

        long confirmedCount = 0;
        long rejectedCount = 0;
        long underReviewCount = 0;
        long pendingCount = 0;
        long needsMoreInfoCount = 0;

        double sumScoreConfirmed = 0.0;
        double sumScoreRejected = 0.0;

        for (AiMatchResult match : allMatches) {
            String status = match.getReviewStatus() != null ? match.getReviewStatus().name() : "PENDING_REVIEW";
            double score = match.getOverallScore() != null ? match.getOverallScore().doubleValue() : 0.0;

            switch (status) {
                case "CONFIRMED_MATCH":
                    confirmedCount++;
                    sumScoreConfirmed += score;
                    break;
                case "REJECTED_MATCH":
                    rejectedCount++;
                    sumScoreRejected += score;
                    break;
                case "UNDER_REVIEW":
                    underReviewCount++;
                    break;
                case "NEEDS_MORE_INFORMATION":
                    needsMoreInfoCount++;
                    break;
                default:
                    pendingCount++;
                    break;
            }
        }

        long reviewedCount = confirmedCount + rejectedCount;
        double confirmationRate = reviewedCount > 0 ? (double) confirmedCount / reviewedCount : 0.0;
        double avgScoreConfirmed = confirmedCount > 0 ? sumScoreConfirmed / confirmedCount : 0.0;
        double avgScoreRejected = rejectedCount > 0 ? sumScoreRejected / rejectedCount : 0.0;

        Map<String, Object> feedbackCorrelation = new HashMap<>();
        feedbackCorrelation.put("total_ai_matches_persisted", totalMatches);
        feedbackCorrelation.put("confirmed_matches", confirmedCount);
        feedbackCorrelation.put("rejected_matches", rejectedCount);
        feedbackCorrelation.put("under_review_matches", underReviewCount);
        feedbackCorrelation.put("pending_review_matches", pendingCount);
        feedbackCorrelation.put("needs_more_info_matches", needsMoreInfoCount);
        feedbackCorrelation.put("officer_confirmation_rate", Math.round(confirmationRate * 10000.0) / 100.0); // %
        feedbackCorrelation.put("avg_score_confirmed_matches", Math.round(avgScoreConfirmed * 1000.0) / 1000.0);
        feedbackCorrelation.put("avg_score_rejected_matches", Math.round(avgScoreRejected * 1000.0) / 1000.0);
        feedbackCorrelation.put("separation_gap", Math.round((avgScoreConfirmed - avgScoreRejected) * 1000.0) / 1000.0);

        return feedbackCorrelation;
    }
}
