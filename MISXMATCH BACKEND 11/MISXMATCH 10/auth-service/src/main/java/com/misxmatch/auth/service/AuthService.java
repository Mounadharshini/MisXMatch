package com.misxmatch.auth.service;

import com.misxmatch.auth.dto.*;
import com.misxmatch.auth.entity.Role;
import com.misxmatch.auth.entity.User;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AadhaarSendOtpResponse sendAadhaarOtp(AadhaarSendOtpRequest request);
    String requestAadhaarOtp(AadhaarOtpRequest request);
    AadhaarVerifyOtpResponse verifyAadhaarOtp(AadhaarVerifyOtpRequest request);
    AuthResponse loginWithAadhaarPassword(AadhaarLoginRequest request);
    void logout(String refreshToken);
    AuthResponse refresh(RefreshTokenRequest request);
    String forgotPassword(ForgotPasswordRequest request);
    String resendResetOtp(ForgotPasswordRequest request);
    String verifyResetOtp(VerifyResetOtpRequest request);
    void resetPassword(ResetPasswordRequest request);
    boolean validateResetToken(String token);
    String getAadhaarProviderMode();

    // Super Admin only
    User createAdmin(CreateAdminRequest request, String requestingUserId);
    void deleteAdmin(String adminUserId, String requestingUserId);
    String resetAdminPassword(String adminUserId, String requestingUserId);
    java.util.List<User> listAdmins(String requestingUserId);
    java.util.Map<String, Long> getUserCountsByRole(String requestingUserId);
}
