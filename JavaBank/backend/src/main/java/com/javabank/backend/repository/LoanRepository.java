package com.javabank.backend.repository;

import com.javabank.backend.model.entity.Loan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LoanRepository extends JpaRepository<Loan, UUID> {
    List<Loan> findAllByOrderByCreatedOnDesc();
}
