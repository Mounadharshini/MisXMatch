package com.misxmatch.auth.repository;

import com.misxmatch.auth.entity.AadhaarOtpTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AadhaarOtpTransactionRepository extends JpaRepository<AadhaarOtpTransaction, String> {
    Optional<AadhaarOtpTransaction> findByTxnId(String txnId);
    Optional<AadhaarOtpTransaction> findTopByAadhaarHashOrderByCreatedAtDesc(String aadhaarHash);
    Optional<AadhaarOtpTransaction> findByVerificationToken(String verificationToken);
    void deleteByAadhaarHash(String aadhaarHash);
}
