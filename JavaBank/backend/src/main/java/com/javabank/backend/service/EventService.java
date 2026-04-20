package com.javabank.backend.service;

import com.javabank.backend.model.entity.EventEntity;
import com.javabank.backend.repository.EventRepository;
import com.javabank.backend.websocket.EventWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class EventService {
    private static final Logger LOGGER = LoggerFactory.getLogger(EventService.class);

    private final EventRepository eventRepository;
    private final EventWebSocketHandler eventWebSocketHandler;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${app.analytics.ingestion-url:${INGESTION_API_URL:http://localhost:8000/events}}")
    private String ingestionUrl;

    public EventService(EventRepository eventRepository, EventWebSocketHandler eventWebSocketHandler, ObjectMapper objectMapper) {
        this.eventRepository = eventRepository;
        this.eventWebSocketHandler = eventWebSocketHandler;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .version(HttpClient.Version.HTTP_1_1)
            .build();
    }

    public void track(String eventName, UUID customerId, String tenantId, Map<String, Object> metadata) {
        track(eventName, customerId, tenantId, metadata, null);
    }

    public void track(String eventName, UUID customerId, String tenantId, Map<String, Object> metadata, Instant timestamp) {
        String resolvedTenantId = tenantId == null ? "bank_a" : tenantId;
        String hashedUserId = customerId == null ? "anonymous" : hashUserId(customerId.toString());
        Instant eventTimestamp = timestamp == null ? Instant.now() : timestamp;

        EventEntity e = new EventEntity();
        e.setEventName(eventName);
        e.setCustomerId(customerId);
        e.setTenantId(resolvedTenantId);
        e.setUserId(hashedUserId);
        e.setMetadata(metadata);
        e.setTimestamp(eventTimestamp);
        eventRepository.save(e);

        forwardToIngestion(eventName, hashedUserId, resolvedTenantId, metadata == null ? Map.of() : metadata, eventTimestamp);

        eventWebSocketHandler.broadcast(eventName, Map.of(
            "tenantId", resolveAnalyticsTenantId(e.getTenantId()),
            "customerId", hashedUserId,
            "metadata", metadata == null ? Map.of() : metadata
        ));
    }

    private String resolveAnalyticsTenantId(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return "jbank";
        }

        String normalized = tenantId.trim().toLowerCase();
        if ("bank_a".equals(normalized) || "jbank".equals(normalized)) {
            return "jbank";
        }
        if ("bank_b".equals(normalized) || "obank".equals(normalized)) {
            return "obank";
        }
        if ("javabank".equals(normalized)) {
            return "jbank";
        }
        return normalized;
    }

    private void forwardToIngestion(String eventName, String hashedUserId, String tenantId, Map<String, Object> metadata, Instant timestamp) {
        if (ingestionUrl == null || ingestionUrl.isBlank()) {
            return;
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("event_name", eventName);
            payload.put("tenant_id", resolveAnalyticsTenantId(tenantId));
            payload.put("user_id", hashedUserId);
            payload.put("timestamp", (timestamp == null ? Instant.now() : timestamp).toEpochMilli() / 1000.0);
            payload.put("channel", "web");
            payload.put("metadata", metadata);

            String jsonBody = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(ingestionUrl))
                .timeout(Duration.ofSeconds(3))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
                .build();

            httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenAccept(resp -> {
                    if (resp.statusCode() >= 400) {
                        LOGGER.warn("[INGESTION] Failed for event={} tenant={} status={} url={} response={}", eventName, resolveAnalyticsTenantId(tenantId), resp.statusCode(), ingestionUrl, resp.body());
                    }
                })
                .exceptionally(ex -> {
                    LOGGER.warn("[INGESTION] Error forwarding event={} tenant={} url={} reason={}", eventName, resolveAnalyticsTenantId(tenantId), ingestionUrl, ex.getMessage());
                    return null;
                });
        } catch (Exception ex) {
            // Analytics forwarding is non-blocking and must never break core banking flows.
            LOGGER.warn("[INGESTION] Serialization/setup failure for event={} tenant={} url={} reason={}", eventName, resolveAnalyticsTenantId(tenantId), ingestionUrl, ex.getMessage());
        }
    }

    private String hashUserId(String userId) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(userId.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                hexString.append(String.format("%02x", b));
            }
            return hexString.toString();
        } catch (Exception ex) {
            return userId;
        }
    }
}
