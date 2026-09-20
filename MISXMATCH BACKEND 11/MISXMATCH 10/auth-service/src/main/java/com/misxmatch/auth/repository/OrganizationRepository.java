package com.misxmatch.auth.repository;

import com.misxmatch.auth.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, Long>, JpaSpecificationExecutor<Organization> {
    Optional<Organization> findByUserId(String userId);
    List<Organization> findByVerificationStatus(String verificationStatus);
    List<Organization> findByOrgType(String orgType);
    List<Organization> findByOrgTypeAndVerificationStatus(String orgType, String verificationStatus);
}
