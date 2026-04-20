package com.javabank.backend.model.entity;

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
@Table(name = "\"UserLocation\"")
public class UserLocation {
    @Id
    @GeneratedValue
    private UUID id;

    private UUID customerId;
    private Double latitude;
    private Double longitude;
    private String country;
    private String city;
    private String ip;
    private String deviceType;
    private String userAgent;
    private String platform;
    private Instant timestamp = Instant.now();
}
