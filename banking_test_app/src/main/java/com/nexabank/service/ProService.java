package com.nexabank.service;

import com.nexabank.entity.*;
import com.nexabank.enums.*;
import com.nexabank.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class ProService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final UserLicenseRepository userLicenseRepository;
    private final EventRepository eventRepository;
    private final EventService eventService;
    private final PayeeRepository payeeRepository;
    private final CustomerRepository customerRepository;

    public ProService(AccountRepository accountRepository, TransactionRepository transactionRepository,
                      UserLicenseRepository userLicenseRepository, EventRepository eventRepository,
                      EventService eventService, PayeeRepository payeeRepository,
                      CustomerRepository customerRepository) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.userLicenseRepository = userLicenseRepository;
        this.eventRepository = eventRepository;
        this.eventService = eventService;
        this.payeeRepository = payeeRepository;
        this.customerRepository = customerRepository;
    }

    @Transactional
    public Map<String, Object> unlockFeature(UUID customerId, String featureId, String tenantId) {
        List<AccountType> types = Arrays.asList(AccountType.SAVINGS, AccountType.CURRENT, AccountType.INVESTMENT);
        Account account = accountRepository.findFirstByCustomerIdAndAccountTypeInOrderByBalanceDesc(customerId, types)
                .orElseThrow(() -> new RuntimeException("No account found"));

        if (account.getBalance() < 2000) {
            throw new RuntimeException("Insufficient funds. ₹2,000 required.");
        }

        account.setBalance(account.getBalance() - 2000);
        accountRepository.save(account);

        Transaction tx = Transaction.builder()
                .transactionType(TransactionType.PRO_LICENSE_FEE)
                .senderAccNo(account.getAccNo())
                .receiverAccNo("NEXABANK-SYSTEM")
                .amount(2000.0)
                .status(TransactionStatus.SUCCESS)
                .category("Service Fee")
                .description("Unlock " + featureId + " license")
                .channel(TransactionChannel.WEB)
                .build();
        transactionRepository.save(tx);

        LocalDateTime expiryDate = LocalDateTime.now().plusMonths(1);
        Optional<UserLicense> existingLicense = userLicenseRepository.findByCustomerIdAndFeatureId(customerId, featureId);
        UserLicense license;
        if (existingLicense.isPresent()) {
            license = existingLicense.get();
            license.setExpiryDate(expiryDate);
            license.setActive(true);
            license.setAmount(2000.0);
        } else {
            license = UserLicense.builder()
                    .customerId(customerId)
                    .featureId(featureId)
                    .amount(2000.0)
                    .expiryDate(expiryDate)
                    .build();
        }
        license = userLicenseRepository.save(license);

        eventService.trackEvent("pro.features.unlock_success", customerId.toString(), tenantId,
                Map.of("featureId", featureId, "amount", 2000));

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Feature unlocked successfully for 1 month");
        result.put("license", license);
        return result;
    }

    public List<UserLicense> getProStatus(UUID customerId) {
        return userLicenseRepository.findByCustomerIdAndActiveTrueAndExpiryDateAfter(customerId, LocalDateTime.now());
    }

    public Map<String, Object> getCryptoPrices() {
        // Fallback static prices (for standalone mode without CoinGecko)
        List<Map<String, Object>> assets = new ArrayList<>();
        assets.add(Map.of("id", "BTC", "name", "Bitcoin", "price", 5412042, "change24h", 2.4, "volume", 0, "marketCap", 0));
        assets.add(Map.of("id", "ETH", "name", "Ethereum", "price", 155320, "change24h", 1.8, "volume", 0, "marketCap", 0));
        assets.add(Map.of("id", "SOL", "name", "Solana", "price", 12450, "change24h", -0.5, "volume", 0, "marketCap", 0));
        assets.add(Map.of("id", "XRP", "name", "Ripple", "price", 44.5, "change24h", 3.2, "volume", 0, "marketCap", 0));
        assets.add(Map.of("id", "ADA", "name", "Cardano", "price", 31.2, "change24h", -1.1, "volume", 0, "marketCap", 0));

        Map<String, Object> result = new HashMap<>();
        result.put("assets", assets);
        result.put("lastUpdated", LocalDateTime.now().toString());
        result.put("fallback", true);
        return result;
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> executeTrade(UUID customerId, String asset, double amount, double price,
                                             String type, String tenantId) {
        List<AccountType> types = Arrays.asList(AccountType.SAVINGS, AccountType.CURRENT, AccountType.INVESTMENT);
        Account account = accountRepository.findFirstByCustomerIdAndAccountTypeInOrderByBalanceDesc(customerId, types)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        double totalCost = amount * price;
        if ("BUY".equals(type) && account.getBalance() < totalCost) {
            throw new RuntimeException("Insufficient funds for trade");
        }

        List<Object> investments = account.getInvestment() != null ? new ArrayList<>(account.getInvestment()) : new ArrayList<>();
        int assetIndex = -1;
        for (int i = 0; i < investments.size(); i++) {
            if (investments.get(i) instanceof Map) {
                Map<String, Object> inv = (Map<String, Object>) investments.get(i);
                if (asset.equals(inv.get("asset"))) {
                    assetIndex = i;
                    break;
                }
            }
        }

        if ("BUY".equals(type)) {
            if (assetIndex > -1) {
                Map<String, Object> inv = new HashMap<>((Map<String, Object>) investments.get(assetIndex));
                inv.put("amount", ((Number) inv.get("amount")).doubleValue() + amount);
                inv.put("avgPrice", (((Number) inv.get("avgPrice")).doubleValue() + price) / 2);
                investments.set(assetIndex, inv);
            } else {
                investments.add(Map.of("type", "CRYPTO", "asset", asset, "amount", amount, "avgPrice", price));
            }
            account.setBalance(account.getBalance() - totalCost);
        } else {
            if (assetIndex == -1) throw new RuntimeException("Insufficient asset holdings");
            Map<String, Object> inv = new HashMap<>((Map<String, Object>) investments.get(assetIndex));
            double currentAmount = ((Number) inv.get("amount")).doubleValue();
            if (currentAmount < amount) throw new RuntimeException("Insufficient asset holdings");
            currentAmount -= amount;
            if (currentAmount == 0) {
                investments.remove(assetIndex);
            } else {
                inv.put("amount", currentAmount);
                investments.set(assetIndex, inv);
            }
            account.setBalance(account.getBalance() + totalCost);
        }

        account.setInvestment(investments);
        accountRepository.save(account);

        Transaction tx = Transaction.builder()
                .transactionType(TransactionType.PAYMENT)
                .senderAccNo("BUY".equals(type) ? account.getAccNo() : "CRYPTO-EXCHANGE")
                .receiverAccNo("BUY".equals(type) ? "CRYPTO-EXCHANGE" : account.getAccNo())
                .amount(totalCost)
                .status(TransactionStatus.SUCCESS)
                .category("Crypto Trade")
                .description(type + " " + amount + " " + asset + " @ ₹" + price)
                .channel(TransactionChannel.WEB)
                .build();
        transactionRepository.save(tx);

        eventService.trackEvent("pro.crypto-trading.trade_execute", customerId.toString(), tenantId,
                Map.of("asset", asset, "amount", amount, "type", type, "totalCost", totalCost, "status", "success"));

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("investments", investments);
        return result;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getPortfolio(UUID customerId) {
        List<AccountType> types = Arrays.asList(AccountType.SAVINGS, AccountType.CURRENT, AccountType.INVESTMENT);
        Account account = accountRepository.findFirstByCustomerIdAndAccountTypeInOrderByBalanceDesc(customerId, types)
                .orElse(null);

        List<Object> investments = account != null && account.getInvestment() != null ? account.getInvestment() : new ArrayList<>();
        List<Object> cryptoHoldings = new ArrayList<>();
        for (Object inv : investments) {
            if (inv instanceof Map) {
                Map<String, Object> m = (Map<String, Object>) inv;
                if ("CRYPTO".equals(m.get("type"))) {
                    cryptoHoldings.add(m);
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("holdings", cryptoHoldings);
        result.put("balance", account != null ? account.getBalance() : 0);
        return result;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getWealthInsights(UUID customerId, String tenantId) {
        List<Account> accounts = accountRepository.findByCustomerId(customerId);
        List<String> accNos = accounts.stream().map(Account::getAccNo).toList();

        LocalDateTime ninetyDaysAgo = LocalDateTime.now().minusDays(90);
        List<Transaction> transactions = transactionRepository.findByAccountNumbersAndTimestampAfter(accNos, ninetyDaysAgo);

        Map<String, Double> categorySpending = new HashMap<>();
        double totalIncome = 0, totalExpenses = 0;

        for (Transaction tx : transactions) {
            boolean isSender = accNos.contains(tx.getSenderAccNo());
            boolean isReceiver = accNos.contains(tx.getReceiverAccNo());
            if (isSender && !isReceiver) {
                totalExpenses += tx.getAmount();
                String cat = tx.getCategory() != null ? tx.getCategory() : "Others";
                categorySpending.merge(cat, tx.getAmount(), Double::sum);
            } else if (isReceiver && !isSender) {
                totalIncome += tx.getAmount();
            }
        }

        double totalBalance = accounts.stream().mapToDouble(Account::getBalance).sum();
        double investmentValue = 0;
        for (Account acc : accounts) {
            if (acc.getInvestment() != null) {
                for (Object inv : acc.getInvestment()) {
                    if (inv instanceof Map) {
                        Map<String, Object> m = (Map<String, Object>) inv;
                        double amt = ((Number) m.getOrDefault("amount", 0)).doubleValue();
                        double avgP = ((Number) m.getOrDefault("avgPrice", 0)).doubleValue();
                        investmentValue += amt * avgP;
                    }
                }
            }
        }

        double netWorth = totalBalance + investmentValue;
        double finalTotalExpenses = totalExpenses;
        List<Map<String, Object>> topCategories = categorySpending.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(8)
                .map(e -> Map.<String, Object>of("name", e.getKey(), "amount", e.getValue(),
                        "percentage", finalTotalExpenses > 0 ? (e.getValue() / finalTotalExpenses * 100) : 0))
                .toList();

        double finalTotalIncome = totalIncome;
        Map<String, Object> result = new HashMap<>();
        result.put("netWorth", netWorth);
        result.put("totalBalance", totalBalance);
        result.put("investmentValue", investmentValue);
        result.put("totalIncome", finalTotalIncome);
        result.put("totalExpenses", finalTotalExpenses);
        result.put("savingsRate", finalTotalIncome > 0 ? ((finalTotalIncome - finalTotalExpenses) / finalTotalIncome * 100) : 0);
        result.put("topCategories", topCategories);
        result.put("transactionCount", transactions.size());
        return result;
    }

    public List<Payee> getPayrollPayees(UUID customerId) {
        return payeeRepository.findByPayerCustomerId(customerId);
    }

    public List<Map<String, Object>> searchPayrollPayees(UUID customerId, String query) {
        List<Customer> results = customerRepository.findByNameContainingIgnoreCaseAndIdNot(query, customerId);
        List<Map<String, Object>> formatted = new ArrayList<>();
        for (Customer c : results) {
            List<Account> accounts = accountRepository.findByCustomerIdAndStatusTrue(c.getId());
            if (!accounts.isEmpty()) {
                Account first = accounts.get(0);
                formatted.add(Map.of(
                        "customerId", c.getId().toString(),
                        "name", c.getName(),
                        "accNo", first.getAccNo(),
                        "ifsc", first.getIfsc()
                ));
            }
            if (formatted.size() >= 10) break;
        }
        return formatted;
    }

    @Transactional
    public Map<String, Object> processPayroll(UUID customerId, String tenantId,
                                               List<Map<String, String>> payees, double amountPerPayee) {
        if (payees.size() > 20) throw new RuntimeException("Maximum 20 payees per batch");
        if (amountPerPayee <= 0) throw new RuntimeException("Amount must be greater than 0");
        if (amountPerPayee > 10000) throw new RuntimeException("Maximum ₹10,000 per payee per batch");

        UserLicense license = userLicenseRepository
                .findByCustomerIdAndFeatureIdAndActiveTrueAndExpiryDateAfter(customerId, "bulk-payroll-processing", LocalDateTime.now())
                .orElseThrow(() -> new RuntimeException("Active Payroll Pro license required."));

        double totalAmount = amountPerPayee * payees.size();

        List<AccountType> types = Arrays.asList(AccountType.SAVINGS, AccountType.CURRENT);
        Account senderAccount = accountRepository.findFirstByCustomerIdAndAccountTypeInOrderByBalanceDesc(customerId, types)
                .orElseThrow(() -> new RuntimeException("No account found"));

        if (senderAccount.getBalance() < totalAmount) {
            throw new RuntimeException("Insufficient funds");
        }

        senderAccount.setBalance(senderAccount.getBalance() - totalAmount);
        accountRepository.save(senderAccount);

        for (Map<String, String> payee : payees) {
            String payeeAccNo = payee.get("accNo");
            String payeeName = payee.get("name");
            Account payeeAccount = accountRepository.findByAccNo(payeeAccNo).orElse(null);
            if (payeeAccount != null) {
                payeeAccount.setBalance(payeeAccount.getBalance() + amountPerPayee);
                accountRepository.save(payeeAccount);
            }

            Transaction tx = Transaction.builder()
                    .transactionType(TransactionType.PAYMENT)
                    .senderAccNo(senderAccount.getAccNo())
                    .receiverAccNo(payeeAccNo)
                    .amount(amountPerPayee)
                    .status(TransactionStatus.SUCCESS)
                    .category("Payroll Batch")
                    .description("Payroll to " + payeeName)
                    .channel(TransactionChannel.WEB)
                    .build();
            transactionRepository.save(tx);
        }

        eventService.trackEvent("pro.payroll-pro.batch_process", customerId.toString(), tenantId,
                Map.of("payees_count", payees.size(), "amount_per_payee", amountPerPayee,
                        "total_amount", totalAmount, "status", "success"));

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Successfully paid ₹" + amountPerPayee + " to " + payees.size() + " payees");
        result.put("totalAmount", totalAmount);
        result.put("payeesProcessed", payees.size());
        return result;
    }
}
