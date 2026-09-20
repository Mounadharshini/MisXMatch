package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.dto.NlpSearchRequest;
import com.misxmatch.casesvc.dto.NlpSearchResponse;
import com.misxmatch.casesvc.entity.MissingPerson;
import com.misxmatch.casesvc.repository.MissingPersonRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AiNaturalLanguageSearchService {

    private final MissingPersonRepository missingPersonRepository;

    public AiNaturalLanguageSearchService(MissingPersonRepository missingPersonRepository) {
        this.missingPersonRepository = missingPersonRepository;
    }

    public NlpSearchResponse search(NlpSearchRequest request) {
        String originalQuery = request != null && request.getQuery() != null ? request.getQuery().trim() : "";
        String q = originalQuery.toLowerCase();
        List<MissingPerson> list = missingPersonRepository.findAll();

        // 1. Intelligent Entity Extraction
        Integer extractedAge = extractAge(q);
        String ageRange = "Any";
        if (extractedAge != null) {
            ageRange = extractedAge <= 12 ? "Child (" + extractedAge + "y)" : extractedAge <= 19 ? "Teenager (" + extractedAge + "y)" : extractedAge >= 60 ? "Senior (" + extractedAge + "y)" : "Adult (" + extractedAge + "y)";
        } else if (q.contains("child") || q.contains("kid") || q.contains("minor") || q.contains("toddler") || q.contains("baby")) {
            ageRange = "Child (Under 12)";
        } else if (q.contains("teen") || q.contains("adolescent")) {
            ageRange = "Teenager (13-19)";
        } else if (q.contains("elderly") || q.contains("old age") || q.contains("senior") || q.contains("grandfather") || q.contains("grandmother")) {
            ageRange = "Senior (60+)";
        }

        String gender = "Any";
        if (q.contains("boy") || q.contains("man") || q.contains("male") || q.contains("son") || q.contains("father") || q.contains("brother") || q.contains("gentleman") || q.contains("uncle")) {
            gender = "Male";
        } else if (q.contains("girl") || q.contains("woman") || q.contains("female") || q.contains("daughter") || q.contains("mother") || q.contains("sister") || q.contains("lady") || q.contains("aunt")) {
            gender = "Female";
        }

        String location = extractLocation(q);
        List<String> clothingAndVisualKeywords = extractVisualKeywords(q);

        NlpSearchResponse.ExtractedEntities entities = NlpSearchResponse.ExtractedEntities.builder()
                .ageRange(ageRange)
                .gender(gender)
                .location(location)
                .clothingKeywords(clothingAndVisualKeywords)
                .build();

        // 2. High-Accuracy Multi-Factor Semantic Ranking
        List<NlpSearchResponse.RankedResult> ranked = new ArrayList<>();
        Set<String> queryWords = new HashSet<>(Arrays.asList(q.split("[\\s,;.]+")));
        queryWords.removeIf(w -> w.length() < 2 || List.of("and", "the", "with", "was", "seen", "who", "has", "for", "near", "last", "any", "look", "looking", "find").contains(w));

        for (MissingPerson mp : list) {
            double score = 0.0;
            List<String> matchRationales = new ArrayList<>();

            String name = (mp.getName() != null ? mp.getName() : "").toLowerCase();
            String desc = (mp.getDescription() != null ? mp.getDescription() : "").toLowerCase();
            String loc = (mp.getLastSeenLocation() != null ? mp.getLastSeenLocation() : "").toLowerCase();
            String marks = (mp.getIdentifyingMarks() != null ? mp.getIdentifyingMarks() : "").toLowerCase();
            String fullDossier = name + " " + desc + " " + loc + " " + marks;

            // Name similarity check
            if (!name.isBlank() && q.contains(name)) {
                score += 0.45;
                matchRationales.add("Exact Name Match (" + mp.getName() + ")");
            } else {
                for (String w : queryWords) {
                    if (w.length() >= 3 && name.contains(w)) {
                        score += 0.30;
                        matchRationales.add("Name contains '" + w + "'");
                        break;
                    }
                }
            }

            // Gender consistency
            if (!"Any".equalsIgnoreCase(gender) && mp.getGender() != null) {
                if (gender.equalsIgnoreCase(mp.getGender())) {
                    score += 0.20;
                    matchRationales.add("Gender Match (" + mp.getGender() + ")");
                } else {
                    score -= 0.35; // Significant penalty for gender mismatch
                }
            }

            // Age proximity
            if (extractedAge != null && mp.getAge() != null) {
                int diff = Math.abs(mp.getAge() - extractedAge);
                if (diff == 0) {
                    score += 0.25;
                    matchRationales.add("Exact Age Match (" + mp.getAge() + "y)");
                } else if (diff <= 2) {
                    score += 0.20;
                    matchRationales.add("Age Proximity (" + mp.getAge() + " vs " + extractedAge + ")");
                } else if (diff <= 5) {
                    score += 0.10;
                    matchRationales.add("Age Range Match (±5y)");
                }
            } else if (!"Any".equalsIgnoreCase(ageRange) && mp.getAge() != null) {
                if (ageRange.contains("Child") && mp.getAge() <= 12) {
                    score += 0.20;
                    matchRationales.add("Child Category Match (" + mp.getAge() + "y)");
                } else if (ageRange.contains("Teenager") && mp.getAge() >= 13 && mp.getAge() <= 19) {
                    score += 0.20;
                    matchRationales.add("Teen Category Match (" + mp.getAge() + "y)");
                } else if (ageRange.contains("Senior") && mp.getAge() >= 60) {
                    score += 0.20;
                    matchRationales.add("Senior Category Match (" + mp.getAge() + "y)");
                }
            }

            // Location alignment
            if (!"Any Region".equalsIgnoreCase(location) && !loc.isBlank()) {
                String locSearch = location.toLowerCase().replace(" ncr", "");
                if (loc.contains(locSearch) || q.contains(loc)) {
                    score += 0.25;
                    matchRationales.add("Location / Regional match (" + mp.getLastSeenLocation() + ")");
                }
            }

            // Clothing, appearance, and physical keywords overlap
            int matchedKeywordsCount = 0;
            for (String kw : clothingAndVisualKeywords) {
                if (fullDossier.contains(kw.toLowerCase())) {
                    score += 0.15;
                    matchedKeywordsCount++;
                }
            }
            if (matchedKeywordsCount > 0) {
                matchRationales.add(matchedKeywordsCount + " Visual/Clothing attribute matches");
            }

            // General query words fuzzy match
            int wordHits = 0;
            for (String w : queryWords) {
                if (fullDossier.contains(w)) {
                    wordHits++;
                }
            }
            if (wordHits > 0) {
                score += Math.min(0.25, wordHits * 0.08);
            }

            // Base floor if there's any substantive match
            if (score > 0.15) {
                score = Math.min(0.99, Math.max(0.40, score));
            }

            if (score >= 0.45) {
                String rationale = matchRationales.isEmpty()
                        ? "Semantic text correlation (" + Math.round(score * 100) + "%)"
                        : String.join(" • ", matchRationales);

                ranked.add(NlpSearchResponse.RankedResult.builder()
                        .person(mp)
                        .matchConfidence(Math.round(score * 100.0) / 100.0)
                        .matchRationale(rationale)
                        .build());
            }
        }

        ranked.sort(Comparator.comparingDouble(NlpSearchResponse.RankedResult::getMatchConfidence).reversed());

        return NlpSearchResponse.builder()
                .originalQuery(originalQuery)
                .extractedEntities(entities)
                .results(ranked)
                .build();
    }

    private Integer extractAge(String q) {
        Pattern p = Pattern.compile("\\b(\\d{1,2})\\s*(?:years?|yrs?|yo|y/o|age|aged|year-old)?\\b");
        Matcher m = p.matcher(q);
        while (m.find()) {
            try {
                int age = Integer.parseInt(m.group(1));
                if (age >= 1 && age <= 100) {
                    return age;
                }
            } catch (Exception ignored) {}
        }
        return null;
    }

    private String extractLocation(String q) {
        Map<String, String> cityMap = Map.ofEntries(
                Map.entry("delhi", "Delhi NCR"),
                Map.entry("new delhi", "Delhi NCR"),
                Map.entry("noida", "Delhi NCR"),
                Map.entry("gurgaon", "Delhi NCR"),
                Map.entry("mumbai", "Mumbai"),
                Map.entry("pune", "Pune"),
                Map.entry("chennai", "Chennai"),
                Map.entry("bengaluru", "Bengaluru"),
                Map.entry("bangalore", "Bengaluru"),
                Map.entry("kolkata", "Kolkata"),
                Map.entry("hyderabad", "Hyderabad"),
                Map.entry("jaipur", "Jaipur"),
                Map.entry("lucknow", "Lucknow"),
                Map.entry("chandigarh", "Chandigarh"),
                Map.entry("ahmedabad", "Ahmedabad"),
                Map.entry("kashmere gate", "Kashmere Gate ISBT, Delhi"),
                Map.entry("anand vihar", "Anand Vihar, Delhi"),
                Map.entry("howrah", "Howrah, Kolkata"),
                Map.entry("andheri", "Andheri, Mumbai")
        );

        for (Map.Entry<String, String> e : cityMap.entrySet()) {
            if (q.contains(e.getKey())) {
                return e.getValue();
            }
        }
        return "Any Region";
    }

    private List<String> extractVisualKeywords(String q) {
        List<String> dictionary = List.of(
                "Sweater", "Jacket", "Kurta", "Saree", "Jeans", "T-Shirt", "Shirt", "Trousers", "Hoodie", "Dress",
                "Spectacles", "Glasses", "Backpack", "Bag", "Cap", "Hat", "Watch",
                "Blue", "Red", "Yellow", "Black", "White", "Green", "Maroon", "Navy", "Pink", "Floral", "Striped",
                "Scar", "Mole", "Tattoo", "Birthmark", "Beard", "Mustache", "Limp"
        );

        List<String> found = new ArrayList<>();
        for (String word : dictionary) {
            if (q.contains(word.toLowerCase())) {
                found.add(word);
            }
        }
        return found;
    }
}
