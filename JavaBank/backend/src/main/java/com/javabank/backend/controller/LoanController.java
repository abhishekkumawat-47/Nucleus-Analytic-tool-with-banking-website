package com.javabank.backend.controller;

import com.javabank.backend.model.entity.*;
import com.javabank.backend.model.enums.ApplicationStatus;
import com.javabank.backend.model.enums.LoanType;
import com.javabank.backend.model.enums.TransactionStatus;
import com.javabank.backend.model.enums.TransactionType;
import com.javabank.backend.repository.*;
import com.javabank.backend.security.AuthUser;
import com.javabank.backend.security.SecurityUtils;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api")
public class LoanController {
    private final LoanRepository loanRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final TransactionRepository transactionRepository;

    public LoanController(LoanRepository loanRepository, LoanApplicationRepository loanApplicationRepository, AccountRepository accountRepository, CustomerRepository customerRepository, TransactionRepository transactionRepository) {
        this.loanRepository = loanRepository;
        this.loanApplicationRepository = loanApplicationRepository;
        this.accountRepository = accountRepository;
        this.customerRepository = customerRepository;
        this.transactionRepository = transactionRepository;
    }

    @GetMapping("/loans")
    public ResponseEntity<?> allLoans() {
        return ResponseEntity.ok(loanRepository.findAllByOrderByCreatedOnDesc());
    }

    @GetMapping("/applications/{userId}")
    public ResponseEntity<?> apps(@PathVariable UUID userId) {
        return ResponseEntity.ok(loanApplicationRepository.findByCustomerIdOrderByCreatedOnDesc(userId));
    }

    @GetMapping("/admin/applications")
    public ResponseEntity<?> adminApps() {
        if (!SecurityUtils.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
        }
        return ResponseEntity.ok(loanApplicationRepository.findAllByOrderByCreatedOnDesc());
    }

    @PostMapping("/apply")
    public ResponseEntity<?> apply(@RequestBody Map<String, Object> body) {
        try {
            LoanApplication app = new LoanApplication();
            app.setCustomerId(UUID.fromString(String.valueOf(body.get("customerId"))));
            app.setLoanType(LoanType.valueOf(String.valueOf(body.getOrDefault("loanType", "PERSONAL"))));
            app.setPrincipalAmount(Double.parseDouble(String.valueOf(body.getOrDefault("principalAmount", "0"))));
            app.setTerm(Integer.parseInt(String.valueOf(body.getOrDefault("term", "12"))));
            app.setInterestRate(Double.parseDouble(String.valueOf(body.getOrDefault("interestRate", "10"))));
            app.setStatus(ApplicationStatus.PENDING);

            if (body.get("kycData") instanceof Map<?, ?> kycData) {
                Map<String, Object> map = new HashMap<>();
                kycData.forEach((k, v) -> map.put(String.valueOf(k), v));
                app.setKycData(map);
            } else {
                app.setKycData(new HashMap<>());
            }

            LoanApplication saved = loanApplicationRepository.save(app);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Application submitted successfully",
                "application", saved
            ));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Missing required fields"));
        }
    }

    @PostMapping("/approve/{applicationId}")
    @Transactional
    public ResponseEntity<?> approve(@PathVariable UUID applicationId, @RequestBody Map<String, Object> body) {
        if (!SecurityUtils.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
        }

        String accNo = String.valueOf(body.getOrDefault("accNo", ""));
        Account target = accountRepository.findById(accNo).orElse(null);
        if (target == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Target account for disbursal not found"));
        }

        LoanApplication app = loanApplicationRepository.findById(applicationId).orElse(null);
        if (app == null || app.getStatus() != ApplicationStatus.PENDING) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Valid pending application not found"));
        }

        app.setStatus(ApplicationStatus.APPROVED);
        loanApplicationRepository.save(app);

        Loan loan = new Loan();
        loan.setAccNo(accNo);
        loan.setLoanType(app.getLoanType());
        loan.setPrincipalAmount(app.getPrincipalAmount());
        loan.setInterestRate(app.getInterestRate());
        loan.setInterestAmount((app.getPrincipalAmount() * app.getInterestRate() * (app.getTerm() / 12.0)) / 100.0);
        loan.setTerm(app.getTerm());
        loan.setStartDate(Instant.now());
        loan.setEndDate(Instant.now().plus(app.getTerm() * 30L, ChronoUnit.DAYS));
        loan.setDueAmount(app.getPrincipalAmount());
        loan.setSchedule(new ArrayList<>());
        loan = loanRepository.save(loan);

        target.setBalance(target.getBalance() + app.getPrincipalAmount());
        accountRepository.save(target);

        TransactionEntity tx = new TransactionEntity();
        tx.setTransactionType(TransactionType.TRANSFER);
        tx.setSenderAccNo("NEXABANK-SYSTEM");
        tx.setReceiverAccNo(accNo);
        tx.setAmount(app.getPrincipalAmount());
        tx.setStatus(TransactionStatus.SUCCESS);
        tx.setCategory("LOAN_DISBURSAL");
        tx.setDescription(app.getLoanType().name() + " Loan Disbursal (" + loan.getId().toString().substring(0, 4).toUpperCase() + ")");
        tx.setLoanId(loan.getId());
        transactionRepository.save(tx);

        return ResponseEntity.ok(Map.of(
            "updatedApp", app,
            "activeLoan", loan,
            "customerId", app.getCustomerId().toString()
        ));
    }

    @PostMapping("/reject/{applicationId}")
    public ResponseEntity<?> reject(@PathVariable UUID applicationId) {
        if (!SecurityUtils.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
        }

        LoanApplication app = loanApplicationRepository.findById(applicationId).orElse(null);
        if (app == null || app.getStatus() != ApplicationStatus.PENDING) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Valid pending application not found"));
        }

        app.setStatus(ApplicationStatus.REJECTED);
        loanApplicationRepository.save(app);
        return ResponseEntity.ok(Map.of("message", "Application rejected", "application", app));
    }

    @GetMapping("/loanbyId/{id}")
    public ResponseEntity<?> loanById(@PathVariable UUID id) {
        return loanRepository.findById(id)
            .<ResponseEntity<?>>map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Loan not found")));
    }

    @PutMapping("/applications/{id}/kyc")
    public ResponseEntity<?> updateKyc(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        LoanApplication app = loanApplicationRepository.findById(id).orElse(null);
        if (app == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Application not found"));
        }

        if (body.get("kycData") instanceof Map<?, ?> kycData) {
            Map<String, Object> merged = new HashMap<>();
            if (app.getKycData() != null) merged.putAll(app.getKycData());
            kycData.forEach((k, v) -> merged.put(String.valueOf(k), v));
            app.setKycData(merged);
        }
        if (body.get("kycStep") != null) {
            app.setKycStep(Integer.parseInt(String.valueOf(body.get("kycStep"))));
        }

        loanApplicationRepository.save(app);
        return ResponseEntity.ok(app);
    }
}
