package com.javabank.backend.controller;

import com.javabank.backend.model.entity.Account;
import com.javabank.backend.model.entity.TransactionEntity;
import com.javabank.backend.model.enums.TransactionStatus;
import com.javabank.backend.model.enums.TransactionType;
import com.javabank.backend.repository.AccountRepository;
import com.javabank.backend.repository.TransactionRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class TransactionController {
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;

    public TransactionController(TransactionRepository transactionRepository, AccountRepository accountRepository) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getAll() {
        List<TransactionEntity> tx = transactionRepository.findAll().stream()
            .sorted(Comparator.comparing(TransactionEntity::getTimestamp).reversed())
            .toList();
        return ResponseEntity.ok(tx);
    }

    @GetMapping("/byReceiverAccTransactions/{ReceiverAcc}")
    public ResponseEntity<?> byReceiver(@PathVariable String ReceiverAcc) {
        return ResponseEntity.ok(transactionRepository.findByReceiverAccNo(ReceiverAcc));
    }

    @GetMapping("/byIdTransactions/{id}")
    public ResponseEntity<?> byId(@PathVariable UUID id) {
        return transactionRepository.findById(id)
            .<ResponseEntity<?>>map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Transaction not found")));
    }

    @GetMapping("/bySenderAccTransactions/{SenderAcc}")
    public ResponseEntity<?> bySender(@PathVariable String SenderAcc) {
        return ResponseEntity.ok(transactionRepository.findBySenderAccNo(SenderAcc));
    }

    @GetMapping("/byUserAcc/{Acc}")
    public ResponseEntity<?> byUserAcc(@PathVariable String Acc) {
        return ResponseEntity.ok(transactionRepository.findBySenderAccNoOrReceiverAccNoOrderByTimestampDesc(Acc, Acc));
    }

    @GetMapping("/byCustomer/{customerId}")
    public ResponseEntity<?> byCustomer(@PathVariable UUID customerId) {
        List<String> accNos = accountRepository.findByCustomerIdAndStatusTrue(customerId)
            .stream()
            .map(Account::getAccNo)
            .collect(Collectors.toList());

        List<TransactionEntity> tx = transactionRepository.findAll().stream()
            .filter(t -> accNos.contains(t.getSenderAccNo()) || accNos.contains(t.getReceiverAccNo()))
            .sorted(Comparator.comparing(TransactionEntity::getTimestamp).reversed())
            .toList();
        return ResponseEntity.ok(tx);
    }

    @PostMapping("/transactions")
    @Transactional
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        String senderAccNo = String.valueOf(body.getOrDefault("senderAccNo", ""));
        String receiverAccNo = String.valueOf(body.getOrDefault("receiverAccNo", ""));
        double amount = Double.parseDouble(String.valueOf(body.getOrDefault("amount", "0")));

        if (senderAccNo.equals(receiverAccNo)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Sender and Receiver Account Number cannot be the same"));
        }

        Account sender = accountRepository.findById(senderAccNo).orElse(null);
        Account receiver = accountRepository.findById(receiverAccNo).orElse(null);

        if (sender == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Sender account not found"));
        if (receiver == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Receiver account not found"));

        TransactionType type = TransactionType.valueOf(String.valueOf(body.getOrDefault("transactionType", "TRANSFER")));
        if ((type == TransactionType.TRANSFER || type == TransactionType.PAYMENT) && sender.getBalance() < amount) {
            return ResponseEntity.badRequest().body(Map.of("error", "Insufficient funds"));
        }

        if (type == TransactionType.TRANSFER || type == TransactionType.PAYMENT) {
            sender.setBalance(sender.getBalance() - amount);
            receiver.setBalance(receiver.getBalance() + amount);
            accountRepository.save(sender);
            accountRepository.save(receiver);
        }

        TransactionEntity tx = new TransactionEntity();
        tx.setSenderAccNo(senderAccNo);
        tx.setReceiverAccNo(receiverAccNo);
        tx.setAmount(amount);
        tx.setTransactionType(type);
        Object status = body.get("status");
        if (status instanceof Boolean b) {
            tx.setStatus(b ? TransactionStatus.SUCCESS : TransactionStatus.FAILED);
        } else {
            tx.setStatus(TransactionStatus.valueOf(String.valueOf(status == null ? "SUCCESS" : status)));
        }
        tx.setCategory(String.valueOf(body.getOrDefault("category", "GENERAL")));
        tx.setDescription((String) body.get("description"));
        tx.setTimestamp(Instant.now());

        return ResponseEntity.status(HttpStatus.CREATED).body(transactionRepository.save(tx));
    }
}
