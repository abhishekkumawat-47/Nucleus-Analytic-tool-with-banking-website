package com.nexabank.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "\"UserLicense\"",
       uniqueConstraints = @UniqueConstraint(columnNames = {"\"customerId\"", "\"featureId\""}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserLicense {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "\"customerId\"", columnDefinition = "uuid", nullable = false)
    private UUID customerId;

    @Column(name = "\"featureId\"", nullable = false)
    private String featureId;

    @Column(nullable = false)
    private Double amount;

    @Column(name = "\"expiryDate\"", nullable = false)
    private LocalDateTime expiryDate;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "\"createdOn\"", nullable = false)
    @Builder.Default
    private LocalDateTime createdOn = LocalDateTime.now();

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"customerId\"", insertable = false, updatable = false)
    private Customer customer;
}
