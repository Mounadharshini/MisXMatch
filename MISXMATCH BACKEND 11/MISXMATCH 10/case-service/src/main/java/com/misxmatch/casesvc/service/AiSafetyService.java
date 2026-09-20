package com.misxmatch.casesvc.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.misxmatch.casesvc.entity.*;
import com.misxmatch.casesvc.repository.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
public class AiSafetyService {

    private final AiQualityAssessmentRepository qualityRepo;
    private final AiCandidateLeadRepository candidateLeadRepo;
    private final AiTemporalTrackRepository temporalTrackRepo;
    private final AiAuditEventRepository auditRepo;
    private final AiFeedbackRepository feedbackRepo;
    private final AiRetentionPolicyRepository retentionRepo;
    private final MissingPersonRepository missingPersonRepo;
    private final FoundPersonRepository foundPersonRepo;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${ai.service.url:http://127.0.0.1:8000}")
    private String aiServiceUrl;

    @Value("${ai.service.api-key:misxmatch-internal-ai-service-secret-key-2026}")
    private String aiServiceApiKey;

    public AiSafetyService(AiQualityAssessmentRepository qualityRepo,
                           AiCandidateLeadRepository candidateLeadRepo,
                           AiTemporalTrackRepository temporalTrackRepo,
                           AiAuditEventRepository auditRepo,
                           AiFeedbackRepository feedbackRepo,
                           AiRetentionPolicyRepository retentionRepo,
                           MissingPersonRepository missingPersonRepo,
                           FoundPersonRepository foundPersonRepo) {
        this.qualityRepo = qualityRepo;
        this.candidateLeadRepo = candidateLeadRepo;
        this.temporalTrackRepo = temporalTrackRepo;
        this.auditRepo = auditRepo;
        this.feedbackRepo = feedbackRepo;
        this.retentionRepo = retentionRepo;
        this.missingPersonRepo = missingPersonRepo;
        this.foundPersonRepo = foundPersonRepo;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    // --- Case Authorization Check ---
    public boolean isAuthorizedForCase(String caseId, String userId, String role) {
        if (caseId == null || caseId.isBlank()) return true;
        if ("ADMIN".equalsIgnoreCase(role) || "SUPER_ADMIN".equalsIgnoreCase(role) || "POLICE".equalsIgnoreCase(role)) {
            return true;
        }
        if ("HOSPITAL".equalsIgnoreCase(role) || "NGO".equalsIgnoreCase(role)) {
            return true;
        }
        // Public user check: owner of report
        Optional<MissingPerson> mp = missingPersonRepo.findByCaseNumber(caseId);
        if (mp.isPresent() && userId.equalsIgnoreCase(mp.get().getReportedBy())) {
            return true;
        }
        Optional<FoundPerson> fp = foundPersonRepo.findByCaseNumber(caseId);
        if (fp.isPresent() && userId.equalsIgnoreCase(fp.get().getReportedBy())) {
            return true;
        }
        return false;
    }

    // --- 1. Quality Assessment ---
    public Map<String, Object> assessQuality(String caseId, String evidenceId, String imageBase64, List<Map<String, Object>> detectedFaces, String userId, String userRole) {
        if (!isAuthorizedForCase(caseId, userId, userRole)) {
            logAuditEvent(userId, userRole, "QUALITY_ASSESSMENT_DENIED", caseId, "Unauthorized case access attempt");
            throw new SecurityException("Unauthorized access to case " + caseId);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-API-Key", aiServiceApiKey);

        Map<String, Object> reqBody = new HashMap<>();
        reqBody.put("caseId", caseId);
        reqBody.put("evidenceId", evidenceId);
        reqBody.put("imageBase64", imageBase64);
        reqBody.put("detectedFaces", detectedFaces != null ? detectedFaces : Collections.emptyList());

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(reqBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    aiServiceUrl + "/ai/safety/quality-assessment",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            Map<String, Object> resMap = response.getBody();
            if (resMap != null) {
                // Save DB entity
                AiQualityAssessment qa = qualityRepo.findByEvidenceId(evidenceId)
                        .orElseGet(() -> AiQualityAssessment.builder().evidenceId(evidenceId).caseId(caseId).build());

                qa.setCaseId(caseId);
                qa.setUsableForMatching((Boolean) resMap.getOrDefault("usableForMatching", false));
                qa.setReviewRequired((Boolean) resMap.getOrDefault("reviewRequired", true));
                qa.setReasonsJson(toJsonStr(resMap.get("reasons")));
                qa.setImageQualityScore(asDouble(resMap.get("imageQualityScore")));
                qa.setDetectedFaceCount(asInt(resMap.get("detectedFaceCount")));
                qa.setFaceCoverage(asDouble(resMap.get("faceCoverage")));
                qa.setBlurScore(asDouble(resMap.get("blurScore")));
                qa.setBrightnessScore(asDouble(resMap.get("brightnessScore")));
                qa.setTamperingRiskScore(asDouble(resMap.get("tamperingRiskScore")));
                qa.setModelVersion((String) resMap.getOrDefault("modelVersion", "1.0.0-safety-gate"));
                qa.setLimitationNotice((String) resMap.get("limitationNotice"));

                qualityRepo.save(qa);
                logAuditEvent(userId, userRole, "QUALITY_ASSESSMENT_EXECUTED", caseId, "Quality score: " + qa.getImageQualityScore());
            }
            return resMap;
        } catch (Exception e) {
            log.error("AI Quality Assessment service call failed for case {}: {}", caseId, e.getMessage());
            throw new RuntimeException("AI Quality Assessment service call failed: " + e.getMessage());
        }
    }

    // --- 2. Candidate Lead Explanation ---
    public Map<String, Object> generateCandidateLead(String sourceCaseId, String targetCaseId, Double faceScore, Double reidScore, Double textScore, Double locationScore, Double timelineScore, Map<String, Object> qualityAssessment, String userId, String userRole) {
        if (!isAuthorizedForCase(sourceCaseId, userId, userRole)) {
            logAuditEvent(userId, userRole, "CANDIDATE_LEAD_DENIED", sourceCaseId, "Unauthorized access to source case");
            throw new SecurityException("Unauthorized access to source case " + sourceCaseId);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-API-Key", aiServiceApiKey);

        Map<String, Object> reqBody = new HashMap<>();
        reqBody.put("sourceCaseNumber", sourceCaseId);
        reqBody.put("targetCaseNumber", targetCaseId);
        reqBody.put("faceScore", faceScore);
        reqBody.put("reidScore", reidScore);
        reqBody.put("textScore", textScore);
        reqBody.put("locationScore", locationScore);
        reqBody.put("timelineScore", timelineScore);
        reqBody.put("qualityAssessment", qualityAssessment);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(reqBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    aiServiceUrl + "/ai/safety/candidate-explanation",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            Map<String, Object> resMap = response.getBody();
            if (resMap != null) {
                String leadId = (String) resMap.getOrDefault("leadId", "LEAD-" + sourceCaseId + "-" + targetCaseId);
                
                AiCandidateLead lead = candidateLeadRepo.findByLeadId(leadId)
                        .orElseGet(() -> AiCandidateLead.builder().leadId(leadId).build());

                lead.setSourceCaseNumber(sourceCaseId);
                lead.setTargetCaseNumber(targetCaseId);
                if (lead.getDecisionStatus() == null) {
                    lead.setDecisionStatus("REVIEW_REQUIRED");
                }
                lead.setCalibratedConfidence(asDouble(resMap.get("calibratedConfidence")));
                lead.setFaceScore(faceScore);
                lead.setReidScore(reidScore);
                lead.setTextScore(textScore);
                lead.setLocationScore(locationScore);
                lead.setTimelineScore(timelineScore);
                lead.setExplanation((String) resMap.get("explanation"));
                lead.setQualityWarningsJson(toJsonStr(resMap.get("qualityWarnings")));
                lead.setModelVersionsJson(toJsonStr(resMap.get("modelVersions")));

                candidateLeadRepo.save(lead);
                logAuditEvent(userId, userRole, "CANDIDATE_LEAD_GENERATED", sourceCaseId, "Lead ID: " + leadId + ", Calibrated confidence: " + lead.getCalibratedConfidence() + "%");
            }
            return resMap;
        } catch (Exception e) {
            log.error("AI Candidate Explanation service call failed for {} -> {}: {}", sourceCaseId, targetCaseId, e.getMessage());
            throw new RuntimeException("AI Candidate Explanation service call failed: " + e.getMessage());
        }
    }

    // --- 3. Temporal Track ---
    public Map<String, Object> processTemporalTrack(String caseId, String cameraId, String videoBase64, String startTimeIso, String userId, String userRole) {
        if (!isAuthorizedForCase(caseId, userId, userRole)) {
            logAuditEvent(userId, userRole, "TEMPORAL_TRACK_DENIED", caseId, "Unauthorized access to case");
            throw new SecurityException("Unauthorized access to case " + caseId);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-API-Key", aiServiceApiKey);

        Map<String, Object> reqBody = new HashMap<>();
        reqBody.put("caseId", caseId);
        reqBody.put("cameraId", cameraId);
        reqBody.put("videoBase64", videoBase64);
        reqBody.put("startTimeIso", startTimeIso);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(reqBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    aiServiceUrl + "/ai/safety/temporal-track",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            Map<String, Object> resMap = response.getBody();
            if (resMap != null && resMap.get("tracks") instanceof List) {
                List tracks = (List) resMap.get("tracks");
                for (Object tObj : tracks) {
                    if (tObj instanceof Map) {
                        Map tMap = (Map) tObj;
                        AiTemporalTrack track = AiTemporalTrack.builder()
                                .trackId((String) tMap.get("trackId"))
                                .caseId(caseId)
                                .cameraId(cameraId)
                                .frameCount(asInt(tMap.get("frameCount")))
                                .candidateLeadsJson(toJsonStr(tMap.get("candidateLeads")))
                                .qualityMeasuresJson(toJsonStr(tMap.get("qualityMeasures")))
                                .build();
                        temporalTrackRepo.save(track);
                    }
                }
                logAuditEvent(userId, userRole, "TEMPORAL_TRACK_PROCESSED", caseId, "Camera: " + cameraId + ", Tracks: " + tracks.size());
            }
            return resMap;
        } catch (Exception e) {
            log.error("AI Temporal Track service call failed for case {}: {}", caseId, e.getMessage());
            throw new RuntimeException("AI Temporal Track service call failed: " + e.getMessage());
        }
    }

    // --- 4. Review Candidate Lead ---
    public Map<String, Object> reviewLead(String leadId, String action, String notes, String userId, String userRole) {
        Optional<AiCandidateLead> opt = candidateLeadRepo.findByLeadId(leadId);
        if (opt.isEmpty()) {
            throw new NoSuchElementException("Lead ID " + leadId + " not found.");
        }

        AiCandidateLead lead = opt.get();
        String updatedStatus;
        if ("APPROVED".equalsIgnoreCase(action) || "CONFIRM".equalsIgnoreCase(action)) {
            updatedStatus = "APPROVED";
        } else if ("REJECTED".equalsIgnoreCase(action) || "REJECT".equalsIgnoreCase(action)) {
            updatedStatus = "REJECTED";
        } else if ("NEEDS_MORE_EVIDENCE".equalsIgnoreCase(action)) {
            updatedStatus = "NEEDS_MORE_EVIDENCE";
        } else {
            throw new IllegalArgumentException("Invalid review action: " + action + ". Allowed: APPROVED, REJECTED, NEEDS_MORE_EVIDENCE");
        }

        lead.setDecisionStatus(updatedStatus);
        lead.setReviewedBy(userId);
        lead.setReviewedAt(LocalDateTime.now());
        lead.setReviewNotes(notes);
        candidateLeadRepo.save(lead);

        logAuditEvent(userId, userRole, "LEAD_REVIEWED", lead.getSourceCaseNumber(), "Decision: " + updatedStatus + ", Lead: " + leadId);

        Map<String, Object> result = new HashMap<>();
        result.put("status", "SUCCESS");
        result.put("leadId", leadId);
        result.put("decisionStatus", updatedStatus);
        result.put("reviewedBy", userId);
        result.put("reviewedAt", lead.getReviewedAt().toString());
        result.put("message", "Investigative lead review registered successfully.");
        return result;
    }

    // --- 5. Submit Opt-in Feedback ---
    public Map<String, Object> submitFeedback(String leadId, String caseId, String reviewerAction, Boolean optIn, String notes, String userId) {
        String feedbackId = "FB-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        AiFeedback fb = AiFeedback.builder()
                .feedbackId(feedbackId)
                .leadId(leadId)
                .caseId(caseId)
                .reviewerId(userId)
                .reviewerAction(reviewerAction)
                .optInForCalibration(optIn != null ? optIn : true)
                .feedbackNotes(notes)
                .build();
        feedbackRepo.save(fb);

        return Map.of("status", "SUCCESS", "feedbackId", feedbackId, "message", "Human reviewer feedback recorded for offline calibration fine-tuning.");
    }

    // --- Audit Trail Helper ---
    public List<AiAuditEvent> getAuditTrail(String caseId, String userId, String role) {
        if (!isAuthorizedForCase(caseId, userId, role)) {
            throw new SecurityException("Unauthorized access to audit trail for case " + caseId);
        }
        return auditRepo.findByCaseId(caseId);
    }

    public Optional<AiCandidateLead> getCandidateLead(String sourceCaseNumber, String targetCaseNumber) {
        String leadId = "LEAD-" + sourceCaseNumber + "-" + targetCaseNumber;
        Optional<AiCandidateLead> byId = candidateLeadRepo.findByLeadId(leadId);
        if (byId.isPresent()) return byId;
        List<AiCandidateLead> list = candidateLeadRepo.findBySourceCaseNumberOrTargetCaseNumber(sourceCaseNumber, targetCaseNumber);
        return list.stream().filter(l -> 
            (sourceCaseNumber != null && sourceCaseNumber.equalsIgnoreCase(l.getSourceCaseNumber()) && targetCaseNumber != null && targetCaseNumber.equalsIgnoreCase(l.getTargetCaseNumber())) ||
            (sourceCaseNumber != null && sourceCaseNumber.equalsIgnoreCase(l.getTargetCaseNumber()) && targetCaseNumber != null && targetCaseNumber.equalsIgnoreCase(l.getSourceCaseNumber()))
        ).findFirst();
    }

    public Optional<AiQualityAssessment> getQualityAssessment(String caseId) {
        List<AiQualityAssessment> list = qualityRepo.findByCaseId(caseId);
        if (list.isEmpty()) return Optional.empty();
        return Optional.of(list.get(list.size() - 1));
    }

    public List<AiCandidateLead> getAllCandidateLeads() {
        return candidateLeadRepo.findAll();
    }

    private void logAuditEvent(String principalId, String principalRole, String eventType, String caseId, String details) {
        String safeDecision = details;
        if (safeDecision != null && safeDecision.length() > 490) {
            safeDecision = safeDecision.substring(0, 490);
        }
        AiAuditEvent audit = AiAuditEvent.builder()
                .eventId("AUD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .principalId(principalId)
                .principalRole(principalRole)
                .eventType(eventType)
                .caseId(caseId)
                .modelVersions("1.0.0-safety-module")
                .reviewerDecision(safeDecision)
                .build();
        auditRepo.save(audit);
    }

    private String toJsonStr(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return obj.toString();
        }
    }

    private Double asDouble(Object val) {
        if (val instanceof Number) return ((Number) val).doubleValue();
        return 0.0;
    }

    private Integer asInt(Object val) {
        if (val instanceof Number) return ((Number) val).intValue();
        return 0;
    }
}
