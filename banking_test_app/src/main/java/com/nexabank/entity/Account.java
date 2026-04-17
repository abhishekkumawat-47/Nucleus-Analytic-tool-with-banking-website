package com.nexabank.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nexabank.enums.AccountType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "\"Account\"")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Account {

    @Id
    @Column(name = "\"accNo\"")
    private String accNo;

    @Column(name = "\"customerId\"", columnDefinition = "uuid", nullable = false)
    private UUID customerId;

    @Column(nullable = false)
    private String ifsc;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"accountType\"", nullable = false)
    @Builder.Default
    private AccountType accountType = AccountType.SAVINGS;

    @Column(nullable = false)
    @Builder.Default
    private Double balance = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean status = true;

    @Column(name = "\"createdOn\"", nullable = false)
    @Builder.Default
    private LocalDateTime createdOn = LocalDateTime.now();

    @Column(name = "\"updatedOn\"", nullable = false)
    @Builder.Default
    private LocalDateTime updatedOn = LocalDateTime.now();

    @Column(name = "\"deletedOn\"")
    private LocalDateTime deletedOn;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<Object> investment;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"customerId\"", insertable = false, updatable = false)
    private Customer customer;

    @JsonIgnore
    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Loan> loans;

    @JsonIgnore
    @OneToMany(mappedBy = "senderAccount", fetch = FetchType.LAZY)
    private List<Transaction> sentTransactions;

    @JsonIgnore
    @OneToMany(mappedBy = "receiverAccount", fetch = FetchType.LAZY)
    private List<Transaction> receivedTransactions;

    @PreUpdate
    public void preUpdate() {
        this.updatedOn = LocalDateTime.now();
    }
}
