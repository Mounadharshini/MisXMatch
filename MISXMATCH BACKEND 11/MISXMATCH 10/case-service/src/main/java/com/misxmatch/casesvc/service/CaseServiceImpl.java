package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.dto.*;
import com.misxmatch.casesvc.entity.*;
import com.misxmatch.casesvc.repository.*;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@lombok.extern.slf4j.Slf4j
@Service
public class CaseServiceImpl implements CaseService {

    private final MissingPersonRepository missingPersonRepository;
    private final FoundPersonRepository foundPersonRepository;
    private final SightingRepository sightingRepository;
    private final AiMatchRepository aiMatchRepository;
    private final CctvCameraRepository cctvCameraRepository;
    private final AiMatchingProvider aiMatchingProvider;
    private final AiRiskAssessmentService aiRiskAssessmentService;
    private final AiOcrService aiOcrService;
    private final AiDuplicateDetectionService aiDuplicateDetectionService;
    private final AiNaturalLanguageSearchService aiNaturalLanguageSearchService;
    private final CctvAiInvestigationService cctvAiInvestigationService;
    private final CctvInvestigationLeadRepository cctvInvestigationLeadRepository;
    private final CctvAnalysisSessionRepository cctvAnalysisSessionRepository;
    private final FileStorageService fileStorageService;
    private final com.misxmatch.casesvc.client.AuditLogClient auditLogClient;
    private final com.misxmatch.casesvc.client.NotificationClient notificationClient;
    private final com.misxmatch.casesvc.feed.CctvFeedSource cctvFeedSource;
    private final EvidenceService evidenceService;
    private final CaseReunificationRequestRepository caseReunificationRequestRepository;

    public CaseServiceImpl(MissingPersonRepository missingPersonRepository,
                           FoundPersonRepository foundPersonRepository,
                           SightingRepository sightingRepository,
                           AiMatchRepository aiMatchRepository,
                           CctvCameraRepository cctvCameraRepository,
                           AiMatchingProvider aiMatchingProvider,
                           AiRiskAssessmentService aiRiskAssessmentService,
                           AiOcrService aiOcrService,
                           AiDuplicateDetectionService aiDuplicateDetectionService,
                           AiNaturalLanguageSearchService aiNaturalLanguageSearchService,
                           CctvAiInvestigationService cctvAiInvestigationService,
                           CctvInvestigationLeadRepository cctvInvestigationLeadRepository,
                           CctvAnalysisSessionRepository cctvAnalysisSessionRepository,
                           FileStorageService fileStorageService,
                           com.misxmatch.casesvc.client.AuditLogClient auditLogClient,
                           com.misxmatch.casesvc.client.NotificationClient notificationClient,
                           com.misxmatch.casesvc.feed.CctvFeedSource cctvFeedSource,
                           EvidenceService evidenceService,
                           CaseReunificationRequestRepository caseReunificationRequestRepository) {
        this.missingPersonRepository = missingPersonRepository;
        this.foundPersonRepository = foundPersonRepository;
        this.sightingRepository = sightingRepository;
        this.aiMatchRepository = aiMatchRepository;
        this.cctvCameraRepository = cctvCameraRepository;
        this.aiMatchingProvider = aiMatchingProvider;
        this.aiRiskAssessmentService = aiRiskAssessmentService;
        this.aiOcrService = aiOcrService;
        this.aiDuplicateDetectionService = aiDuplicateDetectionService;
        this.aiNaturalLanguageSearchService = aiNaturalLanguageSearchService;
        this.cctvAiInvestigationService = cctvAiInvestigationService;
        this.cctvInvestigationLeadRepository = cctvInvestigationLeadRepository;
        this.cctvAnalysisSessionRepository = cctvAnalysisSessionRepository;
        this.fileStorageService = fileStorageService;
        this.auditLogClient = auditLogClient;
        this.notificationClient = notificationClient;
        this.cctvFeedSource = cctvFeedSource;
        this.evidenceService = evidenceService;
        this.caseReunificationRequestRepository = caseReunificationRequestRepository;
    }

    private Pageable createPageable(int page, int size, String sortBy, String sortDir, String defaultSort) {
        int p = Math.max(0, page);
        int s = size > 0 ? size : 10;
        String field = (sortBy != null && !sortBy.isBlank()) ? sortBy : defaultSort;
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PageRequest.of(p, s, Sort.by(direction, field));
    }

    @Override
    @Transactional
    public MissingPerson reportMissing(String reportedBy, MissingPersonRequest request) {
        String reporter = (reportedBy != null && !reportedBy.isBlank() && !"CITIZEN".equalsIgnoreCase(reportedBy) && !"ANONYMOUS".equalsIgnoreCase(reportedBy))
                ? reportedBy
                : (request.getReportedBy() != null && !request.getReportedBy().isBlank() ? request.getReportedBy() : "CITIZEN");
        String uid = (reportedBy != null && !reportedBy.isBlank() && !"CITIZEN".equalsIgnoreCase(reportedBy) && !"ANONYMOUS".equalsIgnoreCase(reportedBy))
                ? reportedBy.trim()
                : null;
        MissingPerson mp = MissingPerson.builder()
                .userId(uid)
                .reportedBy(reporter)
                .name(request.getName())
                .age(request.getAge())
                .gender(request.getGender())
                .height(request.getHeight())
                .complexion(request.getComplexion())
                .identifyingMarks(request.getIdentifyingMarks())
                .lastSeenLocation(request.getLastSeenLocation())
                .lastSeenDate(request.getLastSeenDate() != null ? request.getLastSeenDate() : java.time.LocalDate.now())
                .photoUrl(request.getPhotoUrl())
                .description(request.getDescription())
                .contactPhone(request.getContactPhone())
                .status(CaseStatus.SUBMITTED)
                .build();

        // Run automated AI Risk Assessment on intake
        RiskAssessmentResponse risk = aiRiskAssessmentService.assessRisk(mp);
        mp.setRiskLevel(risk.getRiskLevel());
        mp.setRiskScore(risk.getRiskScore());
        mp.setRiskFactors(String.join("; ", risk.getIdentifiedRiskFactors()));

        MissingPerson saved = missingPersonRepository.save(mp);

        auditLogClient.logAsync(reporter, "USER", "MISSING_CASE_CREATED", "Created missing case #" + saved.getCaseNumber() + " for " + saved.getName() + " (Risk Score: " + saved.getRiskScore() + ")");

        // Dispatch case created notification to police and admin
        notificationClient.sendCaseCreatedNotificationAsync(saved.getCaseNumber(), saved.getName(), saved.getLastSeenLocation());

        // High-priority / CRITICAL risk cases trigger emergency broadcast & high risk priority alert to authorities
        if ("CRITICAL".equalsIgnoreCase(saved.getRiskLevel()) || "HIGH".equalsIgnoreCase(saved.getRiskLevel()) || (saved.getRiskScore() != null && saved.getRiskScore() >= 75.0)) {
            notificationClient.sendHighRiskCaseNotificationAsync(saved.getCaseNumber(), saved.getRiskScore(), saved.getRiskLevel(), saved.getLastSeenLocation());
            notificationClient.broadcastEmergencyAsync(saved);
        }

        // Dispatch personal intake notification to reporting user
        if (reportedBy != null && !reportedBy.isBlank() && !"anonymous".equalsIgnoreCase(reportedBy)) {
            String title = "Missing Person Report Filed: #" + saved.getCaseNumber();
            String msg = "Your missing person report for " + saved.getName() + " has been registered in the database.";
            notificationClient.sendNotificationAsync(reportedBy.trim(), title, msg, "CASE_CREATED", saved.getCaseNumber(), null, saved.getLastSeenLocation(), "USER_REPORT_" + saved.getCaseNumber());
        }

        // Auto-run AI Biometric & Multi-modal Prediction against existing found persons & sightings
        triggerAiMatchingForMissing(saved, reportedBy != null ? reportedBy : "AI_VISION_PIPELINE");

        return saved;
    }

    @Override
    public List<MissingPerson> listMissing() {
        return missingPersonRepository.findAll();
    }

    @Override
    public List<MissingPerson> listMissingByReporter(String reportedBy) {
        return missingPersonRepository.findByReportedBy(reportedBy);
    }

