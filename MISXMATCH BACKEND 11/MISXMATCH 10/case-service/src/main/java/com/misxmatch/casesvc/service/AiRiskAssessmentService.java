package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.dto.RiskAssessmentResponse;
import com.misxmatch.casesvc.entity.MissingPerson;
import com.misxmatch.casesvc.repository.MissingPersonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class AiRiskAssessmentService {

    private final MissingPersonRepository missingPersonRepository;

    @Value("${ai.risk.high-risk-zones:border,trafficking,highway,port,checkpoint,red light,transit corridor,national highway,airport,railway station}")
    private List<String> highRiskZones = new ArrayList<>(List.of(
            "border", "trafficking", "highway", "port", "checkpoint",
            "red light", "transit corridor", "national highway", "airport", "railway station"
    ));

    @Autowired
    public AiRiskAssessmentService(@Autowired(required = false) MissingPersonRepository missingPersonRepository) {
        this.missingPersonRepository = missingPersonRepository;
    }

    public AiRiskAssessmentService() {
        this(null);
    }

    public List<String> getHighRiskZones() {
        return highRiskZones;
    }

    public void setHighRiskZones(List<String> highRiskZones) {
        if (highRiskZones != null) {
            this.highRiskZones = new ArrayList<>(highRiskZones);
        }
    }

    public RiskAssessmentResponse assessRisk(MissingPerson mp) {
        return assessRisk(mp, false);
    }

    public RiskAssessmentResponse assessRisk(MissingPerson mp, Boolean extremeWeather) {
        if (mp == null) {
            return RiskAssessmentResponse.builder()
                    .riskLevel("MEDIUM")
                    .riskScore(50.0)
                    .build();
        }

        double score = 50.0;
        List<String> factors = new ArrayList<>();
        List<String> protocols = new ArrayList<>();

        // 1. Age vulnerability
        if (mp.getAge() != null) {
            if (mp.getAge() < 12) {
                score += 35.0;
                factors.add("Child under 12 years of age (High Vulnerability)");
                protocols.add("Activate Childline & Golden 72-Hour Rapid Response");
            } else if (mp.getAge() >= 65) {
                score += 30.0;
                factors.add("Senior citizen (Geriatric vulnerability)");
                protocols.add("Alert Senior Citizen helpline and local shelter networks");
            }
        }

        // 2. Medical / Cognitive impairment
        if (mp.getDescription() != null) {
            String desc = mp.getDescription().toLowerCase();
            if (desc.contains("dementia") || desc.contains("alzheimer") || desc.contains("mental") || desc.contains("medical")) {
                score += 25.0;
                factors.add("Critical medical / cognitive impairment condition");
                protocols.add("Dispatch priority medical alert to regional hospital emergency rooms");
            }
        }

        // 3. Time since last seen (Golden 72-Hour window)
        LocalDateTime lastSeenDateTime = null;
        if (mp.getLastSeenDate() != null) {
            lastSeenDateTime = mp.getLastSeenDate().atStartOfDay();
        } else if (mp.getCreatedAt() != null) {
            lastSeenDateTime = mp.getCreatedAt();
        }

        if (lastSeenDateTime != null) {
            long hours = Duration.between(lastSeenDateTime, LocalDateTime.now()).toHours();
            if (hours > 72) {
                score += 20.0;
                factors.add("Extended missing duration (>72 hours since last seen)");
                protocols.add("Initiate wide-area Search & Rescue grid and inter-state transit alert");
            } else if (hours > 24) {
                score += 10.0;
                factors.add("Elapsed time > 24 hours since last seen (Golden 72-Hour window active)");
                protocols.add("Escalate to regional law enforcement coordinator and deploy rapid search team");
            }
        }

        // 4. Location risk
        if (mp.getLastSeenLocation() != null && !mp.getLastSeenLocation().isBlank() && highRiskZones != null) {
            String locLower = mp.getLastSeenLocation().toLowerCase();
            boolean matchesHighRisk = highRiskZones.stream()
                    .anyMatch(zone -> locLower.contains(zone.toLowerCase()));
            if (matchesHighRisk) {
                score += 20.0;
                factors.add("High-risk location match: " + mp.getLastSeenLocation() + " (Border/Trafficking corridor)");
                protocols.add("Notify border checkpoints, transport authorities, and transit surveillance teams");
            }
        }

        // 5. Repeat-disappearance history
        if (missingPersonRepository != null && mp.getName() != null && !mp.getName().isBlank()) {
            List<MissingPerson> priorCases;
            if (mp.getReportedBy() != null && !mp.getReportedBy().isBlank()) {
                priorCases = missingPersonRepository.findByNameIgnoreCaseAndReportedByIgnoreCase(mp.getName(), mp.getReportedBy());
            } else {
                priorCases = missingPersonRepository.findByNameIgnoreCase(mp.getName());
            }

            long priorCount = priorCases == null ? 0 : priorCases.stream()
                    .filter(p -> (mp.getId() == null || !Objects.equals(p.getId(), mp.getId()))
                            && (mp.getCaseNumber() == null || !Objects.equals(p.getCaseNumber(), mp.getCaseNumber())))
                    .count();

            if (priorCount > 0) {
                score += 20.0;
                factors.add("Repeat disappearance history detected (" + priorCount + " prior case(s) found for " + mp.getName() + ")");
                protocols.add("Engage specialized runaway / repeat disappearance intervention unit and review case history");
            }
        }

        // 6. Weather / Environmental risk
        boolean hasExtremeWeather = Boolean.TRUE.equals(extremeWeather);
        if (!hasExtremeWeather && mp.getDescription() != null) {
            String desc = mp.getDescription().toLowerCase();
            hasExtremeWeather = desc.contains("extreme weather") || desc.contains("blizzard") || desc.contains("storm") ||
                    desc.contains("flood") || desc.contains("freezing") || desc.contains("heatwave") ||
                    desc.contains("cyclone") || desc.contains("heavy snow") || desc.contains("torrential rain") ||
                    desc.contains("severe weather");
        }

        if (hasExtremeWeather) {
            score += 15.0;
            factors.add("Extreme weather / hazardous environmental conditions reported");
            protocols.add("Dispatch specialized severe weather Search & Rescue unit and thermal imaging drones");
        }

        // Bound score scale (15.0 - 99.0)
        score = Math.min(99.0, Math.max(15.0, score));

        String level = "LOW";
        if (score >= 80.0) {
            level = "CRITICAL";
        } else if (score >= 60.0) {
            level = "HIGH";
        } else if (score >= 40.0) {
            level = "MEDIUM";
        }

        return RiskAssessmentResponse.builder()
                .caseNumber(mp.getCaseNumber())
                .riskLevel(level)
                .riskScore(score)
                .identifiedRiskFactors(factors)
                .recommendedProtocols(protocols)
                .build();
    }
}
