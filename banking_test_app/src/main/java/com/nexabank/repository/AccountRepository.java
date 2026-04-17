package com.nexabank.repository;

import com.nexabank.entity.Account;
import com.nexabank.enums.AccountType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountRepository extends JpaRepository<Account, String> {
    Optional<Account> findByAccNo(String accNo);
    List<Account> findByCustomerIdAndStatusTrue(UUID customerId);
    List<Account> findByCustomerId(UUID customerId);
    Optional<Account> findFirstByCustomerIdAndAccountTypeInOrderByBalanceDesc(UUID customerId, List<AccountType> types);
    Optional<Account> findByAccNoAndStatusTrue(String accNo);
    List<Account> findByAccNoContainingIgnoreCaseOrCustomerIdIn(String accNo, List<UUID> customerIds);
}
