package com.javabank.backend.model.entity;

import com.javabank.backend.model.enums.ApplicationStatus;
import com.javabank.backend.model.enums.LoanType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "\"LoanApplication\"")
public class LoanApplication {
    @Id
    @GeneratedValue
    private UUID id;

    private UUID customerId;

    @Enumerated(EnumType.STRING)
    private LoanType loanType;

    private Double principalAmount;
    private Integer term;
    private Double interestRate;

    @Enumerated(EnumType.STRING)
    private ApplicationStatus status = ApplicationStatus.PENDING;

    @JdbcTypeCode(SqlTypes.JSON)
    @jakarta.persistence.Column(columnDefinition = "jsonb")
    private Map<String, Object> kycData;

    private Integer kycStep = 0;
    private String notes;
    private UUID reviewedBy;
    private Instant createdOn = Instant.now();
    private Instant updatedOn = Instant.now();
}
