package com.nexabank.repository;

import com.nexabank.entity.FeatureToggle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FeatureToggleRepository extends JpaRepository<FeatureToggle, UUID> {
    List<FeatureToggle> findByTenantIdIn(List<String> tenantIds);
    Optional<FeatureToggle> findByKeyAndTenantId(String key, String tenantId);
}
