package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.client.AiServiceClient;
import com.misxmatch.casesvc.client.NotificationClient;
import com.misxmatch.casesvc.entity.CctvAnalysisSession;
import com.misxmatch.casesvc.entity.MissingPerson;
import com.misxmatch.casesvc.repository.CctvAnalysisSessionRepository;
import com.misxmatch.casesvc.repository.CctvInvestigationLeadRepository;
import com.misxmatch.casesvc.repository.MissingPersonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CctvAnalysisWorkflowTest {

    @Mock
    private MissingPersonRepository missingPersonRepository;

    @Mock
    private SmartAiMatchingProvider aiMatchingProvider;

    @Mock
    private AiServiceClient aiServiceClient;

    @Mock
    private NotificationClient notificationClient;

    @Mock
    private CctvAnalysisSessionRepository cctvAnalysisSessionRepository;

    @Mock
    private CctvInvestigationLeadRepository cctvInvestigationLeadRepository;

    @InjectMocks
    private CctvAiInvestigationService cctvAiInvestigationService;

    private MissingPerson candidateMissingPerson;

    @BeforeEach
    void setUp() {
        candidateMissingPerson = MissingPerson.builder()
                .id(1L)
                .caseNumber("MP-8001")
                .name("Aarav Sharma")
                .age(16)
                .gender("Male")
                .lastSeenLocation("Kashmere Gate ISBT, Delhi")
                .photoUrl("https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1")
                .build();
    }

    @Test
    @DisplayName("Should successfully analyze CCTV video media via Python AI microservice and persist session")
    void testAnalyzeCctvMedia_Success() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "cctv_sample.mp4", "video/mp4", "fake video stream bytes".getBytes()
        );

        when(missingPersonRepository.findAll()).thenReturn(List.of(candidateMissingPerson));

        Map<String, Object> mockPythonResult = Map.of(
                "success", true,
                "mediaType", "video",
                "totalDetections", 1,
                "sampledFrameCount", 15,
                "durationSec", 15.0,
                "detections", List.of(
                        Map.of(
                                "personIndex", 1,
                                "frameNumber", 25,
                                "timestampSeconds", 1.0,
                                "boundingBox", Map.of("x", 100, "y", 50, "width", 120, "height", 240),
                                "confidence", 0.91,
                                "hasUsableFace", true,
                                "candidateMatch", Map.of(
                                        "missingCaseNumber", "MP-8001",
                                        "personName", "Aarav Sharma",
                                        "overallSimilarityScore", 0.88,
                                        "confidenceLevel", "HIGH",
                                        "matchReason", "Biometric Facial Alignment Score: 88%"
                                )
                        )
                ),
                "disclaimer", "AI Candidate Suggestion — Requires Human Verification — not definitive identification"
        );

        when(aiServiceClient.analyzeCctvMedia(any(), anyString(), any(), any())).thenReturn(mockPythonResult);

        Map<String, Object> result = cctvAiInvestigationService.analyzeCctvMedia(
                file, "CAM-DL-401", "OFFICER_007", "POLICE", 1.0f
        );

        assertNotNull(result);
        assertEquals(true, result.get("success"));
        assertEquals(1, result.get("totalDetections"));

        // Verify CctvAnalysisSession saved to MySQL
        verify(cctvAnalysisSessionRepository, times(1)).save(any(CctvAnalysisSession.class));

        // Verify high-confidence candidate match dispatched alert via NotificationClient
        verify(notificationClient, times(1)).sendAiMatchFoundNotificationAsync(
                eq("MP-8001"), anyLong(), eq(0.88), eq("police_officer")
        );
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when CCTV file is empty")
    void testAnalyzeCctvMedia_EmptyFile_ThrowsException() {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file", "empty.mp4", "video/mp4", new byte[0]
        );

        assertThrows(IllegalArgumentException.class, () ->
                cctvAiInvestigationService.analyzeCctvMedia(emptyFile, "CAM-01", "OFFICER_007", "POLICE", 1.0f)
        );
    }
}
