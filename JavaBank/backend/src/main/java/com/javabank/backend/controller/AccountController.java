package com.javabank.backend.controller;

import com.javabank.backend.model.entity.Account;
import com.javabank.backend.model.entity.Customer;
import com.javabank.backend.model.entity.TransactionEntity;
import com.javabank.backend.model.enums.AccountType;
import com.javabank.backend.model.enums.TransactionStatus;
import com.javabank.backend.model.enums.TransactionType;
import com.javabank.backend.repository.AccountRepository;
import com.javabank.backend.repository.CustomerRepository;
import com.javabank.backend.repository.TransactionRepository;
import com.javabank.backend.security.AuthUser;
import com.javabank.backend.security.SecurityUtils;
import com.javabank.backend.service.AccountNumberService;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
public class AccountController {
    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final TransactionRepository transactionRepository;
    private final AccountNumberService accountNumberService;

    public AccountController(AccountRepository accountRepository, CustomerRepository customerRepository, TransactionRepository transactionRepository, AccountNumberService accountNumberService) {
        this.accountRepository = accountRepository;
        this.customerRepository = customerRepository;
        this.transactionRepository = transactionRepository;
        this.accountNumberService = accountNumberService;
    }

    @PostMapping("/accounts")
    public ResponseEntity<?> createAccount(@RequestBody Map<String, Object> body) {
        UUID customerId = UUID.fromString(String.valueOf(body.get("customerId")));
        Optional<Customer> customerOpt = customerRepository.findById(customerId);
        if (customerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Customer not found"));
        }

        Account account = new Account();
        account.setAccNo(accountNumberService.generateUniqueAccountNumber());
        account.setCustomerId(customerId);
        account.setIfsc(String.valueOf(body.getOrDefault("ifsc", "")));
        account.setAccountType(AccountType.valueOf(String.valueOf(body.getOrDefault("accountType", "SAVINGS"))));
        account.setBalance(Double.parseDouble(String.valueOf(body.getOrDefault("balance", "0"))));
        account.setStatus(true);
        account.setCreatedOn(Instant.now());
        account.setUpdatedOn(Instant.now());

        return ResponseEntity.status(HttpStatus.CREATED).body(accountRepository.save(account));
    }

    @GetMapping("/accounts/{id}")
    public ResponseEntity<?> getById(@PathVariable String id) {
        return accountRepository.findById(id)
            .<ResponseEntity<?>>map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Account not found")));
    }

    @GetMapping("/customers/accounts/{customerId}")
    public ResponseEntity<?> getByCustomer(@PathVariable UUID customerId) {
        if (customerRepository.findById(customerId).isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Customer not found"));
        }
        return ResponseEntity.ok(accountRepository.findByCustomerIdAndStatusTrue(customerId));
    }

