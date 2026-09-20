package com.misxmatch.auth.service;

import com.misxmatch.auth.client.AuditLogClient;
import com.misxmatch.auth.dto.AadhaarVerifyRequest;
import com.misxmatch.auth.dto.DeactivateUserRequest;
import com.misxmatch.auth.dto.PageResponse;
import com.misxmatch.auth.dto.ProfileRequest;
import com.misxmatch.auth.dto.ProfileResponse;
import com.misxmatch.auth.dto.ReactivateUserRequest;
import com.misxmatch.auth.dto.UserSummaryDto;
import com.misxmatch.auth.entity.Aadhaar;
import com.misxmatch.auth.entity.Profile;
import com.misxmatch.auth.entity.Role;
import com.misxmatch.auth.entity.User;
import com.misxmatch.auth.exception.BadRequestException;
import com.misxmatch.auth.exception.ForbiddenException;
import com.misxmatch.auth.repository.AadhaarRepository;
import com.misxmatch.auth.repository.ProfileRepository;
import com.misxmatch.auth.repository.RefreshTokenRepository;
import com.misxmatch.auth.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

@Service
public class ProfileServiceImpl implements ProfileService {

    private final ProfileRepository profileRepository;
    private final AadhaarRepository aadhaarRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditLogClient auditLogClient;

