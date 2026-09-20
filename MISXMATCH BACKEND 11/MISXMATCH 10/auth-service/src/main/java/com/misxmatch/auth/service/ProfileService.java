package com.misxmatch.auth.service;

import com.misxmatch.auth.dto.AadhaarVerifyRequest;
import com.misxmatch.auth.dto.PageResponse;
import com.misxmatch.auth.dto.ProfileRequest;
import com.misxmatch.auth.dto.ProfileResponse;
import com.misxmatch.auth.dto.UserSummaryDto;

import java.util.List;

public interface ProfileService {
    ProfileResponse getProfile(String userId);
    ProfileResponse updateProfile(String userId, String role, ProfileRequest request);
    ProfileResponse getProfileById(String targetUserId);
    void deleteUser(String targetUserId);
    void deleteUser(String targetUserId, String requestingUserId);
    String verifyAadhaar(String userId, AadhaarVerifyRequest request);
    List<UserSummaryDto> listAllUsers();
    PageResponse<UserSummaryDto> listAllUsersPaginated(int page, int size, String q, String role, Boolean enabled, String sortBy, String sortDir);
    UserSummaryDto updateUserStatus(String userId, boolean enabled);
    UserSummaryDto deactivateUser(String targetUserId, String requestingUserId, com.misxmatch.auth.dto.DeactivateUserRequest request);
    UserSummaryDto reactivateUser(String targetUserId, String requestingUserId, com.misxmatch.auth.dto.ReactivateUserRequest request);
}
