package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.entity.MissingPerson;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class AiScoreCalculatorService {

    @Value("${ai.weights.face:0.40}")
    private double faceWeight = 0.40;

    @Value("${ai.weights.text:0.25}")
    private double textWeight = 0.25;

    @Value("${ai.weights.clothing:0.15}")
    private double clothingWeight = 0.15;

    @Value("${ai.weights.location:0.10}")
    private double locationWeight = 0.10;

    @Value("${ai.weights.timeline:0.10}")
    private double timelineWeight = 0.10;

    public ScoreResult calculateWeightedScore(Double faceScore, Double textScore, Double clothingScore, Double locationScore, Double timelineScore) {
        double f = faceScore != null ? (faceScore > 1.0 ? faceScore / 100.0 : Math.max(0.0, Math.min(1.0, faceScore))) : 0.50;
        double t = textScore != null ? (textScore > 1.0 ? textScore / 100.0 : Math.max(0.0, Math.min(1.0, textScore))) : 0.50;
        double c = clothingScore != null ? (clothingScore > 1.0 ? clothingScore / 100.0 : Math.max(0.0, Math.min(1.0, clothingScore))) : 0.50;
        double l = locationScore != null ? (locationScore > 1.0 ? locationScore / 100.0 : Math.max(0.0, Math.min(1.0, locationScore))) : 0.50;
        double tm = timelineScore != null ? (timelineScore > 1.0 ? timelineScore / 100.0 : Math.max(0.0, Math.min(1.0, timelineScore))) : 0.50;

        double totalScoreRaw = (faceWeight * f) + (textWeight * t) + (clothingWeight * c) + (locationWeight * l) + (timelineWeight * tm);
        double finalScore100 = Math.round(Math.max(0.0, Math.min(100.0, totalScoreRaw * 100.0)) * 10.0) / 10.0;

        String band;
        String bandDescription;

        if (finalScore100 >= 95.0) {
            band = "EMERGENCY_REVIEW";
            bandDescription = "Emergency Review — Top Tier Biometric Match";
        } else if (finalScore100 >= 85.0) {
            band = "IMMEDIATE_POLICE_REVIEW";
            bandDescription = "Immediate Police Review Required";
        } else if (finalScore100 >= 70.0) {
            band = "MANUAL_VERIFICATION";
            bandDescription = "Manual Verification Required";
        } else if (finalScore100 >= 50.0) {
            band = "MORE_EVIDENCE_NEEDED";
            bandDescription = "More Evidence Needed";
        } else {
            band = "LOW_PRIORITY_LEAD";
            bandDescription = "Low-Priority Lead";
        }

        ScoreResult result = new ScoreResult();
        result.setFinalScore(finalScore100);
        result.setConfidenceBand(band);
        result.setBandDescription(bandDescription);
        result.setFaceScore(Math.round(f * 100.0) / 100.0);
        result.setTextScore(Math.round(t * 100.0) / 100.0);
        result.setClothingScore(Math.round(c * 100.0) / 100.0);
        result.setLocationScore(Math.round(l * 100.0) / 100.0);
        result.setTimelineScore(Math.round(tm * 100.0) / 100.0);
        return result;
    }

    public RiskPriorityResult calculateCaseRiskPriority(MissingPerson mp) {
        if (mp == null) {
            return new RiskPriorityResult("LOW", 10.0, List.of("Standard case assessment"));
        }

        double riskScore = 15.0;
        List<String> reasons = new ArrayList<>();

        // Age factor
        if (mp.getAge() != null) {
            if (mp.getAge() <= 6) {
                riskScore += 45.0;
                reasons.add("Young child vulnerability (Age <= 6 yrs)");
            } else if (mp.getAge() <= 12) {
                riskScore += 35.0;
                reasons.add("Minor child vulnerability (Age <= 12 yrs)");
            } else if (mp.getAge() >= 65) {
                riskScore += 30.0;
                reasons.add("Senior citizen vulnerability (Age >= 65 yrs)");
            }
        }

        // Description keywords (Medical/Disability/Trafficking)
        String desc = mp.getDescription() != null ? mp.getDescription().toLowerCase() : "";
        if (desc.contains("medical") || desc.contains("diabetes") || desc.contains("heart") || desc.contains("patient") || desc.contains("dementia") || desc.contains("alzheimer")) {
            riskScore += 25.0;
            reasons.add("Urgent medical condition / critical medication required");
        }
        if (desc.contains("disabled") || desc.contains("disability") || desc.contains("wheelchair") || desc.contains("deaf") || desc.contains("blind") || desc.contains("mute")) {
            riskScore += 25.0;
            reasons.add("Physical or sensory disability reported");
        }
        if (desc.contains("kidnap") || desc.contains("traffick") || desc.contains("abduct") || desc.contains("forced") || desc.contains("stolen")) {
            riskScore += 35.0;
            reasons.add("Suspected abduction / trafficking indicators");
        }

        // Risk level flag set on case
        if ("HIGH".equalsIgnoreCase(mp.getRiskLevel())) {
            riskScore += 15.0;
        } else if ("CRITICAL".equalsIgnoreCase(mp.getRiskLevel())) {
            riskScore += 30.0;
        }

        // Elapsed time factor
        if (mp.getCreatedAt() != null) {
            long elapsedHours = Duration.between(mp.getCreatedAt(), LocalDateTime.now()).toHours();
            if (elapsedHours <= 24) {
                riskScore += 20.0; // Golden 24h window
                reasons.add("Critical Golden Window (< 24 hrs since reporting)");
            } else if (elapsedHours > 72) {
                riskScore += 10.0;
                reasons.add("Extended missing duration (> 72 hrs)");
            }
        }

        riskScore = Math.min(100.0, Math.max(5.0, riskScore));

        String priorityLevel = "LOW";
        if (riskScore >= 75.0) {
            priorityLevel = "CRITICAL";
        } else if (riskScore >= 55.0) {
            priorityLevel = "HIGH";
        } else if (riskScore >= 35.0) {
            priorityLevel = "MEDIUM";
        }

        if (reasons.isEmpty()) {
            reasons.add("Standard intake parameters");
        }

        return new RiskPriorityResult(priorityLevel, Math.round(riskScore * 10.0) / 10.0, reasons);
    }

    @Data
    public static class ScoreResult {
        private Double finalScore;
        private String confidenceBand;
        private String bandDescription;
        private Double faceScore;
        private Double textScore;
        private Double clothingScore;
        private Double locationScore;
        private Double timelineScore;
    }

    @Data
    public static class RiskPriorityResult {
        private String priorityLevel;
        private Double riskScore;
        private List<String> priorityReasons;

        public RiskPriorityResult(String priorityLevel, Double riskScore, List<String> priorityReasons) {
            this.priorityLevel = priorityLevel;
            this.riskScore = riskScore;
            this.priorityReasons = priorityReasons;
        }
    }
}
