package com.nexabank.service;

import com.nexabank.entity.*;
import com.nexabank.enums.*;
import com.nexabank.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final EventService eventService;

    public CustomerService(CustomerRepository customerRepository, PasswordEncoder passwordEncoder,
                           EventService eventService) {
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.eventService = eventService;
    }

    public Customer register(String name, String email, String phone, String password,
                             String dateOfBirth, String pan, String tenantId,
                             Map<String, Object> settingConfig, Map<String, Object> address) {
        if (customerRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("User with this email already exists");
        }
        if (customerRepository.findByPhone(phone).isPresent()) {
            throw new RuntimeException("User with this phone number already exists");
        }
        if (customerRepository.findByPan(pan).isPresent()) {
            throw new RuntimeException("User with this PAN already exists");
        }

        Customer customer = Customer.builder()
                .name(name)
                .email(email)
                .phone(phone)
                .password(passwordEncoder.encode(password))
                .dateOfBirth(LocalDateTime.parse(dateOfBirth + "T00:00:00"))
                .pan(pan)
                .tenantId(tenantId != null ? tenantId : "bank_a")
                .settingConfig(settingConfig != null ? settingConfig : new HashMap<>())
                .address(address != null ? address : new HashMap<>())
                .build();

        customer = customerRepository.save(customer);
        eventService.trackEvent("auth.register.success", customer.getId().toString(),
                customer.getTenantId(), Map.of("device_type", "web"));
        return customer;
    }

    public Customer login(String email, String password) {
        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(password, customer.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        customer.setLastLogin(LocalDateTime.now());
        customerRepository.save(customer);

        eventService.trackEvent("auth.login.success", customer.getId().toString(),
                customer.getTenantId(), Map.of("device_type", "web"));
        return customer;
    }

    public Optional<Customer> findById(UUID id) {
        return customerRepository.findById(id);
    }

    public Customer updateUser(UUID id, String name, String email, String phone,
                               String dateOfBirth, String pan,
                               Map<String, Object> settingConfig, Map<String, Object> address) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (name != null) customer.setName(name);
        if (email != null) customer.setEmail(email);
        if (phone != null) customer.setPhone(phone);
        if (dateOfBirth != null) customer.setDateOfBirth(LocalDateTime.parse(dateOfBirth + "T00:00:00"));
        if (pan != null) customer.setPan(pan);
        if (settingConfig != null) customer.setSettingConfig(settingConfig);
        if (address != null) customer.setAddress(address);

        return customerRepository.save(customer);
    }

    public void updatePassword(UUID id, String oldPassword, String newPassword) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(oldPassword, customer.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        customer.setPassword(passwordEncoder.encode(newPassword));
        customerRepository.save(customer);
    }
}
