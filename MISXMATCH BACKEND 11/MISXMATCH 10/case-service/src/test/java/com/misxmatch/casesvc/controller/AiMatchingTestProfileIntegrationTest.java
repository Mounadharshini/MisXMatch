package com.misxmatch.casesvc.controller;

import com.misxmatch.casesvc.service.AiMatchingProvider;
import com.misxmatch.casesvc.service.MockAiProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
public class AiMatchingTestProfileIntegrationTest {

    @Autowired
    private AiMatchingProvider testAiMatchingProvider;

    @Test
    @DisplayName("Verify Mock AI Provider (MockAiProvider) is selected when active profile is test")
    void testMockProviderSelectedWhenProfileIsTest() {
        assertNotNull(testAiMatchingProvider, "AiMatchingProvider bean should be present in test profile");
        assertTrue(testAiMatchingProvider instanceof MockAiProvider,
                "MockAiProvider should be injected as @Primary when active profile is test");
    }
}
