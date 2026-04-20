package com.javabank.backend.model.entity;

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
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "\"Loan\"")
public class Loan {
    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    private LoanType loanType;

    private Double interestRate;
    private Double principalAmount;
    private Double interestAmount;
    private Integer term;
    private Instant startDate;
    private Instant endDate;
    private Boolean status = true;
    private Instant createdOn = Instant.now();
    private Instant updatedOn = Instant.now();

    @JdbcTypeCode(SqlTypes.JSON)
    @jakarta.persistence.Column(columnDefinition = "jsonb")
    private List<Map<String, Object>> schedule;

    private Double dueAmount;
    private String accNo;
}
