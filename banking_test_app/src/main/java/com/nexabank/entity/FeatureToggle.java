package com.nexabank.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "\"FeatureToggle\"",
       uniqueConstraints = @UniqueConstraint(columnNames = {"key", "\"tenantId\""}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FeatureToggle {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false)
    private String key;

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @Column(name = "\"tenantId\"", nullable = false)
    private String tenantId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"tenantId\"", insertable = false, updatable = false)
    private Tenant tenant;
}
