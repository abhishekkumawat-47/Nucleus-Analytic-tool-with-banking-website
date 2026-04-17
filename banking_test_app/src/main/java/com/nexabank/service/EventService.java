package com.nexabank.service;

import com.nexabank.entity.Event;
import com.nexabank.repository.EventRepository;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
public class EventService {

    private final EventRepository eventRepository;

    public EventService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    public void trackEvent(String eventName, String customerId, String tenantId, Map<String, Object> metadata) {
        trackEvent(eventName, customerId, tenantId, metadata, null);
    }

    public void trackEvent(String eventName, String customerId, String tenantId,
                           Map<String, Object> metadata, LocalDateTime timestampOverride) {
        try {
            String hashedUserId = customerId != null ? hashUserId(customerId) : "anonymous";
            Event event = Event.builder()
                    .eventName(eventName)
                    .tenantId(tenantId)
                    .userId(hashedUserId)
                    .customerId(customerId != null ? UUID.fromString(customerId) : null)
                    .metadata(metadata)
                    .timestamp(timestampOverride != null ? timestampOverride : LocalDateTime.now())
                    .build();
            eventRepository.save(event);
        } catch (Exception e) {
            // Silent fail — event tracking should never break the primary app
            System.err.println("[EVENT_TRACKER] Failed to store event: " + e.getMessage());
        }
    }

    public static String hashUserId(String userId) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(userId.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return userId;
        }
    }
}