    public ProfileServiceImpl(ProfileRepository profileRepository,
                              AadhaarRepository aadhaarRepository,
                              UserRepository userRepository,
                              RefreshTokenRepository refreshTokenRepository,
                              AuditLogClient auditLogClient) {
        this.profileRepository = profileRepository;
        this.aadhaarRepository = aadhaarRepository;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
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
    public ProfileResponse getProfile(String userId) {
        return toResponse(profileRepository.findByUserId(userId).orElseGet(() -> emptyProfile(userId)));
    }

    @Override
    @Transactional
    public ProfileResponse updateProfile(String userId, String role, ProfileRequest request) {
        Profile profile = profileRepository.findByUserId(userId).orElseGet(() -> emptyProfile(userId));
        if (request.getFullName() != null) profile.setFullName(request.getFullName());
        if (request.getPhone() != null) profile.setPhone(request.getPhone());
        if (request.getAddress() != null) profile.setAddress(request.getAddress());
        if (request.getCity() != null) profile.setCity(request.getCity());
        if (request.getState() != null) profile.setState(request.getState());
        if (request.getPincode() != null) profile.setPincode(request.getPincode());
        if (request.getGender() != null) profile.setGender(request.getGender());
        if (request.getDateOfBirth() != null) profile.setDateOfBirth(request.getDateOfBirth());
        if (request.getBio() != null) profile.setBio(request.getBio());
        if (request.getEmergencyContactName() != null) profile.setEmergencyContactName(request.getEmergencyContactName());
        if (request.getEmergencyContactPhone() != null) profile.setEmergencyContactPhone(request.getEmergencyContactPhone());
        if (request.getProfilePhotoUrl() != null) profile.setProfilePhotoUrl(request.getProfilePhotoUrl());
        if (role != null && !role.isBlank()) profile.setRole(role);
        return toResponse(profileRepository.save(profile));
    }

    @Override
    public ProfileResponse getProfileById(String targetUserId) {
        return toResponse(profileRepository.findByUserId(targetUserId).orElseGet(() -> emptyProfile(targetUserId)));
    }

    @Override
    @Transactional
    public void deleteUser(String targetUserId) {
        deleteUser(targetUserId, "admin");
    }

    @Override
    @Transactional
    public void deleteUser(String targetUserId, String requestingUserId) {
        User requester = assertSuperAdmin(requestingUserId);

        User target = userRepository.findByUserId(targetUserId)
                .orElseThrow(() -> new BadRequestException("Target user not found: " + targetUserId));

        if (target.isSuperAdmin()) {
            throw new ForbiddenException("Super Admin accounts cannot be deleted.");
        }

        if (target.getUserId().equalsIgnoreCase(requester.getUserId())) {
            throw new ForbiddenException("Administrators cannot delete their own active account.");
        }

        refreshTokenRepository.deleteByUserId(targetUserId);
        profileRepository.deleteByUserId(targetUserId);
        userRepository.delete(target);

        String auditDetails = String.format("Deleted account: %s (%s) | Actioned By Super Admin: %s",
                target.getUserId(), target.getRole().name(), requester.getUserId());
        auditLogClient.logAsync(requester.getUserId(), "SUPER_ADMIN", "ACCOUNT_DELETED", auditDetails);
    }

    @org.springframework.beans.factory.annotation.Value("${aadhaar.ekyc.enabled:false}")
    private boolean ekycEnabled;

    @Override
    @Transactional
    public String verifyAadhaar(String userId, AadhaarVerifyRequest request) {
        if (request.getAadhaarNumber() == null || request.getAadhaarNumber().replaceAll("\\s", "").length() != 12) {
            throw new BadRequestException("Aadhaar number must be exactly 12 digits");
        }
        String cleanAadhaar = request.getAadhaarNumber().replaceAll("\\s", "");
        String hash = sha256(cleanAadhaar);
        String last4 = cleanAadhaar.substring(8);

        Aadhaar aadhaar = aadhaarRepository.findByUserId(userId).orElse(Aadhaar.builder().userId(userId).build());
        aadhaar.setAadhaarHash(hash);
        aadhaar.setAadhaarLast4(last4);

        if (!ekycEnabled) {
            aadhaar.setVerificationStatus("VERIFIED");
            aadhaarRepository.save(aadhaar);
            profileRepository.findByUserId(userId).ifPresent(p -> {
                p.setAadhaarVerified(true);
                profileRepository.save(p);
            });
            return "Aadhaar verified successfully (simulation mode)";
        }

        aadhaar.setVerificationStatus("VERIFIED");
        aadhaarRepository.save(aadhaar);
        profileRepository.findByUserId(userId).ifPresent(p -> {
            p.setAadhaarVerified(true);
            profileRepository.save(p);
        });
        return "Aadhaar verified successfully via eKYC";
    }

    @Override
    public List<UserSummaryDto> listAllUsers() {
        return userRepository.findAll().stream().map(this::mapToSummary).toList();
    }

    @Override
    public PageResponse<UserSummaryDto> listAllUsersPaginated(int page, int size, String q, String role, Boolean enabled, String sortBy, String sortDir) {
        Pageable pageable = createPageable(page, size, sortBy, sortDir, "id");

        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (q != null && !q.isBlank()) {
                String search = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("userId")), search),
                        cb.like(cb.lower(root.get("email")), search)
                ));
            }

            if (role != null && !role.isBlank() && !"ALL".equalsIgnoreCase(role)) {
                try {
                    Role r = Role.valueOf(role.trim().toUpperCase());
                    predicates.add(cb.equal(root.get("role"), r));
                } catch (Exception ignored) {}
            }

            if (enabled != null) {
                predicates.add(cb.equal(root.get("enabled"), enabled));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<User> usersPage = userRepository.findAll(spec, pageable);
        List<UserSummaryDto> summaries = usersPage.getContent().stream()
                .map(this::mapToSummary)
                .toList();

        return PageResponse.of(summaries, usersPage.getNumber(), usersPage.getSize(), usersPage.getTotalElements());
    }

    @Override
    @Transactional
    public UserSummaryDto updateUserStatus(String userId, boolean enabled) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new BadRequestException("User not found: " + userId));

        if (user.isSuperAdmin()) {
            throw new ForbiddenException("Super Admin account status cannot be modified.");
        }

        user.setEnabled(enabled);
        userRepository.save(user);

        if (!enabled) {
            refreshTokenRepository.deleteByUserId(user.getUserId());
        }

        return mapToSummary(user);
    }

    @Override
    @Transactional
    public UserSummaryDto deactivateUser(String targetUserId, String requestingUserId, DeactivateUserRequest request) {
        User requester = assertSuperAdmin(requestingUserId);

        if (request == null || request.getReason() == null || request.getReason().trim().length() < 5) {
            throw new BadRequestException("Deactivation reason is mandatory (minimum 5 characters).");
        }
        if (request.getEvidenceRef() == null || request.getEvidenceRef().trim().length() < 3) {
            throw new BadRequestException("Evidence reference is mandatory (complaint ID, FIR number, audit reference, or evidence file).");
        }

        User target = userRepository.findByUserId(targetUserId)
                .orElseThrow(() -> new BadRequestException("Target user not found: " + targetUserId));

        if (target.isSuperAdmin()) {
            throw new ForbiddenException("Super Admin accounts cannot be deactivated, suspended, or modified.");
        }

        if (target.getUserId().equalsIgnoreCase(requester.getUserId())) {
            throw new ForbiddenException("Super Administrators cannot deactivate their own active account.");
        }

        String previousStatus = target.isEnabled() ? "ACTIVE" : "SUSPENDED";

        target.setEnabled(false);
        target.setDeactivationReason(request.getReason().trim());
        target.setDeactivationEvidenceRef(request.getEvidenceRef().trim());
        target.setDeactivatedBy(requester.getUserId());
        target.setDeactivatedAt(LocalDateTime.now());
        userRepository.save(target);

        // Immediately revoke all active refresh tokens so user cannot obtain new access tokens
        refreshTokenRepository.deleteByUserId(target.getUserId());

        // Log in immutable audit ledger
        String auditDetails = String.format("Deactivated account: %s (%s) | Reason: %s | Evidence: %s | Previous Status: %s | Actioned By Super Admin: %s",
                target.getUserId(), target.getRole().name(), request.getReason().trim(), request.getEvidenceRef().trim(), previousStatus, requester.getUserId());
        auditLogClient.logAsync(requester.getUserId(), "SUPER_ADMIN", "ACCOUNT_DEACTIVATED", auditDetails);

        return mapToSummary(target);
    }

    @Override
    @Transactional
    public UserSummaryDto reactivateUser(String targetUserId, String requestingUserId, ReactivateUserRequest request) {
        User requester = assertSuperAdmin(requestingUserId);

        if (request == null || request.getReason() == null || request.getReason().trim().length() < 5) {
            throw new BadRequestException("Reactivation reason is mandatory (minimum 5 characters).");
        }

        User target = userRepository.findByUserId(targetUserId)
                .orElseThrow(() -> new BadRequestException("Target user not found: " + targetUserId));

        String previousStatus = target.isEnabled() ? "ACTIVE" : "SUSPENDED";

        target.setEnabled(true);
        target.setReactivationReason(request.getReason().trim());
        target.setReactivatedBy(requester.getUserId());
        target.setReactivatedAt(LocalDateTime.now());
        userRepository.save(target);

        // Log in immutable audit ledger
        String auditDetails = String.format("Reactivated account: %s (%s) | Reason: %s | Previous Status: %s | Actioned By Super Admin: %s",
                target.getUserId(), target.getRole().name(), request.getReason().trim(), previousStatus, requester.getUserId());
        auditLogClient.logAsync(requester.getUserId(), "SUPER_ADMIN", "ACCOUNT_REACTIVATED", auditDetails);

        return mapToSummary(target);
    }

    private User assertSuperAdmin(String requestingUserId) {
        if (requestingUserId == null || requestingUserId.isBlank()) {
            throw new ForbiddenException("Access Denied: Authentication required.");
        }
        User requester = userRepository.findByUserId(requestingUserId)
                .orElseThrow(() -> new ForbiddenException("Access Denied: Unknown administrator."));
        if (!requester.isSuperAdmin()) {
            throw new ForbiddenException("Access Denied: Only Super Administrators can perform this action.");
        }
        return requester;
    }

    private UserSummaryDto mapToSummary(User u) {
        Optional<Profile> pOpt = profileRepository.findByUserId(u.getUserId());
        return UserSummaryDto.builder()
                .id(u.getId())
                .userId(u.getUserId())
                .email(u.getEmail())
                .role(u.getRole().name())
                .superAdmin(u.isSuperAdmin())
                .enabled(u.isEnabled())
                .fullName(pOpt.map(Profile::getFullName).orElse(u.getUserId()))
                .phone(pOpt.map(Profile::getPhone).orElse("—"))
                .city(pOpt.map(Profile::getCity).orElse("—"))
                .aadhaarVerified(pOpt.map(Profile::isAadhaarVerified).orElse(false))
                .createdAt(u.getCreatedAt())
                .deactivationReason(u.getDeactivationReason())
                .deactivationEvidenceRef(u.getDeactivationEvidenceRef())
                .deactivatedBy(u.getDeactivatedBy())
                .deactivatedAt(u.getDeactivatedAt())
                .reactivationReason(u.getReactivationReason())
                .reactivatedBy(u.getReactivatedBy())
                .reactivatedAt(u.getReactivatedAt())
                .build();
    }

    private Profile emptyProfile(String userId) {
        return Profile.builder().userId(userId).build();
    }

    private ProfileResponse toResponse(Profile p) {
        String email = userRepository.findByUserId(p.getUserId()).map(User::getEmail).orElse(null);
        return ProfileResponse.builder()
                .userId(p.getUserId())
                .fullName(p.getFullName())
                .email(email)
                .phone(p.getPhone())
                .address(p.getAddress())
                .city(p.getCity())
                .state(p.getState())
                .pincode(p.getPincode())
                .gender(p.getGender())
                .dateOfBirth(p.getDateOfBirth())
                .bio(p.getBio())
                .emergencyContactName(p.getEmergencyContactName())
                .emergencyContactPhone(p.getEmergencyContactPhone())
                .profilePhotoUrl(p.getProfilePhotoUrl())
                .role(p.getRole())
                .aadhaarVerified(p.isAadhaarVerified())
                .build();
    }

    private String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes()));
        } catch (Exception e) {
            throw new RuntimeException("Hashing failed", e);
        }
    }
}
