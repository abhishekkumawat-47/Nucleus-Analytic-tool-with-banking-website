package com.nexabank.repository;

import com.nexabank.entity.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LoanApplicationRepository extends JpaRepository<LoanApplication, UUID> {
    List<LoanApplication> findByCustomerIdOrderByCreatedOnDesc(UUID customerId);
    List<LoanApplication> findAllByOrderByCreatedOnDesc();
}
