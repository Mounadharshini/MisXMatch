package com.misxmatch.casesvc.config;

import com.misxmatch.casesvc.service.AiMatchingProvider;
import com.misxmatch.casesvc.service.MockAiProvider;
import com.misxmatch.casesvc.service.SmartAiMatchingProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

@Slf4j
@Configuration
public class AiProviderConfig {

    @Bean
    @Primary
    @Profile("!test")
    public AiMatchingProvider activeRealAiMatchingProvider(SmartAiMatchingProvider realProvider) {
        log.info("Configuring Real AI Matching Provider ({}) as @Primary bean for active non-test profile.", realProvider.getProviderName());
        return realProvider;
    }

    @Bean
    @Primary
    @Profile("test")
    public AiMatchingProvider activeMockAiMatchingProvider(MockAiProvider mockProvider) {
        log.info("Configuring Mock AI Matching Provider ({}) as @Primary bean for test profile.", mockProvider.getProviderName());
        return mockProvider;
    }
}
