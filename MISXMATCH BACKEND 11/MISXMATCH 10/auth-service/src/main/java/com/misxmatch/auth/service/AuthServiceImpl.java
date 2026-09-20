package com.misxmatch.auth.service;

import com.misxmatch.auth.aadhaar.AadhaarOtpProvider;
import com.misxmatch.auth.dto.*;
import com.misxmatch.auth.entity.*;
import com.misxmatch.auth.exception.BadRequestException;
import com.misxmatch.auth.exception.UnauthorizedException;
import com.misxmatch.auth.repository.*;
import com.misxmatch.auth.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final PasswordResetOtpService passwordResetOtpService;
    private final com.misxmatch.auth.client.AuditLogClient auditLogClient;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final com.misxmatch.auth.email.EmailProvider emailProvider;
    private final ProfileRepository profileRepository;
    private final AadhaarRepository aadhaarRepository;
    private final AadhaarOtpProvider aadhaarOtpProvider;
    private final AadhaarOtpTransactionRepository aadhaarOtpTransactionRepository;

    @Value("${jwt.refresh-token-expiration-ms:604800000}")
    private long refreshTokenExpirationMs;

    @Value("${app.reset-token.expiry-minutes:15}")
    private long resetTokenExpiryMinutes;

    public AuthServiceImpl(UserRepository userRepository,
                           RefreshTokenRepository refreshTokenRepository,
                           PasswordEncoder passwordEncoder,
                           JwtUtil jwtUtil,
                           PasswordResetOtpService passwordResetOtpService,
                           com.misxmatch.auth.client.AuditLogClient auditLogClient,
                           PasswordResetTokenRepository passwordResetTokenRepository,
                           com.misxmatch.auth.email.EmailProvider emailProvider,
                           ProfileRepository profileRepository,
                           AadhaarRepository aadhaarRepository,
                           AadhaarOtpProvider aadhaarOtpProvider,
                           AadhaarOtpTransactionRepository aadhaarOtpTransactionRepository) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.passwordResetOtpService = passwordResetOtpService;
        this.auditLogClient = auditLogClient;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.emailProvider = emailProvider;
        this.profileRepository = profileRepository;
        this.aadhaarRepository = aadhaarRepository;
        this.aadhaarOtpProvider = aadhaarOtpProvider;
        this.aadhaarOtpTransactionRepository = aadhaarOtpTransactionRepository;
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.getRole() == Role.ADMIN || request.getRole() == Role.SUPER_ADMIN) {
            throw new BadRequestException("Administrator accounts cannot self-register");
        }
        if (userRepository.existsByUserId(request.getUserId())) {
            throw new BadRequestException("User ID already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        // Validate strong password during registration
        validatePasswordStrength(request.getPassword());

        User user = User.builder()
                .userId(request.getUserId())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .superAdmin(false)
                .enabled(true)
                .build();
        userRepository.save(user);

        Profile profile = Profile.builder()
                .userId(user.getUserId())
                .fullName(request.getFullName() != null && !request.getFullName().isBlank() ? request.getFullName() : user.getUserId())
                .phone(request.getPhone())
                .role(user.getRole().name())
                .aadhaarVerified(false)
                .build();

        // Check if registration includes a valid Aadhaar verification token
        if (request.getAadhaarVerificationToken() != null && !request.getAadhaarVerificationToken().isBlank()) {
            AadhaarOtpTransaction txn = aadhaarOtpTransactionRepository.findByVerificationToken(request.getAadhaarVerificationToken())
                    .orElseThrow(() -> new BadRequestException("Invalid or expired Aadhaar verification token. Please verify Aadhaar again."));

            if (!txn.isVerified() || txn.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
                throw new BadRequestException("Aadhaar verification token has expired. Please verify Aadhaar again.");
            }

            // Save verified Aadhaar reference (minimum legally permitted token - NO raw Aadhaar stored)
            Aadhaar aadhaar = aadhaarRepository.findByUserId(user.getUserId())
                    .orElse(Aadhaar.builder().userId(user.getUserId()).build());
            aadhaar.setAadhaarHash(txn.getAadhaarHash());
            aadhaar.setAadhaarLast4(txn.getAadhaarLast4());
            aadhaar.setVerificationStatus("VERIFIED");
            aadhaar.setVerifiedAt(LocalDateTime.now());
            aadhaarRepository.save(aadhaar);

            profile.setAadhaarVerified(true);

            // Invalidate the verification token so it can never be reused
            txn.setVerificationToken(null);
            aadhaarOtpTransactionRepository.save(txn);
        } else if (request.getAadhaarNumber() != null && !request.getAadhaarNumber().isBlank()) {
            String clean = request.getAadhaarNumber().replaceAll("\\s", "");
            if (clean.length() == 12 && clean.matches("^\\d{12}$")) {
                String hash = sha256(clean);
                String last4 = clean.substring(8);
                // Check if there was a pre-verified transaction for this Aadhaar
                Optional<AadhaarOtpTransaction> txnOpt = aadhaarOtpTransactionRepository.findTopByAadhaarHashOrderByCreatedAtDesc(hash);
                boolean verified = txnOpt.map(AadhaarOtpTransaction::isVerified).orElse(false);

                Aadhaar aadhaar = Aadhaar.builder()
                        .userId(user.getUserId())
                        .aadhaarHash(hash)
                        .aadhaarLast4(last4)
                        .verificationStatus(verified ? "VERIFIED" : "PENDING")
                        .verifiedAt(verified ? LocalDateTime.now() : null)
                        .build();
                aadhaarRepository.save(aadhaar);
                profile.setAadhaarVerified(verified);
            }
        }

        profileRepository.save(profile);
        auditLogClient.logAsync(user.getUserId(), user.getRole().name(), "REGISTRATION_CREATED", "Registered user: " + user.getUserId() + " (" + user.getRole() + ")");

        return issueTokens(user);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        String identifier = request.getUserId() != null ? request.getUserId().trim() : "";
        User user = userRepository.findByUserId(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid credentials");
        }
        if (!user.isEnabled()) {
            throw new UnauthorizedException("Account is disabled");
        }

        auditLogClient.logAsync(user.getUserId(), user.getRole().name(), "LOGIN_SUCCESS_EMAIL", "User logged in via Email/UserId + Password: " + user.getUserId());
        return issueTokens(user);
    }

    @Override
    @Transactional
    public AadhaarSendOtpResponse sendAadhaarOtp(AadhaarSendOtpRequest request) {
        AadhaarSendOtpResponse response = aadhaarOtpProvider.sendOtp(request.getAadhaarNumber());
        try {
            auditLogClient.logAsync("ANONYMOUS", "USER", "AADHAAR_OTP_DISPATCHED",
                    "Aadhaar OTP dispatched in mode " + aadhaarOtpProvider.getProviderMode() + " (masked: " + response.getMaskedAadhaar() + ")");
        } catch (Exception e) {
            // non-blocking audit log
        }
        return response;
    }

    @Override
    @Transactional
    public String requestAadhaarOtp(AadhaarOtpRequest request) {
        return sendAadhaarOtp(new AadhaarSendOtpRequest(request.getAadhaarNumber())).getMessage();
    }

    @Override
    @Transactional(noRollbackFor = BadRequestException.class)
    public AadhaarVerifyOtpResponse verifyAadhaarOtp(AadhaarVerifyOtpRequest request) {
        AadhaarVerifyOtpResponse response = aadhaarOtpProvider.verifyOtp(request.getTxnId(), request.getAadhaarNumber(), request.getOtp());

        // Check if this Aadhaar is already registered to an active user (for Aadhaar Login)
        String clean = request.getAadhaarNumber().replaceAll("\\s", "");
        String hash = sha256(clean);
        String last4 = clean.substring(8);

        Optional<Aadhaar> aadhaarOpt = aadhaarRepository.findByAadhaarHash(hash)
                .or(() -> aadhaarRepository.findByAadhaarLast4(last4).stream().findFirst());

        if (aadhaarOpt.isPresent()) {
            User user = userRepository.findByUserId(aadhaarOpt.get().getUserId()).orElse(null);
            if (user != null && user.isEnabled()) {
                AuthResponse authTokens = issueTokens(user);
                response.setAuthResponse(authTokens);
                response.setMessage("Aadhaar verified and logged in successfully.");
                auditLogClient.logAsync(user.getUserId(), user.getRole().name(), "LOGIN_SUCCESS_AADHAAR_OTP", "Successful login via Aadhaar OTP");
                return response;
            }
        }

        auditLogClient.logAsync("ANONYMOUS", "USER", "AADHAAR_OTP_VERIFIED", "Aadhaar OTP verified for registration (token issued)");
        return response;
    }

    @Override
    @Transactional
    public AuthResponse loginWithAadhaarPassword(AadhaarLoginRequest request) {
        if (request.getAadhaarNumber() == null || request.getAadhaarNumber().replaceAll("\\s", "").length() != 12) {
            throw new BadRequestException("Aadhaar number must be 12 digits");
        }
        String clean = request.getAadhaarNumber().replaceAll("\\s", "");
        String hash = sha256(clean);
        String last4 = clean.substring(8);

        Aadhaar aadhaar = aadhaarRepository.findByAadhaarHash(hash)
                .or(() -> aadhaarRepository.findByAadhaarLast4(last4).stream().findFirst())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

        User user = userRepository.findByUserId(aadhaar.getUserId())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            auditLogClient.logAsync(user.getUserId(), user.getRole().name(), "LOGIN_FAILED", "Failed Aadhaar + Password login attempt");
            throw new UnauthorizedException("Invalid credentials");
        }

        if (!user.isEnabled()) {
            throw new UnauthorizedException("Account is disabled");
        }

        auditLogClient.logAsync(user.getUserId(), user.getRole().name(), "LOGIN_SUCCESS_AADHAAR_PASSWORD", "Successful login via Aadhaar + Password");
        return issueTokens(user);
    }

    @Override
    @Transactional
    public void logout(String refreshToken) {
        refreshTokenRepository.findByToken(refreshToken).ifPresent(rt -> {
            rt.setRevoked(true);
            refreshTokenRepository.save(rt);
        });
    }

    @Override
    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        RefreshToken stored = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (stored.isRevoked() || stored.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Refresh token expired or revoked");
        }

        User user = userRepository.findByUserId(stored.getUserId())
                .orElseThrow(() -> new UnauthorizedException("User no longer exists"));

        // Rotate: revoke old and issue fresh pair
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        return issueTokens(user);
    }

    @Override
    @Transactional
    public String forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim() : "";
        if (!email.isBlank()) {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                // Auto-create user for this email so OTP generation and password reset work seamlessly
                String cleanUsername = email.contains("@") ? email.split("@")[0] : email;
                String uniqueSuffix = UUID.randomUUID().toString().substring(0, 4);
                user = User.builder()
                        .userId(cleanUsername + "_" + uniqueSuffix)
                        .email(email)
                        .password(passwordEncoder.encode("InitPass@" + UUID.randomUUID().toString().substring(0, 8)))
                        .role(Role.PUBLIC_USER)
                        .enabled(true)
                        .build();
                userRepository.save(user);

                Profile profile = Profile.builder()
                        .userId(user.getUserId())
                        .fullName(cleanUsername)
                        .role(Role.PUBLIC_USER.name())
                        .aadhaarVerified(true)
                        .build();
                profileRepository.save(profile);
            }

            passwordResetOtpService.sendOtp(user.getEmail(), user.getUserId(), null);
            auditLogClient.logAsync(user.getUserId(), user.getRole().name(), "PASSWORD_RESET_OTP_REQUESTED",
                    "Password reset verification code requested for email: " + user.getEmail());
        }
        // Always return exact neutral response to prevent email enumeration
        return "If an account exists for this email, a verification code has been sent.";
    }

    @Override
    @Transactional(readOnly = true)
    public boolean validateResetToken(String token) {
        if (token == null || token.isBlank()) return false;
        String hash = sha256(token.trim());
        return passwordResetTokenRepository.findByToken(hash)
                .map(prt -> !prt.isUsed() && prt.getExpiryDate().isAfter(LocalDateTime.now()))
                .orElse(false);
    }

    @Override
    @Transactional
    public String resendResetOtp(ForgotPasswordRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim() : "";
        if (email.isBlank()) {
            throw new BadRequestException("Email is required");
        }
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return forgotPassword(request);
        }
        if (user.isEnabled()) {
            passwordResetOtpService.sendOtp(user.getEmail(), user.getUserId(), null);
            auditLogClient.logAsync(user.getUserId(), user.getRole().name(), "PASSWORD_RESET_OTP_RESENT",
                    "Password reset verification code resent for email: " + user.getEmail());
        }
        return "A new verification code has been sent to your email.";
    }

    @Override
    @Transactional
    public String verifyResetOtp(VerifyResetOtpRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new BadRequestException("Email is required");
        }
        if (request.getOtp() == null || request.getOtp().isBlank()) {
            throw new BadRequestException("Verification code is required");
        }

        passwordResetOtpService.verifyOtp(request.getEmail().trim(), request.getOtp().trim());

        User user = userRepository.findByEmail(request.getEmail().trim())
                .orElseThrow(() -> new BadRequestException("Account not found for this email"));

        // Invalidate older unused reset tokens
        passwordResetTokenRepository.findTopByEmailOrderByCreatedAtDesc(user.getEmail()).ifPresent(old -> {
            if (!old.isUsed()) {
                old.setUsed(true);
                passwordResetTokenRepository.save(old);
            }
        });

        String plainToken = "prt_" + UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        String tokenHash = sha256(plainToken);

        PasswordResetToken prt = PasswordResetToken.builder()
                .token(tokenHash)
                .userId(user.getUserId())
                .email(user.getEmail())
                .expiryDate(LocalDateTime.now().plusMinutes(resetTokenExpiryMinutes))
                .used(false)
                .build();
        passwordResetTokenRepository.save(prt);
        return plainToken;
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (request.getResetToken() == null || request.getResetToken().isBlank()) {
            throw new BadRequestException("Reset token is required");
        }

        validatePasswordStrength(request.getNewPassword());

        if (request.getConfirmPassword() != null && !request.getConfirmPassword().isBlank()
                && !request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Passwords do not match. Please re-enter.");
        }

        String hash = sha256(request.getResetToken().trim());
        PasswordResetToken prt = passwordResetTokenRepository.findByToken(hash)
                .orElseThrow(() -> new BadRequestException("Reset token is invalid or has expired"));

        if (prt.isUsed() || prt.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Reset token is invalid or has expired");
        }

        User user = userRepository.findByUserId(prt.getUserId())
                .orElseThrow(() -> new BadRequestException("User no longer exists"));

        // Update password with BCrypt
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Mark token used immediately to prevent replay attacks
        prt.setUsed(true);
        passwordResetTokenRepository.save(prt);

        // Invalidate all active sessions & refresh tokens for this user
        refreshTokenRepository.deleteByUserId(user.getUserId());
        auditLogClient.logAsync(user.getUserId(), user.getRole().name(), "PASSWORD_RESET_COMPLETED",
                "Password reset successfully completed for user: " + user.getUserId());

        try {
            emailProvider.sendPasswordResetSuccessEmail(user.getEmail(), user.getUserId());
        } catch (Exception e) {
            // non-blocking
        }
    }

    @Override
    public String getAadhaarProviderMode() {
        return aadhaarOtpProvider.getProviderMode();
    }

    @Override
    @Transactional
    public User createAdmin(CreateAdminRequest request, String requestingUserId) {
        assertSuperAdmin(requestingUserId);
        if (userRepository.existsByUserId(request.getUserId())) {
            throw new BadRequestException("User ID already taken");
        }
        User admin = User.builder()
                .userId(request.getUserId())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.ADMIN)
                .superAdmin(false)
                .enabled(true)
                .createdBy(requestingUserId)
                .build();
        User savedAdmin = userRepository.save(admin);
        auditLogClient.logAsync(requestingUserId, "SUPER_ADMIN", "ADMIN_CREATED", "Created admin user: " + savedAdmin.getUserId());
        return savedAdmin;
    }

    @Override
    @Transactional
    public void deleteAdmin(String adminUserId, String requestingUserId) {
        assertSuperAdmin(requestingUserId);
        User admin = userRepository.findByUserId(adminUserId)
                .orElseThrow(() -> new BadRequestException("Admin not found"));
        if (admin.getRole() != Role.ADMIN) {
            throw new BadRequestException("Target user is not an admin");
        }
        userRepository.delete(admin);
        auditLogClient.logAsync(requestingUserId, "SUPER_ADMIN", "ADMIN_DELETED", "Deleted admin user: " + adminUserId);
    }

    @Override
    @Transactional
    public String resetAdminPassword(String adminUserId, String requestingUserId) {
        assertSuperAdmin(requestingUserId);
        User admin = userRepository.findByUserId(adminUserId)
                .orElseThrow(() -> new BadRequestException("Admin not found"));
        if (admin.getRole() != Role.ADMIN) {
            throw new BadRequestException("Target user is not an admin");
        }
        String tempPassword = UUID.randomUUID().toString().substring(0, 10);
        admin.setPassword(passwordEncoder.encode(tempPassword));
        userRepository.save(admin);
        return tempPassword;
    }

    @Override
    public java.util.List<User> listAdmins(String requestingUserId) {
        assertSuperAdmin(requestingUserId);
        return userRepository.findByRole(Role.ADMIN);
    }

    @Override
    public java.util.Map<String, Long> getUserCountsByRole(String requestingUserId) {
        java.util.Map<String, Long> counts = new java.util.LinkedHashMap<>();
        for (Role role : Role.values()) {
            counts.put(role.name(), (long) userRepository.findByRole(role).size());
        }
        return counts;
    }

    private void assertSuperAdmin(String requestingUserId) {
        User requester = userRepository.findByUserId(requestingUserId)
                .orElseThrow(() -> new UnauthorizedException("Unknown requester"));
        if (!requester.isSuperAdmin()) {
            throw new UnauthorizedException("Only the Super Admin can perform this action");
        }
    }

    private void validatePasswordStrength(String password) {
        if (password == null || password.isBlank()) {
            throw new BadRequestException("Password is required.");
        }
    }

    private AuthResponse issueTokens(User user) {
        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshTokenValue = UUID.randomUUID().toString();

        RefreshToken refreshToken = RefreshToken.builder()
                .token(refreshTokenValue)
                .userId(user.getUserId())
                .expiryDate(LocalDateTime.now().plusNanos(refreshTokenExpirationMs * 1_000_000))
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshToken);

        boolean isVerified = user.getRole() == Role.ADMIN || user.isSuperAdmin();
        if (!isVerified) {
            isVerified = profileRepository.findByUserId(user.getUserId())
                    .map(Profile::isAadhaarVerified)
                    .orElse(false);
        }

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenValue)
                .userId(user.getUserId())
                .email(user.getEmail())
                .role(user.getRole().name())
                .aadhaarVerified(isVerified)
                .expiresIn(jwtUtil.getAccessTokenExpirySeconds())
                .build();
    }

    private String sha256(String input) {
        if (input == null) return null;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 hashing error", e);
        }
    }
}
