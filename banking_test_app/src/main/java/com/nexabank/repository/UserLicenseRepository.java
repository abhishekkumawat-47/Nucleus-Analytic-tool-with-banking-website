package com.nexabank.repository;

import com.nexabank.entity.UserLicense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserLicenseRepository extends JpaRepository<UserLicense, UUID> {
    List<UserLicense> findByCustomerIdAndActiveTrueAndExpiryDateAfter(UUID customerId, LocalDateTime now);
    Optional<UserLicense> findByCustomerIdAndFeatureId(UUID customerId, String featureId);
    Optional<UserLicense> findByCustomerIdAndFeatureIdAndActiveTrueAndExpiryDateAfter(UUID customerId, String featureId, LocalDateTime now);
}
