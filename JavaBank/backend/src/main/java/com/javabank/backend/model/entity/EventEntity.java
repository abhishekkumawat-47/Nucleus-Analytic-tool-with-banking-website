package com.javabank.backend.model.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "\"Event\"")
public class EventEntity {
    @Id
    @GeneratedValue
    private UUID id;

    private String eventName;
    private String tenantId;
    private String userId;
    private UUID customerId;

    @JdbcTypeCode(SqlTypes.JSON)
    @jakarta.persistence.Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    private Instant timestamp = Instant.now();
}
