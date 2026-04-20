package com.javabank.backend.model.entity;

import com.javabank.backend.model.enums.AccountType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "\"Account\"")
public class Account {
    @Id
    private String accNo;

    private UUID customerId;

    private String ifsc;

    @Enumerated(EnumType.STRING)
    private AccountType accountType = AccountType.SAVINGS;

    private Double balance = 0.0;

    private Boolean status = true;

    private Instant createdOn = Instant.now();
    private Instant updatedOn = Instant.now();
    private Instant deletedOn;

    @JdbcTypeCode(SqlTypes.JSON)
    @jakarta.persistence.Column(columnDefinition = "jsonb")
    private List<Map<String, Object>> investment;
}
