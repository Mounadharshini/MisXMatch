package com.misxmatch.auth.service;

import com.misxmatch.auth.dto.OrganizationRequest;
import com.misxmatch.auth.dto.PageResponse;
import com.misxmatch.auth.entity.Organization;

import java.util.List;

public interface OrganizationService {
    Organization submit(String userId, OrganizationRequest request);
    Organization getMine(String userId);
    List<Organization> listAll(String orgType);
    PageResponse<Organization> listAllPaginated(int page, int size, String q, String orgType, String verificationStatus, String sortBy, String sortDir);
    List<Organization> listPending();
    PageResponse<Organization> listPendingPaginated(int page, int size, String q, String sortBy, String sortDir);
    Organization approve(String userId, String approverId);
    Organization reject(String userId, String approverId);
}
