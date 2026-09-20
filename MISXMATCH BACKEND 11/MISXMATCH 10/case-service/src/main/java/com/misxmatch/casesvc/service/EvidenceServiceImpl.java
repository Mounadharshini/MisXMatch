package com.misxmatch.casesvc.service;

import com.misxmatch.casesvc.dto.EvidenceRequest;
import com.misxmatch.casesvc.dto.PageResponse;
import com.misxmatch.casesvc.entity.UploadedFile;
import com.misxmatch.casesvc.repository.UploadedFileRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class EvidenceServiceImpl implements EvidenceService {

    private final UploadedFileRepository uploadedFileRepository;
    private final FileStorageService fileStorageService;
    private final com.misxmatch.casesvc.client.AuditLogClient auditLogClient;

    public EvidenceServiceImpl(UploadedFileRepository uploadedFileRepository,
                               FileStorageService fileStorageService,
                               com.misxmatch.casesvc.client.AuditLogClient auditLogClient) {
        this.uploadedFileRepository = uploadedFileRepository;
        this.fileStorageService = fileStorageService;
        this.auditLogClient = auditLogClient;
    }

    private Pageable createPageable(int page, int size, String sortBy, String sortDir, String defaultSort) {
        int p = Math.max(0, page);
        int s = size > 0 ? size : 10;
        String field = (sortBy != null && !sortBy.isBlank()) ? sortBy : defaultSort;
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PageRequest.of(p, s, Sort.by(direction, field));
    }

    @Override
    @Transactional
    public UploadedFile upload(String uploadedBy, EvidenceRequest request) {
        UploadedFile file = UploadedFile.builder()
                .caseNumber(request.getCaseNumber())
                .title(request.getTitle())
                .category(request.getCategory() != null ? request.getCategory() : "cctv")
                .location(request.getLocation())
                .seizureDate(request.getSeizureDate())
                .format(request.getFormat() != null ? request.getFormat() : "MP4")
                .fileSize(request.getFileSize())
                .fileUrl(request.getFileUrl())
                .fileType(request.getFileType())
                .description(request.getDescription())
                .officerName(request.getOfficerName())
                .badgeNumber(request.getBadgeNumber())
                .sha256(request.getSha256() != null ? request.getSha256() : "sha256-" + System.currentTimeMillis())
                .uploadedBy(uploadedBy != null ? uploadedBy : "OFFICER")
                .build();
        UploadedFile saved = uploadedFileRepository.save(file);
        auditLogClient.logAsync(uploadedBy != null ? uploadedBy : "OFFICER", "OFFICER", "EVIDENCE_UPLOADED", "Uploaded evidence file for case #" + request.getCaseNumber() + " (" + request.getTitle() + ")");
        return saved;
    }

    @Override
    @Transactional
    public UploadedFile uploadMultipart(String uploadedBy, String caseNumber, String title, String category, String location, String seizureDate, String description, String officerName, String badgeNumber, org.springframework.web.multipart.MultipartFile file) {
        String fileUrl = fileStorageService.storeFile(file, "evidence");
        String format = extractFormat(file.getOriginalFilename());
        String fileSizeStr = formatFileSize(file.getSize());
        String sha256 = calculateSha256(file);

        UploadedFile uploadedFile = UploadedFile.builder()
                .caseNumber(caseNumber)
                .title(title != null && !title.isBlank() ? title : file.getOriginalFilename())
                .category(category != null && !category.isBlank() ? category : "cctv")
                .location(location)
                .seizureDate(seizureDate != null ? seizureDate : java.time.LocalDate.now().toString())
                .format(format)
                .fileSize(fileSizeStr)
                .fileUrl(fileUrl)
                .fileType(file.getContentType())
                .description(description)
                .officerName(officerName)
                .badgeNumber(badgeNumber)
                .sha256(sha256)
                .uploadedBy(uploadedBy != null ? uploadedBy : "OFFICER")
                .build();

        UploadedFile saved = uploadedFileRepository.save(uploadedFile);
        auditLogClient.logAsync(uploadedBy != null ? uploadedBy : "OFFICER", "OFFICER", "EVIDENCE_UPLOADED", "Uploaded evidence file for case #" + caseNumber + " (" + saved.getTitle() + ")");
        return saved;
    }

    @Override
    @Transactional
    public UploadedFile uploadVerificationEvidence(String uploadedBy, String caseNumber, Long matchId, String evidenceType, String title, String description, String verificationNotes, String officerName, String badgeNumber, org.springframework.web.multipart.MultipartFile file) {
        String fileUrl = fileStorageService.storeFile(file, "evidence");
        String format = extractFormat(file.getOriginalFilename());
        String fileSizeStr = formatFileSize(file.getSize());
        String sha256 = calculateSha256(file);

        UploadedFile uploadedFile = UploadedFile.builder()
                .caseNumber(caseNumber)
                .matchId(matchId)
                .evidenceType(evidenceType != null && !evidenceType.isBlank() ? evidenceType : "Identity confirmation")
                .title(title != null && !title.isBlank() ? title : file.getOriginalFilename())
                .category("verification_evidence")
                .format(format)
                .fileSize(fileSizeStr)
                .fileUrl(fileUrl)
                .fileType(file.getContentType())
                .description(description)
                .verificationNotes(verificationNotes)
                .verificationStatus("SUBMITTED")
                .officerName(officerName)
                .badgeNumber(badgeNumber)
                .sha256(sha256)
                .uploadedBy(uploadedBy != null ? uploadedBy : "OFFICER")
                .build();

        UploadedFile saved = uploadedFileRepository.save(uploadedFile);
        auditLogClient.logAsync(uploadedBy != null ? uploadedBy : "OFFICER", "OFFICER", "VERIFICATION_EVIDENCE_UPLOADED", "Verification evidence (" + uploadedFile.getEvidenceType() + ") uploaded for case #" + caseNumber + " (" + saved.getTitle() + ")");
        return saved;
    }

    private String extractFormat(String filename) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf(".") + 1).toUpperCase();
        }
        return "BIN";
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        char pre = "KMGTPE".charAt(exp - 1);
        return String.format("%.1f %cB", bytes / Math.pow(1024, exp), pre);
    }

    private String calculateSha256(org.springframework.web.multipart.MultipartFile file) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(file.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return "sha256-" + System.currentTimeMillis();
        }
    }

    @Override
    public List<UploadedFile> listAll() {
        return uploadedFileRepository.findAll();
    }

    @Override
    public PageResponse<UploadedFile> listAllPaginated(int page, int size, String q, String category, String fileType, String sortBy, String sortDir) {
        Pageable pageable = createPageable(page, size, sortBy, sortDir, "id");
        Specification<UploadedFile> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                List<Predicate> searchPredicates = new ArrayList<>();
                searchPredicates.add(cb.like(cb.lower(root.get("title")), pattern));
                searchPredicates.add(cb.like(cb.lower(root.get("caseNumber")), pattern));
                searchPredicates.add(cb.like(cb.lower(root.get("location")), pattern));
                searchPredicates.add(cb.like(cb.lower(root.get("officerName")), pattern));
                searchPredicates.add(cb.like(cb.lower(root.get("description")), pattern));
                searchPredicates.add(cb.like(cb.lower(root.get("uploadedBy")), pattern));
                searchPredicates.add(cb.like(cb.lower(root.get("format")), pattern));
                searchPredicates.add(cb.like(cb.lower(root.get("category")), pattern));
                if (root.get("evidenceType") != null) {
                    searchPredicates.add(cb.like(cb.lower(root.get("evidenceType")), pattern));
                }
                try {
                    Long idVal = Long.parseLong(q.trim());
                    searchPredicates.add(cb.equal(root.get("id"), idVal));
                } catch (NumberFormatException ignored) {}
                predicates.add(cb.or(searchPredicates.toArray(new Predicate[0])));
            }

            if (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category)) {
                predicates.add(cb.equal(cb.lower(root.get("category")), category.trim().toLowerCase()));
            }

            if (fileType != null && !fileType.isBlank() && !"ALL".equalsIgnoreCase(fileType)) {
                predicates.add(cb.equal(cb.lower(root.get("fileType")), fileType.trim().toLowerCase()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<UploadedFile> resultPage = uploadedFileRepository.findAll(spec, pageable);
        return PageResponse.from(resultPage);
    }

    @Override
    public List<UploadedFile> listByCase(String caseNumber) {
        return uploadedFileRepository.findByCaseNumber(caseNumber);
    }

    @Override
    public PageResponse<UploadedFile> listByCasePaginated(String caseNumber, int page, int size, String q, String sortBy, String sortDir) {
        Pageable pageable = createPageable(page, size, sortBy, sortDir, "id");
        Specification<UploadedFile> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("caseNumber"), caseNumber));

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                Predicate titleMatch = cb.like(cb.lower(root.get("title")), pattern);
                Predicate descMatch = cb.like(cb.lower(root.get("description")), pattern);
                predicates.add(cb.or(titleMatch, descMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<UploadedFile> resultPage = uploadedFileRepository.findAll(spec, pageable);
        return PageResponse.from(resultPage);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        uploadedFileRepository.deleteById(id);
    }
}
