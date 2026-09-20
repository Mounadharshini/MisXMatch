package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.dto.ai.AiMultiMatchResponse;
import com.misxmatch.casesvc.dto.ai.AiRiskScoreResponse;
import com.misxmatch.casesvc.entity.AiMatchResult;
import com.misxmatch.casesvc.entity.AiRiskResult;
import com.misxmatch.casesvc.entity.ReviewStatus;

import java.util.List;
import java.util.Optional;

public interface AiResultPersistenceService {

    AiMatchResult saveMatchResult(String sourceCaseId, String candidateCaseId, AiMultiMatchResponse response);

    AiRiskResult saveRiskResult(String caseId, AiRiskScoreResponse response);

    List<AiMatchResult> getMatchesForCase(String caseId);

    List<AiMatchResult> getMatchesForCaseFiltered(String caseId, ReviewStatus status);

    Optional<AiMatchResult> getTopMatchForCase(String caseId);

    Optional<AiRiskResult> getLatestRiskForCase(String caseId);

    AiMatchResult getMatchById(Long matchId);

    AiMatchResult updateMatchReview(Long matchId, ReviewStatus status, String reviewerUsername, String reviewerRole, String comment);
}

