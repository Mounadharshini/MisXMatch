package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.client.AiServiceClient;
import com.misxmatch.casesvc.dto.ai.*;
import com.misxmatch.casesvc.entity.AiMatchResult;
import com.misxmatch.casesvc.entity.CaseStatus;
import com.misxmatch.casesvc.entity.FoundPerson;
import com.misxmatch.casesvc.entity.MissingPerson;
import com.misxmatch.casesvc.entity.Sighting;
import com.misxmatch.casesvc.repository.FoundPersonRepository;
import com.misxmatch.casesvc.repository.MissingPersonRepository;
import com.misxmatch.casesvc.repository.SightingRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import com.misxmatch.casesvc.client.NotificationClient;

@Slf4j
@Service
public class AiIntegrationServiceImpl implements AiIntegrationService {

    private final AiServiceClient aiServiceClient;
    private final AiResultPersistenceService resultPersistenceService;
    private final MissingPersonRepository missingPersonRepository;
    private final FoundPersonRepository foundPersonRepository;
    private final SightingRepository sightingRepository;
    private final NotificationClient notificationClient;

    @Value("${ai.matching.top-n:10}")
    private int topN = 10;

    public AiIntegrationServiceImpl(AiServiceClient aiServiceClient,
                                    AiResultPersistenceService resultPersistenceService,
                                    MissingPersonRepository missingPersonRepository,
                                    FoundPersonRepository foundPersonRepository,
                                    SightingRepository sightingRepository,
                                    NotificationClient notificationClient) {
        this.aiServiceClient = aiServiceClient;
        this.resultPersistenceService = resultPersistenceService;
        this.missingPersonRepository = missingPersonRepository;
        this.foundPersonRepository = foundPersonRepository;
        this.sightingRepository = sightingRepository;
        this.notificationClient = notificationClient;
    }

    @Override
    @Transactional
    public AiRiskScoreResponse evaluateAndSaveCaseRisk(String caseNumber) {
        MissingPerson mp = missingPersonRepository.findByCaseNumber(caseNumber)
                .orElseThrow(() -> new IllegalArgumentException("Missing person case not found for case number: " + caseNumber));

        List<String> dangerInds = new ArrayList<>();
        List<String> vulnFlags = new ArrayList<>();

        if (mp.getAge() != null && mp.getAge() < 18) {
            vulnFlags.add("minor");
        }
        if (mp.getDescription() != null) {
            String descLower = mp.getDescription().toLowerCase();
            if (descLower.contains("abduct") || descLower.contains("kidnap") || descLower.contains("forced")) {
                dangerInds.add("abduction");
            }
            if (descLower.contains("insulin") || descLower.contains("dementia") || descLower.contains("medication")) {
                vulnFlags.add("medical");
            }
        }

        String lastSeenStr = mp.getLastSeenDate() != null ? mp.getLastSeenDate().atStartOfDay().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z" : null;
        String createdStr = mp.getCreatedAt() != null ? mp.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z" : null;

        AiRiskScoreRequest req = AiRiskScoreRequest.builder()
                .caseId(mp.getCaseNumber())
                .age(mp.getAge())
                .gender(mp.getGender())
                .lastSeenDate(lastSeenStr)
                .createdAt(createdStr)
                .medicalConditions(mp.getIdentifyingMarks())
                .dangerIndicators(dangerInds)
                .vulnerabilityFlags(vulnFlags)
                .description(mp.getDescription())
                .build();

        AiRiskScoreResponse response = aiServiceClient.calculateRiskScore(req);

        if (response != null && response.getRiskScore() != null) {
            resultPersistenceService.saveRiskResult(caseNumber, response);
            log.info("Evaluated and persisted risk result into MySQL for case {}: score={}, level={}", caseNumber, response.getRiskScore(), response.getRiskLevel());

            if ("HIGH".equalsIgnoreCase(response.getRiskLevel()) || "CRITICAL".equalsIgnoreCase(response.getRiskLevel()) || response.getRiskScore() >= 0.75) {
                notificationClient.sendHighRiskCaseNotificationAsync(caseNumber, response.getRiskScore(), response.getRiskLevel(), mp.getLastSeenLocation());
            }
        }

        return response;
    }

