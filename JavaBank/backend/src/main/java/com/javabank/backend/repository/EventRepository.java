package com.javabank.backend.repository;

import com.javabank.backend.model.entity.EventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EventRepository extends JpaRepository<EventEntity, UUID> {
    List<EventEntity> findTop20ByOrderByTimestampDesc();
    List<EventEntity> findByCustomerIdAndEventName(UUID customerId, String eventName);
}
