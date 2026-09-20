package com.misxmatch.auth.repository;

import com.misxmatch.auth.entity.Profile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProfileRepository extends JpaRepository<Profile, Long> {
    Optional<Profile> findByUserId(String userId);
    void deleteByUserId(String userId);
}
