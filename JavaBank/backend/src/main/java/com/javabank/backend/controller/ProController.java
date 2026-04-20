package com.javabank.backend.controller;

import com.javabank.backend.model.entity.*;
import com.javabank.backend.model.enums.AccountType;
import com.javabank.backend.model.enums.TransactionStatus;
import com.javabank.backend.model.enums.TransactionType;
import com.javabank.backend.repository.*;
import com.javabank.backend.security.AuthUser;
import com.javabank.backend.security.SecurityUtils;
import com.javabank.backend.service.EventService;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/pro")
public class ProController {
    private final AccountRepository accountRepository;
    private final UserLicenseRepository userLicenseRepository;
    private final TransactionRepository transactionRepository;
    private final EventRepository eventRepository;
    private final PayeeRepository payeeRepository;
    private final CustomerRepository customerRepository;
    private final EventService eventService;

    public ProController(AccountRepository accountRepository, UserLicenseRepository userLicenseRepository, TransactionRepository transactionRepository, EventRepository eventRepository, PayeeRepository payeeRepository, CustomerRepository customerRepository, EventService eventService) {
        this.accountRepository = accountRepository;
        this.userLicenseRepository = userLicenseRepository;
        this.transactionRepository = transactionRepository;
        this.eventRepository = eventRepository;
        this.payeeRepository = payeeRepository;
        this.customerRepository = customerRepository;
        this.eventService = eventService;
    }

