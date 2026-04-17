package com.nexabank.repository;

import com.nexabank.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, UUID> {
    Optional<Customer> findByEmail(String email);
    Optional<Customer> findByPhone(String phone);
    Optional<Customer> findByPan(String pan);
    List<Customer> findByNameContainingIgnoreCaseAndIdNot(String name, UUID excludeId);
}
