package com.javabank.backend.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "\"FeatureToggle\"")
public class FeatureToggle {
    @Id
    @GeneratedValue
    private UUID id;

    private String tenantId;
    private String keyName;
    private Boolean enabled = true;

    @Column(unique = true)
    private String tenantKey;
}