    @Override
    @Transactional
    public AiMultiMatchResponse evaluateMultiFactorMatch(String missingCaseNumber, String targetCaseNumber) {
        MissingPerson mp = missingPersonRepository.findByCaseNumber(missingCaseNumber)
                .orElseThrow(() -> new IllegalArgumentException("Missing person case not found: " + missingCaseNumber));

        AiMultiMatchRequest.PersonRecord p1 = buildPersonRecord(mp);
        AiMultiMatchRequest.PersonRecord p2 = null;

        // Try found person first
        FoundPerson fp = foundPersonRepository.findAll().stream()
                .filter(f -> targetCaseNumber.equalsIgnoreCase(f.getCaseNumber()))
                .findFirst().orElse(null);

        if (fp != null) {
            p2 = buildPersonRecordFromFound(fp);
        } else {
            // Try sighting
            Sighting s = sightingRepository.findAll().stream()
                    .filter(sg -> targetCaseNumber.equalsIgnoreCase("SIGHTING-" + sg.getId()))
                    .findFirst().orElse(null);
            if (s != null) {
                p2 = buildPersonRecordFromSighting(s);
            }
        }

        if (p2 == null) {
            throw new IllegalArgumentException("Target report not found for identifier: " + targetCaseNumber);
        }

        AiMultiMatchRequest request = AiMultiMatchRequest.builder()
                .person1(p1)
                .person2(p2)
                .build();

        AiMultiMatchResponse response = aiServiceClient.compareMultiFactor(request);

        if (response != null && response.getOverallScore() != null) {
            resultPersistenceService.saveMatchResult(missingCaseNumber, targetCaseNumber, response);
            log.info("Evaluated and persisted match result into MySQL: {} -> {} (Score: {})", missingCaseNumber, targetCaseNumber, response.getOverallScore());
        }

        return response;
    }

