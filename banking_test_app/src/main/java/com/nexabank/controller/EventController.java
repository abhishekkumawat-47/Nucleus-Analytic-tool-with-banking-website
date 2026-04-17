package com.nexabank.controller;

import com.nexabank.entity.*;
import com.nexabank.repository.*;
import com.nexabank.service.EventService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
public class EventController {

    private final EventService eventService;
    private final EventRepository eventRepository;
    private final CustomerRepository customerRepository;
    private final TransactionRepository transactionRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final UserLocationRepository userLocationRepository;
    private final FeatureToggleRepository featureToggleRepository;
    private final TenantRepository tenantRepository;

    public EventController(EventService eventService, EventRepository eventRepository,
                           CustomerRepository customerRepository, TransactionRepository transactionRepository,
                           LoanApplicationRepository loanApplicationRepository,
                           UserLocationRepository userLocationRepository,
                           FeatureToggleRepository featureToggleRepository,
                           TenantRepository tenantRepository) {
        this.eventService = eventService;
        this.eventRepository = eventRepository;
        this.customerRepository = customerRepository;
        this.transactionRepository = transactionRepository;
        this.loanApplicationRepository = loanApplicationRepository;
        this.userLocationRepository = userLocationRepository;
        this.featureToggleRepository = featureToggleRepository;
        this.tenantRepository = tenantRepository;
    }

    @PostMapping("/events/track")
    public ResponseEntity<?> track(@RequestBody Map<String, Object> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String customerId = auth != null ? auth.getPrincipal().toString() : null;
        String tenantId = "bank_a";
        if (auth != null && auth.getDetails() instanceof Map) {
            tenantId = (String) ((Map<String, Object>) auth.getDetails()).getOrDefault("tenantId", "bank_a");
        }

        String eventType = (String) body.get("eventType");
        Map<String, Object> metadata = (Map<String, Object>) body.getOrDefault("metadata", new HashMap<>());
        eventService.trackEvent(eventType, customerId, tenantId, metadata);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/events/location")
    public ResponseEntity<?> location(@RequestBody Map<String, Object> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        String customerId = auth.getPrincipal().toString();

        UserLocation loc = UserLocation.builder()
                .customerId(UUID.fromString(customerId))
                .latitude(body.get("latitude") != null ? ((Number) body.get("latitude")).doubleValue() : null)
                .longitude(body.get("longitude") != null ? ((Number) body.get("longitude")).doubleValue() : null)
                .country((String) body.get("country"))
                .city((String) body.get("city"))
                .ip((String) body.get("ip"))
                .deviceType("desktop")
                .platform("Web / Chrome")
                .build();
        userLocationRepository.save(loc);
        return ResponseEntity.ok(Map.of("message", "Location stored successfully"));
    }

    @GetMapping("/events/toggles/{tenantId}")
    public ResponseEntity<?> getToggles(@PathVariable String tenantId) {
        List<FeatureToggle> toggles = featureToggleRepository.findByTenantIdIn(Arrays.asList("bank_a", "bank_b"));
        Map<String, Boolean> map = new HashMap<>();
        for (FeatureToggle t : toggles) {
            map.put(t.getKey(), t.getEnabled());
        }
        return ResponseEntity.ok(map);
    }

    @PutMapping("/events/toggles/{key}")
    public ResponseEntity<?> updateToggle(@PathVariable String key, @RequestBody Map<String, Object> body) {
        boolean enabled = (Boolean) body.get("enabled");
        for (String tid : Arrays.asList("bank_a", "bank_b")) {
            var opt = featureToggleRepository.findByKeyAndTenantId(key, tid);
            if (opt.isPresent()) {
                FeatureToggle t = opt.get();
                t.setEnabled(enabled);
                featureToggleRepository.save(t);
            } else {
                FeatureToggle t = FeatureToggle.builder().key(key).enabled(enabled).tenantId(tid).build();
                featureToggleRepository.save(t);
            }
        }
        return ResponseEntity.ok(Map.of("key", key, "enabled", enabled));
    }

    @GetMapping("/events/admin/stats")
    public ResponseEntity<?> adminStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", customerRepository.count());
        stats.put("totalEvents", eventRepository.count());
        stats.put("totalTransactions", transactionRepository.count());
        stats.put("totalLoanApps", loanApplicationRepository.count());
        stats.put("recentEvents", eventRepository.findTop20ByOrderByTimestampDesc());
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/events/admin/locations")
    public ResponseEntity<?> adminLocations() {
        return ResponseEntity.ok(userLocationRepository.findTop100ByOrderByTimestampDesc());
    }

    @GetMapping("/tenants/ifsc-list")
    public ResponseEntity<?> ifscList() {
        List<Tenant> tenants = tenantRepository.findAll();
        List<Map<String, String>> list = tenants.stream().map(t -> Map.of(
                "bankName", t.getName(),
                "ifsc", t.getIfscPrefix() + t.getBranchCode(),
                "tenantId", t.getId()
        )).toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping("/events/simulate")
    public ResponseEntity<?> simulate(@RequestBody Map<String, Object> body) {
        // Simulation is a complex operation - return a simplified response for now
        // The full simulation engine can be added later
        return ResponseEntity.ok(Map.of(
                "message", "Simulation endpoint available. Full engine under construction.",
                "status", "ok"
        ));
    }
}
