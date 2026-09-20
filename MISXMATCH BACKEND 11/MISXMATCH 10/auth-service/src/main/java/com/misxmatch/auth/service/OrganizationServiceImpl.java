package com.misxmatch.auth.service;

import com.misxmatch.auth.dto.OrganizationRequest;
import com.misxmatch.auth.dto.PageResponse;
import com.misxmatch.auth.entity.Organization;
import com.misxmatch.auth.exception.BadRequestException;
import com.misxmatch.auth.repository.OrganizationRepository;
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
public class OrganizationServiceImpl implements OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final com.misxmatch.auth.client.AuditLogClient auditLogClient;

    public OrganizationServiceImpl(OrganizationRepository organizationRepository, com.misxmatch.auth.client.AuditLogClient auditLogClient) {
        this.organizationRepository = organizationRepository;
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
    public Organization submit(String userId, OrganizationRequest request) {
        Organization org = organizationRepository.findByUserId(userId)
                .orElse(Organization.builder().userId(userId).build());
        org.setOrgName(request.getOrgName());
        org.setOrgType(request.getOrgType());
        org.setRegistrationNumber(request.getRegistrationNumber());
        org.setJurisdiction(request.getJurisdiction());
        org.setContactPerson(request.getContactPerson());
        org.setContactPhone(request.getContactPhone());
        // Re-submitting resets status back to PENDING so admins re-review changes.
        org.setVerificationStatus("PENDING");
        return organizationRepository.save(org);
    }

    @Override
    public Organization getMine(String userId) {
        return organizationRepository.findByUserId(userId).orElse(null);
    }

    @Override
    public List<Organization> listAll(String orgType) {
        if (orgType != null && !orgType.isBlank()) {
            return organizationRepository.findByOrgType(orgType.toUpperCase());
        }
        return organizationRepository.findAll();
    }

    @Override
    public PageResponse<Organization> listAllPaginated(int page, int size, String q, String orgType, String verificationStatus, String sortBy, String sortDir) {
        Pageable pageable = createPageable(page, size, sortBy, sortDir, "id");
        Specification<Organization> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("orgName")), pattern);
                Predicate regMatch = cb.like(cb.lower(root.get("registrationNumber")), pattern);
                Predicate jurMatch = cb.like(cb.lower(root.get("jurisdiction")), pattern);
                Predicate contMatch = cb.like(cb.lower(root.get("contactPerson")), pattern);
                predicates.add(cb.or(nameMatch, regMatch, jurMatch, contMatch));
            }

            if (orgType != null && !orgType.isBlank() && !"ALL".equalsIgnoreCase(orgType)) {
                predicates.add(cb.equal(cb.upper(root.get("orgType")), orgType.trim().toUpperCase()));
            }

            if (verificationStatus != null && !verificationStatus.isBlank() && !"ALL".equalsIgnoreCase(verificationStatus)) {
                predicates.add(cb.equal(cb.upper(root.get("verificationStatus")), verificationStatus.trim().toUpperCase()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Organization> resultPage = organizationRepository.findAll(spec, pageable);
        return PageResponse.from(resultPage);
    }

    @Override
    public List<Organization> listPending() {
        return organizationRepository.findByVerificationStatus("PENDING");
    }

    @Override
    public PageResponse<Organization> listPendingPaginated(int page, int size, String q, String sortBy, String sortDir) {
        Pageable pageable = createPageable(page, size, sortBy, sortDir, "id");
        Specification<Organization> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("verificationStatus"), "PENDING"));

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("orgName")), pattern);
                Predicate regMatch = cb.like(cb.lower(root.get("registrationNumber")), pattern);
                Predicate jurMatch = cb.like(cb.lower(root.get("jurisdiction")), pattern);
                predicates.add(cb.or(nameMatch, regMatch, jurMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Organization> resultPage = organizationRepository.findAll(spec, pageable);
        return PageResponse.from(resultPage);
    }

    @Override
    @Transactional
    public Organization approve(String userId, String approverId) {
        Organization org = organizationRepository.findByUserId(userId)
                .orElseThrow(() -> new BadRequestException("Organization not found for user: " + userId));
        org.setVerificationStatus("VERIFIED");
        Organization saved = organizationRepository.save(org);
        auditLogClient.logAsync(approverId, "ADMIN", "ORG_APPROVED", "Approved organization verification for user: " + userId + " (" + org.getOrgName() + ")");
        return saved;
    }

    @Override
    @Transactional
    public Organization reject(String userId, String approverId) {
        Organization org = organizationRepository.findByUserId(userId)
                .orElseThrow(() -> new BadRequestException("Organization not found for user: " + userId));
        org.setVerificationStatus("REJECTED");
        Organization saved = organizationRepository.save(org);
        auditLogClient.logAsync(approverId, "ADMIN", "ORG_REJECTED", "Rejected organization verification for user: " + userId + " (" + org.getOrgName() + ")");
        return saved;
    }
}
