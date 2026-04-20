package com.javabank.backend.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "\"UserLicense\"")
public class UserLicense {
    @Id
    @GeneratedValue
    private UUID id;

    private UUID customerId;
    private String featureId;
    private Double amount;
    private Instant expiryDate;
    private Boolean active = true;
    private Instant createdOn = Instant.now();

    @Column(unique = true)
    private String customerFeatureKey;
}
