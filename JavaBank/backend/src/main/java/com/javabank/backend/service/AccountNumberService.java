package com.javabank.backend.service;

import com.javabank.backend.repository.AccountRepository;
import org.springframework.stereotype.Service;

import java.util.concurrent.ThreadLocalRandom;

@Service
public class AccountNumberService {
    private final AccountRepository accountRepository;

    public AccountNumberService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    public String generateUniqueAccountNumber() {
        String accNo;
        do {
            long value = ThreadLocalRandom.current().nextLong(1_000_000_000_000L, 10_000_000_000_000L);
            accNo = Long.toString(value);
        } while (accountRepository.existsById(accNo));
        return accNo;
    }
}
