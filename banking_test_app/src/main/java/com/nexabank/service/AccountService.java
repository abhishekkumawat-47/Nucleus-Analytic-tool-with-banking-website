package com.nexabank.service;

import com.nexabank.entity.Account;
import com.nexabank.entity.Customer;
import com.nexabank.entity.Transaction;
import com.nexabank.enums.*;
import com.nexabank.repository.AccountRepository;
import com.nexabank.repository.CustomerRepository;
import com.nexabank.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final TransactionRepository transactionRepository;

    public AccountService(AccountRepository accountRepository, CustomerRepository customerRepository,
                          TransactionRepository transactionRepository) {
        this.accountRepository = accountRepository;
        this.customerRepository = customerRepository;
        this.transactionRepository = transactionRepository;
    }

    public String generateUniqueAccountNumber() {
        String accNo;
        do {
            long num = (long) (Math.pow(10, 12) + ThreadLocalRandom.current().nextDouble() * 9 * Math.pow(10, 12));
            accNo = String.valueOf(num);
        } while (accountRepository.findByAccNo(accNo).isPresent());
        return accNo;
    }

    public Account createAccount(UUID customerId, String ifsc, AccountType accountType, Double balance) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        String accNo = generateUniqueAccountNumber();
        Account account = Account.builder()
                .accNo(accNo)
                .customerId(customerId)
                .ifsc(ifsc)
                .accountType(accountType)
                .balance(balance != null ? balance : 0.0)
                .build();
        return accountRepository.save(account);
    }

    public Optional<Account> getByAccNo(String accNo) {
        return accountRepository.findByAccNo(accNo);
    }

    public List<Account> getByCustomerId(UUID customerId) {
        return accountRepository.findByCustomerIdAndStatusTrue(customerId);
    }

    @Transactional
    public Map<String, Object> transferBetweenOwnAccounts(String fromAccNo, String toAccNo, Double amount, String description) {
        Account from = accountRepository.findByAccNoAndStatusTrue(fromAccNo)
                .orElseThrow(() -> new RuntimeException("Source account not found or inactive"));
        Account to = accountRepository.findByAccNoAndStatusTrue(toAccNo)
                .orElseThrow(() -> new RuntimeException("Destination account not found or inactive"));

        if (!from.getCustomerId().equals(to.getCustomerId())) {
            throw new RuntimeException("Transfer only allowed between accounts owned by the same customer");
        }
        if (from.getBalance() < amount) {
            throw new RuntimeException("Insufficient funds");
        }

        from.setBalance(from.getBalance() - amount);
        to.setBalance(to.getBalance() + amount);
        accountRepository.save(from);
        accountRepository.save(to);

        Customer fromCustomer = customerRepository.findById(from.getCustomerId()).orElse(null);
        Customer toCustomer = customerRepository.findById(to.getCustomerId()).orElse(null);
        boolean isCrossBank = fromCustomer != null && toCustomer != null &&
                !fromCustomer.getTenantId().equals(toCustomer.getTenantId());

        Transaction tx = Transaction.builder()
                .transactionType(TransactionType.TRANSFER)
                .senderAccNo(fromAccNo)
                .receiverAccNo(toAccNo)
                .amount(amount)
                .status(TransactionStatus.SUCCESS)
                .category(isCrossBank ? "CROSS_TRANSFER" : "SELF_TRANSFER")
                .description(description != null ? description : "Self Transfer")
                .build();
        transactionRepository.save(tx);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Transfer successful");
        result.put("transactionId", tx.getId().toString());
        result.put("fromAccount", Map.of("accountNumber", from.getAccNo(), "newBalance", from.getBalance()));
        result.put("toAccount", Map.of("accountNumber", to.getAccNo(), "newBalance", to.getBalance()));
        return result;
    }

    @Transactional
    public Map<String, Object> payToPayee(String fromAccNo, String toAccNo, Double amount, String description) {
        Account from = accountRepository.findByAccNoAndStatusTrue(fromAccNo)
                .orElseThrow(() -> new RuntimeException("Source account not found or inactive"));
        Account to = accountRepository.findByAccNoAndStatusTrue(toAccNo)
                .orElseThrow(() -> new RuntimeException("Destination account not found or inactive"));

        if (from.getBalance() < amount) {
            throw new RuntimeException("Insufficient funds");
        }

        from.setBalance(from.getBalance() - amount);
        to.setBalance(to.getBalance() + amount);
        accountRepository.save(from);
        accountRepository.save(to);

        Customer fromCustomer = customerRepository.findById(from.getCustomerId()).orElse(null);
        Customer toCustomer = customerRepository.findById(to.getCustomerId()).orElse(null);
        boolean isCrossBank = fromCustomer != null && toCustomer != null &&
                !fromCustomer.getTenantId().equals(toCustomer.getTenantId());

        Transaction tx = Transaction.builder()
                .transactionType(TransactionType.PAYMENT)
                .senderAccNo(fromAccNo)
                .receiverAccNo(toAccNo)
                .amount(amount)
                .status(TransactionStatus.SUCCESS)
                .category(isCrossBank ? "CROSS_TRANSFER" : "PAYEE_TRANSFER")
                .description(description != null ? description : "Payment to Payee")
                .build();
        transactionRepository.save(tx);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Payment successful");
        result.put("transactionId", tx.getId().toString());
        result.put("fromAccount", Map.of("accountNumber", from.getAccNo(), "newBalance", from.getBalance()));
        return result;
    }
}
