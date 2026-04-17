package com.nexabank.controller;

import com.nexabank.enums.AccountType;
import com.nexabank.service.AccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping("/accounts")
    public ResponseEntity<?> createAccount(@RequestBody Map<String, Object> body) {
        try {
            UUID customerId = UUID.fromString((String) body.get("customerId"));
            String ifsc = (String) body.get("ifsc");
            AccountType accountType = AccountType.valueOf((String) body.get("accountType"));
            Double balance = body.get("balance") != null ? ((Number) body.get("balance")).doubleValue() : 0.0;
            return ResponseEntity.status(201).body(accountService.createAccount(customerId, ifsc, accountType, balance));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/accounts/{id}")
    public ResponseEntity<?> getById(@PathVariable String id) {
        return accountService.getByAccNo(id)
                .map(acc -> ResponseEntity.ok((Object) acc))
                .orElse(ResponseEntity.status(404).body(Map.of("error", "Account not found")));
    }

    @GetMapping("/customers/accounts/{customerId}")
    public ResponseEntity<?> getByCustomer(@PathVariable String customerId) {
        return ResponseEntity.ok(accountService.getByCustomerId(UUID.fromString(customerId)));
    }

    @PostMapping("/accounts/transfer")
    public ResponseEntity<?> transfer(@RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(accountService.transferBetweenOwnAccounts(
                    (String) body.get("fromAccountNo"),
                    (String) body.get("toAccountNo"),
                    ((Number) body.get("amount")).doubleValue(),
                    (String) body.get("description")
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/accounts/pay")
    public ResponseEntity<?> pay(@RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(accountService.payToPayee(
                    (String) body.get("fromAccountNo"),
                    (String) body.get("toAccountNo"),
                    ((Number) body.get("amount")).doubleValue(),
                    (String) body.get("description")
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
