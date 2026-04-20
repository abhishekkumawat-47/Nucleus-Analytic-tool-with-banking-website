package com.javabank.backend.repository;

import com.javabank.backend.model.entity.FeatureToggle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeatureToggleRepository extends JpaRepository<FeatureToggle, UUID> {
    List<FeatureToggle> findByTenantIdIn(List<String> tenantIds);
    Optional<FeatureToggle> findByTenantKey(String tenantKey);
}
