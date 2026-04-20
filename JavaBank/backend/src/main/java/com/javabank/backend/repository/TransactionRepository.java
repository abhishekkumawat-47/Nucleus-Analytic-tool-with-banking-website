package com.javabank.backend.repository;

import com.javabank.backend.model.entity.TransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<TransactionEntity, UUID> {
    List<TransactionEntity> findByReceiverAccNo(String receiverAccNo);
    List<TransactionEntity> findBySenderAccNo(String senderAccNo);
    List<TransactionEntity> findBySenderAccNoOrReceiverAccNoOrderByTimestampDesc(String senderAccNo, String receiverAccNo);
}
