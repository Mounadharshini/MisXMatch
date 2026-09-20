package com.misxmatch.casesvc.config;

import com.misxmatch.casesvc.entity.*;
import com.misxmatch.casesvc.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CaseDataInitializer implements CommandLineRunner {

    private final MissingPersonRepository missingPersonRepository;
    private final FoundPersonRepository foundPersonRepository;
    private final SightingRepository sightingRepository;
    private final CctvCameraRepository cctvCameraRepository;
    private final AiMatchRepository aiMatchRepository;
    private final OcrResultRepository ocrResultRepository;
    private final UploadedFileRepository uploadedFileRepository;

    public CaseDataInitializer(MissingPersonRepository missingPersonRepository,
                               FoundPersonRepository foundPersonRepository,
                               SightingRepository sightingRepository,
                               CctvCameraRepository cctvCameraRepository,
                               AiMatchRepository aiMatchRepository,
                               OcrResultRepository ocrResultRepository,
                               UploadedFileRepository uploadedFileRepository) {
        this.missingPersonRepository = missingPersonRepository;
        this.foundPersonRepository = foundPersonRepository;
        this.sightingRepository = sightingRepository;
        this.cctvCameraRepository = cctvCameraRepository;
        this.aiMatchRepository = aiMatchRepository;
        this.ocrResultRepository = ocrResultRepository;
        this.uploadedFileRepository = uploadedFileRepository;
    }

    @Override
    public void run(String... args) {
        // Purely dynamic - no mock data or seed cameras auto-injected at startup
    }
}
