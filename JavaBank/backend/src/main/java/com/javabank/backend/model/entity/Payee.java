package com.javabank.backend.model.entity;

import com.javabank.backend.model.enums.CustomerType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "\"Payee\"")
public class Payee {
    @Id
    @GeneratedValue
    private UUID id;

    private String name;
    private String payeeAccNo;
    private String payeeifsc;
    private UUID payeeCustomerId;
    private UUID payerCustomerId;

    @Enumerated(EnumType.STRING)
    private CustomerType payeeType = CustomerType.INDIVIDUAL;
}
