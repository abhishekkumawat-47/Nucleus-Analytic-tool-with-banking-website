package com.javabank.backend.repository;

import com.javabank.backend.model.entity.Payee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PayeeRepository extends JpaRepository<Payee, UUID> {
    List<Payee> findByPayerCustomerId(UUID payerCustomerId);
    Optional<Payee> findByPayerCustomerIdAndPayeeCustomerId(UUID payerCustomerId, UUID payeeCustomerId);
    List<Payee> findByPayerCustomerIdAndNameContainingIgnoreCase(UUID payerCustomerId, String query);
}
