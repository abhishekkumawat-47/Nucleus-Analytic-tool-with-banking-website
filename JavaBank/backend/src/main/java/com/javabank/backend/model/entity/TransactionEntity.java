package com.javabank.backend.model.entity;

import com.javabank.backend.model.enums.TransactionChannel;
import com.javabank.backend.model.enums.TransactionStatus;
import com.javabank.backend.model.enums.TransactionType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "\"Transaction\"")
public class TransactionEntity {
    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    private TransactionType transactionType;

    private String senderAccNo;
    private String receiverAccNo;
    private Double amount;

    @Enumerated(EnumType.STRING)
    private TransactionStatus status = TransactionStatus.SUCCESS;

    private String category;

    @Enumerated(EnumType.STRING)
    private TransactionChannel channel = TransactionChannel.WEB;

    private String description;
    private Instant timestamp = Instant.now();
    private UUID loanId;
}
