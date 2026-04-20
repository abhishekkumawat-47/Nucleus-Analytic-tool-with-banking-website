package com.javabank.backend.controller;

import com.javabank.backend.model.entity.Account;
import com.javabank.backend.model.entity.Customer;
import com.javabank.backend.model.entity.FeatureToggle;
import com.javabank.backend.model.entity.TransactionEntity;
import com.javabank.backend.model.entity.UserLocation;
import com.javabank.backend.model.enums.AccountType;
import com.javabank.backend.model.enums.KycStatus;
import com.javabank.backend.model.enums.TransactionChannel;
import com.javabank.backend.model.enums.TransactionStatus;
import com.javabank.backend.model.enums.TransactionType;
import com.javabank.backend.repository.AccountRepository;
import com.javabank.backend.repository.CustomerRepository;
import com.javabank.backend.repository.EventRepository;
import com.javabank.backend.repository.FeatureToggleRepository;
import com.javabank.backend.repository.LoanApplicationRepository;
import com.javabank.backend.repository.TenantRepository;
import com.javabank.backend.repository.TransactionRepository;
import com.javabank.backend.repository.UserLocationRepository;
import com.javabank.backend.security.AuthUser;
import com.javabank.backend.security.SecurityUtils;
import com.javabank.backend.service.EventService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/events")
public class EventController {
    private static final List<String> GLOBAL_ANALYTICS_TENANTS = List.of("jbank", "obank");

    private final EventService eventService;
    private final EventRepository eventRepository;
    private final UserLocationRepository userLocationRepository;
    private final FeatureToggleRepository featureToggleRepository;
    private final CustomerRepository customerRepository;
    private final TransactionRepository transactionRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final AccountRepository accountRepository;
    private final TenantRepository tenantRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${app.analytics.base-url:${ANALYTICS_API_URL:http://analytics-api:8001}}")
    private String analyticsApiUrl;

    public EventController(
        EventService eventService,
        EventRepository eventRepository,
        UserLocationRepository userLocationRepository,
        FeatureToggleRepository featureToggleRepository,
        CustomerRepository customerRepository,
        TransactionRepository transactionRepository,
        LoanApplicationRepository loanApplicationRepository,
        AccountRepository accountRepository,
        TenantRepository tenantRepository,
        ObjectMapper objectMapper
    ) {
        this.eventService = eventService;
        this.eventRepository = eventRepository;
        this.userLocationRepository = userLocationRepository;
        this.featureToggleRepository = featureToggleRepository;
        this.customerRepository = customerRepository;
        this.transactionRepository = transactionRepository;
        this.loanApplicationRepository = loanApplicationRepository;
        this.accountRepository = accountRepository;
        this.tenantRepository = tenantRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .version(HttpClient.Version.HTTP_1_1)
            .build();
    }

    @PostMapping("/track")
    public ResponseEntity<?> track(@RequestBody Map<String, Object> body) {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));
        }

        String eventType = String.valueOf(body.getOrDefault("eventType", ""));
        Map<String, Object> metadata = body.get("metadata") instanceof Map<?, ?> raw ? castMap(raw) : Map.of();
        eventService.track(eventType, auth.getId(), auth.getTenantId(), metadata);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/location")
    public ResponseEntity<?> location(@RequestBody Map<String, Object> body) {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }

        UserLocation l = new UserLocation();
        l.setCustomerId(auth.getId());
        l.setLatitude(parseDouble(body.get("latitude")));
        l.setLongitude(parseDouble(body.get("longitude")));
        l.setCountry((String) body.get("country"));
        l.setCity((String) body.get("city"));
        l.setIp((String) body.get("ip"));
        l.setDeviceType((String) body.get("deviceType"));
        l.setUserAgent((String) body.get("userAgent"));
        l.setPlatform((String) body.get("platform"));
        userLocationRepository.save(l);