    @PostMapping("/accounts/transfer")
    @Transactional
    public ResponseEntity<?> transfer(@RequestBody Map<String, Object> body) {
        String from = String.valueOf(body.getOrDefault("fromAccountNo", ""));
        String to = String.valueOf(body.getOrDefault("toAccountNo", ""));
        double amount = Double.parseDouble(String.valueOf(body.getOrDefault("amount", "0")));
        String description = String.valueOf(body.getOrDefault("description", "Self Transfer"));

        Optional<Account> fromOpt = accountRepository.findByAccNoAndStatusTrue(from);
        Optional<Account> toOpt = accountRepository.findByAccNoAndStatusTrue(to);

        if (fromOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Source account not found or inactive"));
        if (toOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Destination account not found or inactive"));

        Account fromAcc = fromOpt.get();
        Account toAcc = toOpt.get();

        if (!Objects.equals(fromAcc.getCustomerId(), toAcc.getCustomerId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Transfer only allowed between accounts owned by the same customer"));
        }

        if (fromAcc.getBalance() < amount) {
            return ResponseEntity.badRequest().body(Map.of("error", "Insufficient funds"));
        }

        fromAcc.setBalance(fromAcc.getBalance() - amount);
        toAcc.setBalance(toAcc.getBalance() + amount);
        fromAcc.setUpdatedOn(Instant.now());
        toAcc.setUpdatedOn(Instant.now());
        accountRepository.save(fromAcc);
        accountRepository.save(toAcc);

        Customer fromCust = customerRepository.findById(fromAcc.getCustomerId()).orElse(null);
        Customer toCust = customerRepository.findById(toAcc.getCustomerId()).orElse(null);
        boolean isCrossBank = fromCust != null && toCust != null && !Objects.equals(fromCust.getTenantId(), toCust.getTenantId());

        TransactionEntity tx = new TransactionEntity();
        tx.setTransactionType(TransactionType.TRANSFER);
        tx.setSenderAccNo(from);
        tx.setReceiverAccNo(to);
        tx.setAmount(amount);
        tx.setStatus(TransactionStatus.SUCCESS);
        tx.setCategory(isCrossBank ? "CROSS_TRANSFER" : "SELF_TRANSFER");
        tx.setDescription(description);
        tx.setTimestamp(Instant.now());
        tx = transactionRepository.save(tx);

        return ResponseEntity.ok(Map.of(
            "message", "Transfer successful",
            "transactionId", tx.getId().toString(),
            "fromAccount", Map.of("accountNumber", fromAcc.getAccNo(), "newBalance", fromAcc.getBalance()),
            "toAccount", Map.of("accountNumber", toAcc.getAccNo(), "newBalance", toAcc.getBalance())
        ));
    }

    @PostMapping("/accounts/pay")
    @Transactional
    public ResponseEntity<?> pay(@RequestBody Map<String, Object> body) {
        String from = String.valueOf(body.getOrDefault("fromAccountNo", ""));
        String to = String.valueOf(body.getOrDefault("toAccountNo", ""));
        double amount = Double.parseDouble(String.valueOf(body.getOrDefault("amount", "0")));
        String description = String.valueOf(body.getOrDefault("description", "Payment to Payee"));

        Optional<Account> fromOpt = accountRepository.findByAccNoAndStatusTrue(from);
        Optional<Account> toOpt = accountRepository.findByAccNoAndStatusTrue(to);

        if (fromOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Source account not found or inactive"));
        if (toOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Destination account not found or inactive"));

        Account fromAcc = fromOpt.get();
        Account toAcc = toOpt.get();

        if (fromAcc.getBalance() < amount) {
            return ResponseEntity.badRequest().body(Map.of("error", "Insufficient funds"));
        }

        fromAcc.setBalance(fromAcc.getBalance() - amount);
        toAcc.setBalance(toAcc.getBalance() + amount);
        fromAcc.setUpdatedOn(Instant.now());
        toAcc.setUpdatedOn(Instant.now());
        accountRepository.save(fromAcc);
        accountRepository.save(toAcc);

        Customer fromCust = customerRepository.findById(fromAcc.getCustomerId()).orElse(null);
        Customer toCust = customerRepository.findById(toAcc.getCustomerId()).orElse(null);
        boolean isCrossBank = fromCust != null && toCust != null && !Objects.equals(fromCust.getTenantId(), toCust.getTenantId());

        TransactionEntity tx = new TransactionEntity();
        tx.setTransactionType(TransactionType.PAYMENT);
        tx.setSenderAccNo(from);
        tx.setReceiverAccNo(to);
        tx.setAmount(amount);
        tx.setStatus(TransactionStatus.SUCCESS);
        tx.setCategory(isCrossBank ? "CROSS_TRANSFER" : "PAYEE_TRANSFER");
        tx.setDescription(description);
        tx.setTimestamp(Instant.now());
        tx = transactionRepository.save(tx);

        return ResponseEntity.ok(Map.of(
            "message", "Payment successful",
            "transactionId", tx.getId().toString(),
            "fromAccount", Map.of("accountNumber", fromAcc.getAccNo(), "newBalance", fromAcc.getBalance())
        ));
    }
}
