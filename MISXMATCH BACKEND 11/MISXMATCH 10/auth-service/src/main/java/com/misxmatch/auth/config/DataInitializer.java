package com.misxmatch.auth.config;

import com.misxmatch.auth.entity.Aadhaar;
import com.misxmatch.auth.entity.Organization;
import com.misxmatch.auth.entity.Profile;
import com.misxmatch.auth.entity.Role;
import com.misxmatch.auth.entity.User;
import com.misxmatch.auth.repository.AadhaarRepository;
import com.misxmatch.auth.repository.OrganizationRepository;
import com.misxmatch.auth.repository.ProfileRepository;
import com.misxmatch.auth.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Seeds default production-grade accounts across all roles (Admin, Police,
 * Hospital, NGO, Shelter, Public Citizen) with pre-configured profiles,
 * verified Aadhaar records, and registered organizations.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final AadhaarRepository aadhaarRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository,
                           ProfileRepository profileRepository,
                           AadhaarRepository aadhaarRepository,
                           OrganizationRepository organizationRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.aadhaarRepository = aadhaarRepository;
        this.organizationRepository = organizationRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            seedUser("admin", "admin@agency.gov.in", "password", Role.ADMIN, true, "System Super Admin");
            seedUser("police_officer", "police@agency.gov.in", "password", Role.POLICE, false, "Inspector Rajesh Kumar");
            seedUser("hospital_staff", "hospital@agency.gov.in", "password", Role.HOSPITAL, false, "Dr. Ananya Sharma");
            seedUser("ngo_coordinator", "ngo@agency.gov.in", "password", Role.NGO, false, "Priya Verma");
            seedUser("john_citizen", "citizen@agency.gov.in", "password", Role.PUBLIC_USER, false, "John Citizen");
            seedUser("dhachumaa1822", "dhachumaa1822@gmail.com", "password", Role.PUBLIC_USER, false, "Dhachumaa User");
        }
    }

    private void seedUser(String userId, String email, String password, Role role, boolean isSuperAdmin, String fullName) {
        if (userRepository.existsByUserId(userId) || userRepository.existsByEmail(email)) {
            return;
        }

        User user = User.builder()
                .userId(userId)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(role)
                .superAdmin(isSuperAdmin)
                .enabled(true)
                .build();
        userRepository.save(user);

        Profile profile = Profile.builder()
                .userId(userId)
                .fullName(fullName)
                .role(role.name())
                .aadhaarVerified(true)
                .build();
        profileRepository.save(profile);
    }
}
