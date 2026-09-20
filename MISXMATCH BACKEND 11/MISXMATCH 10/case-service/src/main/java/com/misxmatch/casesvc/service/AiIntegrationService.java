package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.dto.ai.*;

public interface AiIntegrationService {
    AiRiskScoreResponse evaluateAndSaveCaseRisk(String caseNumber);
    AiMultiMatchResponse evaluateMultiFactorMatch(String missingCaseNumber, String targetCaseNumber);
    AiCandidateAnalysisResponse analyzeCaseCandidates(String missingCaseNumber);
}

