package com.nexabank.controller;

import com.nexabank.entity.Transaction;
import com.nexabank.enums.*;
import com.nexabank.repository.TransactionRepository;
import com.nexabank.repository.AccountRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

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
        return ResponseEntity.ok(transactionRepository.findAllByOrderByTimestampDesc());
    }

    @GetMapping("/byReceiverAccTransactions/{receiverAcc}")
    public ResponseEntity<?> byReceiver(@PathVariable String receiverAcc) {
        return ResponseEntity.ok(transactionRepository.findByReceiverAccNo(receiverAcc));
    }

    @GetMapping("/byIdTransactions/{id}")
    public ResponseEntity<?> byId(@PathVariable String id) {
        return transactionRepository.findById(UUID.fromString(id))
                .map(tx -> ResponseEntity.ok((Object) tx))
                .orElse(ResponseEntity.status(404).body(Map.of("error", "Transaction not found")));
    }

    @GetMapping("/bySenderAccTransactions/{senderAcc}")
    public ResponseEntity<?> bySender(@PathVariable String senderAcc) {
        return ResponseEntity.ok(transactionRepository.findBySenderAccNo(senderAcc));
    }

    @GetMapping("/byUserAcc/{acc}")
    public ResponseEntity<?> byUserAcc(@PathVariable String acc) {
        return ResponseEntity.ok(transactionRepository.findByUserAcc(acc));
    }

    @GetMapping("/byCustomer/{customerId}")
    public ResponseEntity<?> byCustomer(@PathVariable String customerId) {
        UUID cid = UUID.fromString(customerId);
        List<String> accNos = accountRepository.findByCustomerId(cid).stream()
                .map(a -> a.getAccNo()).toList();
        if (accNos.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(transactionRepository.findByAccountNumbers(accNos));
    }

    @PostMapping("/transactions")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            String senderAccNo = (String) body.get("senderAccNo");
            String receiverAccNo = (String) body.get("receiverAccNo");
            Double amount = ((Number) body.get("amount")).doubleValue();
            TransactionType type = TransactionType.valueOf((String) body.get("transactionType"));
            String category = (String) body.get("category");
            String description = (String) body.get("description");

            if (senderAccNo.equals(receiverAccNo)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Sender and Receiver cannot be same"));
            }

            var sender = accountRepository.findByAccNo(senderAccNo);
            var receiver = accountRepository.findByAccNo(receiverAccNo);
            if (sender.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Sender account not found"));
            if (receiver.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Receiver account not found"));

            if ((type == TransactionType.TRANSFER || type == TransactionType.PAYMENT) && sender.get().getBalance() < amount) {
                return ResponseEntity.badRequest().body(Map.of("error", "Insufficient funds"));
            }

            Object statusRaw = body.get("status");
            TransactionStatus status;
            if (statusRaw instanceof Boolean) {
                status = (Boolean) statusRaw ? TransactionStatus.SUCCESS : TransactionStatus.FAILED;
            } else {
                status = TransactionStatus.valueOf((String) statusRaw);
            }

            Transaction tx = Transaction.builder()
                    .transactionType(type)
                    .senderAccNo(senderAccNo)
                    .receiverAccNo(receiverAccNo)
                    .amount(amount)
                    .status(status)
                    .category(category)
                    .description(description)
                    .build();
            tx = transactionRepository.save(tx);

            if (type == TransactionType.TRANSFER || type == TransactionType.PAYMENT) {
                var s = sender.get();
                var r = receiver.get();
                s.setBalance(s.getBalance() - amount);
                r.setBalance(r.getBalance() + amount);
                accountRepository.save(s);
                accountRepository.save(r);
            }

            return ResponseEntity.status(201).body(tx);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Server Error"));
        }
    }
}
