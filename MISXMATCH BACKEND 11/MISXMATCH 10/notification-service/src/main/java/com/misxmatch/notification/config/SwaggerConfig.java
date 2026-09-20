package com.misxmatch.notification.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI notificationServiceOpenAPI() {
        return new OpenAPI().info(new Info().title("MISXMATCH Notification Service").version("1.0.0")
                .description("Notifications, audit logs and role-based dashboard statistics"));
    }
}
