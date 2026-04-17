package com.nexabank.controller;

import com.nexabank.entity.*;
import com.nexabank.enums.CustomerType;
import com.nexabank.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class PayeeController {

    private final PayeeRepository payeeRepository;
    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;

    public PayeeController(PayeeRepository payeeRepository, AccountRepository accountRepository,
                           CustomerRepository customerRepository) {
        this.payeeRepository = payeeRepository;
        this.accountRepository = accountRepository;
        this.customerRepository = customerRepository;
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getPrincipal().toString() : null;
    }

    @PostMapping("/payee/{payerCustomerId}")
    public ResponseEntity<?> addPayee(@PathVariable String payerCustomerId, @RequestBody Map<String, String> body) {
        String currentUser = getCurrentUserId();
        if (!payerCustomerId.equals(currentUser)) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized access to this payer"));
        }

        String payeeAccNo = body.get("payeeAccNo");
        var accountOpt = accountRepository.findByAccNo(payeeAccNo);
        if (accountOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Account does not exist"));

        Account account = accountOpt.get();
        UUID payeeCustomerId = account.getCustomerId();
        UUID payerCustId = UUID.fromString(payerCustomerId);

        var existing = payeeRepository.findByPayeeCustomerIdAndPayerCustomerId(payeeCustomerId, payerCustId);
        if (existing.isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Payee already exists for this payer"));
        }

        String payeeifsc = body.get("payeeifsc");
        if (!account.getIfsc().equals(payeeifsc)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Provided IFSC does not match the account's IFSC"));
        }

        Payee payee = Payee.builder()
                .name(body.get("name"))
                .payeeAccNo(payeeAccNo)
                .payeeifsc(payeeifsc)
                .payeeCustomerId(payeeCustomerId)
                .payerCustomerId(payerCustId)
                .payeeType(CustomerType.valueOf(body.getOrDefault("payeeType", "INDIVIDUAL")))
                .build();
        payee = payeeRepository.save(payee);
        return ResponseEntity.status(201).body(payee);
    }

    @GetMapping("/payees/{payerCustomerId}")
    public ResponseEntity<?> fetchPayees(@PathVariable String payerCustomerId) {
        String currentUser = getCurrentUserId();
        if (!payerCustomerId.equals(currentUser)) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized access to this payer"));
        }
        return ResponseEntity.ok(payeeRepository.findByPayerCustomerId(UUID.fromString(payerCustomerId)));
    }

    @PutMapping("/payee/{payerCustomerId}")
    public ResponseEntity<?> editPayee(@PathVariable String payerCustomerId, @RequestBody Map<String, String> body) {
        String currentUser = getCurrentUserId();
        if (!payerCustomerId.equals(currentUser)) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized access to this payer"));
        }

        String payeeAccNo = body.get("payeeAccNo");
        var accountOpt = accountRepository.findByAccNo(payeeAccNo);
        if (accountOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Account does not exist"));

        UUID payeeCustomerId = accountOpt.get().getCustomerId();
        UUID payerCustId = UUID.fromString(payerCustomerId);

        var payeeOpt = payeeRepository.findByPayeeCustomerIdAndPayerCustomerId(payeeCustomerId, payerCustId);
        if (payeeOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Payee not found for this payer"));

        Payee payee = payeeOpt.get();
        payee.setName(body.get("name"));
        if (body.get("payeeType") != null) payee.setPayeeType(CustomerType.valueOf(body.get("payeeType")));
        payee = payeeRepository.save(payee);
        return ResponseEntity.ok(payee);
    }

    @DeleteMapping("/payee/{payerCustomerId}")
    public ResponseEntity<?> deletePayee(@PathVariable String payerCustomerId, @RequestBody Map<String, String> body) {
        String currentUser = getCurrentUserId();
        if (!payerCustomerId.equals(currentUser)) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized access to this payer"));
        }

        String payeeAccNo = body.get("payeeAccNo");
        var accountOpt = accountRepository.findByAccNo(payeeAccNo);
        if (accountOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Account does not exist"));

        UUID payeeCustomerId = accountOpt.get().getCustomerId();
        UUID payerCustId = UUID.fromString(payerCustomerId);

        var payeeOpt = payeeRepository.findByPayeeCustomerIdAndPayerCustomerId(payeeCustomerId, payerCustId);
        if (payeeOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Payee not found for this payer"));

        payeeRepository.delete(payeeOpt.get());
        return ResponseEntity.ok(Map.of("message", "Payee deleted successfully"));
    }

    @PostMapping("/payees/name")
    public ResponseEntity<?> checkPayeeName(@RequestBody Map<String, Object> body) {
        Map<String, String> data = (Map<String, String>) body.get("data");
        if (data == null) return ResponseEntity.badRequest().body(Map.of("error", "Missing data"));

        String payeeAccNo = data.get("payeeAccNo");
        String payeeifsc = data.get("payeeifsc");

        var accountOpt = accountRepository.findByAccNo(payeeAccNo);
        if (accountOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Account does not exist"));

        Account account = accountOpt.get();
        if (!account.getIfsc().equals(payeeifsc)) {
            return ResponseEntity.badRequest().body(Map.of("error", "IFSC does not match account"));
        }

        var customerOpt = customerRepository.findById(account.getCustomerId());
        if (customerOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Customer not found"));

        return ResponseEntity.ok(Map.of("customerName", customerOpt.get().getName()));
    }

    @GetMapping("/payees/search")
    public ResponseEntity<?> searchPayees(@RequestParam("q") String query) {
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing query"));
        }

        List<Customer> customers = customerRepository.findByNameContainingIgnoreCaseAndIdNot(query, UUID.randomUUID());
        List<UUID> customerIds = customers.stream().map(Customer::getId).collect(Collectors.toList());

        List<Account> accounts = accountRepository.findByAccNoContainingIgnoreCaseOrCustomerIdIn(query, customerIds);

        List<Map<String, String>> results = accounts.stream().limit(10).map(acc -> {
            Customer c = customerRepository.findById(acc.getCustomerId()).orElse(null);
            Map<String, String> m = new HashMap<>();
            m.put("name", c != null ? c.getName() : "Unknown");
            m.put("accNo", acc.getAccNo());
            m.put("ifsc", acc.getIfsc());
            m.put("bankName", "NexaBank");
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(results);
    }
}
