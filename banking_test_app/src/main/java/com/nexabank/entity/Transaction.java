package com.nexabank.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nexabank.enums.*;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "\"Transaction\"")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"transactionType\"", nullable = false)
    private TransactionType transactionType;

    @Column(name = "\"senderAccNo\"", nullable = false)
    private String senderAccNo;

    @Column(name = "\"receiverAccNo\"", nullable = false)
    private String receiverAccNo;

    @Column(nullable = false)
    private Double amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TransactionStatus status = TransactionStatus.SUCCESS;

    @Column(nullable = false)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TransactionChannel channel = TransactionChannel.WEB;

    private String description;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(name = "\"loanId\"", columnDefinition = "uuid")
    private UUID loanId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"loanId\"", insertable = false, updatable = false)
    private Loan loan;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"senderAccNo\"", referencedColumnName = "\"accNo\"", insertable = false, updatable = false)
    private Account senderAccount;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"receiverAccNo\"", referencedColumnName = "\"accNo\"", insertable = false, updatable = false)
    private Account receiverAccount;
}
