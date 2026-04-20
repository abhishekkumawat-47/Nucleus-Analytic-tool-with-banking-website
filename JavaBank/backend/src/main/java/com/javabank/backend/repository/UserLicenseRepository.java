package com.javabank.backend.repository;

import com.javabank.backend.model.entity.UserLicense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserLicenseRepository extends JpaRepository<UserLicense, UUID> {
    List<UserLicense> findByCustomerIdAndActiveTrueAndExpiryDateAfter(UUID customerId, Instant now);
    Optional<UserLicense> findByCustomerFeatureKey(String customerFeatureKey);
    Optional<UserLicense> findFirstByCustomerIdAndFeatureIdAndActiveTrueAndExpiryDateAfter(UUID customerId, String featureId, Instant now);
}
