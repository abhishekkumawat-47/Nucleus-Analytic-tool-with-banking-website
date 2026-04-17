package com.nexabank.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nexabank.enums.CustomerType;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "\"Payee\"")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payee {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "\"payeeAccNo\"", nullable = false)
    private String payeeAccNo;

    @Column(nullable = false)
    private String payeeifsc;

    @Column(name = "\"payeeCustomerId\"", columnDefinition = "uuid", nullable = false)
    private UUID payeeCustomerId;

    @Column(name = "\"payerCustomerId\"", columnDefinition = "uuid", nullable = false)
    private UUID payerCustomerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"payeeType\"", nullable = false)
    @Builder.Default
    private CustomerType payeeType = CustomerType.INDIVIDUAL;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"payeeAccNo\"", referencedColumnName = "\"accNo\"", insertable = false, updatable = false)
    private Account payeeAccount;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"payeeCustomerId\"", insertable = false, updatable = false)
    private Customer payeeCustomer;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"payerCustomerId\"", insertable = false, updatable = false)
    private Customer payerCustomer;
}
