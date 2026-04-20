package com.javabank.backend.repository;

import com.javabank.backend.model.entity.Account;
import com.javabank.backend.model.enums.AccountType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, String> {
    List<Account> findByCustomerIdAndStatusTrue(UUID customerId);
    Optional<Account> findByAccNoAndStatusTrue(String accNo);
    List<Account> findByCustomerIdAndAccountTypeInOrderByBalanceDesc(UUID customerId, List<AccountType> accountTypes);
}
