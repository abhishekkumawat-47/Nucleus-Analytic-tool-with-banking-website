package com.nexabank.seed;

import com.nexabank.entity.*;
import com.nexabank.enums.*;
import com.nexabank.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;

@Component
public class DataSeeder implements CommandLineRunner {

    private final TenantRepository tenantRepository;
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final FeatureToggleRepository featureToggleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.tenant.a.id}") private String tenantAId;
    @Value("${app.tenant.a.name}") private String tenantAName;
    @Value("${app.tenant.a.ifsc}") private String tenantAIfsc;
    @Value("${app.tenant.a.branch}") private String tenantABranch;
    @Value("${app.tenant.b.id}") private String tenantBId;
    @Value("${app.tenant.b.name}") private String tenantBName;
    @Value("${app.tenant.b.ifsc}") private String tenantBIfsc;
    @Value("${app.tenant.b.branch}") private String tenantBBranch;
    @Value("${app.system.email}") private String systemEmail;
    @Value("${app.system.name}") private String systemName;
    @Value("${app.system.tenant}") private String systemTenant;

    public DataSeeder(TenantRepository tenantRepository, CustomerRepository customerRepository,
                      AccountRepository accountRepository, FeatureToggleRepository featureToggleRepository,
                      PasswordEncoder passwordEncoder) {
        this.tenantRepository = tenantRepository;
        this.customerRepository = customerRepository;
        this.accountRepository = accountRepository;
        this.featureToggleRepository = featureToggleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // 1. Seed tenants
        seedTenant(tenantAId, tenantAName, tenantAIfsc, tenantABranch);
        seedTenant(tenantBId, tenantBName, tenantBIfsc, tenantBBranch);
        System.out.println("✅ 2 Tenants seeded.");

        // 2. Seed system customer + system accounts
        Optional<Customer> existing = customerRepository.findByEmail(systemEmail);
        Customer systemCustomer;
        if (existing.isEmpty()) {
            systemCustomer = Customer.builder()
                    .name(systemName)
                    .email(systemEmail)
                    .phone("0000000000")
                    .password(passwordEncoder.encode("SystemPassword@123"))
                    .dateOfBirth(LocalDateTime.parse("2000-01-01T00:00:00"))
                    .pan("SYSXX0000S")
                    .tenantId(systemTenant)
                    .settingConfig(new HashMap<>())
                    .address(Map.of("city", "System", "state", "Internal"))
                    .role(CustomerRole.ADMIN)
                    .kycStatus(KycStatus.VERIFIED)
                    .build();
            systemCustomer = customerRepository.save(systemCustomer);
            System.out.println("✅ System customer created.");
        } else {
            systemCustomer = existing.get();
        }

        String[][] systemAccounts = {
                {"NEXABANK-SYSTEM", "Pro License Revenue"},
                {"NEXABANK-SYSTEM-REVENUE", "System Revenue"},
                {"EXTERNAL-BANK", "External Bank Inflows"},
                {"MERCHANT-ID", "Merchant Payments"},
                {"CRYPTO-EXCHANGE", "Crypto Exchange"},
                {"WEALTH-REBALANCE-SYS", "Wealth Rebalance System"}
        };

        for (String[] sa : systemAccounts) {
            if (accountRepository.findByAccNo(sa[0]).isEmpty()) {
                Account acc = Account.builder()
                        .accNo(sa[0])
                        .customerId(systemCustomer.getId())
                        .ifsc(tenantAIfsc + "0001")
                        .accountType(AccountType.CURRENT)
                        .balance(0.0)
                        .build();
                accountRepository.save(acc);
                System.out.println("  ✅ System account \"" + sa[0] + "\" created (" + sa[1] + ").");
            }
        }

        // 3. Seed feature toggles
        String[] features = {"emi_calculator", "kyc", "loan_module", "pro_features"};
        for (String tenantId : Arrays.asList(tenantAId, tenantBId)) {
            for (String feature : features) {
                if (featureToggleRepository.findByKeyAndTenantId(feature, tenantId).isEmpty()) {
                    FeatureToggle toggle = FeatureToggle.builder()
                            .key(feature).enabled(true).tenantId(tenantId).build();
                    featureToggleRepository.save(toggle);
                }
            }
        }
        System.out.println("✅ Feature toggles seeded.");
        System.out.println("\n🎉 Seeding complete!");
    }

    private void seedTenant(String id, String name, String ifsc, String branch) {
        if (tenantRepository.findById(id).isEmpty()) {
            Tenant tenant = Tenant.builder()
                    .id(id).name(name).ifscPrefix(ifsc).branchCode(branch).build();
            tenantRepository.save(tenant);
        }
    }
}
