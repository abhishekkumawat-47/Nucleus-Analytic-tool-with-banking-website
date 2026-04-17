package com.nexabank.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nexabank.enums.ApplicationStatus;
import com.nexabank.enums.LoanType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "\"LoanApplication\"")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoanApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "\"customerId\"", columnDefinition = "uuid", nullable = false)
    private UUID customerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"loanType\"", nullable = false)
    private LoanType loanType;

    @Column(name = "\"principalAmount\"", nullable = false)
    private Double principalAmount;

    @Column(nullable = false)
    private Integer term;

    @Column(name = "\"interestRate\"", nullable = false)
    private Double interestRate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ApplicationStatus status = ApplicationStatus.PENDING;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "\"kycData\"", columnDefinition = "jsonb")
    private Map<String, Object> kycData;

    @Column(name = "\"kycStep\"")
    @Builder.Default
    private Integer kycStep = 0;

    private String notes;

    @Column(name = "\"reviewedBy\"", columnDefinition = "uuid")
    private UUID reviewedBy;

    @Column(name = "\"createdOn\"", nullable = false)
    @Builder.Default
    private LocalDateTime createdOn = LocalDateTime.now();

    @Column(name = "\"updatedOn\"", nullable = false)
    @Builder.Default
    private LocalDateTime updatedOn = LocalDateTime.now();

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"customerId\"", insertable = false, updatable = false)
    private Customer customer;

    @PreUpdate
    public void preUpdate() {
        this.updatedOn = LocalDateTime.now();
    }
}