    @Override
    @Transactional
    public AiCandidateAnalysisResponse analyzeCaseCandidates(String missingCaseNumber) {
        MissingPerson mp = missingPersonRepository.findByCaseNumber(missingCaseNumber)
                .orElseThrow(() -> new IllegalArgumentException("Missing person case not found for case number: " + missingCaseNumber));

        List<FoundPerson> eligibleFoundPersons = foundPersonRepository.findAll().stream()
                .filter(fp -> fp.getStatus() == null || (fp.getStatus() != CaseStatus.CLOSED && fp.getStatus() != CaseStatus.REUNITED))
                .filter(fp -> isFoundPersonEligible(mp, fp))
                .collect(Collectors.toList());

        List<Sighting> eligibleSightings = sightingRepository.findAll().stream()
                .filter(s -> s.getMissingCaseNumber() == null || s.getMissingCaseNumber().equalsIgnoreCase(missingCaseNumber) || s.getMissingCaseNumber().isEmpty())
                .collect(Collectors.toList());

        int totalCandidatesChecked = eligibleFoundPersons.size() + eligibleSightings.size();
        log.info("Executing end-to-end AI candidate analysis for missing case {}: retrieved {} found-person and {} sighting candidates",
                missingCaseNumber, eligibleFoundPersons.size(), eligibleSightings.size());

        List<AiMatchResult> processedResults = new ArrayList<>();
        AiMultiMatchRequest.PersonRecord p1 = buildPersonRecord(mp);

        // Process FoundPerson candidates via Python multi-match endpoint
        for (FoundPerson fp : eligibleFoundPersons) {
            String candidateId = fp.getCaseNumber();
            try {
                AiMultiMatchRequest.PersonRecord p2 = buildPersonRecordFromFound(fp);
                AiMultiMatchRequest request = AiMultiMatchRequest.builder().person1(p1).person2(p2).build();
                AiMultiMatchResponse response = aiServiceClient.compareMultiFactor(request);
                if (response != null && response.getOverallScore() != null) {
                    AiMatchResult result = resultPersistenceService.saveMatchResult(missingCaseNumber, candidateId, response);
                    processedResults.add(result);

                    if (response.getOverallScore() >= 0.80) {
                        notificationClient.sendAiMatchFoundNotificationAsync(missingCaseNumber, result.getId(), response.getOverallScore(), "police_officer");
                    }
                }
            } catch (Exception e) {
                log.warn("AI multi-factor candidate comparison failed for pair {} -> {}: {}", missingCaseNumber, candidateId, e.getMessage());
            }
        }

        // Process Sighting candidates via Python multi-match endpoint
        for (Sighting s : eligibleSightings) {
            String candidateId = "SIGHTING-" + s.getId();
            try {
                AiMultiMatchRequest.PersonRecord p2 = buildPersonRecordFromSighting(s);
                AiMultiMatchRequest request = AiMultiMatchRequest.builder().person1(p1).person2(p2).build();
                AiMultiMatchResponse response = aiServiceClient.compareMultiFactor(request);
                if (response != null && response.getOverallScore() != null) {
                    AiMatchResult result = resultPersistenceService.saveMatchResult(missingCaseNumber, candidateId, response);
                    processedResults.add(result);

                    if (response.getOverallScore() >= 0.80) {
                        notificationClient.sendAiMatchFoundNotificationAsync(missingCaseNumber, result.getId(), response.getOverallScore(), "police_officer");
                    }
                }
            } catch (Exception e) {
                log.warn("AI multi-factor candidate comparison failed for pair {} -> {}: {}", missingCaseNumber, candidateId, e.getMessage());
            }
        }

        // 2. Retrieve stored matches ordered by overallScore DESC
        List<AiMatchResult> allMatches = resultPersistenceService.getMatchesForCase(missingCaseNumber);

        // 3. Rank candidates by overallScore DESC and limit to Top-N
        List<AiMatchResult> topMatches = allMatches.stream()
                .limit(topN)
                .collect(Collectors.toList());

        List<AiCandidateAnalysisResponse.CandidateMatchSummary> summaries = topMatches.stream()
                .map(m -> buildCandidateMatchSummary(m, missingCaseNumber))
                .collect(Collectors.toList());

        String analysisStatus = processedResults.isEmpty() && totalCandidatesChecked > 0 ? "PARTIAL_SUCCESS"
                : (totalCandidatesChecked == 0 ? "NO_CANDIDATES" : "COMPLETED");

        log.info("Finished AI candidate analysis for case {}: {} candidates checked, {} matches persisted, top {} returned",
                missingCaseNumber, totalCandidatesChecked, allMatches.size(), summaries.size());

        return AiCandidateAnalysisResponse.builder()
                .caseId(missingCaseNumber)
                .status(analysisStatus)
                .totalCandidatesChecked(totalCandidatesChecked)
                .matchesFound(allMatches.size())
                .matches(summaries)
                .build();
    }

    private boolean isFoundPersonEligible(MissingPerson mp, FoundPerson fp) {
        // Conservative pre-filtering rules: do not eliminate candidate if attribute values are missing
        if (mp.getAge() != null && fp.getApproximateAge() != null) {
            if (Math.abs(mp.getAge() - fp.getApproximateAge()) > 25) {
                return false;
            }
        }
        if (mp.getGender() != null && fp.getGender() != null) {
            String g1 = mp.getGender().trim().toLowerCase();
            String g2 = fp.getGender().trim().toLowerCase();
            if (!g1.equals("other") && !g2.equals("other") && !g1.equals("unknown") && !g2.equals("unknown")) {
                if (!g1.equals(g2)) {
                    return false;
                }
            }
        }
        return true;
    }

