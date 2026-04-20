package com.javabank.backend.repository;

import com.javabank.backend.model.entity.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LoanApplicationRepository extends JpaRepository<LoanApplication, UUID> {
    List<LoanApplication> findByCustomerIdOrderByCreatedOnDesc(UUID customerId);
    List<LoanApplication> findAllByOrderByCreatedOnDesc();
}
