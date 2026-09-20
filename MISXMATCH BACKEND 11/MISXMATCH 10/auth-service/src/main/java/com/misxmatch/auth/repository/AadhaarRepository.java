package com.misxmatch.auth.repository;

import com.misxmatch.auth.entity.Aadhaar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AadhaarRepository extends JpaRepository<Aadhaar, Long> {
    Optional<Aadhaar> findByUserId(String userId);
    Optional<Aadhaar> findByAadhaarHash(String aadhaarHash);
    java.util.List<Aadhaar> findByAadhaarLast4(String aadhaarLast4);
}