    private AiCandidateAnalysisResponse.CandidateMatchSummary buildCandidateMatchSummary(AiMatchResult m, String missingCaseNumber) {
        String targetId = m.getSourceCaseId().equalsIgnoreCase(missingCaseNumber) ? m.getCandidateCaseId() : m.getSourceCaseId();
        String candidateName = "Candidate " + targetId;
        String candidateType = targetId.startsWith("SIGHTING-") ? "SIGHTING" : "FOUND_PERSON";
        String photoUrl = null;
        String location = null;

        if (targetId.startsWith("SIGHTING-")) {
            try {
                Long sightingId = Long.parseLong(targetId.replace("SIGHTING-", ""));
                Optional<Sighting> sOpt = sightingRepository.findById(sightingId);
                if (sOpt.isPresent()) {
                    Sighting s = sOpt.get();
                    candidateName = "Sighting Report #" + s.getId();
                    photoUrl = s.getPhotoUrl();
                    location = s.getLocation();
                }
            } catch (Exception ignored) {}
        } else {
            Optional<FoundPerson> fpOpt = foundPersonRepository.findByCaseNumber(targetId);
            if (fpOpt.isPresent()) {
                FoundPerson fp = fpOpt.get();
                candidateName = fp.getApproximateName() != null && !fp.getApproximateName().isBlank()
                        ? fp.getApproximateName()
                        : "Found Person (" + fp.getCaseNumber() + ")";
                photoUrl = fp.getPhotoUrl();
                location = fp.getFoundLocation();
            }
        }

        return AiCandidateAnalysisResponse.CandidateMatchSummary.builder()
                .candidateId(targetId)
                .candidateName(candidateName)
                .candidateType(candidateType)
                .candidatePhotoUrl(photoUrl)
                .candidateLocation(location)
                .overallScore(m.getOverallScore())
                .classification(m.getClassification())
                .faceScore(m.getFaceScore())
                .textScore(m.getTextScore())
                .attributeScore(m.getAttributeScore())
                .locationScore(m.getLocationScore())
                .timeScore(m.getTimeScore())
                .availableFactorsCount(m.getAvailableFactorsCount())
                .analysisTimestamp(m.getAnalysisTimestamp())
                .disclaimer("AI-generated candidate match. Human verification is required before confirming identity.")
                .build();
    }

    private AiMultiMatchRequest.PersonRecord buildPersonRecord(MissingPerson mp) {
        AiAttributeMatchRequest.PersonAttributes attrs = AiAttributeMatchRequest.PersonAttributes.builder()
                .age(mp.getAge())
                .gender(mp.getGender())
                .clothing(mp.getDescription())
                .skinTone(mp.getComplexion())
                .build();

        String ts = mp.getLastSeenDate() != null ? mp.getLastSeenDate().atStartOfDay().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z" : null;

        return AiMultiMatchRequest.PersonRecord.builder()
                .image(mp.getPhotoUrl())
                .description(mp.getDescription())
                .attributes(attrs)
                .timestamp(ts)
                .build();
    }

    private AiMultiMatchRequest.PersonRecord buildPersonRecordFromFound(FoundPerson fp) {
        AiAttributeMatchRequest.PersonAttributes attrs = AiAttributeMatchRequest.PersonAttributes.builder()
                .age(fp.getApproximateAge())
                .gender(fp.getGender())
                .clothing(fp.getDescription())
                .build();

        String ts = fp.getFoundDate() != null ? fp.getFoundDate().atStartOfDay().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z" : null;

        return AiMultiMatchRequest.PersonRecord.builder()
                .image(fp.getPhotoUrl())
                .description(fp.getDescription())
                .attributes(attrs)
                .timestamp(ts)
                .build();
    }

    private AiMultiMatchRequest.PersonRecord buildPersonRecordFromSighting(Sighting s) {
        AiAttributeMatchRequest.PersonAttributes attrs = AiAttributeMatchRequest.PersonAttributes.builder()
                .clothing(s.getDescription())
                .build();

        String ts = s.getSightedAt() != null ? s.getSightedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z" : null;

        return AiMultiMatchRequest.PersonRecord.builder()
                .image(s.getPhotoUrl())
                .description(s.getDescription())
                .attributes(attrs)
                .timestamp(ts)
                .build();
    }
}