        eventService.track("location_captured", auth.getId(), auth.getTenantId(), Map.of("country", body.get("country"), "city", body.get("city")));
        return ResponseEntity.ok(Map.of("message", "Location stored successfully"));
    }

    @GetMapping("/toggles/{tenantId}")
    public ResponseEntity<?> toggles(@PathVariable String tenantId) {
        Map<String, Boolean> analyticsToggles = fetchAnalyticsToggles();
        if (!analyticsToggles.isEmpty()) {
            return ResponseEntity.ok(analyticsToggles);
        }

        List<FeatureToggle> rows = featureToggleRepository.findByTenantIdIn(List.of("bank_a", "bank_b"));
        Map<String, Boolean> map = new HashMap<>();
        for (FeatureToggle row : rows) {
            map.merge(normalizeToggleKey(row.getKeyName()), row.getEnabled(), Boolean::logicalAnd);
        }

        if (map.isEmpty()) {
            map.put("emi_calculator", true);
            map.put("kyc", true);
            map.put("loan_module", true);
            map.put("pro_features", true);
        }

        return ResponseEntity.ok(map);
    }

    @PutMapping("/toggles/{key}")
    public ResponseEntity<?> updateToggle(@PathVariable String key, @RequestBody Map<String, Object> body) {
        if (!SecurityUtils.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
        }

        boolean enabled = Boolean.parseBoolean(String.valueOf(body.getOrDefault("enabled", "true")));
        String normalizedKey = normalizeToggleKey(key);
        String actorEmail = String.valueOf(body.getOrDefault("actorEmail", "javabank-admin@system.local"));

        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(analyticsApiUrl.replaceAll("/+$", "") + "/tracking/toggles"))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .header("X-User-Role", "super_admin")
                .header("X-User-Email", actorEmail)
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(Map.of(
                    "tenant_id", String.join(",", GLOBAL_ANALYTICS_TENANTS),
                    "feature_name", normalizedKey,
                    "is_enabled", enabled,
                    "actor_email", actorEmail
                )), StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                    "error", "Failed to update analytics toggles",
                    "status", response.statusCode(),
                    "response", response.body()
                ));
            }
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                "error", "Failed to update analytics toggles",
                "reason", ex.getMessage()
            ));
        }

        for (String tenant : List.of("bank_a", "bank_b")) {
            String tenantKey = tenant + ":" + normalizedKey;
            FeatureToggle row = featureToggleRepository.findByTenantKey(tenantKey).orElseGet(FeatureToggle::new);
            row.setTenantId(tenant);
            row.setKeyName(normalizedKey);
            row.setEnabled(enabled);
            row.setTenantKey(tenantKey);
            featureToggleRepository.save(row);
        }
        return ResponseEntity.ok(Map.of("key", normalizedKey, "enabled", enabled, "tenantsUpdated", List.of("bank_a", "bank_b"), "count", 2));
    }

    private Map<String, Boolean> fetchAnalyticsToggles() {
        try {
            String tenants = String.join(",", GLOBAL_ANALYTICS_TENANTS);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(analyticsApiUrl.replaceAll("/+$", "") + "/tracking/toggles?tenants=" + URLEncoder.encode(tenants, StandardCharsets.UTF_8)))
                .timeout(Duration.ofSeconds(10))
                .header("X-User-Role", "super_admin")
                .header("X-User-Email", "javabank-toggle-bridge@system.local")
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return Map.of();
            }

            Map<String, Object> payload = objectMapper.readValue(response.body(), new TypeReference<>() {});
            Object togglesObj = payload.get("toggles");
            if (!(togglesObj instanceof List<?> togglesList)) {
                return Map.of();
            }

            Map<String, Boolean> map = new LinkedHashMap<>();
            for (Object item : togglesList) {
                if (!(item instanceof Map<?, ?> row)) {
                    continue;
                }
                String featureName = normalizeToggleKey(String.valueOf(row.get("feature_name")));
                if (featureName.isBlank()) {
                    continue;
                }
                map.put(featureName, toBoolean(row.get("is_enabled")));
            }
            return map;
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    private boolean toBoolean(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private String normalizeToggleKey(String rawKey) {
        return String.valueOf(rawKey == null ? "" : rawKey)
            .trim()
            .toLowerCase()
            .replace("_page.view", ".page.view")
            .replace(".page_view", ".page.view")
            .replace("_dashboard.view", ".dashboard.view")
            .replace(".dashboard_view", ".dashboard.view")
            .replace("..", ".");
    }

    @GetMapping("/admin/stats")
    public ResponseEntity<?> adminStats() {
        if (!SecurityUtils.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
        }

        return ResponseEntity.ok(Map.of(
            "totalUsers", customerRepository.count(),
            "totalEvents", eventRepository.count(),
            "totalTransactions", transactionRepository.count(),
            "totalLoanApps", loanApplicationRepository.count(),
            "recentEvents", eventRepository.findTop20ByOrderByTimestampDesc()
        ));
    }

    @GetMapping("/admin/locations")
    public ResponseEntity<?> adminLocations() {
        if (!SecurityUtils.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
        }
        return ResponseEntity.ok(userLocationRepository.findTop100ByOrderByTimestampDesc());
    }

    @PostMapping("/simulate")
    public ResponseEntity<?> simulate(@RequestBody Map<String, Object> body) {
        if (!SecurityUtils.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
        }

        int requestedCount = parseInteger(body.get("count"), 50);
        int requestedDays = parseInteger(body.get("days"), 30);
        int count = Math.max(1, Math.min(requestedCount, 150));
        int days = Math.max(1, Math.min(requestedDays, 60));

        String tenantInput = String.valueOf(body.getOrDefault("tenantId", "bank_a")).trim();
        String tenantId = resolveSimulationTenantId(tenantInput);
        if (!tenantRepository.existsById(tenantId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid tenant", "tenantId", tenantInput));
        }

        Random random = new Random();
        List<Customer> tenantCustomers = customerRepository.findAll().stream()
            .filter(c -> tenantId.equals(c.getTenantId()))
            .toList();

        int usersCreated = 0;
        int minUsersForRun = Math.min(count, 12);
        if (tenantCustomers.size() < minUsersForRun) {
            int createCount = minUsersForRun - tenantCustomers.size();
            usersCreated = bootstrapSimulationUsers(tenantId, createCount);
            tenantCustomers = customerRepository.findAll().stream()
                .filter(c -> tenantId.equals(c.getTenantId()))
                .toList();
        }

        if (tenantCustomers.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No users available for simulation"));
        }

        List<Customer> selectedUsers = new ArrayList<>(tenantCustomers);
        Collections.shuffle(selectedUsers, random);
        if (selectedUsers.size() > count) {
            selectedUsers = new ArrayList<>(selectedUsers.subList(0, count));
        }

        Set<UUID> selectedUserIds = new HashSet<>();
        for (Customer c : selectedUsers) {
            selectedUserIds.add(c.getId());
        }

        Map<UUID, Account> accountByCustomerId = new HashMap<>();
        for (Account account : accountRepository.findAll()) {
            if (Boolean.TRUE.equals(account.getStatus()) && selectedUserIds.contains(account.getCustomerId())) {
                accountByCustomerId.putIfAbsent(account.getCustomerId(), account);
            }
        }

        Instant runStart = Instant.now();

        int eventsCreated = 0;
        int transactionsCreated = 0;
        int loanFunnelEvents = 0;
        int proFeatureEvents = 0;
        int loansApplied = 0;
        int payeesCreated = 0;
        Set<String> emittedFeatures = new HashSet<>();
        Map<String, Integer> userTypeDistribution = new LinkedHashMap<>();
        Set<UUID> kycCompletedUsers = new HashSet<>();
        Set<UUID> analyticsOptInUsers = new HashSet<>();
        Set<UUID> successfulPaymentUsers = new HashSet<>();

        String[] countries = {"India", "Singapore", "United States", "Germany", "United Arab Emirates", "Australia"};
        String[] cities = {"Mumbai", "Bengaluru", "Singapore", "New York", "Berlin", "Dubai", "Sydney"};
        Instant now = Instant.now();

        for (Customer customer : selectedUsers) {
            UUID userId = customer.getId();
            SimulationPersona persona = SimulationPersona.generate(random);
            userTypeDistribution.merge(persona.userType, 1, Integer::sum);
            Account userAccount = accountByCustomerId.get(userId);

            int joinDaysAgo = random.nextInt(days) + 1;
            Instant joinTime = now.minus(joinDaysAgo, ChronoUnit.DAYS);

            Map<String, Object> baseMeta = new HashMap<>();
            baseMeta.put("simulated", true);
            baseMeta.put("source", "admin_simulator");
            baseMeta.put("user_type", persona.userType);
            baseMeta.put("channel", persona.channel.name());
            baseMeta.put("device_type", persona.deviceType);
            baseMeta.put("country", countries[random.nextInt(countries.length)]);
            baseMeta.put("city", cities[random.nextInt(cities.length)]);

            eventService.track("free.auth.register.success", userId, tenantId, baseMeta, joinTime.minusSeconds(120));
            eventService.track("free.auth.login.success", userId, tenantId, baseMeta, joinTime);
            eventsCreated += 2;
            emittedFeatures.add("auth");

            for (int day = 0; day <= joinDaysAgo; day++) {
                if (random.nextDouble() > persona.loginProbability) {
                    continue;
                }

                Instant dayStart = joinTime.plus(day, ChronoUnit.DAYS);
                Instant sessionTs = dayStart.plusSeconds(300 + random.nextInt(28000));

                eventService.track("free.auth.login.success", userId, tenantId, baseMeta, sessionTs);
                eventService.track("free.dashboard.view", userId, tenantId, baseMeta, sessionTs.plusSeconds(20));
                eventsCreated += 2;
                emittedFeatures.add("dashboard");

                if (random.nextDouble() < 0.75) {
                    eventService.track("free.accounts.view", userId, tenantId, baseMeta, sessionTs.plusSeconds(80));
                    eventsCreated++;
                    emittedFeatures.add("accounts");
                }

                if (random.nextDouble() < 0.62) {
                    eventService.track("free.transactions.view", userId, tenantId, baseMeta, sessionTs.plusSeconds(140));
                    eventsCreated++;
                    emittedFeatures.add("transactions");

                    if (userAccount != null && random.nextDouble() < persona.transactionProbability) {
                        boolean success = random.nextDouble() > persona.failureRate;
                        double amount = 300 + random.nextInt(25000);
                        TransactionEntity tx = createSimulatedTransaction(userAccount, amount, success, sessionTs.plusSeconds(180), persona.channel);
                        transactionRepository.save(tx);
                        transactionsCreated++;

                        Map<String, Object> txMeta = new HashMap<>(baseMeta);
                        txMeta.put("amount", amount);
                        txMeta.put("status", success ? "success" : "failed");
                        eventService.track(success ? "free.payment.success" : "free.payment.failed", userId, tenantId, txMeta, sessionTs.plusSeconds(190));
                        eventsCreated++;
                        if (success) {
                            successfulPaymentUsers.add(userId);
                        }
                    }
                }

                if (random.nextDouble() < 0.48) {
                    eventService.track("free.payees.view", userId, tenantId, baseMeta, sessionTs.plusSeconds(240));
                    eventsCreated++;
                    emittedFeatures.add("payees");

                    if (random.nextDouble() < 0.22) {
                        eventService.track("free.payees.add_success", userId, tenantId, baseMeta, sessionTs.plusSeconds(270));
                        eventsCreated++;
                        payeesCreated++;
                    }
                    if (random.nextDouble() < 0.33) {
                        boolean payeePaymentSuccess = random.nextDouble() > persona.failureRate;
                        eventService.track(payeePaymentSuccess ? "free.payment.success" : "free.payment.failed", userId, tenantId, baseMeta, sessionTs.plusSeconds(300));
                        eventsCreated++;
                        if (payeePaymentSuccess) {
                            successfulPaymentUsers.add(userId);
                        }
                    }
                }

                if (random.nextDouble() < persona.loanProbability) {
                    eventService.track("lending.loans.viewed", userId, tenantId, baseMeta, sessionTs.plusSeconds(360));
                    eventsCreated++;
                    loanFunnelEvents++;
                    emittedFeatures.add("loans");

                    if (random.nextDouble() < 0.65) {
                        eventService.track("free.loan.kyc_started", userId, tenantId, baseMeta, sessionTs.plusSeconds(390));
                        eventsCreated++;
                        loanFunnelEvents++;
                    }
                    if (random.nextDouble() < 0.42) {
                        eventService.track("lending.loan.applied", userId, tenantId, baseMeta, sessionTs.plusSeconds(430));
                        eventService.track("free.loan.kyc_completed", userId, tenantId, baseMeta, sessionTs.plusSeconds(460));
                        eventsCreated++;
                        eventsCreated++;
                        loanFunnelEvents++;
                        loansApplied++;
                        kycCompletedUsers.add(userId);
                    }
                }

                if (random.nextDouble() < 0.28) {
                    eventService.track("core.profile.viewed", userId, tenantId, baseMeta, sessionTs.plusSeconds(480));
                    eventsCreated++;
                    emittedFeatures.add("profile");
                    if (random.nextDouble() < 0.2) {
                        eventService.track("core.profile.update.success", userId, tenantId, baseMeta, sessionTs.plusSeconds(520));
                        eventsCreated++;
                    }
                }

                if (random.nextDouble() < persona.proProbability) {
                    eventService.track("pro.features.view", userId, tenantId, baseMeta, sessionTs.plusSeconds(560));
                    eventsCreated++;
                    proFeatureEvents++;
                    emittedFeatures.add("pro");

                    boolean unlock = random.nextDouble() < 0.65;
                    eventService.track(unlock ? "pro.features.unlock_success" : "pro.features.unlock_failed", userId, tenantId, baseMeta, sessionTs.plusSeconds(600));
                    eventsCreated++;
                    proFeatureEvents++;
                    if (unlock) {
                        analyticsOptInUsers.add(userId);
                    }

                    if (unlock) {
                        List<String> proEvents = new ArrayList<>(List.of(
                            "crypto_trading.page.view",
                            "wealth_management.page.view",
                            "payroll.page.view",
                            "ai_insights.page.view"
                        ));
                        Collections.shuffle(proEvents, random);
                        int proTouches = 1 + random.nextInt(3);
                        for (int p = 0; p < proTouches; p++) {
                            eventService.track(proEvents.get(p), userId, tenantId, baseMeta, sessionTs.plusSeconds(640 + (p * 30L)));
                            eventsCreated++;
                            proFeatureEvents++;
                        }
                    }
                }
            }

            if (random.nextDouble() < 0.7) {
                Map<String, Object> liveMeta = new HashMap<>(baseMeta);
                liveMeta.put("live_pulse", true);
                eventService.track("free.dashboard.view", userId, tenantId, liveMeta, now.minusSeconds(random.nextInt(240)));
                eventsCreated++;
            }
        }

        UUID coverageUser = selectedUsers.get(0).getId();
        Map<String, String> requiredCoverage = new LinkedHashMap<>();
        requiredCoverage.put("accounts", "free.accounts.view");
        requiredCoverage.put("transactions", "free.transactions.view");
        requiredCoverage.put("payees", "free.payees.view");
        requiredCoverage.put("loans", "lending.loans.viewed");
        requiredCoverage.put("profile", "core.profile.viewed");
        requiredCoverage.put("pro", "pro.features.view");

        for (Map.Entry<String, String> entry : requiredCoverage.entrySet()) {
            if (emittedFeatures.contains(entry.getKey())) {
                continue;
            }
            Map<String, Object> coverageMeta = new HashMap<>();
            coverageMeta.put("simulated", true);
            coverageMeta.put("source", "feature_coverage_backfill");
            coverageMeta.put("user_type", "coverage");
            coverageMeta.put("channel", "WEB");
            coverageMeta.put("device_type", "desktop");
            eventService.track(entry.getValue(), coverageUser, tenantId, coverageMeta, now.minusSeconds(60 + random.nextInt(120)));
            eventsCreated++;
        }

        int fullyCompleted = 0;
        for (UUID userId : selectedUserIds) {
            if (kycCompletedUsers.contains(userId)
                && analyticsOptInUsers.contains(userId)
                && successfulPaymentUsers.contains(userId)) {
                fullyCompleted++;
            }
        }

        long runMs = Math.max(1L, Duration.between(runStart, Instant.now()).toMillis());
        double throughputEventsPerSec = Math.round((eventsCreated * 1000.0 / runMs) * 100.0) / 100.0;

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Simulation completed with realistic user journeys");
        response.put("tenantId", tenantId);
        response.put("requestedTenant", tenantInput);
        response.put("resolvedTenant", tenantId);
        response.put("requestedUsers", count);
        response.put("simulatedDays", days);
        response.put("totalUsers", tenantCustomers.size());
        response.put("simulatedUsers", selectedUsers.size());
        response.put("usersCreated", usersCreated);
        response.put("eventsCreated", eventsCreated);
        response.put("transactionsCreated", transactionsCreated);
        response.put("applicationsCreated", loansApplied);
        response.put("loansApplied", loansApplied);
        response.put("compliantUsers", kycCompletedUsers.size());
        response.put("kycCompleted", kycCompletedUsers.size());
        response.put("analyticsOptInUsers", analyticsOptInUsers.size());
        response.put("fullyCompleted", fullyCompleted);
        response.put("payeesCreated", payeesCreated);
        response.put("runMs", runMs);
        response.put("throughputEventsPerSec", throughputEventsPerSec);
        response.put("loanFunnelEvents", loanFunnelEvents);
        response.put("proFeatureEvents", proFeatureEvents);
        response.put("userTypeDistribution", userTypeDistribution);
        return ResponseEntity.ok(response);
    }

    private int bootstrapSimulationUsers(String tenantId, int userCount) {
        List<Customer> created = new ArrayList<>(userCount);
        for (int i = 0; i < userCount; i++) {
            String nonce = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
            Customer c = new Customer();
            c.setName("Sim User " + (i + 1));
            c.setEmail("sim." + nonce + "@javabank.local");
            c.setPhone("9" + String.format("%09d", Math.abs((nonce + i).hashCode()) % 1_000_000_000));
            c.setPassword("simulated_user");
            c.setPan("SIM" + nonce.substring(0, 5).toUpperCase());
            c.setTenantId(tenantId);
            c.setKycStatus(KycStatus.VERIFIED);
            c.setDateOfBirth(LocalDate.of(1990, 1, 1));
            c.setLastLogin(Instant.now());
            created.add(c);
        }

        List<Customer> savedCustomers = customerRepository.saveAll(created);
        List<Account> accounts = new ArrayList<>(savedCustomers.size());
        for (Customer customer : savedCustomers) {
            Account a = new Account();
            String accountSuffix = String.format("%010d", Math.abs(customer.getId().hashCode()) % 10_000_000_000L);
            a.setAccNo(accountSuffix);
            a.setCustomerId(customer.getId());
            a.setIfsc(tenantId.equals("bank_a") ? "JBK0001" : "OBK0001");
            a.setAccountType(AccountType.SAVINGS);
            a.setBalance(10_000.0 + (Math.abs(customer.getId().hashCode()) % 250_000));
            a.setStatus(true);
            a.setCreatedOn(Instant.now());
            a.setUpdatedOn(Instant.now());
            accounts.add(a);
        }
        accountRepository.saveAll(accounts);
        return savedCustomers.size();
    }

    private static String resolveSimulationTenantId(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return "bank_a";
        }
        String normalized = tenantId.trim().toLowerCase();
        if ("jbank".equals(normalized) || "javabank".equals(normalized) || "bank_a".equals(normalized)) {
            return "bank_a";
        }
        if ("obank".equals(normalized) || "bank_b".equals(normalized)) {
            return "bank_b";
        }
        return normalized;
    }

    private static TransactionEntity createSimulatedTransaction(Account account, double amount, boolean success, Instant timestamp, TransactionChannel channel) {
        TransactionEntity tx = new TransactionEntity();
        tx.setTransactionType(TransactionType.PAYMENT);
        tx.setSenderAccNo(account.getAccNo());
        tx.setReceiverAccNo("MERCHANT-SIM");
        tx.setAmount(amount);
        tx.setStatus(success ? TransactionStatus.SUCCESS : TransactionStatus.FAILED);
        tx.setCategory("SIMULATED_PAYMENT");
        tx.setChannel(channel);
        tx.setDescription(success ? "Simulated user payment" : "Simulated failed payment");
        tx.setTimestamp(timestamp);
        return tx;
    }

    private static int parseInteger(Object value, int defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception ex) {
            return defaultValue;
        }
    }

    private static Double parseDouble(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (Exception ex) {
            return null;
        }
    }

    private static Map<String, Object> castMap(Map<?, ?> raw) {
        Map<String, Object> map = new HashMap<>();
        raw.forEach((k, v) -> map.put(String.valueOf(k), v));
        return map;
    }

    private static final class SimulationPersona {
        private final String userType;
        private final double loginProbability;
        private final double transactionProbability;
        private final double loanProbability;
        private final double proProbability;
        private final double failureRate;
        private final TransactionChannel channel;
        private final String deviceType;

        private SimulationPersona(
            String userType,
            double loginProbability,
            double transactionProbability,
            double loanProbability,
            double proProbability,
            double failureRate,
            TransactionChannel channel,
            String deviceType
        ) {
            this.userType = userType;
            this.loginProbability = loginProbability;
            this.transactionProbability = transactionProbability;
            this.loanProbability = loanProbability;
            this.proProbability = proProbability;
            this.failureRate = failureRate;
            this.channel = channel;
            this.deviceType = deviceType;
        }

        private static SimulationPersona generate(Random random) {
            double bucket = random.nextDouble();
            if (bucket < 0.35) {
                return new SimulationPersona("casual_user", 0.24, 0.18, 0.08, 0.05, 0.05, TransactionChannel.MOBILE, "mobile");
            }
            if (bucket < 0.68) {
                return new SimulationPersona("salary_user", 0.58, 0.42, 0.16, 0.12, 0.04, random.nextBoolean() ? TransactionChannel.MOBILE : TransactionChannel.WEB, "mobile");
            }
            if (bucket < 0.88) {
                return new SimulationPersona("power_user", 0.78, 0.66, 0.22, 0.28, 0.03, TransactionChannel.WEB, random.nextBoolean() ? "desktop" : "tablet");
            }
            return new SimulationPersona("business_user", 0.84, 0.72, 0.30, 0.38, 0.02, TransactionChannel.WEB, "desktop");
        }
    }
}
