package com.nexabank.repository;

import com.nexabank.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EventRepository extends JpaRepository<Event, UUID> {
    List<Event> findTop20ByOrderByTimestampDesc();
    List<Event> findByCustomerIdAndEventName(UUID customerId, String eventName);
}
