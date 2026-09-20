package com.misxmatch.casesvc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"com.misxmatch.casesvc"})
@EnableJpaRepositories(basePackages = {"com.misxmatch.casesvc.repository"})
@EntityScan(basePackages = {"com.misxmatch.casesvc.entity"})
public class CaseServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CaseServiceApplication.class, args);
    }
}
