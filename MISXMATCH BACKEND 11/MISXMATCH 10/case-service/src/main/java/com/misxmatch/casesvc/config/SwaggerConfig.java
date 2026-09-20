package com.misxmatch.casesvc.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI caseServiceOpenAPI() {
        return new OpenAPI().info(new Info().title("MISXMATCH Case Management Service").version("1.0.0")
                .description("Missing/found reports, sightings, AI matching (mocked) and case tracking"));
    }
}
