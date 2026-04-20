package com.javabank.backend.controller;

import com.javabank.backend.model.entity.Account;
import com.javabank.backend.model.entity.Payee;
import com.javabank.backend.model.enums.CustomerType;
import com.javabank.backend.repository.AccountRepository;
import com.javabank.backend.repository.CustomerRepository;
import com.javabank.backend.repository.PayeeRepository;
import com.javabank.backend.security.AuthUser;
import com.javabank.backend.security.SecurityUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
public class PayeeController {
    private final PayeeRepository payeeRepository;
    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;

    public PayeeController(PayeeRepository payeeRepository, AccountRepository accountRepository, CustomerRepository customerRepository) {
        this.payeeRepository = payeeRepository;
        this.accountRepository = accountRepository;
        this.customerRepository = customerRepository;
    }

    @GetMapping("/payees/search")
    public ResponseEntity<?> searchPayees(@RequestParam("q") String query) {
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing or invalid query parameter"));
        }
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));

        List<Map<String, Object>> out = new ArrayList<>();

        accountRepository.findAll().forEach(acc -> {
            boolean matchAcc = acc.getAccNo().toLowerCase().contains(query.toLowerCase());
            String name = customerRepository.findById(acc.getCustomerId()).map(c -> c.getName()).orElse("");
            boolean matchName = name.toLowerCase().contains(query.toLowerCase());
            if (matchAcc || matchName) {
                out.add(Map.of(
                    "accNo", acc.getAccNo(),
                    "ifsc", acc.getIfsc(),
                    "name", name,
                    "customerId", acc.getCustomerId().toString()
                ));
            }
        });

        return ResponseEntity.ok(out);
    }

    @PostMapping("/payee/{payerCustomerId}")
    public ResponseEntity<?> addPayee(@PathVariable UUID payerCustomerId, @RequestBody Map<String, Object> body) {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null || !auth.getId().equals(payerCustomerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Unauthorized access to this payer"));
        }

        String payeeAccNo = String.valueOf(body.getOrDefault("payeeAccNo", ""));
        Account account = accountRepository.findById(payeeAccNo).orElse(null);
        if (account == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Account does not exist"));

        String payeeIfsc = String.valueOf(body.getOrDefault("payeeifsc", ""));
        if (!Objects.equals(payeeIfsc, account.getIfsc())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Provided IFSC does not match the account's IFSC"));
        }

        if (payeeRepository.findByPayerCustomerIdAndPayeeCustomerId(payerCustomerId, account.getCustomerId()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Payee already exists for this payer"));
        }

        Payee p = new Payee();
        p.setName(String.valueOf(body.getOrDefault("name", "")));
        p.setPayeeAccNo(payeeAccNo);
        p.setPayeeifsc(payeeIfsc);
        p.setPayeeCustomerId(account.getCustomerId());
        p.setPayerCustomerId(payerCustomerId);
        p.setPayeeType(CustomerType.valueOf(String.valueOf(body.getOrDefault("payeeType", "INDIVIDUAL"))));

        return ResponseEntity.status(HttpStatus.CREATED).body(payeeRepository.save(p));
    }

    @GetMapping("/payees/{payerCustomerId}")
    public ResponseEntity<?> fetchPayees(@PathVariable UUID payerCustomerId) {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null || !auth.getId().equals(payerCustomerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Unauthorized access to this payer"));
        }
        return ResponseEntity.ok(payeeRepository.findByPayerCustomerId(payerCustomerId));
    }

    @PutMapping("/payee/{payerCustomerId}")
    public ResponseEntity<?> editPayee(@PathVariable UUID payerCustomerId, @RequestBody Map<String, Object> body) {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null || !auth.getId().equals(payerCustomerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Unauthorized access to this payer"));
        }

        String payeeAccNo = String.valueOf(body.getOrDefault("payeeAccNo", ""));
        Account account = accountRepository.findById(payeeAccNo).orElse(null);
        if (account == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Account does not exist"));

        String payeeIfsc = String.valueOf(body.getOrDefault("payeeifsc", ""));
        if (!Objects.equals(payeeIfsc, account.getIfsc())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Provided IFSC does not match the account's IFSC"));
        }

        Payee payee = payeeRepository.findByPayerCustomerIdAndPayeeCustomerId(payerCustomerId, account.getCustomerId()).orElse(null);
        if (payee == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Payee not found for this payer"));
        }

        payee.setName(String.valueOf(body.getOrDefault("name", payee.getName())));
        payee.setPayeeType(CustomerType.valueOf(String.valueOf(body.getOrDefault("payeeType", payee.getPayeeType().name()))));
        return ResponseEntity.ok(payeeRepository.save(payee));
    }

    @DeleteMapping("/payee/{payerCustomerId}")
    public ResponseEntity<?> deletePayee(@PathVariable UUID payerCustomerId, @RequestBody Map<String, Object> body) {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null || !auth.getId().equals(payerCustomerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Unauthorized access to this payer"));
        }

        String payeeAccNo = String.valueOf(body.getOrDefault("payeeAccNo", ""));
        Account account = accountRepository.findById(payeeAccNo).orElse(null);
        if (account == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Account does not exist"));

        Payee payee = payeeRepository.findByPayerCustomerIdAndPayeeCustomerId(payerCustomerId, account.getCustomerId()).orElse(null);
        if (payee == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Payee not found for this payer"));
        }
        payeeRepository.delete(payee);
        return ResponseEntity.ok(Map.of("deletedPayee", payee, "message", "Payee deleted successfully"));
    }

    @PostMapping("/payees/name")
    public ResponseEntity<?> checkPayeeName(@RequestBody Map<String, Object> body) {
        Object dataObj = body.get("data");
        if (!(dataObj instanceof Map<?, ?> data)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing required fields: payeeifsc, payeeAccNo"));
        }

        String payeeifsc = String.valueOf(data.get("payeeifsc"));
        String payeeAccNo = String.valueOf(data.get("payeeAccNo"));

        Account account = accountRepository.findById(payeeAccNo).orElse(null);
        if (account == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Account does not exist"));

        if (!Objects.equals(account.getIfsc(), payeeifsc)) {
            return ResponseEntity.badRequest().body(Map.of("error", "IFSC does not match account"));
        }

        String customerName = customerRepository.findById(account.getCustomerId()).map(c -> c.getName()).orElse(null);
        if (customerName == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid account data"));
        }

        return ResponseEntity.ok(Map.of("customerName", customerName));
    }
}
