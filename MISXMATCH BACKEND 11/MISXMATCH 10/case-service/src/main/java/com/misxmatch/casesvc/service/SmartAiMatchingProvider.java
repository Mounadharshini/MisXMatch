package com.misxmatch.casesvc.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.misxmatch.casesvc.dto.MatchResult;
import com.misxmatch.casesvc.entity.FoundPerson;
import com.misxmatch.casesvc.entity.MissingPerson;
import com.misxmatch.casesvc.entity.Sighting;
import com.misxmatch.casesvc.entity.UploadedFile;
import com.misxmatch.casesvc.repository.FoundPersonRepository;
import com.misxmatch.casesvc.repository.MissingPersonRepository;
import com.misxmatch.casesvc.repository.SightingRepository;
import com.misxmatch.casesvc.repository.UploadedFileRepository;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * SmartAiMatchingProvider
 * =======================
 * Advanced Multi-Modal AI Prediction & Biometric Alignment Engine.
 * 
 * Features:
 * 1. Deep Learning Facial & Re-ID Biometric Alignment (512-d Cosine Similarity).
 * 2. Multi-source matching across:
 *    - Missing ↔ Found (General)
 *    - Missing ↔ Hospital Patients
 *    - Missing ↔ Shelter/NGO Residents
 *    - Missing ↔ Citizen Sightings
 *    - Missing ↔ Other Missing Cases (Cross-matching)
 *    - Missing ↔ CCTV / Photo Evidence
 * 3. Non-mock Final Match Score with confidence classification.
 */
@Slf4j
@Service("realAiProvider")
public class SmartAiMatchingProvider implements AiMatchingProvider {

    private final MissingPersonRepository missingPersonRepository;
    private final FoundPersonRepository foundPersonRepository;
    private final SightingRepository sightingRepository;
    private final UploadedFileRepository uploadedFileRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public String getProviderName() {
        return "RealAiProvider (Python Multimodal Biometric Engine v2.0)";
    }

    @Override
    public Map<String, Object> detectFaces(byte[] imageBytes) {
        if (imageBytes == null || imageBytes.length == 0) return Map.of("status", "FAILED", "face_count", 0);
        try {
            String endpoint = aiServiceUrl + "/detect/faces";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            HttpEntity<byte[]> request = new HttpEntity<>(imageBytes, headers);
            return restTemplate.postForObject(endpoint, request, Map.class);
        } catch (Exception e) {
            log.warn("Failed to execute detectFaces on real AI service: {}", e.getMessage());
            return Map.of("status", "FAILED", "face_count", 0, "error", e.getMessage());
        }
    }

    @Override
    public Map<String, Object> compareFaces(String image1, String image2) {
        AiFaceMatchResponse res = compareFaceImages(image1, image2, 0.40);
        if (res != null) {
            return Map.of(
                    "status", res.getStatus() != null ? res.getStatus() : "SUCCESS",
                    "is_match", Boolean.TRUE.equals(res.getIsMatch()),
                    "similarity_score", res.getSimilarityScore() != null ? res.getSimilarityScore() : 0.0,
                    "raw_cosine_similarity", res.getRawCosineSimilarity() != null ? res.getRawCosineSimilarity() : 0.0,
                    "l2_distance", res.getL2Distance() != null ? res.getL2Distance() : 0.0,
                    "confidence", res.getConfidence() != null ? res.getConfidence() : "LOW",
                    "model_used", getProviderName()
            );
        }
        return Map.of("status", "FAILED", "is_match", false, "similarity_score", 0.0);
    }

    @Override
    public Map<String, Object> compareTexts(String text1, String text2) {
        AiTextMatchResponse res = compareTextDescriptions(text1, text2, 0.40);
        if (res != null) {
            return Map.of(
                    "status", res.getStatus() != null ? res.getStatus() : "SUCCESS",
                    "is_match", Boolean.TRUE.equals(res.getIsMatch()),
                    "similarity_score", res.getSimilarityScore() != null ? res.getSimilarityScore() : 0.0,
                    "semantic_similarity", res.getSemanticSimilarity() != null ? res.getSemanticSimilarity() : 0.0,
                    "keyword_similarity", res.getKeywordSimilarity() != null ? res.getKeywordSimilarity() : 0.0,
                    "matched_keywords", res.getMatchedKeywords() != null ? res.getMatchedKeywords() : List.of(),
                    "confidence", res.getConfidence() != null ? res.getConfidence() : "LOW",
                    "model_used", getProviderName()
            );
        }
        return Map.of("status", "FAILED", "is_match", false, "similarity_score", 0.0);
    }

