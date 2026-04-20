package com.javabank.backend.model.entity;

import com.javabank.backend.model.enums.CustomerRole;
import com.javabank.backend.model.enums.CustomerType;
import com.javabank.backend.model.enums.KycStatus;
import jakarta.persistence.Column;
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
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "\"Customer\"")
public class Customer {
    @Id
    @GeneratedValue
    private UUID id;

    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(unique = true, nullable = false)
    private String phone;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    private CustomerType customerType = CustomerType.INDIVIDUAL;

    private LocalDate dateOfBirth;

    @Column(unique = true, nullable = false)
    private String pan;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> settingConfig;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> address;

    @Enumerated(EnumType.STRING)
    private CustomerRole role = CustomerRole.USER;

    private String tenantId = "bank_a";

    @Enumerated(EnumType.STRING)
    private KycStatus kycStatus = KycStatus.NOT_STARTED;

    private Instant kycCompletedAt;
    private Instant lastLogin;
}
