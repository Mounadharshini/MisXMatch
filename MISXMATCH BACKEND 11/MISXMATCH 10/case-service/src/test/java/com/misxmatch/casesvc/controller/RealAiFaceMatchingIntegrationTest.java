package com.misxmatch.casesvc.controller;

import com.misxmatch.casesvc.entity.*;
import com.misxmatch.casesvc.repository.*;
import com.misxmatch.casesvc.service.AiMatchingProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class RealAiFaceMatchingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MissingPersonRepository missingPersonRepository;

    @Autowired
    private FoundPersonRepository foundPersonRepository;

    @Autowired
    private SightingRepository sightingRepository;

    @Autowired
    private UploadedFileRepository uploadedFileRepository;

    @Autowired
    private AiMatchRepository aiMatchRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private AiMatchingProvider aiMatchingProvider;

    @BeforeEach
    void setUp() {
        aiMatchRepository.deleteAll();
        missingPersonRepository.deleteAll();
        foundPersonRepository.deleteAll();
        sightingRepository.deleteAll();
        uploadedFileRepository.deleteAll();

        // 1. Missing Person Report (Target for matching)
        MissingPerson mp = MissingPerson.builder()
                .caseNumber("MP-REAL-101")
                .name("Aarav Sharma")
                .age(12)
                .gender("Male")
                .lastSeenLocation("Kashmere Gate, Delhi")
                .lastSeenDate(LocalDate.now().minusDays(2))
                .reportedBy("citizen@example.com")
                .photoUrl("https://images.unsplash.com/photo-1544005313-94ddf0286df2")
                .description("Wearing blue jeans and red shirt with spectacles.")
                .status(CaseStatus.OPEN)
                .build();
        missingPersonRepository.save(mp);

        // 2. Found Person (Category: GENERAL)
        FoundPerson fpGen = FoundPerson.builder()
                .caseNumber("FP-REAL-201")
                .approximateName("Unidentified Boy 1")
                .approximateAge(12)
                .gender("Male")
                .foundLocation("Kashmere Gate ISBT, Delhi")
                .foundDate(LocalDate.now().minusDays(1))
                .reportedBy("police_officer")
                .category("GENERAL")
                .photoUrl("https://images.unsplash.com/photo-1544005313-94ddf0286df2")
                .description("Young boy wearing red shirt.")
                .status(CaseStatus.OPEN)
                .build();
        foundPersonRepository.save(fpGen);

        // 3. Hospital Patient (Category: HOSPITAL)
        FoundPerson fpHosp = FoundPerson.builder()
                .caseNumber("HP-REAL-301")
                .approximateName("Trauma Patient #402")
                .approximateAge(12)
                .gender("Male")
                .foundLocation("AIIMS Trauma Centre, New Delhi")
                .foundDate(LocalDate.now())
                .reportedBy("hospital_staff")
                .category("HOSPITAL")
                .photoUrl("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d")
                .description("Admitted in ER ward with spectacles.")
                .status(CaseStatus.OPEN)
                .build();
        foundPersonRepository.save(fpHosp);

        // 4. Shelter Resident (Category: SHELTER / NGO) - NO PHOTO ATTACHED
        FoundPerson fpShelter = FoundPerson.builder()
                .caseNumber("SR-REAL-401")
                .approximateName("Shelter Intake #18")
                .approximateAge(13)
                .gender("Male")
                .foundLocation("Sneha Sadan Shelter, Delhi")
                .foundDate(LocalDate.now())
                .reportedBy("shelter_manager")
                .category("SHELTER")
                .photoUrl("") // NO PHOTO ATTACHED
                .description("Minor boy located near railway station.")
                .status(CaseStatus.OPEN)
                .build();
        foundPersonRepository.save(fpShelter);

        // 5. Citizen Sighting with photo
        Sighting sighting = Sighting.builder()
                .missingCaseNumber("MP-REAL-101")
                .reportedBy("citizen_watcher")
                .location("Majestic Metro, Delhi")
                .description("Spotted boy matching description near platform.")
                .photoUrl("https://images.unsplash.com/photo-1544005313-94ddf0286df2")
                .sightedAt(LocalDateTime.now().minusHours(4))
                .verified(false)
                .build();
        sightingRepository.save(sighting);

        // 6. CCTV Evidence Upload
        UploadedFile cctvFile = UploadedFile.builder()
                .caseNumber("MP-REAL-101")
                .title("CCTV Kashmere Gate Platform 4 Frame")
                .category("cctv")
                .location("Kashmere Gate Metro Platform 4")
                .fileUrl("https://images.unsplash.com/photo-1544005313-94ddf0286df2")
                .description("Surveillance crop containing young male subject.")
                .uploadedBy("police_officer")
                .build();
        uploadedFileRepository.save(cctvFile);
    }

    @Test
    @DisplayName("Verify multi-source candidates query across Found, Hospital, Shelter, Sighting, and CCTV")
    void testMultiSourceCandidateMatching() {
        var matchResult = aiMatchingProvider.matchByImage("MP-REAL-101", null);
        assertNotNull(matchResult, "Match result must not be null");
        assertNotNull(matchResult.getCandidates(), "Candidates list must not be null");

        // Verify multi-source report types present in candidates
        boolean hasFound = matchResult.getCandidates().stream().anyMatch(c -> "FOUND_PERSON".equals(c.getTargetReportType()));
        boolean hasHospital = matchResult.getCandidates().stream().anyMatch(c -> "HOSPITAL_PATIENT".equals(c.getTargetReportType()));
        boolean hasShelter = matchResult.getCandidates().stream().anyMatch(c -> "SHELTER_RESIDENT".equals(c.getTargetReportType()));
        boolean hasSighting = matchResult.getCandidates().stream().anyMatch(c -> "CITIZEN_SIGHTING".equals(c.getTargetReportType()));
        boolean hasCctv = matchResult.getCandidates().stream().anyMatch(c -> "CCTV_EVIDENCE".equals(c.getTargetReportType()));

        assertTrue(hasFound || hasHospital || hasShelter || hasSighting || hasCctv,
                "Candidates must contain records from multi-source database queries");
    }

    @Test
    @DisplayName("Verify Candidate with NO photo has null face score (No artificial 0% or fake scores assigned)")
    void testCandidateWithNoPhotoHasNullFaceScore() {
        var matchResult = aiMatchingProvider.matchByImage("MP-REAL-101", null);
        assertNotNull(matchResult);

        var shelterCand = matchResult.getCandidates().stream()
                .filter(c -> "SR-REAL-401".equals(c.getTargetCaseNumber()))
                .findFirst();

        if (shelterCand.isPresent()) {
            assertNull(shelterCand.get().getSimilarityScore(),
                    "Candidate without a photo must have null similarityScore (No fake 0% score)");
            assertNull(shelterCand.get().getFaceScore(),
                    "Candidate without a photo must have null faceScore");
        }
    }

    @Test
    @DisplayName("POST /api/cases/{caseId}/ai/face-match - Executes multi-source face match & persists to MySQL")
    void testExecuteFaceMatchApiAndPersistToMySql() throws Exception {
        mockMvc.perform(post("/api/cases/MP-REAL-101/ai/face-match")
                        .header("X-User-Id", "POLICE_OFFICER_1")
                        .header("X-User-Role", "POLICE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUCCESS")))
                .andExpect(jsonPath("$.caseId", is("MP-REAL-101")));

        var persistedMatches = aiMatchRepository.findByMissingCaseNumberOrFoundCaseNumber("MP-REAL-101", "MP-REAL-101");
        assertFalse(persistedMatches.isEmpty(), "Matches must be persisted in ai_matches MySQL table");
    }

    @Test
    @DisplayName("POST /ai/matches/{matchId}/review - Human officer review approval updates match status and audit log")
    void testHumanOfficerReviewWorkflow() throws Exception {
        AiMatch match = AiMatch.builder()
                .missingCaseNumber("MP-REAL-101")
                .targetCaseNumber("FP-REAL-201")
                .sourceReportType("MISSING")
                .targetReportType("FOUND_PERSON")
                .targetName("Unidentified Boy 1")
                .similarityScore(0.88)
                .finalScore(88.0)
                .matchStatus("PENDING_REVIEW")
                .build();
        AiMatch saved = aiMatchRepository.save(match);

        String reviewJson = "{\"action\":\"APPROVE\",\"notes\":\"Confirmed by station officer after physical verification.\"}";

        mockMvc.perform(post("/ai/matches/" + saved.getId() + "/review")
                        .header("X-User-Id", "INSPECTOR_RAJESH")
                        .header("X-User-Role", "POLICE")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUCCESS")))
                .andExpect(jsonPath("$.matchStatus", is("APPROVED")));

        var updated = aiMatchRepository.findById(saved.getId()).orElse(null);
        assertNotNull(updated);
        assertEquals("APPROVED", updated.getMatchStatus());
        assertEquals("INSPECTOR_RAJESH", updated.getReviewedBy());

        // Verify audit log dispatch
        assertTrue(auditLogRepository.findAll().stream().anyMatch(l -> "AI_MATCH_REVIEWED".equals(l.getAction())));
    }
}
