package com.nexabank.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "\"UserLocation\"")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "\"customerId\"", columnDefinition = "uuid", nullable = false)
    private UUID customerId;

    private Double latitude;
    private Double longitude;
    private String country;
    private String city;
    private String ip;

    @Column(name = "\"deviceType\"")
    private String deviceType;

    @Column(name = "\"userAgent\"")
    private String userAgent;

    private String platform;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"customerId\"", insertable = false, updatable = false)
    private Customer customer;
}
