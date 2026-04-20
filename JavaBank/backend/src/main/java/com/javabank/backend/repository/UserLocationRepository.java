package com.javabank.backend.repository;

import com.javabank.backend.model.entity.UserLocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserLocationRepository extends JpaRepository<UserLocation, UUID> {
    List<UserLocation> findTop100ByOrderByTimestampDesc();
}