    @Override
    public Map<String, Object> getMyReports(String reportedBy) {
        if (reportedBy == null || reportedBy.isBlank() || "anonymousUser".equalsIgnoreCase(reportedBy) 
                || "citizen".equalsIgnoreCase(reportedBy) || "anonymous".equalsIgnoreCase(reportedBy)) {
            return Map.of("missing", List.of(), "found", List.of(), "sightings", List.of(), "total", 0);
        }
        String cleanUser = reportedBy.trim();
        
        List<MissingPerson> missing = new ArrayList<>(missingPersonRepository.findByUserIdOrderByCreatedAtDesc(cleanUser));
        List<MissingPerson> legacyMissing = missingPersonRepository.findByReportedBy(cleanUser);
        java.util.Set<Long> missingIds = missing.stream().map(MissingPerson::getId).collect(java.util.stream.Collectors.toSet());
        for (MissingPerson mp : legacyMissing) {
            if (mp.getId() != null && !missingIds.contains(mp.getId())) {
                missing.add(mp);
                missingIds.add(mp.getId());
            }
        }

        List<FoundPerson> found = new ArrayList<>(foundPersonRepository.findByUserIdOrderByCreatedAtDesc(cleanUser));
        List<FoundPerson> legacyFound = foundPersonRepository.findByReportedBy(cleanUser);
        java.util.Set<Long> foundIds = found.stream().map(FoundPerson::getId).collect(java.util.stream.Collectors.toSet());
        for (FoundPerson fp : legacyFound) {
            if (fp.getId() != null && !foundIds.contains(fp.getId())) {
                found.add(fp);
                foundIds.add(fp.getId());
            }
        }

        List<Sighting> sightings = new ArrayList<>(sightingRepository.findByUserIdOrderByCreatedAtDesc(cleanUser));
        List<Sighting> legacySightings = sightingRepository.findByReportedBy(cleanUser);
        java.util.Set<Long> sightingIds = sightings.stream().map(Sighting::getId).collect(java.util.stream.Collectors.toSet());
        for (Sighting s : legacySightings) {
            if (s.getId() != null && !sightingIds.contains(s.getId())) {
                sightings.add(s);
                sightingIds.add(s.getId());
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("missing", missing);
        res.put("found", found);
        res.put("sightings", sightings);
        res.put("total", missing.size() + found.size() + sightings.size());
        return res;
    }

    @Override
    public PageResponse<MissingPerson> listMissingPaginated(int page, int size, String q, String status, String priority, String gender, String reportedBy, String sortBy, String sortDir) {
        Pageable pageable = createPageable(page, size, sortBy, sortDir, "id");
        Specification<MissingPerson> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("name")), pattern);
                Predicate caseNumMatch = cb.like(cb.lower(root.get("caseNumber")), pattern);
                Predicate locMatch = cb.like(cb.lower(root.get("lastSeenLocation")), pattern);
                Predicate descMatch = cb.like(cb.lower(root.get("description")), pattern);
                predicates.add(cb.or(nameMatch, caseNumMatch, locMatch, descMatch));
            }

            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                try {
                    CaseStatus cs = CaseStatus.valueOf(status.trim().toUpperCase());
                    predicates.add(cb.equal(root.get("status"), cs));
                } catch (Exception ignored) {}
            }

            if (priority != null && !priority.isBlank() && !"ALL".equalsIgnoreCase(priority)) {
                predicates.add(cb.equal(cb.upper(root.get("riskLevel")), priority.trim().toUpperCase()));
            }

            if (gender != null && !gender.isBlank() && !"ALL".equalsIgnoreCase(gender)) {
                predicates.add(cb.equal(cb.upper(root.get("gender")), gender.trim().toUpperCase()));
            }

            if (reportedBy != null && !reportedBy.isBlank()) {
                predicates.add(cb.equal(root.get("reportedBy"), reportedBy.trim()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<MissingPerson> resultPage = missingPersonRepository.findAll(spec, pageable);
        return PageResponse.from(resultPage);
    }

    private MissingPerson findMissingPerson(String idOrCaseNumber) {
        if (idOrCaseNumber == null || idOrCaseNumber.isBlank()) {
            throw new IllegalArgumentException("Case ID or Number cannot be null");
        }
        String trimmed = idOrCaseNumber.trim();
        final String val = trimmed.startsWith("#") ? trimmed.substring(1).trim() : trimmed;
        if (val.matches("^\\d+$")) {
            return missingPersonRepository.findById(Long.parseLong(val))
                    .or(() -> missingPersonRepository.findByCaseNumber(val))
                    .orElseThrow(() -> new IllegalArgumentException("Missing-person case not found: " + val));
        }
        return missingPersonRepository.findByCaseNumber(val)
                .orElseThrow(() -> new IllegalArgumentException("Missing-person case not found: " + val));
    }

    @Override
    public MissingPerson getMissingById(Long id) {
        return missingPersonRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Missing-person case not found: " + id));
    }

    @Override
    public MissingPerson getMissingByIdOrCaseNumber(String idOrCaseNumber) {
        return findMissingPerson(idOrCaseNumber);
    }

    @Override
    @Transactional
    public MissingPerson updateMissing(Long id, MissingPersonRequest request) {
        return updateMissing(String.valueOf(id), request);
    }

    @Override
    @Transactional
    public MissingPerson updateMissing(String idOrCaseNumber, MissingPersonRequest request) {
        MissingPerson mp = findMissingPerson(idOrCaseNumber);
        mp.setName(request.getName());
        mp.setAge(request.getAge());
        mp.setGender(request.getGender());
        mp.setHeight(request.getHeight());
        mp.setComplexion(request.getComplexion());
        mp.setIdentifyingMarks(request.getIdentifyingMarks());
        mp.setLastSeenLocation(request.getLastSeenLocation());
        mp.setLastSeenDate(request.getLastSeenDate());
        mp.setPhotoUrl(request.getPhotoUrl());
        mp.setDescription(request.getDescription());
        mp.setContactPhone(request.getContactPhone());

        // Re-assess risk score
        RiskAssessmentResponse risk = aiRiskAssessmentService.assessRisk(mp);
        mp.setRiskLevel(risk.getRiskLevel());
        mp.setRiskScore(risk.getRiskScore());
        mp.setRiskFactors(String.join("; ", risk.getIdentifiedRiskFactors()));

        MissingPerson saved = missingPersonRepository.save(mp);

        auditLogClient.logAsync(saved.getReportedBy() != null ? saved.getReportedBy() : "USER", "USER", "MISSING_CASE_UPDATED", "Updated missing case #" + saved.getCaseNumber() + " (" + saved.getName() + ")");

        if ("CRITICAL".equalsIgnoreCase(saved.getRiskLevel()) || "HIGH".equalsIgnoreCase(saved.getRiskLevel())) {
            notificationClient.broadcastEmergencyAsync(saved);
        }

        // Auto-run updated AI Biometric & Multi-modal Prediction against all found cases
        try {
            if (saved.getPhotoUrl() != null && !saved.getPhotoUrl().isBlank()) {
                MatchResult mr = aiMatchingProvider.matchByImage(saved.getCaseNumber(), saved.getPhotoUrl());
                persistMatches(mr, "AI_DYNAMIC_UPDATE_PIPELINE");
            } else if (saved.getDescription() != null && !saved.getDescription().isBlank()) {
                MatchResult mr = aiMatchingProvider.matchByText(saved.getCaseNumber(), saved.getDescription());
                persistMatches(mr, "AI_DYNAMIC_UPDATE_PIPELINE");
            }
        } catch (Exception ignored) {}

        return saved;
    }

    @Override
    @Transactional
    public MissingPerson updateMissingStatus(Long id, CaseStatus status) {
        return updateMissingStatus(String.valueOf(id), status);
    }

    @Override
    @Transactional
    public MissingPerson updateMissingStatus(String idOrCaseNumber, CaseStatus status) {
        MissingPerson mp = findMissingPerson(idOrCaseNumber);
        mp.setStatus(status);
        MissingPerson updated = missingPersonRepository.save(mp);
        auditLogClient.logAsync("POLICE", "POLICE", "CASE_STATUS_CHANGED", "Case #" + mp.getCaseNumber() + " status updated to " + status);
        return updated;
    }

    @Override
    @Transactional
    public void deleteMissing(Long id) {
        deleteMissing(String.valueOf(id));
    }

    @Override
    @Transactional
    public void deleteMissing(String idOrCaseNumber) {
        MissingPerson mp = findMissingPerson(idOrCaseNumber);
        missingPersonRepository.delete(mp);
        auditLogClient.logAsync("ADMIN", "ADMIN", "CASE_DELETED", "Deleted case #" + idOrCaseNumber + " (" + mp.getName() + ")");
    }

    @Override
    @Transactional
    public FoundPerson reportFound(String reportedBy, FoundPersonRequest request) {
        String reporter = (reportedBy != null && !reportedBy.isBlank() && !"ANONYMOUS".equalsIgnoreCase(reportedBy) && !"CITIZEN".equalsIgnoreCase(reportedBy))
                ? reportedBy
                : (request.getReportedBy() != null && !request.getReportedBy().isBlank() ? request.getReportedBy() : "ANONYMOUS");
        String uid = (reportedBy != null && !reportedBy.isBlank() && !"ANONYMOUS".equalsIgnoreCase(reportedBy) && !"CITIZEN".equalsIgnoreCase(reportedBy))
                ? reportedBy.trim()
                : null;
        String caseNum = (request.getCaseNumber() != null && !request.getCaseNumber().isBlank()) ? request.getCaseNumber() : "FP-" + System.currentTimeMillis();
        FoundPerson fp = FoundPerson.builder()
                .caseNumber(caseNum)
                .userId(uid)
                .reportedBy(reporter)
                .approximateName(request.getApproximateName())
                .approximateAge(request.getApproximateAge())
                .gender(request.getGender())
                .foundLocation(request.getFoundLocation())
                .foundDate(request.getFoundDate() != null ? request.getFoundDate() : java.time.LocalDate.now())
                .photoUrl(request.getPhotoUrl())
                .description(request.getDescription())
                .currentLocation(request.getCurrentLocation())
                .category(request.getCategory() != null ? request.getCategory() : "GENERAL")
                .metadata(request.getMetadata())
                .status(CaseStatus.SUBMITTED)
                .build();
        FoundPerson saved = foundPersonRepository.save(fp);

        auditLogClient.logAsync(reporter, "USER", "FOUND_CASE_CREATED", "Reported found individual #" + saved.getCaseNumber() + " (" + saved.getApproximateName() + ")");

        // Dispatch found person notification to police and ngo coordinators
        notificationClient.sendFoundPersonNotificationAsync(saved.getCaseNumber(), saved.getApproximateName(), saved.getFoundLocation());

        // Dispatch personal intake notification to reporting user
        if (reportedBy != null && !reportedBy.isBlank() && !"anonymous".equalsIgnoreCase(reportedBy)) {
            String title = "Found Person Intake Registered: #" + saved.getCaseNumber();
            String msg = "Your report for " + (saved.getApproximateName() != null ? saved.getApproximateName() : "unidentified individual") + " has been registered in the database.";
            notificationClient.sendNotificationAsync(reportedBy.trim(), title, msg, "FOUND_PERSON_REPORTED", saved.getCaseNumber(), null, saved.getFoundLocation(), "USER_FOUND_" + saved.getCaseNumber());
        }

        // Run AI Prediction against all active missing persons (including SUBMITTED, OPEN, UNDER_INVESTIGATION, MATCH_FOUND)
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                List<MissingPerson> activeCases = missingPersonRepository.findAll().stream()
                        .filter(m -> m.getStatus() != CaseStatus.CLOSED && m.getStatus() != CaseStatus.REUNITED)
                        .toList();
                for (MissingPerson mp : activeCases) {
                    triggerAiMatchingForMissing(mp, reportedBy != null ? reportedBy : "AI_VISION_PIPELINE");
                }
            } catch (Exception ignored) {}
        });

        return saved;
    }

    @Override
    public List<FoundPerson> listFound() {
        return foundPersonRepository.findAll();
    }

    @Override
    public List<FoundPerson> listFoundByCategory(String category) {
        return foundPersonRepository.findByCategory(category);
    }

    @Override
    public PageResponse<FoundPerson> listFoundPaginated(int page, int size, String q, String category, String status, String reportedBy, String sortBy, String sortDir) {
        Pageable pageable = createPageable(page, size, sortBy, sortDir, "id");
        Specification<FoundPerson> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("approximateName")), pattern);
                Predicate caseNumMatch = cb.like(cb.lower(root.get("caseNumber")), pattern);
                Predicate locMatch = cb.like(cb.lower(root.get("foundLocation")), pattern);
                Predicate currLocMatch = cb.like(cb.lower(root.get("currentLocation")), pattern);
                Predicate descMatch = cb.like(cb.lower(root.get("description")), pattern);
                predicates.add(cb.or(nameMatch, caseNumMatch, locMatch, currLocMatch, descMatch));
            }

            if (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category)) {
                predicates.add(cb.equal(cb.upper(root.get("category")), category.trim().toUpperCase()));
            }

            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                try {
                    CaseStatus cs = CaseStatus.valueOf(status.trim().toUpperCase());
                    predicates.add(cb.equal(root.get("status"), cs));
                } catch (Exception ignored) {}
            }

            if (reportedBy != null && !reportedBy.isBlank()) {
                predicates.add(cb.equal(root.get("reportedBy"), reportedBy.trim()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<FoundPerson> resultPage = foundPersonRepository.findAll(spec, pageable);
        return PageResponse.from(resultPage);
    }

    @Override
    public FoundPerson getFoundByIdOrCaseNumber(String idOrCaseNumber) {
        if (idOrCaseNumber == null || idOrCaseNumber.isBlank()) {
            throw new IllegalArgumentException("Found Case ID or Number cannot be null");
        }
        String trimmed = idOrCaseNumber.trim();
        final String val = trimmed.startsWith("#") ? trimmed.substring(1).trim() : trimmed;
        if (val.matches("^\\d+$")) {
            return foundPersonRepository.findById(Long.parseLong(val))
                    .or(() -> foundPersonRepository.findByCaseNumber(val))
                    .orElseThrow(() -> new IllegalArgumentException("Found-person record not found: " + val));
        }
        return foundPersonRepository.findByCaseNumber(val)
                .orElseThrow(() -> new IllegalArgumentException("Found-person record not found: " + val));
    }

    @Override
    @Transactional
    public void reportSighting(String reportedBy, SightingRequest request) {
        String reporter = (reportedBy != null && !reportedBy.isBlank() && !"ANONYMOUS".equalsIgnoreCase(reportedBy) && !"CITIZEN".equalsIgnoreCase(reportedBy))
                ? reportedBy
                : (request.getReportedBy() != null && !request.getReportedBy().isBlank() ? request.getReportedBy() : "ANONYMOUS");
        String uid = (reportedBy != null && !reportedBy.isBlank() && !"ANONYMOUS".equalsIgnoreCase(reportedBy) && !"CITIZEN".equalsIgnoreCase(reportedBy))
                ? reportedBy.trim()
                : null;
        Sighting sighting = Sighting.builder()
                .missingCaseNumber(request.getMissingCaseNumber())
                .userId(uid)
                .reportedBy(reporter)
                .location(request.getLocation())
                .description(request.getDescription())
                .photoUrl(request.getPhotoUrl())
                .sightedAt(request.getSightedAt())
                .verified(false)
                .build();
        Sighting saved = sightingRepository.save(sighting);

        // Dispatch sighting submitted notification to police officers
        notificationClient.sendSightingNotificationAsync(saved.getMissingCaseNumber(), saved.getId(), saved.getLocation());

        // Dispatch personal confirmation notification to reporting user
        if (reportedBy != null && !reportedBy.isBlank() && !"anonymous".equalsIgnoreCase(reportedBy)) {
            String title = "Citizen Sighting Registered: #" + saved.getId();
            String msg = "Your sighting observation report for case #" + saved.getMissingCaseNumber() + " at " + saved.getLocation() + " has been recorded.";
            notificationClient.sendNotificationAsync(reportedBy.trim(), title, msg, "SIGHTING_SUBMITTED", saved.getMissingCaseNumber(), saved.getId(), saved.getLocation(), "USER_SIGHTING_" + saved.getId());
        }

        // Auto-run AI matching for newly reported Sighting
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                triggerAiMatchingForSighting(saved, reportedBy);
            } catch (Exception ignored) {}
        });
    }

    @Override
    public List<Sighting> listSightings() {
        return sightingRepository.findAll();
    }

    @Override
    public PageResponse<Sighting> listSightingsPaginated(int page, int size, String q, String caseNumber, Boolean verified, String reportedBy, String sortBy, String sortDir) {
        Pageable pageable = createPageable(page, size, sortBy, sortDir, "id");
        Specification<Sighting> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                Predicate caseNumMatch = cb.like(cb.lower(root.get("missingCaseNumber")), pattern);
                Predicate locMatch = cb.like(cb.lower(root.get("location")), pattern);
                Predicate descMatch = cb.like(cb.lower(root.get("description")), pattern);
                predicates.add(cb.or(caseNumMatch, locMatch, descMatch));
            }

            if (caseNumber != null && !caseNumber.isBlank()) {
                predicates.add(cb.equal(root.get("missingCaseNumber"), caseNumber.trim()));
            }

            if (verified != null) {
                predicates.add(cb.equal(root.get("verified"), verified));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Sighting> resultPage = sightingRepository.findAll(spec, pageable);
        return PageResponse.from(resultPage);
    }

    @Override
    @Transactional
    public Sighting verifySighting(Long id, boolean verified) {
        Sighting s = sightingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sighting not found: " + id));
        s.setVerified(verified);
        return sightingRepository.save(s);
    }

    @Override
    @Transactional
    public Sighting verifySighting(String idOrCaseNumber, boolean verified) {
        if (idOrCaseNumber != null && idOrCaseNumber.matches("^\\d+$")) {
            return verifySighting(Long.parseLong(idOrCaseNumber), verified);
        }
        List<Sighting> list = sightingRepository.findAll().stream()
                .filter(s -> s.getMissingCaseNumber() != null && s.getMissingCaseNumber().equalsIgnoreCase(idOrCaseNumber))
                .toList();
        if (!list.isEmpty()) {
            Sighting s = list.get(0);
            s.setVerified(verified);
            return sightingRepository.save(s);
        }
        throw new IllegalArgumentException("Sighting not found: " + idOrCaseNumber);
    }

    @Override
    @Transactional
    public void dismissSighting(Long id) {
        sightingRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void dismissSighting(String idOrCaseNumber) {
        if (idOrCaseNumber != null && idOrCaseNumber.matches("^\\d+$")) {
            sightingRepository.deleteById(Long.parseLong(idOrCaseNumber));
            return;
        }
        List<Sighting> list = sightingRepository.findAll().stream()
                .filter(s -> s.getMissingCaseNumber() != null && s.getMissingCaseNumber().equalsIgnoreCase(idOrCaseNumber))
                .toList();
        if (!list.isEmpty()) {
            sightingRepository.delete(list.get(0));
        }
    }

    @Override
    @Transactional
    public MatchResult matchImage(String requestedBy, ImageMatchRequest request) {
        MatchResult result = aiMatchingProvider.matchByImage(request.getMissingCaseNumber(), request.getImageUrl());
        persistMatches(result, requestedBy);
        return result;
    }

    @Override
    @Transactional
    public MatchResult matchText(String requestedBy, TextMatchRequest request) {
        MatchResult result = aiMatchingProvider.matchByText(request.getMissingCaseNumber(), request.getDescription());
        persistMatches(result, requestedBy);
        return result;
    }

    private void enrichAndSelfHealMatch(AiMatch match) {
        if (match == null) return;
        boolean modified = false;
        String srcCase = (match.getSourceCaseNumber() != null && !match.getSourceCaseNumber().isBlank())
                ? match.getSourceCaseNumber() : match.getMissingCaseNumber();
        String tgtCase = (match.getTargetCaseNumber() != null && !match.getTargetCaseNumber().isBlank())
                ? match.getTargetCaseNumber() : match.getFoundCaseNumber();

        if (match.getSourceCaseNumber() == null && srcCase != null) {
            match.setSourceCaseNumber(srcCase);
            modified = true;
        }
        if (match.getMissingCaseNumber() == null && srcCase != null) {
            match.setMissingCaseNumber(srcCase);
            modified = true;
        }
        if (match.getTargetCaseNumber() == null && tgtCase != null) {
            match.setTargetCaseNumber(tgtCase);
            modified = true;
        }
        if (match.getFoundCaseNumber() == null && tgtCase != null) {
            match.setFoundCaseNumber(tgtCase);
            modified = true;
        }

        if ((match.getSourcePhotoUrl() == null || match.getSourcePhotoUrl().isBlank()) && srcCase != null) {
            Optional<MissingPerson> mpOpt = missingPersonRepository.findByCaseNumber(srcCase);
            if (mpOpt.isPresent() && mpOpt.get().getPhotoUrl() != null && !mpOpt.get().getPhotoUrl().isBlank()) {
                match.setSourcePhotoUrl(mpOpt.get().getPhotoUrl());
                modified = true;
            }
        }

        if ((match.getTargetPhotoUrl() == null || match.getTargetPhotoUrl().isBlank()) && tgtCase != null) {
            Optional<FoundPerson> fpOpt = foundPersonRepository.findByCaseNumber(tgtCase);
            if (fpOpt.isPresent() && fpOpt.get().getPhotoUrl() != null && !fpOpt.get().getPhotoUrl().isBlank()) {
                match.setTargetPhotoUrl(fpOpt.get().getPhotoUrl());
                modified = true;
            } else {
                Optional<MissingPerson> otherMpOpt = missingPersonRepository.findByCaseNumber(tgtCase);
                if (otherMpOpt.isPresent() && otherMpOpt.get().getPhotoUrl() != null && !otherMpOpt.get().getPhotoUrl().isBlank()) {
                    match.setTargetPhotoUrl(otherMpOpt.get().getPhotoUrl());
                    modified = true;
                }
            }
        }

        if (modified) {
            try {
                aiMatchRepository.save(match);
            } catch (Exception e) {
                log.debug("Auto-save healed match note: {}", e.getMessage());
            }
        }
    }

    @Override
    public List<AiMatch> listMatches() {
        List<AiMatch> matches = aiMatchRepository.findAll();
        matches.forEach(this::enrichAndSelfHealMatch);
        return matches.stream()
                .sorted(Comparator
                        .comparingDouble((AiMatch m) -> m.getFinalScore() != null ? m.getFinalScore() : (m.getSimilarityScore() != null ? m.getSimilarityScore() * 100.0 : 0.0))
                        .reversed()
                        .thenComparing((AiMatch m) -> "HIGH".equalsIgnoreCase(m.getPriority()) ? 0 : ("MEDIUM".equalsIgnoreCase(m.getPriority()) ? 1 : 2))
                        .thenComparing(AiMatch::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Override
    @Transactional
    public List<AiMatch> getMatchesForReport(String caseNumber) {
        if (caseNumber == null || caseNumber.isBlank()) return Collections.emptyList();
        String target = caseNumber.trim();
        List<AiMatch> matches = aiMatchRepository.findAll().stream()
                .filter(m -> (m.getMissingCaseNumber() != null && m.getMissingCaseNumber().equalsIgnoreCase(target)) ||
                             (m.getFoundCaseNumber() != null && m.getFoundCaseNumber().equalsIgnoreCase(target)) ||
                             (m.getSourceCaseNumber() != null && m.getSourceCaseNumber().equalsIgnoreCase(target)) ||
                             (m.getTargetCaseNumber() != null && m.getTargetCaseNumber().equalsIgnoreCase(target)))
                .sorted(Comparator.comparingDouble((AiMatch m) -> m.getFinalScore() != null ? m.getFinalScore() : (m.getSimilarityScore() != null ? m.getSimilarityScore() * 100.0 : 0.0)).reversed())
                .limit(5)
                .toList();

        if (matches.isEmpty()) {
            try {
                Optional<MissingPerson> mpOpt = missingPersonRepository.findByCaseNumber(target);
                if (mpOpt.isPresent()) {
                    MissingPerson mp = mpOpt.get();
                    MatchResult result = (mp.getPhotoUrl() != null && !mp.getPhotoUrl().isBlank())
                            ? aiMatchingProvider.matchByImage(target, mp.getPhotoUrl())
                            : aiMatchingProvider.matchByText(target, mp.getDescription());
                    if (result != null && result.getCandidates() != null && !result.getCandidates().isEmpty()) {
                        persistMatches(result, "DYNAMIC_MATCH_ON_DEMAND");
                        matches = aiMatchRepository.findAll().stream()
                                .filter(m -> (m.getMissingCaseNumber() != null && m.getMissingCaseNumber().equalsIgnoreCase(target)) ||
                                             (m.getSourceCaseNumber() != null && m.getSourceCaseNumber().equalsIgnoreCase(target)))
                                .sorted(Comparator.comparingDouble((AiMatch m) -> m.getFinalScore() != null ? m.getFinalScore() : (m.getSimilarityScore() != null ? m.getSimilarityScore() * 100.0 : 0.0)).reversed())
                                .limit(5)
                                .toList();
                    }
                }
            } catch (Exception ignored) {}
        }
        matches.forEach(this::enrichAndSelfHealMatch);
        return matches;
    }

    @Override
    public PageResponse<AiMatch> listMatchesPaginated(int page, int size, String q, String matchStatus, String sortBy, String sortDir) {
        Pageable pageable = createPageable(page, size, sortBy, sortDir, "id");
        Specification<AiMatch> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                Predicate missingMatch = cb.like(cb.lower(root.get("missingCaseNumber")), pattern);
                Predicate foundMatch = cb.like(cb.lower(root.get("foundCaseNumber")), pattern);
                Predicate explMatch = cb.like(cb.lower(root.get("explanation")), pattern);
                predicates.add(cb.or(missingMatch, foundMatch, explMatch));
            }

            if (matchStatus != null && !matchStatus.isBlank() && !"ALL".equalsIgnoreCase(matchStatus)) {
                predicates.add(cb.equal(cb.upper(root.get("matchStatus")), matchStatus.trim().toUpperCase()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<AiMatch> resultPage = aiMatchRepository.findAll(spec, pageable);
        resultPage.getContent().forEach(this::enrichAndSelfHealMatch);
        return PageResponse.from(resultPage);
    }

    private void persistMatches(MatchResult result, String requestedBy) {
        String srcCase = (result.getSourceCaseNumber() != null) ? result.getSourceCaseNumber() : result.getMissingCaseNumber();
        String srcType = (result.getSourceReportType() != null) ? result.getSourceReportType() : "MISSING";

        String defaultSourcePhoto = null;
        String defaultPriority = "MEDIUM";
        Optional<MissingPerson> srcMpOpt = (srcCase != null) ? missingPersonRepository.findByCaseNumber(srcCase) : Optional.empty();
        if (srcMpOpt.isPresent()) {
            MissingPerson mp = srcMpOpt.get();
            defaultSourcePhoto = mp.getPhotoUrl();
            if ("CRITICAL".equalsIgnoreCase(mp.getRiskLevel()) || "HIGH".equalsIgnoreCase(mp.getRiskLevel()) ||
                    (mp.getAge() != null && (mp.getAge() <= 12 || mp.getAge() >= 65))) {
                defaultPriority = "HIGH";
            } else if ("LOW".equalsIgnoreCase(mp.getRiskLevel())) {
                defaultPriority = "LOW";
            }
        }

        for (MatchResult.Candidate c : result.getCandidates()) {
            String tgtCase = (c.getTargetCaseNumber() != null) ? c.getTargetCaseNumber() : c.getFoundCaseNumber();
            String tgtType = (c.getTargetReportType() != null) ? c.getTargetReportType() : "FOUND";
            double finalScore100 = (c.getFinalScore() != null) ? c.getFinalScore() : (c.getSimilarityScore() != null ? Math.round(c.getSimilarityScore() * 100.0 * 10.0) / 10.0 : 0.0);
            Double simScore = (c.getSimilarityScore() != null) ? c.getSimilarityScore() : Math.round((finalScore100 / 100.0) * 100.0) / 100.0;
            String conf = (c.getConfidenceLevel() != null) ? c.getConfidenceLevel() : (finalScore100 >= 80.0 ? "HIGH" : (finalScore100 >= 60.0 ? "MEDIUM" : "LOW"));
            String srcPhoto = (c.getSourcePhotoUrl() != null && !c.getSourcePhotoUrl().isBlank()) ? c.getSourcePhotoUrl() : defaultSourcePhoto;
            if (srcPhoto == null && srcCase != null) {
                srcPhoto = missingPersonRepository.findByCaseNumber(srcCase).map(MissingPerson::getPhotoUrl).orElse(null);
            }
            String tgtPhoto = (c.getPhotoUrl() != null && !c.getPhotoUrl().isBlank()) ? c.getPhotoUrl() : null;
            if (tgtPhoto == null && tgtCase != null) {
                tgtPhoto = foundPersonRepository.findByCaseNumber(tgtCase).map(FoundPerson::getPhotoUrl).orElse(null);
            }
            String priority = (c.getPriority() != null && !c.getPriority().isBlank()) ? c.getPriority() : defaultPriority;

            Optional<AiMatch> existing = aiMatchRepository.findAll().stream()
                    .filter(m -> ((m.getMissingCaseNumber() != null && m.getMissingCaseNumber().equalsIgnoreCase(srcCase)) ||
                                  (m.getSourceCaseNumber() != null && m.getSourceCaseNumber().equalsIgnoreCase(srcCase)))
                              && ((m.getFoundCaseNumber() != null && m.getFoundCaseNumber().equalsIgnoreCase(tgtCase)) ||
                                  (m.getTargetCaseNumber() != null && m.getTargetCaseNumber().equalsIgnoreCase(tgtCase))))
                    .findFirst();

            if (existing.isPresent()) {
                AiMatch match = existing.get();
                match.setMissingCaseNumber(srcCase);
                match.setFoundCaseNumber(tgtCase);
                match.setSourceCaseNumber(srcCase);
                match.setTargetCaseNumber(tgtCase);
                match.setSourceReportType(srcType);
                match.setTargetReportType(tgtType);
                if (srcPhoto != null && !srcPhoto.isBlank()) {
                    match.setSourcePhotoUrl(srcPhoto);
                } else if (match.getSourcePhotoUrl() == null && defaultSourcePhoto != null) {
                    match.setSourcePhotoUrl(defaultSourcePhoto);
                }
                match.setTargetName(c.getPersonName());
                if (tgtPhoto != null && !tgtPhoto.isBlank()) {
                    match.setTargetPhotoUrl(tgtPhoto);
                }
                match.setPriority(priority);
                match.setTargetLocation(c.getCurrentLocation());

                if (c.getFaceScore() != null) {
                    match.setFaceScore(c.getFaceScore());
                    match.setSimilarityScore(simScore);
                    match.setFinalScore(finalScore100);
                    match.setConfidenceLevel(conf);
                    match.setMatchSource(result.getMatchSource());
                    match.setExplanation(c.getReason());
                } else if (match.getFaceScore() == null) {
                    match.setSimilarityScore(simScore);
                    match.setFinalScore(finalScore100);
                    match.setConfidenceLevel(conf);
                    match.setMatchSource(result.getMatchSource());
                    match.setExplanation(c.getReason());
                }
                if (c.getTextScore() != null) match.setTextScore(c.getTextScore());
                if (c.getLocationScore() != null) match.setLocationScore(c.getLocationScore());
                if (c.getAttributeScore() != null) match.setAttributeScore(c.getAttributeScore());
                if (c.getClothingScore() != null) match.setClothingScore(c.getClothingScore());
                if (c.getTimelineScore() != null) match.setTimelineScore(c.getTimelineScore());
                match.setRequestedBy(requestedBy);
                AiMatch savedMatch = aiMatchRepository.save(match);
                if (finalScore100 >= 80.0) {
                    notificationClient.sendAiMatchFoundNotificationAsync(srcCase, savedMatch.getId(), finalScore100 / 100.0, "police_officer");
                }
            } else {
                AiMatch match = AiMatch.builder()
                        .missingCaseNumber(srcCase)
                        .foundCaseNumber(tgtCase)
                        .sourceCaseNumber(srcCase)
                        .targetCaseNumber(tgtCase)
                        .sourceReportType(srcType)
                        .targetReportType(tgtType)
                        .sourcePhotoUrl(srcPhoto)
                        .targetName(c.getPersonName())
                        .targetPhotoUrl(tgtPhoto)
                        .priority(priority)
                        .targetLocation(c.getCurrentLocation())
                        .matchType(result.getMatchType() != null ? result.getMatchType() : "IMAGE")
                        .similarityScore(simScore)
                        .finalScore(finalScore100)
                        .confidenceLevel(conf)
                        .faceScore(c.getFaceScore())
                        .textScore(c.getTextScore())
                        .locationScore(c.getLocationScore())
                        .attributeScore(c.getAttributeScore())
                        .clothingScore(c.getClothingScore())
                        .timelineScore(c.getTimelineScore())
                        .explanation(c.getReason())
                        .matchStatus("PENDING_REVIEW")
                        .matchSource(result.getMatchSource())
                        .requestedBy(requestedBy)
                        .disclaimer("AI-assisted / Requires Human Verification — not definitive identification")
                        .build();
                AiMatch savedMatch = aiMatchRepository.save(match);
                if (finalScore100 >= 80.0) {
                    notificationClient.sendAiMatchFoundNotificationAsync(srcCase, savedMatch.getId(), finalScore100 / 100.0, "police_officer");
                }
            }
        }
        if (!result.getCandidates().isEmpty() && "MISSING".equalsIgnoreCase(srcType)) {
            missingPersonRepository.findByCaseNumber(srcCase).ifPresent(mp -> {
                if (mp.getStatus() == CaseStatus.OPEN) {
                    mp.setStatus(CaseStatus.MATCH_FOUND);
                    missingPersonRepository.save(mp);
                }
            });
        }
    }

    private void triggerAiMatchingForSighting(Sighting sighting, String reportedBy) {
        if (sighting == null) return;

        List<MissingPerson> missingList;
        if (sighting.getMissingCaseNumber() != null && !sighting.getMissingCaseNumber().isBlank()) {
            Optional<MissingPerson> mpOpt = missingPersonRepository.findByCaseNumber(sighting.getMissingCaseNumber());
            missingList = mpOpt.map(List::of).orElseGet(missingPersonRepository::findAll);
        } else {
            missingList = missingPersonRepository.findAll().stream()
                    .filter(m -> m.getStatus() != CaseStatus.CLOSED && m.getStatus() != CaseStatus.REUNITED)
                    .toList();
        }

        for (MissingPerson mp : missingList) {
            double faceScore = 0.0;
            double textScore = 0.0;
            double locScore = 0.0;
            double clothingScore = 0.0;

            if (sighting.getPhotoUrl() != null && mp.getPhotoUrl() != null && !sighting.getPhotoUrl().isBlank() && !mp.getPhotoUrl().isBlank()) {
                MatchResult mr = aiMatchingProvider.matchByImage(mp.getCaseNumber(), sighting.getPhotoUrl());
                if (!mr.getCandidates().isEmpty()) {
                    faceScore = mr.getCandidates().get(0).getFaceScore() != null ? mr.getCandidates().get(0).getFaceScore() : 0.0;
                    textScore = mr.getCandidates().get(0).getTextScore() != null ? mr.getCandidates().get(0).getTextScore() : 0.0;
                }
            }

            if (sighting.getDescription() != null && mp.getDescription() != null) {
                MatchResult textMr = aiMatchingProvider.matchByText(mp.getCaseNumber(), sighting.getDescription());
                if (!textMr.getCandidates().isEmpty()) {
                    textScore = Math.max(textScore, textMr.getCandidates().get(0).getTextScore() != null ? textMr.getCandidates().get(0).getTextScore() : 0.0);
                    clothingScore = Math.max(clothingScore, textMr.getCandidates().get(0).getClothingScore() != null ? textMr.getCandidates().get(0).getClothingScore() : 0.0);
                }
            }

            if (sighting.getLocation() != null && mp.getLastSeenLocation() != null) {
                if (sighting.getLocation().toLowerCase().contains(mp.getLastSeenLocation().toLowerCase()) ||
                    mp.getLastSeenLocation().toLowerCase().contains(sighting.getLocation().toLowerCase())) {
                    locScore = 0.85;
                }
            }

            double overallScore = Math.max(faceScore * 0.65 + textScore * 0.35, Math.max(faceScore, textScore * 0.80 + locScore * 0.20));
            overallScore = Math.min(0.99, Math.max(0.05, overallScore));

            if (overallScore >= 0.40) {
                String explanation = "Sighting match report at " + sighting.getLocation() + " (Facial Score: " + Math.round(faceScore * 100) + "%, Text Score: " + Math.round(textScore * 100) + "%)";
                AiMatch match = AiMatch.builder()
                        .missingCaseNumber(mp.getCaseNumber())
                        .foundCaseNumber("SIGHTING-" + sighting.getId())
                        .matchType("SIGHTING")
                        .similarityScore(Math.round(overallScore * 100.0) / 100.0)
                        .faceScore(Math.round(faceScore * 100.0) / 100.0)
                        .textScore(Math.round(textScore * 100.0) / 100.0)
                        .locationScore(Math.round(locScore * 100.0) / 100.0)
                        .clothingScore(Math.round(clothingScore * 100.0) / 100.0)
                        .timelineScore(0.80)
                        .explanation(explanation)
                        .matchStatus("PENDING_REVIEW")
                        .matchSource("AI_SIGHTING_CORRELATION_ENGINE")
                        .requestedBy(reportedBy)
                        .build();
                aiMatchRepository.save(match);

                if (mp.getStatus() == CaseStatus.OPEN) {
                    mp.setStatus(CaseStatus.MATCH_FOUND);
                    missingPersonRepository.save(mp);
                }
            }
        }
    }

    @Override
    public CaseStatus getStatus(String caseNumber) {
        Optional<MissingPerson> mp = missingPersonRepository.findByCaseNumber(caseNumber);
        return mp.map(MissingPerson::getStatus)
                .orElseThrow(() -> new IllegalArgumentException("Case not found: " + caseNumber));
    }

    @Override
    public List<CctvCamera> listCctvCameras() {
        return cctvCameraRepository.findAll();
    }

    @Override
    public PageResponse<CctvCamera> listCctvCamerasPaginated(int page, int size, String q, String status, String sortBy, String sortDir) {
        Pageable pageable = createPageable(page, size, sortBy, sortDir, "id");
        Specification<CctvCamera> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                Predicate codeMatch = cb.like(cb.lower(root.get("cameraCode")), pattern);
                Predicate labelMatch = cb.like(cb.lower(root.get("label")), pattern);
                Predicate cityMatch = cb.like(cb.lower(root.get("city")), pattern);
                Predicate locMatch = cb.like(cb.lower(root.get("location")), pattern);
                predicates.add(cb.or(codeMatch, labelMatch, cityMatch, locMatch));
            }

            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(cb.lower(root.get("status")), status.trim().toLowerCase()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<CctvCamera> resultPage = cctvCameraRepository.findAll(spec, pageable);
        return PageResponse.from(resultPage);
    }

    @Override
    @Transactional
    public CctvScanResponse scanCctv(String requestedBy, CctvScanRequest request) {
        CctvCamera camera = cctvCameraRepository.findByCameraCode(request.getCameraCode())
                .orElseThrow(() -> new IllegalArgumentException("Camera not found: " + request.getCameraCode()));

        List<MissingPerson> activeCases = missingPersonRepository.findAll().stream()
                .filter(m -> m.getStatus() == CaseStatus.OPEN || m.getStatus() == CaseStatus.UNDER_INVESTIGATION || m.getStatus() == CaseStatus.MATCH_FOUND)
                .toList();

        List<MatchResult.Candidate> detected = new ArrayList<>();

        if (request.getMissingCaseNumber() != null && !request.getMissingCaseNumber().isBlank()) {
            MatchResult result = aiMatchingProvider.matchByImage(request.getMissingCaseNumber(), request.getFrameImageUrl());
            detected.addAll(result.getCandidates());
            persistMatches(result, requestedBy != null ? requestedBy : "CCTV_SYSTEM");
        } else {
            for (MissingPerson mp : activeCases) {
                MatchResult result = aiMatchingProvider.matchByImage(mp.getCaseNumber(), request.getFrameImageUrl());
                if (!result.getCandidates().isEmpty()) {
                    for (MatchResult.Candidate c : result.getCandidates()) {
                        if (c.getSimilarityScore() >= 0.50) {
                            detected.add(c);
                        }
                    }
                }
            }
        }

        detected.sort(Comparator.comparingDouble(MatchResult.Candidate::getSimilarityScore).reversed());

        // Generate synthetic facial bounding boxes
        List<CctvScanResponse.DetectedBoundingBox> boxes = new ArrayList<>();
        boxes.add(CctvScanResponse.DetectedBoundingBox.builder()
                .boxId("FACE-DET-01")
                .top(22.5)
                .left(34.0)
                .width(18.5)
                .height(24.0)
                .faceQualityScore(94.2)
                .matchedPersonName(!detected.isEmpty() ? detected.get(0).getPersonName() : "Unknown Pedestrian")
                .matchSimilarity(!detected.isEmpty() ? detected.get(0).getSimilarityScore() : null)
                .build());

        if (detected.size() > 1) {
            boxes.add(CctvScanResponse.DetectedBoundingBox.builder()
                    .boxId("FACE-DET-02")
                    .top(45.0)
                    .left(62.0)
                    .width(16.0)
                    .height(21.0)
                    .faceQualityScore(88.6)
                    .matchedPersonName(detected.get(1).getPersonName())
                    .matchSimilarity(detected.get(1).getSimilarityScore())
                    .build());
        }

        return CctvScanResponse.builder()
                .cameraCode(camera.getCameraCode())
                .cameraLabel(camera.getLabel())
                .city(camera.getCity())
                .scannedAt(LocalDateTime.now())
                .matchDetected(!detected.isEmpty())
                .facesDetectedInFrame(boxes.size())
                .simulated(camera.isSimulated())
                .feedSourceType(camera.getFeedSourceType() != null ? camera.getFeedSourceType() : cctvFeedSource.getSourceType())
                .boundingBoxes(boxes)
                .candidates(detected.stream().limit(5).toList())
                .build();
    }

    @Override
    public NlpSearchResponse searchNlp(NlpSearchRequest request) {
        return aiNaturalLanguageSearchService.search(request);
    }

    @Override
    public OcrExtractResponse processOcr(String userId, OcrExtractRequest request) {
        return aiOcrService.processDocument(userId, request);
    }

    @Override
    public DuplicateCheckResponse checkDuplicate(DuplicateCheckRequest request) {
        return aiDuplicateDetectionService.checkDuplicate(request);
    }

    @Override
    public RiskAssessmentResponse assessRisk(Long missingPersonId) {
        MissingPerson mp = getMissingById(missingPersonId);
        return aiRiskAssessmentService.assessRisk(mp);
    }

    @Override
    public List<MissingPerson> listRiskPrioritizedQueue() {
        List<MissingPerson> list = missingPersonRepository.findAll();
        list.sort((a, b) -> {
            int rA = getRiskRank(a.getRiskLevel());
            int rB = getRiskRank(b.getRiskLevel());
            if (rA != rB) return Integer.compare(rA, rB);
            double sA = a.getRiskScore() != null ? a.getRiskScore() : 0.0;
            double sB = b.getRiskScore() != null ? b.getRiskScore() : 0.0;
            return Double.compare(sB, sA);
        });
        return list;
    }

    @Override
    public PageResponse<MissingPerson> listRiskPrioritizedQueuePaginated(int page, int size, String sortBy, String sortDir) {
        List<MissingPerson> fullQueue = listRiskPrioritizedQueue();
        int p = Math.max(0, page);
        int s = size > 0 ? size : 10;
        int fromIndex = p * s;
        if (fromIndex >= fullQueue.size()) {
            return PageResponse.of(Collections.emptyList(), p, s, fullQueue.size());
        }
        int toIndex = Math.min(fromIndex + s, fullQueue.size());
        List<MissingPerson> pagedList = fullQueue.subList(fromIndex, toIndex);
        return PageResponse.of(pagedList, p, s, fullQueue.size());
    }

    private int getRiskRank(String level) {
        if (level == null) return 3;
        return switch (level.toUpperCase()) {
            case "CRITICAL" -> 1;
            case "HIGH" -> 2;
            case "MEDIUM" -> 3;
            default -> 4;
        };
    }

    @Override
    @Transactional
    public AiMatch reviewMatch(Long matchId, String reviewerUserId, MatchReviewRequest request) {
        AiMatch match = aiMatchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match record not found: " + matchId));

        String action = request.getAction() != null ? request.getAction().toUpperCase() : "INVESTIGATING";
        match.setMatchStatus(action);
        match.setReviewedBy(reviewerUserId != null ? reviewerUserId : "OFFICER");
        match.setReviewedAt(LocalDateTime.now());
        match.setReviewNotes(request.getReviewNotes());

        // If human officer confirms verified match, update missing person and found person status
        if ("VERIFIED_MATCH".equals(action) || "APPROVED".equals(action) || "APPROVE".equals(action) || request.isUpdateCaseStatusToReunited()) {
            match.setMatchStatus("VERIFIED_MATCH");
            if (match.getMissingCaseNumber() != null) {
                missingPersonRepository.findByCaseNumber(match.getMissingCaseNumber()).ifPresent(mp -> {
                    mp.setStatus(CaseStatus.REUNITED);
                    missingPersonRepository.save(mp);
                });
            }
            if (match.getFoundCaseNumber() != null) {
                foundPersonRepository.findByCaseNumber(match.getFoundCaseNumber()).ifPresent(fp -> {
                    fp.setStatus(CaseStatus.REUNITED);
                    foundPersonRepository.save(fp);
                });
            }
        }

        return aiMatchRepository.save(match);
    }

    @Override
    public Map<String, Object> getStats() {
        List<MissingPerson> allMissing = missingPersonRepository.findAll();
        long total = allMissing.size();
        long open = allMissing.stream().filter(m -> m.getStatus() == CaseStatus.OPEN || m.getStatus() == CaseStatus.SUBMITTED).count();
        long underInvestigation = allMissing.stream().filter(m -> m.getStatus() == CaseStatus.UNDER_INVESTIGATION).count();
        long matchFound = allMissing.stream().filter(m -> m.getStatus() == CaseStatus.MATCH_FOUND).count();
        long reunited = allMissing.stream().filter(m -> m.getStatus() == CaseStatus.REUNITED).count();
        long closed = allMissing.stream().filter(m -> m.getStatus() == CaseStatus.CLOSED).count();

        long criticalRisk = allMissing.stream().filter(m -> "CRITICAL".equalsIgnoreCase(m.getRiskLevel())).count();
        long highRisk = allMissing.stream().filter(m -> "HIGH".equalsIgnoreCase(m.getRiskLevel())).count();

        List<FoundPerson> allFoundList = foundPersonRepository.findAll();
        long totalFound = allFoundList.size();
        long activeFound = allFoundList.stream().filter(f -> f.getStatus() != CaseStatus.CLOSED && f.getStatus() != CaseStatus.REUNITED).count();
        long hospitalFound = allFoundList.stream().filter(f -> "HOSPITAL".equalsIgnoreCase(f.getCategory())).count();
        long shelterFound = allFoundList.stream().filter(f -> "SHELTER".equalsIgnoreCase(f.getCategory())).count();
        long ngoFound = allFoundList.stream().filter(f -> "NGO".equalsIgnoreCase(f.getCategory())).count();
        long generalFound = allFoundList.stream().filter(f -> f.getCategory() == null || "GENERAL".equalsIgnoreCase(f.getCategory())).count();

        long totalSightings = sightingRepository.count();
        long verifiedSightings = sightingRepository.findAll().stream().filter(Sighting::isVerified).count();
        long pendingSightings = totalSightings - verifiedSightings;

        long totalAiMatches = aiMatchRepository.count();
        long verifiedAiMatches = aiMatchRepository.findAll().stream().filter(m -> "VERIFIED_MATCH".equalsIgnoreCase(m.getMatchStatus()) || "VERIFIED".equalsIgnoreCase(m.getMatchStatus())).count();
        long pendingAiMatches = aiMatchRepository.findAll().stream().filter(m -> "PENDING_REVIEW".equalsIgnoreCase(m.getMatchStatus()) || "PENDING_VERIFICATION".equalsIgnoreCase(m.getMatchStatus())).count();

        long liveCameras = cctvCameraRepository.findByStatus("live").size();
        long totalCameras = cctvCameraRepository.count();

        long maleMissing = allMissing.stream().filter(m -> "MALE".equalsIgnoreCase(m.getGender())).count();
        long femaleMissing = allMissing.stream().filter(m -> "FEMALE".equalsIgnoreCase(m.getGender())).count();
        long otherMissing = total - (maleMissing + femaleMissing);

        long active = open + underInvestigation + matchFound;
        long resolvedMissing = reunited + closed;
        long resolvedFound = allFoundList.stream().filter(f -> f.getStatus() == CaseStatus.REUNITED || f.getStatus() == CaseStatus.CLOSED).count();
        long totalResolved = resolvedMissing + resolvedFound;
        long totalActive = active + activeFound + totalSightings;
        long totalReports = total + totalFound + totalSightings;
        long totalClosed = closed + allFoundList.stream().filter(f -> f.getStatus() == CaseStatus.CLOSED).count();
        long pendingCases = open + underInvestigation + activeFound + pendingSightings;

        long totalNotifications = notificationClient.getNotificationsCount();

        Map<String, Object> stats = new HashMap<>();
        // Unified report and active case metrics (100% dynamic from DB)
        stats.put("totalReports", totalReports);
        stats.put("activeCases", totalActive);
        stats.put("totalActive", totalActive);
        stats.put("missingReports", total);
        stats.put("totalMissing", total);
        stats.put("activeMissing", active);
        stats.put("missingCount", active);
        stats.put("foundReports", totalFound);
        stats.put("totalFound", totalFound);
        stats.put("activeFound", activeFound);
        stats.put("foundCount", activeFound);
        stats.put("sightingReports", totalSightings);
        stats.put("totalSightings", totalSightings);
        stats.put("activeSightings", totalSightings);
        stats.put("sightingCount", totalSightings);
        stats.put("hospitalReports", hospitalFound);
        stats.put("hospitalPatients", hospitalFound);
        stats.put("hospital", hospitalFound);
        stats.put("shelterReports", shelterFound);
        stats.put("shelterResidents", shelterFound);
        stats.put("shelter", shelterFound);
        stats.put("ngoReports", ngoFound);
        stats.put("ngoRecords", ngoFound);
        stats.put("ngo", ngoFound);
        stats.put("generalFound", generalFound);
        stats.put("aiMatches", totalAiMatches);
        stats.put("totalAiMatches", totalAiMatches);
        stats.put("verifiedAiMatches", verifiedAiMatches);
        stats.put("pendingAiMatches", pendingAiMatches);
        stats.put("pendingCases", pendingCases);
        stats.put("resolvedCases", totalResolved);
        stats.put("closedCases", totalClosed);
        stats.put("open", open);
        stats.put("underInvestigation", underInvestigation);
        stats.put("matchFound", matchFound);
        stats.put("reunited", reunited);
        stats.put("closed", closed);
        stats.put("notifications", totalNotifications);
        stats.put("totalNotifications", totalNotifications);
        stats.put("criticalRiskCount", criticalRisk);
        stats.put("highRiskCount", highRisk);
        stats.put("verifiedSightings", verifiedSightings);
        stats.put("pendingSightings", pendingSightings);
        stats.put("liveCameras", liveCameras);
        stats.put("totalCameras", totalCameras);
        stats.put("maleCount", maleMissing);
        stats.put("femaleCount", femaleMissing);
        stats.put("otherCount", otherMissing);
        double resolutionRate = totalReports == 0 ? 0.0 : Math.round(((double) totalResolved / totalReports) * 1000.0) / 10.0;
        stats.put("resolutionRatePercent", resolutionRate);
        return stats;
    }

    @Override
    @Transactional
    public CctvCamera createCamera(CctvCameraRequest request) {
        String code = request.getCameraCode();
        if (code == null || code.isBlank()) {
            code = "CAM-" + request.getCity().substring(0, Math.min(3, request.getCity().length())).toUpperCase() + "-" + System.currentTimeMillis() % 10000;
        }
        CctvCamera camera = CctvCamera.builder()
                .cameraCode(code)
                .label(request.getLabel())
                .city(request.getCity())
                .specificLocation(request.getSpecificLocation())
                .status(request.getStatus() != null ? request.getStatus() : "live")
                .resolution(request.getResolution() != null ? request.getResolution() : "1080p")
                .fps(request.getFps() != null ? request.getFps() : 25)
                .streamUrl(request.getStreamUrl())
                .simulated(request.getSimulated() != null ? request.getSimulated() : true)
                .feedSourceType(request.getFeedSourceType() != null ? request.getFeedSourceType() : cctvFeedSource.getSourceType())
                .build();
        return cctvCameraRepository.save(camera);
    }

    @Override
    @Transactional
    public CctvCamera updateCamera(Long id, CctvCameraRequest request) {
        CctvCamera cam = cctvCameraRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Camera not found with id: " + id));
        if (request.getLabel() != null) cam.setLabel(request.getLabel());
        if (request.getCity() != null) cam.setCity(request.getCity());
        if (request.getSpecificLocation() != null) cam.setSpecificLocation(request.getSpecificLocation());
        if (request.getStatus() != null) cam.setStatus(request.getStatus());
        if (request.getResolution() != null) cam.setResolution(request.getResolution());
        if (request.getFps() != null) cam.setFps(request.getFps());
        if (request.getStreamUrl() != null) cam.setStreamUrl(request.getStreamUrl());
        if (request.getSimulated() != null) cam.setSimulated(request.getSimulated());
        if (request.getFeedSourceType() != null) cam.setFeedSourceType(request.getFeedSourceType());
        return cctvCameraRepository.save(cam);
    }

    @Override
    @Transactional
    public void deleteCamera(Long id) {
        cctvCameraRepository.deleteById(id);
    }

    @Override
    @Transactional
    public CctvCamera toggleCameraStatus(Long id, String status) {
        CctvCamera cam = cctvCameraRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Camera not found with id: " + id));
        cam.setStatus(status != null ? status : ("live".equalsIgnoreCase(cam.getStatus()) ? "offline" : "live"));
        return cctvCameraRepository.save(cam);
    }

    @Override
    @Transactional
    public CctvCropAnalysisResponse analyzeCctvCrop(String userId, CctvCropAnalysisRequest request) {
        CctvCamera camera = request.getCameraCode() != null ? cctvCameraRepository.findByCameraCode(request.getCameraCode()).orElse(null) : null;
        CctvCropAnalysisResponse response = cctvFeedSource.analyzeCrop(request, camera);

        // Record analysis session history in DB
        CctvAnalysisSession session = CctvAnalysisSession.builder()
                .cameraCode(request.getCameraCode())
                .investigatorUserId(userId != null ? userId : "OFFICER")
                .searchType("MANUAL_CROP")
                .candidatesFound(response.getCandidates().size())
                .topSimilarityScore(!response.getCandidates().isEmpty() ? response.getCandidates().get(0).getOverallSimilarityScore() : 0.0)
                .build();
        cctvAnalysisSessionRepository.save(session);

        return response;
    }

    @Override
    public CctvTimelineSearchResponse searchCctvTimeline(CctvTimelineSearchRequest request) {
        CctvCamera camera = request.getCameraCode() != null ? cctvCameraRepository.findByCameraCode(request.getCameraCode()).orElse(null) : null;
        return cctvFeedSource.searchTimeline(request, camera);
    }

    @Override
    @Transactional
    public CctvInvestigationLead saveInvestigationLead(String userId, CctvLeadRequest request) {
        CctvInvestigationLead lead = CctvInvestigationLead.builder()
                .cameraCode(request.getCameraCode())
                .cameraLabel(request.getCameraLabel())
                .location(request.getLocation())
                .detectionTimestamp(LocalDateTime.now())
                .capturedFrameUrl(request.getCapturedFrameUrl())
                .croppedPersonUrl(request.getCroppedPersonUrl())
                .missingCaseNumber(request.getMissingCaseNumber())
                .missingPersonName(request.getMissingPersonName())
                .overallSimilarityScore(request.getOverallSimilarityScore())
                .faceScore(request.getFaceScore())
                .clothingScore(request.getClothingScore())
                .appearanceScore(request.getAppearanceScore())
                .accessoryScore(request.getAccessoryScore())
                .rationale(request.getRationale())
                .investigatorUserId(userId != null ? userId : "OFFICER")
                .investigatorNotes(request.getInvestigatorNotes())
                .leadStatus("OPEN_LEAD")
                .build();
        return cctvInvestigationLeadRepository.save(lead);
    }

    @Override
    public List<CctvInvestigationLead> listInvestigationLeads() {
        return cctvInvestigationLeadRepository.findAll();
    }

    @Override
    @Transactional
    public int retriggerAllMatches(String requestedBy) {
        List<MissingPerson> missingList = missingPersonRepository.findAll().stream()
                .filter(m -> m.getStatus() != CaseStatus.CLOSED && m.getStatus() != CaseStatus.REUNITED)
                .toList();
        String actor = requestedBy != null ? requestedBy : "AI_ENGINE_RETRIGGER";

        for (MissingPerson mp : missingList) {
            triggerAiMatchingForMissing(mp, actor);
        }

        List<Sighting> sightings = sightingRepository.findAll();
        for (Sighting s : sightings) {
            triggerAiMatchingForSighting(s, actor);
        }

        return (int) aiMatchRepository.count();
    }

    private void triggerAiMatchingForMissing(MissingPerson mp, String requestedBy) {
        if (mp == null || mp.getCaseNumber() == null) return;
        String actor = requestedBy != null ? requestedBy : "AI_VISION_PIPELINE";
        boolean hasPhoto = (mp.getPhotoUrl() != null && !mp.getPhotoUrl().isBlank());
        if (hasPhoto) {
            try {
                MatchResult mr = aiMatchingProvider.matchByImage(mp.getCaseNumber(), mp.getPhotoUrl());
                persistMatches(mr, actor);
            } catch (Exception e) {
                log.warn("Biometric matching failed for case {}: {}", mp.getCaseNumber(), e.getMessage());
            }
        } else if (mp.getDescription() != null && !mp.getDescription().isBlank()) {
            try {
                MatchResult mr = aiMatchingProvider.matchByText(mp.getCaseNumber(), mp.getDescription());
                persistMatches(mr, actor);
            } catch (Exception e) {
                log.warn("NLP text matching failed for case {}: {}", mp.getCaseNumber(), e.getMessage());
            }
        }
    }

    @Override
    public List<CctvAnalysisSession> listAnalysisHistory() {
        return cctvAnalysisSessionRepository.findAll();
    }

    @Override
    @Transactional
    public MissingPerson updateMissingPhoto(String idOrCaseNumber, org.springframework.web.multipart.MultipartFile file) {
        MissingPerson mp = getMissingByIdOrCaseNumber(idOrCaseNumber);
        String url = fileStorageService.storeFile(file, "photos/missing");
        mp.setPhotoUrl(url);
        return missingPersonRepository.save(mp);
    }

    @Override
    @Transactional
    public FoundPerson updateFoundPhoto(String idOrCaseNumber, org.springframework.web.multipart.MultipartFile file) {
        FoundPerson fp = getFoundByIdOrCaseNumber(idOrCaseNumber);
        String url = fileStorageService.storeFile(file, "photos/found");
        fp.setPhotoUrl(url);
        return foundPersonRepository.save(fp);
    }

    @Override
    public String uploadFile(org.springframework.web.multipart.MultipartFile file, String folder) {
        return fileStorageService.storeFile(file, folder != null ? folder : "uploads");
    }

    @Override
    @Transactional
    public void deleteFound(String idOrCaseNumber) {
        FoundPerson fp = getFoundByIdOrCaseNumber(idOrCaseNumber);
        foundPersonRepository.delete(fp);
        auditLogClient.logAsync("ADMIN", "ADMIN", "FOUND_CASE_DELETED", "Deleted found case #" + idOrCaseNumber + " (" + fp.getApproximateName() + ")");
    }

    @Override
    @Transactional
    public Object submitUnifiedReport(String userId, UnifiedReportRequest request, org.springframework.web.multipart.MultipartFile file) {
        if (userId == null || userId.isBlank() || "anonymousUser".equalsIgnoreCase(userId) || "citizen".equalsIgnoreCase(userId) || "anonymous".equalsIgnoreCase(userId)) {
            throw new IllegalArgumentException("Authentication required. You must be logged in to submit a report.");
        }
        String uid = userId.trim();

        String photoUrl = request.getPhoto();
        if (file != null && !file.isEmpty()) {
            photoUrl = uploadFile(file, "photos/reports");
        }

        String type = request.getReportType();
        if (type == null || type.isBlank()) {
            if (request.getMissingCaseNumber() != null && !request.getMissingCaseNumber().isBlank()) {
                type = "SIGHTING";
            } else if (request.getCategory() != null && !request.getCategory().isBlank()) {
                type = "FOUND_PERSON";
            } else {
                type = "MISSING_PERSON";
            }
        }

        String cleanType = type.trim().toUpperCase();

        if (cleanType.contains("FOUND")) {
            FoundPersonRequest fpr = new FoundPersonRequest();
            fpr.setApproximateName(request.getPersonName());
            fpr.setApproximateAge(request.getAge());
            fpr.setGender(request.getGender());
            fpr.setFoundLocation(request.getLastSeenLocation());
            if (request.getLastSeenDate() != null) {
                fpr.setFoundDateValue(request.getLastSeenDate());
            }
            fpr.setPhotoUrl(photoUrl);
            fpr.setDescription(request.getDescription());
            fpr.setCurrentLocation(request.getCurrentLocation());
            fpr.setCategory(request.getCategory() != null ? request.getCategory() : "GENERAL");
            fpr.setContactNumber(request.getEmergencyContactPhone());
            fpr.setReportedBy(uid);
            return reportFound(uid, fpr);
        } else if (cleanType.contains("SIGHTING")) {
            SightingRequest sr = new SightingRequest();
            sr.setMissingCaseNumber(request.getMissingCaseNumber() != null ? request.getMissingCaseNumber() : "GENERAL_SIGHTING");
            sr.setLocation(request.getLastSeenLocation() != null ? request.getLastSeenLocation() : "Recorded Field Location");
            sr.setDescription(request.getDescription());
            sr.setPhotoUrl(photoUrl);
            if (request.getLastSeenDate() != null) {
                sr.setSightedAtValue(request.getLastSeenDate());
            }
            sr.setReporterPhone(request.getEmergencyContactPhone());
            sr.setReporterName(request.getPersonName());
            sr.setReportedBy(uid);
            reportSighting(uid, sr);
            return Map.of("status", "SUCCESS", "message", "Sighting report submitted successfully", "type", "SIGHTING");
        } else {
            // MISSING_PERSON
            MissingPersonRequest mpr = new MissingPersonRequest();
            mpr.setName(request.getPersonName());
            mpr.setAge(request.getAge());
            mpr.setGender(request.getGender());
            mpr.setHeight(request.getHeight());
            mpr.setComplexion(request.getComplexion());
            mpr.setIdentifyingMarks(request.getIdentifyingMarks());
            mpr.setLastSeenLocation(request.getLastSeenLocation());
            if (request.getLastSeenDate() != null) {
                mpr.setLastSeenDateValue(request.getLastSeenDate());
            }
            mpr.setPhotoUrl(photoUrl);
            mpr.setDescription(request.getDescription());
            mpr.setContactPhone(request.getEmergencyContactPhone());
            mpr.setPriority(request.getPriorityLevel() != null ? request.getPriorityLevel() : "HIGH");
            mpr.setBloodGroup(request.getBloodGroup());
            mpr.setMedicalConditions(request.getMedicalConditions());
            mpr.setReportedBy(uid);
            return reportMissing(uid, mpr);
        }
    }

    @Override
    public Map<String, Object> getActiveCases(String type, String q) {
        String filterType = (type != null) ? type.trim().toLowerCase() : "all";
        String queryTerm = (q != null) ? q.trim().toLowerCase() : "";

        // 1. Active Missing (status != CLOSED and status != REUNITED)
        List<MissingPerson> activeMissingList = missingPersonRepository.findAll().stream()
                .filter(m -> m.getStatus() != CaseStatus.CLOSED && m.getStatus() != CaseStatus.REUNITED)
                .toList();

        // 2. Active Found (status != CLOSED and status != REUNITED)
        List<FoundPerson> activeFoundList = foundPersonRepository.findAll().stream()
                .filter(f -> f.getStatus() != CaseStatus.CLOSED && f.getStatus() != CaseStatus.REUNITED)
                .toList();

        // 3. Active Sightings
        List<Sighting> activeSightingsList = sightingRepository.findAll();

        long missingCount = activeMissingList.size();
        long foundCount = activeFoundList.size();
        long sightingCount = activeSightingsList.size();
        long totalActive = missingCount + foundCount + sightingCount;

        List<Map<String, Object>> unifiedCases = new ArrayList<>();

        if ("all".equals(filterType) || "missing".equals(filterType)) {
            for (MissingPerson m : activeMissingList) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", m.getId());
                item.put("caseNumber", m.getCaseNumber());
                item.put("kind", "missing");
                item.put("type", "missing");
                item.put("fullName", m.getName());
                item.put("name", m.getName());
                item.put("age", m.getAge());
                item.put("gender", m.getGender());
                item.put("lastSeenLocation", m.getLastSeenLocation());
                item.put("lastSeenDate", m.getLastSeenDate());
                item.put("dateRecorded", m.getCreatedAt());
                item.put("photoUrl", m.getPhotoUrl());
                item.put("description", m.getDescription());
                item.put("contactPhone", m.getContactPhone());
                item.put("status", m.getStatus() != null ? m.getStatus().name() : "OPEN");
                item.put("riskLevel", m.getRiskLevel());
                item.put("priority", m.getRiskLevel() != null ? m.getRiskLevel() : "HIGH");
                item.put("reportedBy", m.getReportedBy());
                item.put("userId", m.getUserId());
                unifiedCases.add(item);
            }
        }

        if ("all".equals(filterType) || "found".equals(filterType)) {
            for (FoundPerson f : activeFoundList) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", f.getId());
                item.put("caseNumber", f.getCaseNumber());
                item.put("kind", "found");
                item.put("type", "found");
                item.put("fullName", f.getApproximateName() != null ? f.getApproximateName() : "Unidentified Individual");
                item.put("name", f.getApproximateName() != null ? f.getApproximateName() : "Unidentified Individual");
                item.put("approximateName", f.getApproximateName());
                item.put("age", f.getApproximateAge());
                item.put("gender", f.getGender());
                item.put("foundLocation", f.getFoundLocation());
                item.put("currentLocation", f.getCurrentLocation());
                item.put("dateRecorded", f.getCreatedAt());
                item.put("photoUrl", f.getPhotoUrl());
                item.put("description", f.getDescription());
                item.put("contactPhone", "Confidential");
                item.put("status", f.getStatus() != null ? f.getStatus().name() : "OPEN");
                item.put("category", f.getCategory());
                item.put("priority", "HIGH");
                item.put("reportedBy", f.getReportedBy());
                item.put("userId", f.getUserId());
                unifiedCases.add(item);
            }
        }

        if ("all".equals(filterType) || "sighting".equals(filterType)) {
            for (Sighting s : activeSightingsList) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", s.getId());
                item.put("caseNumber", "SIGHTING-" + s.getId());
                item.put("missingCaseNumber", s.getMissingCaseNumber());
                item.put("kind", "sighting");
                item.put("type", "sighting");
                item.put("fullName", "Sighting lead for " + s.getMissingCaseNumber());
                item.put("name", "Sighting lead for " + s.getMissingCaseNumber());
                item.put("lastSeenLocation", s.getLocation());
                item.put("dateRecorded", s.getSightedAt() != null ? s.getSightedAt() : s.getCreatedAt());
                item.put("photoUrl", s.getPhotoUrl());
                item.put("description", s.getDescription());
                item.put("status", s.isVerified() ? "UNDER_INVESTIGATION" : "SUBMITTED");
                item.put("verified", s.isVerified());
                item.put("priority", "MEDIUM");
                item.put("reportedBy", s.getReportedBy());
                item.put("userId", s.getUserId());
                unifiedCases.add(item);
            }
        }

        List<Map<String, Object>> filteredCases = unifiedCases;
        if (!queryTerm.isBlank()) {
            filteredCases = unifiedCases.stream().filter(c -> {
                String cn = String.valueOf(c.getOrDefault("caseNumber", "")).toLowerCase();
                String mcn = String.valueOf(c.getOrDefault("missingCaseNumber", "")).toLowerCase();
                String fn = String.valueOf(c.getOrDefault("fullName", "")).toLowerCase();
                String loc = String.valueOf(c.getOrDefault("lastSeenLocation", "")).toLowerCase();
                String floc = String.valueOf(c.getOrDefault("foundLocation", "")).toLowerCase();
                String desc = String.valueOf(c.getOrDefault("description", "")).toLowerCase();
                return cn.contains(queryTerm) || mcn.contains(queryTerm) || fn.contains(queryTerm) ||
                       loc.contains(queryTerm) || floc.contains(queryTerm) || desc.contains(queryTerm);
            }).toList();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("totalActive", totalActive);
        response.put("missingCount", missingCount);
        response.put("foundCount", foundCount);
        response.put("sightingCount", sightingCount);
        response.put("cases", filteredCases);
        response.put("totalElements", filteredCases.size());
        return response;
    }

    @Override
    @Transactional
    public UploadedFile submitVerificationEvidence(String userId, String caseNumber, Long matchId, String evidenceType, String title, String description, String verificationNotes, String officerName, String badgeNumber, org.springframework.web.multipart.MultipartFile file) {
        UploadedFile saved = evidenceService.uploadVerificationEvidence(userId, caseNumber, matchId, evidenceType, title, description, verificationNotes, officerName, badgeNumber, file);

        // Update missing person status to EVIDENCE_SUBMITTED
        missingPersonRepository.findByCaseNumber(caseNumber).ifPresent(mp -> {
            mp.setStatus(CaseStatus.EVIDENCE_SUBMITTED);
            missingPersonRepository.save(mp);
        });

        // Update match status to EVIDENCE_SUBMITTED if matchId present
        if (matchId != null) {
            aiMatchRepository.findById(matchId).ifPresent(m -> {
                m.setMatchStatus("EVIDENCE_SUBMITTED");
                m.setReviewNotes("Evidence attached: " + evidenceType + ". " + (verificationNotes != null ? verificationNotes : ""));
                m.setReviewedBy(userId != null ? userId : "OFFICER");
                m.setReviewedAt(LocalDateTime.now());
                aiMatchRepository.save(m);
            });
        }

        auditLogClient.logAsync(userId != null ? userId : "OFFICER", "OFFICER", "VERIFICATION_EVIDENCE_SUBMITTED",
                "Verification evidence (" + evidenceType + ") submitted for case #" + caseNumber);

        return saved;
    }

    @Override
    @Transactional
    public Map<String, Object> requestReunificationConfirmation(String userId, String caseNumber, Long matchId) {
        MissingPerson mp = missingPersonRepository.findByCaseNumber(caseNumber)
                .orElseThrow(() -> new IllegalArgumentException("Case not found: " + caseNumber));

        mp.setStatus(CaseStatus.REUNIFICATION_PENDING);
        missingPersonRepository.save(mp);

        if (matchId != null) {
            aiMatchRepository.findById(matchId).ifPresent(m -> {
                m.setMatchStatus("REUNIFICATION_PENDING");
                m.setReviewedBy(userId != null ? userId : "OFFICER");
                m.setReviewedAt(LocalDateTime.now());
                aiMatchRepository.save(m);
            });
        }

        String recipient = mp.getReportedBy() != null && !mp.getReportedBy().isBlank() ? mp.getReportedBy() : (mp.getUserId() != null ? mp.getUserId() : "citizen");
        String title = "🚨 Reunification Confirmation Requested: Case #" + caseNumber;
        String msg = "A possible match has been identified with verified evidence for your missing-person report (" + (mp.getName() != null ? mp.getName() : "Subject") + "). Please verify whether the person has been safely found/reunited.";
        String dedupKey = "REUNIF_REQ_" + caseNumber + "_" + (matchId != null ? matchId : "0");

        notificationClient.sendNotificationAsync(recipient, title, msg, "REUNIFICATION_REQUEST", caseNumber, matchId, mp.getLastSeenLocation(), dedupKey);
        // Also dispatch to police & admin
        notificationClient.sendNotificationAsync("police_officer", "Reunification Requested: Case #" + caseNumber, "Reunification verification request sent to citizen reporter for case #" + caseNumber, "CASE", caseNumber, matchId, null, dedupKey + "_POLICE");

        auditLogClient.logAsync(userId != null ? userId : "OFFICER", "OFFICER", "REUNIFICATION_REQUESTED",
                "Reunification confirmation request dispatched to reporter (" + recipient + ") for case #" + caseNumber);

        CaseReunificationRequest reqRecord = caseReunificationRequestRepository.findTopByCaseNumberOrderByIdDesc(caseNumber)
                .orElseGet(() -> CaseReunificationRequest.builder()
                        .caseNumber(caseNumber)
                        .reportedBy(recipient)
                        .build());
        reqRecord.setMatchId(matchId);
        reqRecord.setReportedBy(recipient);
        reqRecord.setReunificationStatus("PENDING");
        reqRecord.setStatus("PENDING");
        caseReunificationRequestRepository.save(reqRecord);

        Map<String, Object> res = new HashMap<>();
        res.put("status", "SUCCESS");
        res.put("caseNumber", caseNumber);
        res.put("caseStatus", "REUNIFICATION_PENDING");
        res.put("recipient", recipient);
        res.put("message", "Reunification confirmation request sent to reporting family/guardian.");
        return res;
    }

    @Override
    @Transactional
    public CaseReunificationRequest confirmReunification(String userId, String caseNumber, com.misxmatch.casesvc.dto.ReunificationConfirmationRequest request) {
        MissingPerson mp = missingPersonRepository.findByCaseNumber(caseNumber)
                .orElseThrow(() -> new IllegalArgumentException("Case not found: " + caseNumber));

        mp.setStatus(CaseStatus.REUNIFICATION_CONFIRMED);
        missingPersonRepository.save(mp);

        Long matchId = request.getMatchId();
        if (matchId != null) {
            aiMatchRepository.findById(matchId).ifPresent(m -> {
                m.setMatchStatus("REUNIFICATION_CONFIRMED");
                m.setReviewNotes("Citizen reporter confirmed safe reunification on " + request.getReunificationDate() + " at " + request.getReunificationLocation());
                aiMatchRepository.save(m);

                if (m.getFoundCaseNumber() != null) {
                    foundPersonRepository.findByCaseNumber(m.getFoundCaseNumber()).ifPresent(fp -> {
                        fp.setStatus(CaseStatus.REUNIFICATION_CONFIRMED);
                        foundPersonRepository.save(fp);
                    });
                }
            });
        }

        CaseReunificationRequest req = caseReunificationRequestRepository.findTopByCaseNumberOrderByIdDesc(caseNumber)
                .orElseGet(() -> CaseReunificationRequest.builder()
                        .caseNumber(caseNumber)
                        .build());

        req.setMatchId(matchId != null ? matchId : req.getMatchId());
        req.setReportedBy(mp.getReportedBy() != null ? mp.getReportedBy() : (userId != null ? userId : req.getReportedBy()));
        req.setReunificationStatus("CONFIRMED");
        req.setReunitedWith(request.getReunitedWith() != null ? request.getReunitedWith() : "Family");
        req.setReunificationDate(request.getReunificationDate() != null ? request.getReunificationDate() : java.time.LocalDate.now().toString());
        req.setReunificationLocation(request.getReunificationLocation());
        req.setConfirmationMessage(request.getConfirmationMessage());
        req.setConsentGiven(Boolean.TRUE.equals(request.getConsentGiven()));
        req.setSupportingEvidenceUrl(request.getSupportingEvidenceUrl());
        req.setStatus("PENDING_AUTHORITY_REVIEW");
        req.setConfirmedAt(LocalDateTime.now());

        CaseReunificationRequest saved = caseReunificationRequestRepository.save(req);

        // Notify Admin & Police
        String matchRef = "";
        Long effectiveMatchId = matchId != null ? matchId : req.getMatchId();
        if (effectiveMatchId != null) {
            var matchOpt = aiMatchRepository.findById(effectiveMatchId);
            if (matchOpt.isPresent()) {
                String fcn = matchOpt.get().getFoundCaseNumber();
                matchRef = "Match #" + (fcn != null && !fcn.isBlank() ? fcn : effectiveMatchId);
            } else {
                matchRef = "Match #" + effectiveMatchId;
            }
        }
        if (matchRef.isBlank()) {
            matchRef = "Match #" + caseNumber;
        }

        String title = "Reunification Confirmed: Case #" + caseNumber;
        String msg = "Reporter confirmed reunification for Case #" + caseNumber + ". " + matchRef + " requires authority review.";
        notificationClient.sendNotificationAsync("admin", title, msg, "APPROVAL", caseNumber, effectiveMatchId, null, "REUNIF_CONF_" + caseNumber + "_ADMIN_" + System.currentTimeMillis());
        notificationClient.sendNotificationAsync("police_officer", title, msg, "CASE", caseNumber, effectiveMatchId, null, "REUNIF_CONF_" + caseNumber + "_POLICE_" + System.currentTimeMillis());

        auditLogClient.logAsync(userId != null ? userId : "CITIZEN", "CITIZEN", "REUNIFICATION_CONFIRMED",
                "Reunification officially confirmed by family for case #" + caseNumber + " at " + request.getReunificationLocation());

        return saved;
    }

    @Override
    @Transactional
    public CaseReunificationRequest rejectReunification(String userId, String caseNumber, com.misxmatch.casesvc.dto.ReunificationRejectionRequest request) {
        MissingPerson mp = missingPersonRepository.findByCaseNumber(caseNumber)
                .orElseThrow(() -> new IllegalArgumentException("Case not found: " + caseNumber));

        // The case must remain ACTIVE / UNDER_INVESTIGATION and should NOT be closed
        mp.setStatus(CaseStatus.UNDER_INVESTIGATION);
        missingPersonRepository.save(mp);

        Long matchId = request.getMatchId();
        if (matchId != null) {
            aiMatchRepository.findById(matchId).ifPresent(m -> {
                m.setMatchStatus("MATCH_REJECTED");
                m.setReviewNotes("Match rejected by reporter. Reason: " + request.getRejectionReason() + ". " + (request.getRejectionNotes() != null ? request.getRejectionNotes() : ""));
                m.setReviewedAt(LocalDateTime.now());
                aiMatchRepository.save(m);
            });
        }

        CaseReunificationRequest req = caseReunificationRequestRepository.findTopByCaseNumberOrderByIdDesc(caseNumber)
                .orElseGet(() -> CaseReunificationRequest.builder()
                        .caseNumber(caseNumber)
                        .build());

        req.setMatchId(matchId != null ? matchId : req.getMatchId());
        req.setReportedBy(mp.getReportedBy() != null ? mp.getReportedBy() : (userId != null ? userId : req.getReportedBy()));
        req.setReunificationStatus("REJECTED");
        req.setRejectionReason(request.getRejectionReason() != null ? request.getRejectionReason() : "Wrong person");
        req.setRejectionNotes(request.getRejectionNotes());
        req.setStatus("REJECTED");
        req.setRejectedAt(LocalDateTime.now());

        CaseReunificationRequest saved = caseReunificationRequestRepository.save(req);

        // Notify Police & Admin
        String rejMatchRef = "";
        Long rejEffectiveMatchId = matchId != null ? matchId : req.getMatchId();
        if (rejEffectiveMatchId != null) {
            var matchOpt = aiMatchRepository.findById(rejEffectiveMatchId);
            if (matchOpt.isPresent()) {
                String fcn = matchOpt.get().getFoundCaseNumber();
                rejMatchRef = "Match #" + (fcn != null && !fcn.isBlank() ? fcn : rejEffectiveMatchId);
            } else {
                rejMatchRef = "Match #" + rejEffectiveMatchId;
            }
        }
        if (rejMatchRef.isBlank()) {
            rejMatchRef = "Match #" + caseNumber;
        }

        String reason = (request.getRejectionReason() != null && !request.getRejectionReason().isBlank()) ? request.getRejectionReason() : "Wrong person";
        String rejTitle = "Match Rejected: Case #" + caseNumber;
        String rejMsg = "Reporter rejected " + rejMatchRef + " for Case #" + caseNumber + ". Reason: " + reason + ". Further investigation required.";
        notificationClient.sendNotificationAsync("admin", rejTitle, rejMsg, "APPROVAL", caseNumber, rejEffectiveMatchId, null, "REUNIF_REJ_" + caseNumber + "_ADMIN_" + System.currentTimeMillis());
        notificationClient.sendNotificationAsync("police_officer", rejTitle, rejMsg, "CASE", caseNumber, rejEffectiveMatchId, null, "REUNIF_REJ_" + caseNumber + "_POLICE_" + System.currentTimeMillis());

        auditLogClient.logAsync(userId != null ? userId : "CITIZEN", "CITIZEN", "REUNIFICATION_REJECTED",
                "Match candidate rejected by family for case #" + caseNumber + ". Reason: " + request.getRejectionReason());

        return saved;
    }

    @Override
    public Optional<CaseReunificationRequest> getReunificationDetails(String caseNumber) {
        return caseReunificationRequestRepository.findTopByCaseNumberOrderByIdDesc(caseNumber);
    }

    @Override
    @Transactional
    public CaseReunificationRequest approveReunificationClosure(String adminUserId, String caseNumber, String notes) {
        MissingPerson mp = missingPersonRepository.findByCaseNumber(caseNumber)
                .orElseThrow(() -> new IllegalArgumentException("Case not found: " + caseNumber));

        mp.setStatus(CaseStatus.CLOSED);
        missingPersonRepository.save(mp);

        CaseReunificationRequest req = caseReunificationRequestRepository.findTopByCaseNumberOrderByIdDesc(caseNumber)
                .orElseGet(() -> CaseReunificationRequest.builder()
                        .caseNumber(caseNumber)
                        .reportedBy(mp.getReportedBy())
                        .build());

        req.setReunificationStatus("CLOSED");
        req.setStatus("CLOSED");
        req.setReviewedBy(adminUserId != null ? adminUserId : "SUPER_ADMIN");
        req.setReviewedAt(LocalDateTime.now());
        req.setAdminReviewNotes(notes);

        CaseReunificationRequest saved = caseReunificationRequestRepository.save(req);

        // Also close linked found person and match if any
        if (req.getMatchId() != null) {
            aiMatchRepository.findById(req.getMatchId()).ifPresent(m -> {
                m.setMatchStatus("CLOSED");
                aiMatchRepository.save(m);
                if (m.getFoundCaseNumber() != null) {
                    foundPersonRepository.findByCaseNumber(m.getFoundCaseNumber()).ifPresent(fp -> {
                        fp.setStatus(CaseStatus.CLOSED);
                        foundPersonRepository.save(fp);
                    });
                }
            });
        }

        // Dispatch notifications
        String title = "Official Case Closure: Case #" + caseNumber;
        String msg = "Case #" + caseNumber + " (" + (mp.getName() != null ? mp.getName() : "Subject") + ") has been officially closed and archived following administrative verification and family reunification.";
        String reporter = mp.getReportedBy() != null ? mp.getReportedBy() : "citizen";
        notificationClient.sendNotificationAsync(reporter, title, msg, "CASE", caseNumber, req.getMatchId(), null, "CLOSURE_APPROVED_" + caseNumber + "_CITIZEN");
        notificationClient.sendNotificationAsync("police_officer", title, msg, "CASE", caseNumber, req.getMatchId(), null, "CLOSURE_APPROVED_" + caseNumber + "_POLICE");

        auditLogClient.logAsync(adminUserId != null ? adminUserId : "ADMIN", "ADMIN", "CASE_CLOSED_BY_ADMIN",
                "Case #" + caseNumber + " officially approved for closure and archived.");

        return saved;
    }
}