    private static final Pattern PUNCTUATION = Pattern.compile("[^a-zA-Z0-9\\s]");
    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "the", "in", "on", "at", "with", "wearing", "and", "is", "was", "of", "to", "for", "by", "has", "had", "he", "she", "color", "coloured", "clothes", "dress"
    );

    private static final Map<String, Set<String>> SYNONYMS = Map.of(
            "spectacles", Set.of("spectacles", "glasses", "specs", "eyewear"),
            "shirt", Set.of("shirt", "tshirt", "t-shirt", "top", "tee", "kurta"),
            "pants", Set.of("pants", "trousers", "jeans", "bottom", "trackpants"),
            "saree", Set.of("saree", "sari"),
            "sweater", Set.of("sweater", "pullover", "cardigan", "sweatshirt"),
            "jacket", Set.of("jacket", "coat", "blazer", "windcheater"),
            "kid", Set.of("kid", "child", "minor", "boy", "girl")
    );

    @Value("${ai.service.url:http://${AI_SERVICE_HOST:127.0.0.1}:${AI_SERVICE_PORT:8000}}")
    private String aiServiceUrl;

    @org.springframework.beans.factory.annotation.Autowired
    public SmartAiMatchingProvider(MissingPersonRepository missingPersonRepository,
                                   FoundPersonRepository foundPersonRepository,
                                   SightingRepository sightingRepository,
                                   UploadedFileRepository uploadedFileRepository) {
        this.missingPersonRepository = missingPersonRepository;
        this.foundPersonRepository = foundPersonRepository;
        this.sightingRepository = sightingRepository;
        this.uploadedFileRepository = uploadedFileRepository;
        org.springframework.http.client.SimpleClientHttpRequestFactory requestFactory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(1000);
        requestFactory.setReadTimeout(3000);
        this.restTemplate = new RestTemplate(requestFactory);
        this.objectMapper = new ObjectMapper();
    }

    private static class CandidateSource {
        String targetCaseNumber;
        String targetReportType;
        String personName;
        String photoUrl;
        String currentLocation;
        String gender;
        Integer age;
        String description;
    }

    @Override
    public MatchResult matchByImage(String missingCaseNumber, String imageUrl) {
        Optional<MissingPerson> mpOpt = missingPersonRepository.findByCaseNumber(missingCaseNumber);
        MissingPerson mp = mpOpt.orElse(null);

        String queryImg = (imageUrl != null && !imageUrl.isBlank()) ? imageUrl : (mp != null ? mp.getPhotoUrl() : null);
        List<Double> queryEmbedding = (queryImg != null && !queryImg.isBlank()) ? fetchFaceEmbedding(queryImg) : null;
        List<Double> queryReidEmbedding = (queryImg != null && !queryImg.isBlank()) ? fetchReidEmbedding(queryImg) : null;

        List<CandidateSource> sources = new ArrayList<>();

        // 1. FoundPerson Records (GENERAL, HOSPITAL, NGO, SHELTER)
        if (foundPersonRepository != null) {
            List<FoundPerson> foundPersons = foundPersonRepository.findAll();
            for (FoundPerson fp : foundPersons) {
                String rType = "FOUND_PERSON";
                if ("HOSPITAL".equalsIgnoreCase(fp.getCategory())) {
                    rType = "HOSPITAL_PATIENT";
                } else if ("NGO".equalsIgnoreCase(fp.getCategory()) || "SHELTER".equalsIgnoreCase(fp.getCategory())) {
                    rType = "SHELTER_RESIDENT";
                }
                CandidateSource cs = new CandidateSource();
                cs.targetCaseNumber = fp.getCaseNumber();
                cs.targetReportType = rType;
                cs.personName = (fp.getApproximateName() != null && !fp.getApproximateName().isBlank())
                        ? fp.getApproximateName() : rType.replace('_', ' ') + " #" + fp.getCaseNumber();
                cs.photoUrl = fp.getPhotoUrl();
                cs.currentLocation = fp.getCurrentLocation() != null ? fp.getCurrentLocation() : fp.getFoundLocation();
                cs.gender = fp.getGender();
                cs.age = fp.getApproximateAge();
                cs.description = fp.getDescription();
                sources.add(cs);
            }
        }

        // 2. Citizen Sightings
        if (sightingRepository != null) {
            List<Sighting> sightings = sightingRepository.findAll();
            for (Sighting s : sightings) {
                CandidateSource cs = new CandidateSource();
                cs.targetCaseNumber = "SIGHTING-" + s.getId();
                cs.targetReportType = "CITIZEN_SIGHTING";
                cs.personName = "Sighting reported by " + (s.getReportedBy() != null ? s.getReportedBy() : "Citizen");
                cs.photoUrl = s.getPhotoUrl();
                cs.currentLocation = s.getLocation();
                cs.description = s.getDescription();
                sources.add(cs);
            }
        }

        // 3. Other Missing Persons (Cross-case matching)
        if (missingPersonRepository != null) {
            List<MissingPerson> missingList = missingPersonRepository.findAll();
            for (MissingPerson otherMp : missingList) {
                if (otherMp.getCaseNumber() != null && otherMp.getCaseNumber().equalsIgnoreCase(missingCaseNumber)) {
                    continue; // Skip self
                }
                CandidateSource cs = new CandidateSource();
                cs.targetCaseNumber = otherMp.getCaseNumber();
                cs.targetReportType = "OTHER_MISSING_PERSON";
                cs.personName = (otherMp.getName() != null && !otherMp.getName().isBlank())
                        ? otherMp.getName() : "Missing #" + otherMp.getCaseNumber();
                cs.photoUrl = otherMp.getPhotoUrl();
                cs.currentLocation = otherMp.getLastSeenLocation();
                cs.gender = otherMp.getGender();
                cs.age = otherMp.getAge();
                cs.description = otherMp.getDescription();
                sources.add(cs);
            }
        }

        // 4. UploadedFiles (CCTV evidence / photo uploads)
        if (uploadedFileRepository != null) {
            List<UploadedFile> files = uploadedFileRepository.findAll();
            for (UploadedFile file : files) {
                if (file.getFileUrl() != null && !file.getFileUrl().isBlank()) {
                    CandidateSource cs = new CandidateSource();
                    cs.targetCaseNumber = "FILE-" + file.getId();
                    cs.targetReportType = "CCTV_EVIDENCE";
                    cs.personName = (file.getTitle() != null && !file.getTitle().isBlank())
                            ? file.getTitle() : "CCTV Evidence #" + file.getId();
                    cs.photoUrl = file.getFileUrl();
                    cs.currentLocation = file.getLocation();
                    cs.description = file.getDescription();
                    sources.add(cs);
                }
            }
        }

        List<MatchResult.Candidate> candidates = new ArrayList<>();

        for (CandidateSource cs : sources) {
            boolean hasCandidatePhoto = (cs.photoUrl != null && !cs.photoUrl.trim().isEmpty());
            boolean hasFaceComparison = false;
            Double calibratedFaceScore = null;
            List<String> matchReasons = new ArrayList<>();

            if (queryImg != null && !queryImg.isBlank() && hasCandidatePhoto) {
                if (queryImg.trim().equalsIgnoreCase(cs.photoUrl.trim())) {
                    matchReasons.add("Duplicate Evidence Warning: Both records reference identical image file");
                    calibratedFaceScore = 0.95;
                    hasFaceComparison = true;
                } else if (queryEmbedding != null && !queryEmbedding.isEmpty()) {
                    List<Double> candEmbedding = fetchFaceEmbedding(cs.photoUrl);
                    if (candEmbedding != null && !candEmbedding.isEmpty()) {
                        double rawFaceCosine = computeCosineSimilarity(queryEmbedding, candEmbedding);
                        calibratedFaceScore = calibrateSFaceSimilarity(rawFaceCosine);
                        hasFaceComparison = true;

                        if (queryReidEmbedding != null && !queryReidEmbedding.isEmpty()) {
                            List<Double> candReid = fetchReidEmbedding(cs.photoUrl);
                            if (candReid != null && !candReid.isEmpty()) {
                                double reidSim = computeCosineSimilarity(queryReidEmbedding, candReid);
                                calibratedFaceScore = (0.70 * calibratedFaceScore) + (0.30 * reidSim);
                            }
                        }
                    }
                }

                if (!hasFaceComparison) {
                    AiFaceMatchResponse directMatch = compareFaceImages(queryImg, cs.photoUrl, 0.40);
                    if (directMatch != null && directMatch.getSimilarityScore() != null) {
                        calibratedFaceScore = Math.max(0.02, Math.min(0.99, directMatch.getSimilarityScore() / 100.0));
                        hasFaceComparison = true;
                    }
                }
            }

            Double faceFactor = (hasFaceComparison && calibratedFaceScore != null) ? calibratedFaceScore : null;
            Double textFactor = null;
            Double attributeFactor = null;
            Double locationFactor = null;
            Double timelineFactor = null;

            if (hasFaceComparison && calibratedFaceScore != null && calibratedFaceScore >= 0.40) {
                matchReasons.add("Facial Biometric Alignment (" + Math.round(calibratedFaceScore * 100) + "%)");
            }

            // Demographics & Physical Attributes
            if (mp != null) {
                boolean hasDemographics = false;
                double demoScore = 0.50;

                if (mp.getGender() != null && cs.gender != null && !mp.getGender().isBlank() && !cs.gender.isBlank()) {
                    hasDemographics = true;
                    if (mp.getGender().equalsIgnoreCase(cs.gender)) {
                        demoScore += 0.25;
                    } else {
                        demoScore -= 0.50;
                    }
                }

                if (mp.getAge() != null && cs.age != null) {
                    hasDemographics = true;
                    int diff = Math.abs(mp.getAge() - cs.age);
                    if (diff == 0) {
                        demoScore += 0.25;
                        matchReasons.add("Exact age match (" + cs.age + "y)");
                    } else if (diff <= 2) {
                        demoScore += 0.15;
                        matchReasons.add("Close age proximity (±" + diff + "y)");
                    } else if (diff <= 5) {
                        demoScore += 0.05;
                    } else if (diff > 10) {
                        demoScore -= 0.25;
                    }
                }

                if (hasDemographics) {
                    attributeFactor = Math.max(0.02, Math.min(0.99, demoScore));
                }

                // Location Analysis
                if (mp.getLastSeenLocation() != null && cs.currentLocation != null &&
                        !mp.getLastSeenLocation().isBlank() && !cs.currentLocation.isBlank()) {
                    double locSim = computeLocationSimilarity(mp.getLastSeenLocation(), cs.currentLocation);
                    locationFactor = locSim;
                    if (locSim > 0.3) {
                        matchReasons.add("Jurisdiction proximity (" + cs.currentLocation + ")");
                    }
                }

                // NLP Text & Description / Name Analysis
                if (mp.getDescription() != null && cs.description != null &&
                        !mp.getDescription().isBlank() && !cs.description.isBlank() &&
                        !mp.getDescription().equalsIgnoreCase("Not recorded") && !cs.description.equalsIgnoreCase("Not recorded")) {
                    NlpMatchDetail nlp = computeNlpSemanticScore(mp.getDescription(), cs.description);
                    if (nlp.score > 0.15) {
                        textFactor = Math.max(0.05, Math.min(0.99, nlp.score));
                        matchReasons.addAll(nlp.reasons);
                    }
                } else if (mp.getName() != null && cs.personName != null &&
                        !mp.getName().isBlank() && !cs.personName.isBlank()) {
                    String n1 = mp.getName().toLowerCase().trim();
                    String n2 = cs.personName.toLowerCase().trim();
                    if (n1.contains(n2) || n2.contains(n1)) {
                        textFactor = 0.80;
                        matchReasons.add("Name similarity (" + cs.personName + ")");
                    }
                }

                // Timeline Relevance
                if (mp.getLastSeenDate() != null) {
                    timelineFactor = 0.50; // Active temporal relevance baseline
                }
            }

            // Normalization across active/available factors only
            double wFace = 0.40;
            double wAttr = 0.25;
            double wText = 0.15;
            double wLoc = 0.10;
            double wTime = 0.10;

            double weightSum = 0.0;
            double weightedScore = 0.0;

            if (faceFactor != null) {
                weightSum += wFace;
                weightedScore += (wFace * faceFactor);
            }
            if (attributeFactor != null) {
                weightSum += wAttr;
                weightedScore += (wAttr * attributeFactor);
            }
            if (textFactor != null) {
                weightSum += wText;
                weightedScore += (wText * textFactor);
            }
            if (locationFactor != null) {
                weightSum += wLoc;
                weightedScore += (wLoc * locationFactor);
            }
            if (timelineFactor != null) {
                weightSum += wTime;
                weightedScore += (wTime * timelineFactor);
            }

            double totalScore = (weightSum > 0.0) ? (weightedScore / weightSum) : 0.50;
            totalScore = Math.max(0.02, Math.min(0.99, totalScore));
            double finalScore100 = Math.round(totalScore * 100.0 * 10.0) / 10.0;

            String confidence = "LOW";
            if (finalScore100 >= 80.0) confidence = "HIGH";
            else if (finalScore100 >= 60.0) confidence = "MEDIUM";

            // Priority based on real victim profile
            String casePriority = "MEDIUM";
            if (mp != null) {
                if ("CRITICAL".equalsIgnoreCase(mp.getRiskLevel()) || "HIGH".equalsIgnoreCase(mp.getRiskLevel()) ||
                        (mp.getAge() != null && (mp.getAge() <= 12 || mp.getAge() >= 65))) {
                    casePriority = "HIGH";
                } else if ("LOW".equalsIgnoreCase(mp.getRiskLevel())) {
                    casePriority = "LOW";
                }
            }

            if (totalScore >= 0.35 || (hasFaceComparison && calibratedFaceScore != null && calibratedFaceScore >= 0.35)) {
                Double faceScoreVal = (hasFaceComparison && calibratedFaceScore != null)
                        ? Math.round(calibratedFaceScore * 100.0) / 100.0
                        : null;

                String defaultTypeLabel = cs.targetReportType.replace('_', ' ');
                String reason = matchReasons.isEmpty()
                        ? "Multimodal AI candidate match (" + defaultTypeLabel + ")"
                        : String.join(" • ", matchReasons);

                candidates.add(MatchResult.Candidate.builder()
                        .foundCaseNumber(cs.targetCaseNumber)
                        .targetCaseNumber(cs.targetCaseNumber)
                        .targetReportType(cs.targetReportType)
                        .personName(cs.personName)
                        .similarityScore(hasCandidatePhoto ? faceScoreVal : null)
                        .finalScore(finalScore100)
                        .confidenceLevel(confidence)
                        .priority(casePriority)
                        .matchPairType("Missing ↔ " + cs.targetReportType)
                        .sourcePhotoUrl(queryImg != null ? queryImg : (mp != null ? mp.getPhotoUrl() : null))
                        .photoUrl(cs.photoUrl)
                        .currentLocation(cs.currentLocation)
                        .faceScore(faceScoreVal)
                        .textScore(textFactor != null ? Math.min(0.98, Math.round(textFactor * 100.0) / 100.0) : null)
                        .locationScore(locationFactor != null ? Math.min(0.98, Math.round(locationFactor * 100.0) / 100.0) : null)
                        .attributeScore(attributeFactor != null ? Math.min(0.98, Math.round(attributeFactor * 100.0) / 100.0) : null)
                        .clothingScore(attributeFactor != null ? Math.min(0.98, Math.round(attributeFactor * 100.0) / 100.0) : null)
                        .timelineScore(timelineFactor != null ? Math.min(0.98, Math.round(timelineFactor * 100.0) / 100.0) : null)
                        .reason(reason)
                        .disclaimer("AI-assisted / Requires Human Verification — not definitive identification")
                        .build());
            }
        }

        candidates.sort(Comparator.comparingDouble(MatchResult.Candidate::getFinalScore).reversed());

        return MatchResult.builder()
                .missingCaseNumber(missingCaseNumber)
                .sourceCaseNumber(missingCaseNumber)
                .sourceReportType("MISSING")
                .matchType("IMAGE")
                .matchSource("AI_BIOMETRIC_VISION_ENGINE")
                .candidates(candidates)
                .build();
    }

    @Override
    public MatchResult matchByText(String missingCaseNumber, String description) {
        Optional<MissingPerson> mpOpt = missingPersonRepository.findByCaseNumber(missingCaseNumber);
        MissingPerson mp = mpOpt.orElse(null);
        List<FoundPerson> foundPersons = foundPersonRepository.findAll();
        List<MatchResult.Candidate> candidates = new ArrayList<>();

        for (FoundPerson fp : foundPersons) {
            Double textFactor = null;
            Double locFactor = null;
            Double attributeFactor = null;
            Double timelineFactor = null;
            List<String> matchReasons = new ArrayList<>();

            if (description != null && fp.getDescription() != null && !description.isBlank() && !fp.getDescription().isBlank() &&
                    !description.equalsIgnoreCase("Not recorded") && !fp.getDescription().equalsIgnoreCase("Not recorded")) {
                AiTextMatchResponse aiRes = compareTextDescriptions(description, fp.getDescription(), 0.40);
                if (aiRes != null && aiRes.getSimilarityScore() != null) {
                    textFactor = Math.max(0.02, Math.min(0.99, aiRes.getSimilarityScore() / 100.0));
                    if (aiRes.getMatchedKeywords() != null && !aiRes.getMatchedKeywords().isEmpty()) {
                        matchReasons.add("Attire/description keyword match (" + String.join(", ", aiRes.getMatchedKeywords()) + ")");
                    } else if (Boolean.TRUE.equals(aiRes.getIsMatch())) {
                        matchReasons.add("Deep transformer NLP description match (" + Math.round(aiRes.getSimilarityScore()) + "%)");
                    }
                } else {
                    NlpMatchDetail nlp = computeNlpSemanticScore(description, fp.getDescription());
                    if (nlp.score > 0.15) {
                        textFactor = Math.max(0.05, Math.min(0.99, nlp.score));
                        matchReasons.addAll(nlp.reasons);
                    }
                }
            }

            if (mp != null) {
                boolean hasDemographics = false;
                double demoScore = 0.50;

                if (mp.getGender() != null && fp.getGender() != null && !mp.getGender().isBlank() && !fp.getGender().isBlank()) {
                    hasDemographics = true;
                    if (mp.getGender().equalsIgnoreCase(fp.getGender())) {
                        demoScore += 0.25;
                    } else {
                        demoScore -= 0.50;
                    }
                }
                if (mp.getAge() != null && fp.getApproximateAge() != null) {
                    hasDemographics = true;
                    int diff = Math.abs(mp.getAge() - fp.getApproximateAge());
                    if (diff == 0) {
                        demoScore += 0.25;
                        matchReasons.add("Exact age match (" + fp.getApproximateAge() + "y)");
                    } else if (diff <= 2) {
                        demoScore += 0.15;
                        matchReasons.add("Close age proximity (±" + diff + "y)");
                    } else if (diff <= 5) {
                        demoScore += 0.05;
                    } else if (diff > 10) {
                        demoScore -= 0.25;
                    }
                }
                if (hasDemographics) {
                    attributeFactor = Math.max(0.02, Math.min(0.99, demoScore));
                }

                if (mp.getLastSeenLocation() != null && fp.getFoundLocation() != null &&
                        !mp.getLastSeenLocation().isBlank() && !fp.getFoundLocation().isBlank()) {
                    double locSim = computeLocationSimilarity(mp.getLastSeenLocation(), fp.getFoundLocation());
                    locFactor = locSim;
                    if (locSim > 0.3) {
                        matchReasons.add("Jurisdiction proximity (" + fp.getFoundLocation() + ")");
                    }
                }

                if (mp.getLastSeenDate() != null) {
                    timelineFactor = 0.50;
                }
            }

            double wText = 0.35;
            double wAttr = 0.35;
            double wLoc = 0.20;
            double wTime = 0.10;

            double weightSum = 0.0;
            double weightedScore = 0.0;

            if (textFactor != null) {
                weightSum += wText;
                weightedScore += (wText * textFactor);
            }
            if (attributeFactor != null) {
                weightSum += wAttr;
                weightedScore += (wAttr * attributeFactor);
            }
            if (locFactor != null) {
                weightSum += wLoc;
                weightedScore += (wLoc * locFactor);
            }
            if (timelineFactor != null) {
                weightSum += wTime;
                weightedScore += (wTime * timelineFactor);
            }

            double overallScore = (weightSum > 0.0) ? (weightedScore / weightSum) : 0.50;
            overallScore = Math.min(0.98, Math.max(0.02, overallScore));
            double finalScore100 = Math.round(overallScore * 100.0 * 10.0) / 10.0;

            String confidence = "LOW";
            if (finalScore100 >= 80.0) confidence = "HIGH";
            else if (finalScore100 >= 60.0) confidence = "MEDIUM";

            String casePriority = "MEDIUM";
            if (mp != null) {
                if ("CRITICAL".equalsIgnoreCase(mp.getRiskLevel()) || "HIGH".equalsIgnoreCase(mp.getRiskLevel()) ||
                        (mp.getAge() != null && (mp.getAge() <= 12 || mp.getAge() >= 65))) {
                    casePriority = "HIGH";
                } else if ("LOW".equalsIgnoreCase(mp.getRiskLevel())) {
                    casePriority = "LOW";
                }
            }

            if (overallScore >= 0.35) {
                String reason = matchReasons.isEmpty()
                        ? "NLP attribute match with " + fp.getCurrentLocation()
                        : String.join(" • ", matchReasons);

                candidates.add(MatchResult.Candidate.builder()
                        .foundCaseNumber(fp.getCaseNumber())
                        .targetCaseNumber(fp.getCaseNumber())
                        .targetReportType("FOUND")
                        .personName(fp.getApproximateName() != null ? fp.getApproximateName() : "Intake #" + fp.getCaseNumber())
                        .similarityScore(Math.round((finalScore100 / 100.0) * 100.0) / 100.0)
                        .finalScore(finalScore100)
                        .confidenceLevel(confidence)
                        .priority(casePriority)
                        .matchPairType("Missing ↔ Found")
                        .sourcePhotoUrl(mp != null ? mp.getPhotoUrl() : null)
                        .photoUrl(fp.getPhotoUrl())
                        .currentLocation(fp.getCurrentLocation())
                        .faceScore(null)
                        .textScore(textFactor != null ? Math.min(0.98, Math.round(textFactor * 100.0) / 100.0) : null)
                        .locationScore(locFactor != null ? Math.min(0.98, Math.round(locFactor * 100.0) / 100.0) : null)
                        .attributeScore(attributeFactor != null ? Math.min(0.98, Math.round(attributeFactor * 100.0) / 100.0) : null)
                        .clothingScore(attributeFactor != null ? Math.min(0.98, Math.round(attributeFactor * 100.0) / 100.0) : null)
                        .timelineScore(timelineFactor != null ? Math.min(0.98, Math.round(timelineFactor * 100.0) / 100.0) : null)
                        .reason(reason)
                        .disclaimer("AI-assisted / Requires Human Verification — not definitive identification")
                        .build());
            }
        }

        candidates.sort(Comparator.comparingDouble(MatchResult.Candidate::getFinalScore).reversed());

        return MatchResult.builder()
                .missingCaseNumber(missingCaseNumber)
                .sourceCaseNumber(missingCaseNumber)
                .sourceReportType("MISSING")
                .matchType("TEXT")
                .matchSource("AI_NLP_ATTRIBUTE_ENGINE")
                .candidates(candidates)
                .build();
    }

    private NlpMatchDetail computeNlpSemanticScore(String text1, String text2) {
        Set<String> tokens1 = tokenizeAndClean(text1);
        Set<String> tokens2 = tokenizeAndClean(text2);

        if (tokens1.isEmpty() || tokens2.isEmpty()) {
            return new NlpMatchDetail(0.0, Collections.emptyList());
        }

        Set<String> expanded1 = expandSynonyms(tokens1);
        Set<String> expanded2 = expandSynonyms(tokens2);

        Set<String> intersection = new HashSet<>(expanded1);
        intersection.retainAll(expanded2);

        Set<String> union = new HashSet<>(expanded1);
        union.addAll(expanded2);
        double jaccard = union.isEmpty() ? 0.0 : (double) intersection.size() / union.size();

        List<String> matchedAttributes = new ArrayList<>();
        List<String> colors = List.of("blue", "red", "yellow", "green", "black", "white", "navy", "dark", "pink", "brown", "grey", "gray");
        List<String> items = List.of("shirt", "sweater", "kurta", "jeans", "hoodie", "jacket", "saree", "spectacles", "glasses", "shoes", "scar", "tattoo");

        for (String c : colors) {
            for (String item : items) {
                boolean t1HasBoth = (tokens1.contains(c) || expanded1.contains(c)) && (tokens1.contains(item) || expanded1.contains(item));
                boolean t2HasBoth = (tokens2.contains(c) || expanded2.contains(c)) && (tokens2.contains(item) || expanded2.contains(item));
                if (t1HasBoth && t2HasBoth) {
                    matchedAttributes.add(c + " " + item);
                }
            }
        }

        double score = jaccard * 0.50;
        if (!matchedAttributes.isEmpty()) {
            score += Math.min(0.48, matchedAttributes.size() * 0.24);
        } else if (!intersection.isEmpty()) {
            score += Math.min(0.35, intersection.size() * 0.12);
        }

        score = Math.min(0.98, Math.max(0.0, score));

        List<String> reasons = new ArrayList<>();
        if (!matchedAttributes.isEmpty()) {
            reasons.add("Matching attire: " + String.join(", ", matchedAttributes));
        } else if (!intersection.isEmpty()) {
            reasons.add("Keyword overlap (" + String.join(", ", intersection) + ")");
        }

        return new NlpMatchDetail(score, reasons);
    }

    private Set<String> tokenizeAndClean(String text) {
        if (text == null) return Collections.emptySet();
        String cleaned = PUNCTUATION.matcher(text.toLowerCase()).replaceAll(" ");
        return Arrays.stream(cleaned.split("\\s+"))
                .map(String::trim)
                .filter(w -> !w.isBlank() && !STOP_WORDS.contains(w) && w.length() > 1)
                .collect(Collectors.toSet());
    }

    private Set<String> expandSynonyms(Set<String> tokens) {
        Set<String> expanded = new HashSet<>(tokens);
        for (String t : tokens) {
            for (Map.Entry<String, Set<String>> entry : SYNONYMS.entrySet()) {
                if (entry.getValue().contains(t)) {
                    expanded.addAll(entry.getValue());
                }
            }
        }
        return expanded;
    }

    private double computeLocationSimilarity(String loc1, String loc2) {
        if (loc1 == null || loc2 == null) return 0.0;
        String l1 = loc1.toLowerCase().trim();
        String l2 = loc2.toLowerCase().trim();
        if (l1.contains(l2) || l2.contains(l1)) return 0.90;
        for (String city : List.of("delhi", "mumbai", "chennai", "kolkata", "bengaluru", "hyderabad", "jaipur", "dindigul", "pune", "ahmedabad", "lucknow")) {
            if (l1.contains(city) && l2.contains(city)) return 0.85;
        }
        return 0.0;
    }

    private double calibrateSFaceSimilarity(double rawCosine) {
        if (rawCosine <= 0.15) {
            return Math.max(0.02, rawCosine * 0.60);
        } else if (rawCosine <= 0.35) {
            return 0.10 + ((rawCosine - 0.15) / 0.20) * 0.25;
        } else if (rawCosine <= 0.50) {
            return 0.40 + ((rawCosine - 0.35) / 0.15) * 0.30;
        } else if (rawCosine <= 0.70) {
            return 0.72 + ((rawCosine - 0.50) / 0.20) * 0.20;
        } else {
            return 0.93 + Math.min(0.06, ((rawCosine - 0.70) / 0.30) * 0.06);
        }
    }

    public List<Double> fetchFaceEmbedding(String imagePathOrUrlOrBase64) {
        if (imagePathOrUrlOrBase64 == null || imagePathOrUrlOrBase64.isBlank()) return null;
        try {
            String endpoint = aiServiceUrl + "/embed/face";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, String> requestBody = new HashMap<>();
            if (imagePathOrUrlOrBase64.startsWith("data:image") || imagePathOrUrlOrBase64.length() > 500) {
                requestBody.put("image_base64", imagePathOrUrlOrBase64);
            } else {
                requestBody.put("image_path", imagePathOrUrlOrBase64);
            }
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);
            AiFaceResponse response = restTemplate.postForObject(endpoint, request, AiFaceResponse.class);
            if (response != null && response.getEmbedding() != null) {
                return response.getEmbedding();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch face embedding from AI service: {}", e.getMessage());
        }
        return null;
    }

    public List<Double> fetchReidEmbedding(String imagePathOrUrlOrBase64) {
        if (imagePathOrUrlOrBase64 == null || imagePathOrUrlOrBase64.isBlank()) return null;
        try {
            String endpoint = aiServiceUrl + "/embed/reid";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, String> requestBody = new HashMap<>();
            if (imagePathOrUrlOrBase64.startsWith("data:image") || imagePathOrUrlOrBase64.length() > 500) {
                requestBody.put("image_base64", imagePathOrUrlOrBase64);
            } else {
                requestBody.put("image_path", imagePathOrUrlOrBase64);
            }
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);
            AiFaceResponse response = restTemplate.postForObject(endpoint, request, AiFaceResponse.class);
            if (response != null && response.getEmbedding() != null) {
                return response.getEmbedding();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch Re-ID embedding from AI service: {}", e.getMessage());
        }
        return null;
    }

    public double computeCosineSimilarity(List<Double> v1, List<Double> v2) {
        if (v1 == null || v2 == null || v1.isEmpty() || v2.isEmpty() || v1.size() != v2.size()) return 0.0;
        double dot = 0.0, normA = 0.0, normB = 0.0;
        for (int i = 0; i < v1.size(); i++) {
            double a = v1.get(i), b = v2.get(i);
            dot += a * b;
            normA += a * a;
            normB += b * b;
        }
        if (normA == 0.0 || normB == 0.0) return 0.0;
        return Math.max(0.0, Math.min(1.0, dot / (Math.sqrt(normA) * Math.sqrt(normB))));
    }

    private static class NlpMatchDetail {
        final double score;
        final List<String> reasons;
        NlpMatchDetail(double score, List<String> reasons) {
            this.score = score;
            this.reasons = reasons;
        }
    }

    public AiFaceMatchResponse compareFaceImages(String image1, String image2, Double threshold) {
        if (image1 == null || image2 == null || image1.isBlank() || image2.isBlank()) return null;
        try {
            String endpoint = aiServiceUrl + "/match/face";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> requestBody = new HashMap<>();
            if (image1.startsWith("data:image") || image1.length() > 500) {
                requestBody.put("image1_base64", image1);
            } else {
                requestBody.put("image1_path", image1);
            }
            if (image2.startsWith("data:image") || image2.length() > 500) {
                requestBody.put("image2_base64", image2);
            } else {
                requestBody.put("image2_path", image2);
            }
            requestBody.put("threshold", threshold != null ? threshold : 0.40);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            return restTemplate.postForObject(endpoint, request, AiFaceMatchResponse.class);
        } catch (Exception e) {
            log.warn("Failed to perform direct face similarity comparison: {}", e.getMessage());
        }
        return null;
    }

    public AiTextMatchResponse compareTextDescriptions(String text1, String text2, Double threshold) {
        if (text1 == null || text2 == null || text1.isBlank() || text2.isBlank()) return null;
        try {
            String endpoint = aiServiceUrl + "/match/text";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("text1", text1);
            requestBody.put("text2", text2);
            requestBody.put("threshold", threshold != null ? threshold : 0.40);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            return restTemplate.postForObject(endpoint, request, AiTextMatchResponse.class);
        } catch (Exception e) {
            log.warn("Failed to perform direct text similarity comparison: {}", e.getMessage());
        }
        return null;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AiFaceResponse {
        private String status;
        private List<Double> embedding;
        private Integer dimension;
        private List<Integer> bbox;
        private String model;
        private Double executionTimeMs;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AiFaceMatchResponse {
        private String status;
        private Boolean isMatch;
        private Double similarityScore;
        private Double rawCosineSimilarity;
        private Double l2Distance;
        private String confidence;
        private Double thresholdUsed;
        private Map<String, Object> face1;
        private Map<String, Object> face2;
        private String modelUsed;
        private Double executionTimeMs;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AiTextMatchResponse {
        private String status;
        private Boolean isMatch;
        private Double similarityScore;
        private Double semanticSimilarity;
        private Double keywordSimilarity;
        private List<String> matchedKeywords;
        private String confidence;
        private Double thresholdUsed;
        private String modelUsed;
        private Double executionTimeMs;
    }
}


