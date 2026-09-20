package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.dto.DuplicateCheckRequest;
import com.misxmatch.casesvc.dto.DuplicateCheckResponse;
import com.misxmatch.casesvc.entity.MissingPerson;
import com.misxmatch.casesvc.repository.MissingPersonRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class AiDuplicateDetectionService {

    private final MissingPersonRepository missingPersonRepository;
    private final SmartAiMatchingProvider aiMatchingProvider;

    public AiDuplicateDetectionService(MissingPersonRepository missingPersonRepository,
                                       SmartAiMatchingProvider aiMatchingProvider) {
        this.missingPersonRepository = missingPersonRepository;
        this.aiMatchingProvider = aiMatchingProvider;
    }

    public DuplicateCheckResponse checkDuplicate(DuplicateCheckRequest request) {
        if (request == null || (request.getName() == null && request.getPhotoUrl() == null && request.getPhotoBase64() == null)) {
            return DuplicateCheckResponse.builder().duplicateFound(false).highestSimilarity(0.0).build();
        }

        List<MissingPerson> list = missingPersonRepository.findAll();
        List<DuplicateCheckResponse.DuplicateMatch> matches = new ArrayList<>();
        double highest = 0.0;

        String reqName = request.getName() != null ? request.getName().trim().toLowerCase() : "";
        String reqPhoto = request.getPhotoBase64() != null && !request.getPhotoBase64().isBlank() ? request.getPhotoBase64() : request.getPhotoUrl();

        List<Double> reqEmbedding = null;
        if (reqPhoto != null && !reqPhoto.isBlank()) {
            try {
                reqEmbedding = aiMatchingProvider.fetchFaceEmbedding(reqPhoto);
            } catch (Exception e) {
                log.warn("Failed to extract face embedding for duplicate check: {}", e.getMessage());
            }
        }

        for (MissingPerson mp : list) {
            double sim = 0.0;
            String reason = "";

            if (!reqName.isBlank() && mp.getName() != null) {
                String mpName = mp.getName().trim().toLowerCase();
                if (mpName.equalsIgnoreCase(reqName) || mpName.contains(reqName) || reqName.contains(mpName)) {
                    sim = 0.88;
                    reason = "High demographic name match with open case " + mp.getCaseNumber();
                    if (request.getAge() != null && mp.getAge() != null && request.getAge().equals(mp.getAge())) {
                        sim = 0.95;
                        reason = "Exact name & age match with open case " + mp.getCaseNumber();
                    }
                }
            }

            if (reqEmbedding != null && mp.getPhotoUrl() != null && !mp.getPhotoUrl().isBlank()) {
                try {
                    List<Double> candidateEmb = aiMatchingProvider.fetchFaceEmbedding(mp.getPhotoUrl());
                    if (candidateEmb != null && !candidateEmb.isEmpty()) {
                        double cos = aiMatchingProvider.computeCosineSimilarity(reqEmbedding, candidateEmb);
                        if (cos >= 0.50) {
                            double bioSim = Math.min(0.99, Math.max(sim, cos));
                            sim = bioSim;
                            reason = "Deep facial biometric match (" + Math.round(cos * 100) + "%) with open case " + mp.getCaseNumber();
                        }
                    }
                } catch (Exception ignored) {}
            }

            if (sim >= 0.60) {
                if (sim > highest) highest = sim;

                matches.add(DuplicateCheckResponse.DuplicateMatch.builder()
                        .caseNumber(mp.getCaseNumber())
                        .name(mp.getName())
                        .location(mp.getLastSeenLocation())
                        .similarity(Math.round(sim * 100.0) / 100.0)
                        .reason(reason)
                        .build());
            }
        }

        return DuplicateCheckResponse.builder()
                .duplicateFound(!matches.isEmpty())
                .highestSimilarity(Math.round(highest * 100.0) / 100.0)
                .potentialDuplicates(matches)
                .build();
    }
}
