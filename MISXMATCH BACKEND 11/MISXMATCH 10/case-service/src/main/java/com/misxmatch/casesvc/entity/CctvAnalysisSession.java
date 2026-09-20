package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "cctv_analysis_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CctvAnalysisSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false, unique = true, length = 64)
    private String sessionId;

    @Column(name = "camera_code", length = 64)
    private String cameraCode;

    @Column(name = "investigator_user_id", length = 64)
    private String investigatorUserId;

    @Column(name = "search_type", length = 32)
    @Builder.Default
    private String searchType = "MANUAL_CROP"; // MANUAL_CROP, NLP_PROMPT, TIMELINE_TRACK

    @Column(name = "query_prompt", length = 500)
    private String queryPrompt;

    @Column(name = "candidates_found")
    private Integer candidatesFound;

    @Column(name = "top_similarity_score")
    private Double topSimilarityScore;

    @Column(name = "top_matched_case_number", length = 64)
    private String topMatchedCaseNumber;

    @Column(name = "analyzed_at")
    private LocalDateTime analyzedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        if (analyzedAt == null) {
            analyzedAt = createdAt;
        }
        if (sessionId == null) {
            sessionId = "SESS-" + System.currentTimeMillis();
        }
    }
}
