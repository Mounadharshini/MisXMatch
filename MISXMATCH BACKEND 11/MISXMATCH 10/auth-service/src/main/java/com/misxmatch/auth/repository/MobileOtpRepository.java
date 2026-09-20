package com.misxmatch.auth.repository;

import com.misxmatch.auth.entity.MobileOtp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MobileOtpRepository extends JpaRepository<MobileOtp, Long> {
    Optional<MobileOtp> findByMobile(String mobile);
}
