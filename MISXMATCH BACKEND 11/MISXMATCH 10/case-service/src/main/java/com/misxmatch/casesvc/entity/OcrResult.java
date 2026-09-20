package com.misxmatch.casesvc.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ocr_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OcrResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_number", length = 32)
    private String caseNumber;

    @Column(name = "document_type", length = 64)
    @Builder.Default
    private String documentType = "FIR";

    @Column(name = "extracted_name")
    private String extractedName;

    @Column(name = "extracted_age")
    private Integer extractedAge;

    @Column(name = "extracted_gender", length = 32)
    private String extractedGender;

    @Column(name = "extracted_date")
    private LocalDate extractedDate;

    @Column(name = "extracted_location")
    private String extractedLocation;

    @Column(name = "extracted_station_or_hospital")
    private String extractedStationOrHospital;

    @Column(name = "extracted_fir_or_id_number", length = 64)
    private String extractedFirOrIdNumber;

    @Column(name = "extracted_phone", length = 50)
    private String extractedPhone;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;

    @Column(name = "processed_by", length = 64)
    private String processedBy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
