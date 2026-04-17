package com.nexabank.repository;

import com.nexabank.entity.Payee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayeeRepository extends JpaRepository<Payee, UUID> {
    List<Payee> findByPayerCustomerId(UUID payerCustomerId);
    Optional<Payee> findByPayeeCustomerIdAndPayerCustomerId(UUID payeeCustomerId, UUID payerCustomerId);
}
