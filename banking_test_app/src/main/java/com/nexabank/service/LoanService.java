package com.nexabank.service;

import com.nexabank.entity.*;
import com.nexabank.enums.*;
import com.nexabank.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class LoanService {

    private final LoanRepository loanRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final TransactionRepository transactionRepository;
    private final EventService eventService;

    public LoanService(LoanRepository loanRepository, LoanApplicationRepository loanApplicationRepository,
                       AccountRepository accountRepository, CustomerRepository customerRepository,
                       TransactionRepository transactionRepository, EventService eventService) {
        this.loanRepository = loanRepository;
        this.loanApplicationRepository = loanApplicationRepository;
        this.accountRepository = accountRepository;
        this.customerRepository = customerRepository;
        this.transactionRepository = transactionRepository;
        this.eventService = eventService;
    }

    public List<Loan> getAllLoans() {
        return loanRepository.findAllByOrderByCreatedOnDesc();
    }

    public Optional<Loan> getLoanById(UUID id) {
        return loanRepository.findById(id);
    }

    public List<LoanApplication> getApplicationsByCustomer(UUID customerId) {
        return loanApplicationRepository.findByCustomerIdOrderByCreatedOnDesc(customerId);
    }

    public List<LoanApplication> getAllApplications() {
        return loanApplicationRepository.findAllByOrderByCreatedOnDesc();
    }

    @Transactional
    public LoanApplication applyForLoan(UUID customerId, LoanType loanType, Double principalAmount,
                                         Integer term, Double interestRate, Map<String, Object> kycData) {
        LoanApplication app = LoanApplication.builder()
                .customerId(customerId)
                .loanType(loanType)
                .principalAmount(principalAmount)
                .term(term)
                .interestRate(interestRate)
                .status(ApplicationStatus.PENDING)
                .kycData(kycData != null ? kycData : new HashMap<>())
                .build();

        app = loanApplicationRepository.save(app);

        Customer customer = customerRepository.findById(customerId).orElse(null);
        String tenantId = customer != null ? customer.getTenantId() : "bank_a";
        eventService.trackEvent("loan_applied", customerId.toString(), tenantId,
                Map.of("loanType", loanType.name(), "amount", principalAmount, "term", term));

        return app;
    }

    @Transactional
    public Map<String, Object> approveLoan(UUID applicationId, String accNo) {
        LoanApplication app = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (app.getStatus() != ApplicationStatus.PENDING) {
            throw new RuntimeException("Valid pending application not found");
        }

        Account targetAccount = accountRepository.findByAccNo(accNo)
                .orElseThrow(() -> new RuntimeException("Target account for disbursal not found"));

        app.setStatus(ApplicationStatus.APPROVED);
        loanApplicationRepository.save(app);

        LocalDateTime startDate = LocalDateTime.now();
        LocalDateTime endDate = startDate.plusMonths(app.getTerm());

        Loan loan = Loan.builder()
                .accNo(accNo)
                .loanType(app.getLoanType())
                .principalAmount(app.getPrincipalAmount())
                .interestRate(app.getInterestRate())
                .interestAmount((app.getPrincipalAmount() * app.getInterestRate() * (app.getTerm() / 12.0)) / 100.0)
                .term(app.getTerm())
                .startDate(startDate)
                .endDate(endDate)
                .status(true)
                .dueAmount(app.getPrincipalAmount())
                .schedule(new ArrayList<>())
                .build();
        loan = loanRepository.save(loan);

        // Disburse funds
        targetAccount.setBalance(targetAccount.getBalance() + app.getPrincipalAmount());
        accountRepository.save(targetAccount);

        // Create transaction record
        Transaction tx = Transaction.builder()
                .transactionType(TransactionType.TRANSFER)
                .senderAccNo("NEXABANK-SYSTEM")
                .receiverAccNo(accNo)
                .amount(app.getPrincipalAmount())
                .status(TransactionStatus.SUCCESS)
                .category("LOAN_DISBURSAL")
                .description(app.getLoanType() + " Loan Disbursal")
                .loanId(loan.getId())
                .build();
        transactionRepository.save(tx);

        Customer customer = customerRepository.findById(app.getCustomerId()).orElse(null);
        String tenantId = customer != null ? customer.getTenantId() : "bank_a";
        eventService.trackEvent("loan_approved", app.getCustomerId().toString(), tenantId,
                Map.of("applicationId", applicationId.toString(), "loanId", loan.getId().toString()));

        Map<String, Object> result = new HashMap<>();
        result.put("updatedApp", app);
        result.put("activeLoan", loan);
        return result;
    }

    @Transactional
    public LoanApplication rejectLoan(UUID applicationId) {
        LoanApplication app = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (app.getStatus() != ApplicationStatus.PENDING) {
            throw new RuntimeException("Valid pending application not found");
        }

        app.setStatus(ApplicationStatus.REJECTED);
        loanApplicationRepository.save(app);

        Customer customer = customerRepository.findById(app.getCustomerId()).orElse(null);
        String tenantId = customer != null ? customer.getTenantId() : "bank_a";
        eventService.trackEvent("loan_rejected", app.getCustomerId().toString(), tenantId,
                Map.of("applicationId", applicationId.toString()));

        return app;
    }

    @Transactional
    public LoanApplication updateKyc(UUID applicationId, Map<String, Object> kycData, Integer kycStep) {
        LoanApplication app = loanApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (kycData != null) {
            Map<String, Object> existing = app.getKycData() != null ? new HashMap<>(app.getKycData()) : new HashMap<>();
            existing.putAll(kycData);
            app.setKycData(existing);
        }
        if (kycStep != null) {
            app.setKycStep(kycStep);
        }

        app = loanApplicationRepository.save(app);

        if (kycStep != null && kycStep == 3) {
            Customer customer = customerRepository.findById(app.getCustomerId()).orElse(null);
            String tenantId = customer != null ? customer.getTenantId() : "bank_a";
            eventService.trackEvent("kyc_completed", app.getCustomerId().toString(), tenantId,
                    Map.of("applicationId", applicationId.toString()));
        }

        return app;
    }
}
