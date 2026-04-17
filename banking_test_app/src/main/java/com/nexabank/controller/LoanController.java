package com.nexabank.controller;

import com.nexabank.enums.LoanType;
import com.nexabank.service.LoanService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class LoanController {

    private final LoanService loanService;

    public LoanController(LoanService loanService) {
        this.loanService = loanService;
    }

    @GetMapping("/loans")
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(loanService.getAllLoans());
    }

    @GetMapping("/applications/{userId}")
    public ResponseEntity<?> getApplications(@PathVariable String userId) {
        return ResponseEntity.ok(loanService.getApplicationsByCustomer(UUID.fromString(userId)));
    }

    @GetMapping("/admin/applications")
    public ResponseEntity<?> getAllApplications() {
        return ResponseEntity.ok(loanService.getAllApplications());
    }

    @PostMapping("/apply")
    public ResponseEntity<?> apply(@RequestBody Map<String, Object> body) {
        try {
            UUID customerId = UUID.fromString((String) body.get("customerId"));
            LoanType loanType = LoanType.valueOf((String) body.get("loanType"));
            Double principalAmount = ((Number) body.get("principalAmount")).doubleValue();
            Integer term = ((Number) body.get("term")).intValue();
            Double interestRate = ((Number) body.get("interestRate")).doubleValue();
            Map<String, Object> kycData = (Map<String, Object>) body.get("kycData");

            var app = loanService.applyForLoan(customerId, loanType, principalAmount, term, interestRate, kycData);
            return ResponseEntity.status(201).body(Map.of("message", "Application submitted successfully", "application", app));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/approve/{applicationId}")
    public ResponseEntity<?> approve(@PathVariable String applicationId, @RequestBody Map<String, String> body) {
        try {
            String accNo = body.get("accNo");
            if (accNo == null) return ResponseEntity.badRequest().body(Map.of("error", "Account number required"));
            return ResponseEntity.ok(loanService.approveLoan(UUID.fromString(applicationId), accNo));
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reject/{applicationId}")
    public ResponseEntity<?> reject(@PathVariable String applicationId) {
        try {
            var app = loanService.rejectLoan(UUID.fromString(applicationId));
            return ResponseEntity.ok(Map.of("message", "Application rejected", "application", app));
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/loanbyId/{id}")
    public ResponseEntity<?> getById(@PathVariable String id) {
        return loanService.getLoanById(UUID.fromString(id))
                .map(loan -> ResponseEntity.ok((Object) loan))
                .orElse(ResponseEntity.status(404).body(Map.of("error", "Loan not found")));
    }

    @PutMapping("/applications/{id}/kyc")
    public ResponseEntity<?> updateKyc(@PathVariable String id, @RequestBody Map<String, Object> body) {
        try {
            Map<String, Object> kycData = (Map<String, Object>) body.get("kycData");
            Integer kycStep = body.get("kycStep") != null ? ((Number) body.get("kycStep")).intValue() : null;
            return ResponseEntity.ok(loanService.updateKyc(UUID.fromString(id), kycData, kycStep));
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
