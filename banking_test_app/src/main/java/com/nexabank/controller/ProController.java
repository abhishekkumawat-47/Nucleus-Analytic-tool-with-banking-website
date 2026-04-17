package com.nexabank.controller;

import com.nexabank.service.ProService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/pro")
public class ProController {

    private final ProService proService;

    public ProController(ProService proService) {
        this.proService = proService;
    }

    private String getUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getPrincipal().toString() : null;
    }

    private String getTenantId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getDetails() instanceof Map) {
            return (String) ((Map<String, Object>) auth.getDetails()).getOrDefault("tenantId", "bank_a");
        }
        return "bank_a";
    }

    @PostMapping("/unlock")
    public ResponseEntity<?> unlock(@RequestBody Map<String, String> body) {
        try {
            String userId = getUserId();
            if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            return ResponseEntity.ok(proService.unlockFeature(UUID.fromString(userId), body.get("featureId"), getTenantId()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/status")
    public ResponseEntity<?> status() {
        String userId = getUserId();
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        return ResponseEntity.ok(proService.getProStatus(UUID.fromString(userId)));
    }

    @GetMapping("/crypto_prices")
    public ResponseEntity<?> cryptoPrices() {
        return ResponseEntity.ok(proService.getCryptoPrices());
    }

    @PostMapping("/trade")
    public ResponseEntity<?> trade(@RequestBody Map<String, Object> body) {
        try {
            String userId = getUserId();
            if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            return ResponseEntity.ok(proService.executeTrade(
                    UUID.fromString(userId),
                    (String) body.get("asset"),
                    ((Number) body.get("amount")).doubleValue(),
                    ((Number) body.get("price")).doubleValue(),
                    (String) body.get("type"),
                    getTenantId()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/portfolio")
    public ResponseEntity<?> portfolio() {
        String userId = getUserId();
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        return ResponseEntity.ok(proService.getPortfolio(UUID.fromString(userId)));
    }

    @GetMapping("/wealth_insights")
    public ResponseEntity<?> wealthInsights() {
        String userId = getUserId();
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        return ResponseEntity.ok(proService.getWealthInsights(UUID.fromString(userId), getTenantId()));
    }

    @GetMapping("/payroll_payees")
    public ResponseEntity<?> payrollPayees() {
        String userId = getUserId();
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        return ResponseEntity.ok(proService.getPayrollPayees(UUID.fromString(userId)));
    }

    @PostMapping("/search_payees")
    public ResponseEntity<?> searchPayees(@RequestBody Map<String, String> body) {
        String userId = getUserId();
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        return ResponseEntity.ok(proService.searchPayrollPayees(UUID.fromString(userId), body.get("query")));
    }

    @PostMapping("/process_payroll")
    public ResponseEntity<?> processPayroll(@RequestBody Map<String, Object> body) {
        try {
            String userId = getUserId();
            if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            List<Map<String, String>> payees = (List<Map<String, String>>) body.get("payees");
            double amountPerPayee = ((Number) body.get("amountPerPayee")).doubleValue();
            return ResponseEntity.ok(proService.processPayroll(UUID.fromString(userId), getTenantId(), payees, amountPerPayee));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
