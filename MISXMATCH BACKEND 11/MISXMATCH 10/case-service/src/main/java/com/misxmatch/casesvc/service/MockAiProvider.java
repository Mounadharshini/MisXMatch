package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.dto.MatchResult;
import com.misxmatch.casesvc.entity.FoundPerson;
import com.misxmatch.casesvc.entity.MissingPerson;
import com.misxmatch.casesvc.repository.FoundPersonRepository;
import com.misxmatch.casesvc.repository.MissingPersonRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * MockAiProvider
 * ==============
 * Offline deterministic AI Provider implementation.
 * Allows full local testing without requiring external Python or paid cloud APIs.
 */
@Slf4j
@Service("mockAiProvider")
public class MockAiProvider implements AiMatchingProvider {

    private final MissingPersonRepository missingPersonRepository;
    private final FoundPersonRepository foundPersonRepository;

    public MockAiProvider(MissingPersonRepository missingPersonRepository,
                          FoundPersonRepository foundPersonRepository) {
        this.missingPersonRepository = missingPersonRepository;
        this.foundPersonRepository = foundPersonRepository;
    }

    @Override
    public String getProviderName() {
        return "MockAiProvider (Offline Deterministic Test Engine v2.0)";
    }

    @Override
    public MatchResult matchByImage(String missingCaseNumber, String imageUrl) {
        log.info("MockAiProvider executing matchByImage for case: {}", missingCaseNumber);
        Optional<MissingPerson> mpOpt = missingPersonRepository.findByCaseNumber(missingCaseNumber);
        MissingPerson mp = mpOpt.orElse(null);

        List<FoundPerson> foundPersons = foundPersonRepository.findAll();
        List<MatchResult.Candidate> candidates = new ArrayList<>();

        for (FoundPerson fp : foundPersons) {
            double faceScore = 0.88;
            double textScore = 0.82;
            double locScore = 0.75;
            double clothingScore = 0.80;
            double timelineScore = 0.90;

            double finalScore = Math.round(((0.40 * faceScore) + (0.25 * textScore) + (0.15 * clothingScore) + (0.10 * locScore) + (0.10 * timelineScore)) * 100.0 * 10.0) / 10.0;
            String confidence = finalScore >= 85.0 ? "HIGH" : (finalScore >= 70.0 ? "MEDIUM" : "LOW");

            candidates.add(MatchResult.Candidate.builder()
                    .foundCaseNumber(fp.getCaseNumber())
                    .targetCaseNumber(fp.getCaseNumber())
                    .targetReportType("FOUND")
                    .personName(fp.getApproximateName() != null ? fp.getApproximateName() : "Intake #" + fp.getCaseNumber())
                    .similarityScore(faceScore)
                    .finalScore(finalScore)
                    .confidenceLevel(confidence)
                    .matchPairType("Missing ↔ Found")
                    .faceScore(faceScore)
                    .textScore(textScore)
                    .locationScore(locScore)
                    .clothingScore(clothingScore)
                    .timelineScore(timelineScore)
                    .reason("High facial similarity (88%), similar age range, matching red jacket description, and nearby last-seen location.")
                    .photoUrl(fp.getPhotoUrl())
                    .currentLocation(fp.getCurrentLocation())
                    .disclaimer("AI-assisted / Possible Match — Requires Human Verification")
                    .build());
        }

        candidates.sort(Comparator.comparingDouble(MatchResult.Candidate::getFinalScore).reversed());

        return MatchResult.builder()
                .missingCaseNumber(missingCaseNumber)
                .sourceCaseNumber(missingCaseNumber)
                .sourceReportType("MISSING")
                .matchType("IMAGE")
                .matchSource("MOCK_AI_PROVIDER_ENGINE")
                .candidates(candidates)
                .build();
    }

    @Override
    public MatchResult matchByText(String missingCaseNumber, String description) {
        log.info("MockAiProvider executing matchByText for case: {}", missingCaseNumber);
        return matchByImage(missingCaseNumber, null);
    }

    @Override
    public Map<String, Object> detectFaces(byte[] imageBytes) {
        if (imageBytes == null || imageBytes.length == 0) {
            return Map.of("status", "FAILED", "face_count", 0, "faces", Collections.emptyList());
        }
        // Deterministic mock face detection
        Map<String, Object> face1 = Map.of("bbox", List.of(45, 50, 200, 205), "area", 24025);
        return Map.of(
                "status", "SUCCESS",
                "face_count", 1,
                "faces", List.of(face1),
                "image_dimensions", List.of(250, 250),
                "model_used", getProviderName()
        );
    }

    @Override
    public Map<String, Object> compareFaces(String image1, String image2) {
        double rawCosine = (image1 != null && image2 != null && image1.equalsIgnoreCase(image2)) ? 0.95 : 0.78;
        double simScore = Math.round(rawCosine * 100.0 * 10.0) / 10.0;
        return Map.of(
                "status", "SUCCESS",
                "is_match", rawCosine >= 0.40,
                "similarity_score", simScore,
                "raw_cosine_similarity", rawCosine,
                "l2_distance", 0.62,
                "confidence", rawCosine >= 0.75 ? "HIGH" : "MEDIUM",
                "model_used", getProviderName()
        );
    }

    @Override
    public Map<String, Object> compareTexts(String text1, String text2) {
        return Map.of(
                "status", "SUCCESS",
                "is_match", true,
                "similarity_score", 85.0,
                "semantic_similarity", 0.82,
                "keyword_similarity", 0.88,
                "matched_keywords", List.of("jacket", "spectacles", "red shirt"),
                "confidence", "HIGH",
                "model_used", getProviderName()
        );
    }
}
