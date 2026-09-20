package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.dto.MatchResult;

import java.util.List;
import java.util.Map;

public interface AiMatchingProvider {
    MatchResult matchByImage(String missingCaseNumber, String imageUrl);
    MatchResult matchByText(String missingCaseNumber, String description);
    Map<String, Object> detectFaces(byte[] imageBytes);
    Map<String, Object> compareFaces(String image1, String image2);
    Map<String, Object> compareTexts(String text1, String text2);
    String getProviderName();
}