    @PostMapping("/unlock")
    @Transactional
    public ResponseEntity<?> unlock(@RequestBody Map<String, Object> body) {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));

        String featureId = String.valueOf(body.getOrDefault("featureId", ""));
        List<Account> accounts = accountRepository.findByCustomerIdAndAccountTypeInOrderByBalanceDesc(
            auth.getId(), List.of(AccountType.SAVINGS, AccountType.CURRENT, AccountType.INVESTMENT)
        );

        if (accounts.isEmpty() || accounts.get(0).getBalance() < 2000) {
            return ResponseEntity.badRequest().body(Map.of("error", "Insufficient funds. ₹2,000 required."));
        }

        Account primary = accounts.get(0);
        primary.setBalance(primary.getBalance() - 2000);
        accountRepository.save(primary);

        TransactionEntity tx = new TransactionEntity();
        tx.setTransactionType(TransactionType.PRO_LICENSE_FEE);
        tx.setSenderAccNo(primary.getAccNo());
        tx.setReceiverAccNo("NEXABANK-SYSTEM");
        tx.setAmount(2000.0);
        tx.setStatus(TransactionStatus.SUCCESS);
        tx.setCategory("Service Fee");
        tx.setDescription("Unlock " + featureId + " license");
        transactionRepository.save(tx);

        String key = auth.getId() + ":" + featureId;
        UserLicense license = userLicenseRepository.findByCustomerFeatureKey(key).orElseGet(UserLicense::new);
        license.setCustomerId(auth.getId());
        license.setFeatureId(featureId);
        license.setAmount(2000.0);
        license.setActive(true);
        license.setExpiryDate(Instant.now().plus(30, ChronoUnit.DAYS));
        license.setCustomerFeatureKey(key);
        license = userLicenseRepository.save(license);

        eventService.track("pro.features.unlock_success", auth.getId(), auth.getTenantId(), Map.of("featureId", featureId, "amount", 2000));

        return ResponseEntity.ok(Map.of(
            "message", "Feature unlocked successfully for 1 month",
            "license", license
        ));
    }

    @GetMapping("/status")
    public ResponseEntity<?> status() {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));
        return ResponseEntity.ok(userLicenseRepository.findByCustomerIdAndActiveTrueAndExpiryDateAfter(auth.getId(), Instant.now()));
    }

    @PostMapping("/access_book")
    public ResponseEntity<?> accessBook(@RequestBody Map<String, Object> body) {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));

        String title = String.valueOf(body.getOrDefault("title", ""));
        if (title.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Missing title"));

        eventService.track("pro.finance-library.book_access", auth.getId(), auth.getTenantId(), body);
        return ResponseEntity.ok(Map.of("success", true, "message", "Accessing " + title + "..."));
    }

    @PostMapping("/download_book")
    public ResponseEntity<?> downloadBook(@RequestBody Map<String, Object> body) {
        return accessBook(body);
    }

    @GetMapping("/book_stats")
    public ResponseEntity<?> bookStats() {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));

        List<EventEntity> rows = eventRepository.findByCustomerIdAndEventName(auth.getId(), "pro.finance-library.book_access");
        Map<String, Integer> counts = new HashMap<>();
        for (EventEntity row : rows) {
            Object title = row.getMetadata() == null ? null : row.getMetadata().get("title");
            if (title != null) counts.merge(String.valueOf(title), 1, Integer::sum);
        }
        return ResponseEntity.ok(Map.of("counts", counts));
    }

    @GetMapping("/crypto_prices")
    public ResponseEntity<?> cryptoPrices() {
        Map<String, Object> res = new HashMap<>();
        res.put("assets", List.of(
            Map.of("id", "BTC", "name", "Bitcoin", "price", 5412042, "change24h", 2.4, "volume", 0, "marketCap", 0),
            Map.of("id", "ETH", "name", "Ethereum", "price", 155320, "change24h", 1.8, "volume", 0, "marketCap", 0),
            Map.of("id", "SOL", "name", "Solana", "price", 12450, "change24h", -0.5, "volume", 0, "marketCap", 0),
            Map.of("id", "XRP", "name", "Ripple", "price", 44.5, "change24h", 3.2, "volume", 0, "marketCap", 0),
            Map.of("id", "ADA", "name", "Cardano", "price", 31.2, "change24h", -1.1, "volume", 0, "marketCap", 0)
        ));
        res.put("lastUpdated", Instant.now().toString());
        res.put("fallback", true);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/trade")
    @Transactional
    public ResponseEntity<?> trade(@RequestBody Map<String, Object> body) {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));

        String asset = String.valueOf(body.getOrDefault("asset", ""));
        String type = String.valueOf(body.getOrDefault("type", "BUY"));
        double amount = Double.parseDouble(String.valueOf(body.getOrDefault("amount", "0")));
        double price = Double.parseDouble(String.valueOf(body.getOrDefault("price", "0")));

        List<Account> accounts = accountRepository.findByCustomerIdAndAccountTypeInOrderByBalanceDesc(
            auth.getId(), List.of(AccountType.SAVINGS, AccountType.CURRENT, AccountType.INVESTMENT)
        );

        if (accounts.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Account not found"));
        Account account = accounts.get(0);
        double totalCost = amount * price;

        if ("BUY".equalsIgnoreCase(type) && account.getBalance() < totalCost) {
            return ResponseEntity.badRequest().body(Map.of("error", "Insufficient funds for trade"));
        }

        List<Map<String, Object>> currentInvestments = account.getInvestment() == null ? new ArrayList<>() : new ArrayList<>(account.getInvestment());
        int assetIndex = -1;
        for (int i = 0; i < currentInvestments.size(); i++) {
            Object assetName = currentInvestments.get(i).get("asset");
            if (asset.equals(assetName)) {
                assetIndex = i;
                break;
            }
        }

        if ("BUY".equalsIgnoreCase(type)) {
            account.setBalance(account.getBalance() - totalCost);
            if (assetIndex >= 0) {
                Map<String, Object> existing = new HashMap<>(currentInvestments.get(assetIndex));
                double prevAmount = ((Number) existing.getOrDefault("amount", 0)).doubleValue();
                double prevAvg = ((Number) existing.getOrDefault("avgPrice", price)).doubleValue();
                double nextAmount = prevAmount + amount;
                double nextAvg = nextAmount > 0 ? ((prevAmount * prevAvg) + (amount * price)) / nextAmount : price;
                existing.put("type", "CRYPTO");
                existing.put("asset", asset);
                existing.put("amount", nextAmount);
                existing.put("avgPrice", nextAvg);
                currentInvestments.set(assetIndex, existing);
            } else {
                Map<String, Object> fresh = new HashMap<>();
                fresh.put("type", "CRYPTO");
                fresh.put("asset", asset);
                fresh.put("amount", amount);
                fresh.put("avgPrice", price);
                currentInvestments.add(fresh);
            }
        } else {
            if (assetIndex < 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Insufficient asset holdings"));
            }
            Map<String, Object> existing = new HashMap<>(currentInvestments.get(assetIndex));
            double prevAmount = ((Number) existing.getOrDefault("amount", 0)).doubleValue();
            if (prevAmount < amount) {
                return ResponseEntity.badRequest().body(Map.of("error", "Insufficient asset holdings"));
            }
            account.setBalance(account.getBalance() + totalCost);
            double nextAmount = prevAmount - amount;
            if (nextAmount <= 0) {
                currentInvestments.remove(assetIndex);
            } else {
                existing.put("amount", nextAmount);
                currentInvestments.set(assetIndex, existing);
            }
        }

        account.setInvestment(currentInvestments);
        accountRepository.save(account);

        TransactionEntity tx = new TransactionEntity();
        tx.setTransactionType(TransactionType.PAYMENT);
        tx.setSenderAccNo("BUY".equalsIgnoreCase(type) ? account.getAccNo() : "CRYPTO-EXCHANGE");
        tx.setReceiverAccNo("BUY".equalsIgnoreCase(type) ? "CRYPTO-EXCHANGE" : account.getAccNo());
        tx.setAmount(totalCost);
        tx.setStatus(TransactionStatus.SUCCESS);
        tx.setCategory("Crypto Trade");
        tx.setDescription(type + " " + amount + " " + asset + " @ ₹" + price);
        transactionRepository.save(tx);

        return ResponseEntity.ok(Map.of("success", true, "investments", account.getInvestment() == null ? new ArrayList<>() : account.getInvestment()));
    }

    @GetMapping("/portfolio")
    public ResponseEntity<?> portfolio() {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));

        List<Account> accounts = accountRepository.findByCustomerIdAndAccountTypeInOrderByBalanceDesc(
            auth.getId(), List.of(AccountType.SAVINGS, AccountType.CURRENT, AccountType.INVESTMENT)
        );
        if (accounts.isEmpty()) {
            return ResponseEntity.ok(Map.of("holdings", new ArrayList<>(), "balance", 0));
        }
        Account a = accounts.get(0);
        return ResponseEntity.ok(Map.of("holdings", a.getInvestment() == null ? new ArrayList<>() : a.getInvestment(), "balance", a.getBalance()));
    }

    @GetMapping("/wealth_insights")
    public ResponseEntity<?> wealthInsights() {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));

        List<Account> accounts = accountRepository.findByCustomerIdAndStatusTrue(auth.getId());
        double totalBalance = accounts.stream().mapToDouble(Account::getBalance).sum();

        Map<String, Object> payload = new HashMap<>();
        payload.put("netWorth", totalBalance);
        payload.put("totalBalance", totalBalance);
        payload.put("investmentValue", 0);
        payload.put("totalIncome", 0);
        payload.put("totalExpenses", 0);
        payload.put("savingsRate", 0);
        payload.put("topCategories", new ArrayList<>());
        payload.put("monthlyFlow", new ArrayList<>());
        payload.put("investmentBreakdown", new ArrayList<>());
        payload.put("accounts", accounts);
        payload.put("transactionCount", 0);
        return ResponseEntity.ok(payload);
    }

    @PostMapping("/rebalance_wealth")
    public ResponseEntity<?> rebalance(@RequestBody Map<String, Object> body) {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));

        UserLicense license = userLicenseRepository.findFirstByCustomerIdAndFeatureIdAndActiveTrueAndExpiryDateAfter(
            auth.getId(), "wealth-management-pro", Instant.now()
        ).orElse(null);
        if (license == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Active wealth-management-pro license required."));
        }

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Portfolio rebalanced successfully",
            "portfolio", Map.of("total", 0, "cash", 0, "investments", new ArrayList<>(), "weights", Map.of("STOCKS", 0.4, "BONDS", 0.25, "CRYPTO", 0.2, "CASH_RESERVE", 0.15))
        ));
    }

    @GetMapping("/payroll_payees")
    public ResponseEntity<?> payrollPayees() {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));
        return ResponseEntity.ok(payeeRepository.findByPayerCustomerId(auth.getId()));
    }

    @PostMapping("/search_payees")
    public ResponseEntity<?> searchPayroll(@RequestBody Map<String, Object> body) {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));
        String query = String.valueOf(body.getOrDefault("query", ""));

        List<Map<String, Object>> result = new ArrayList<>();
        customerRepository.findAll().stream()
            .filter(c -> !c.getId().equals(auth.getId()))
            .filter(c -> c.getName() != null && c.getName().toLowerCase().contains(query.toLowerCase()))
            .limit(10)
            .forEach(c -> {
                accountRepository.findByCustomerIdAndStatusTrue(c.getId()).stream().findFirst().ifPresent(acc -> {
                    result.add(Map.of(
                        "customerId", c.getId().toString(),
                        "name", c.getName(),
                        "accNo", acc.getAccNo(),
                        "ifsc", acc.getIfsc()
                    ));
                });
            });

        return ResponseEntity.ok(result);
    }

    @PostMapping("/process_payroll")
    @Transactional
    public ResponseEntity<?> processPayroll(@RequestBody Map<String, Object> body) {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));

        Object payeesObj = body.get("payees");
        if (!(payeesObj instanceof List<?> payeesList) || payeesList.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No payees selected"));
        }

        double amountPerPayee = Double.parseDouble(String.valueOf(body.getOrDefault("amountPerPayee", "0")));
        if (payeesList.size() > 20) return ResponseEntity.badRequest().body(Map.of("error", "Maximum 20 payees per batch"));
        if (amountPerPayee > 10000) return ResponseEntity.badRequest().body(Map.of("error", "Maximum ₹10,000 per payee per batch"));

        UserLicense license = userLicenseRepository.findFirstByCustomerIdAndFeatureIdAndActiveTrueAndExpiryDateAfter(
            auth.getId(), "bulk-payroll-processing", Instant.now()
        ).orElse(null);
        if (license == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Active Payroll Pro license required."));
        }

        List<Account> senderAccounts = accountRepository.findByCustomerIdAndAccountTypeInOrderByBalanceDesc(auth.getId(), List.of(AccountType.SAVINGS, AccountType.CURRENT));
        if (senderAccounts.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "No account found"));
        Account sender = senderAccounts.get(0);

        double total = amountPerPayee * payeesList.size();
        if (sender.getBalance() < total) {
            return ResponseEntity.badRequest().body(Map.of("error", "Insufficient funds. Required: ₹" + total + ", Available: ₹" + sender.getBalance()));
        }

        sender.setBalance(sender.getBalance() - total);
        accountRepository.save(sender);

        int successCount = 0;
        for (Object o : payeesList) {
            if (!(o instanceof Map<?, ?> raw)) continue;
            String accNo = String.valueOf(raw.get("accNo"));
            String name = raw.get("name") == null ? "Employee" : String.valueOf(raw.get("name"));
            Account receiver = accountRepository.findById(accNo).orElse(null);
            if (receiver == null) continue;

            receiver.setBalance(receiver.getBalance() + amountPerPayee);
            accountRepository.save(receiver);

            TransactionEntity tx = new TransactionEntity();
            tx.setTransactionType(TransactionType.PAYMENT);
            tx.setSenderAccNo(sender.getAccNo());
            tx.setReceiverAccNo(accNo);
            tx.setAmount(amountPerPayee);
            tx.setStatus(TransactionStatus.SUCCESS);
            tx.setCategory("Payroll Batch");
            tx.setDescription("Payroll to " + name);
            transactionRepository.save(tx);
            successCount++;
        }

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Successfully paid ₹" + amountPerPayee + " to " + successCount + " payees",
            "totalAmount", total,
            "payeesProcessed", successCount
        ));
    }
}
