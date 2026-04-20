package com.javabank.backend.config;

import com.javabank.backend.model.entity.FeatureToggle;
import com.javabank.backend.model.entity.Tenant;
import com.javabank.backend.repository.FeatureToggleRepository;
import com.javabank.backend.repository.TenantRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SeedDataConfig {
    @Bean
    CommandLineRunner seedTenants(TenantRepository tenantRepository) {
        return args -> {
            if (!tenantRepository.existsById("bank_a")) {
                Tenant t = new Tenant();
                t.setId("bank_a");
                t.setName("JBank");
                t.setIfscPrefix("JAVA");
                t.setBranchCode("0001");
                tenantRepository.save(t);
            }
            if (!tenantRepository.existsById("bank_b")) {
                Tenant t = new Tenant();
                t.setId("bank_b");
                t.setName("OBank");
                t.setIfscPrefix("OMAX");
                t.setBranchCode("0001");
                tenantRepository.save(t);
            }
        };
    }

    @Bean
    CommandLineRunner seedFeatureToggles(FeatureToggleRepository featureToggleRepository) {
        return args -> {
            List<String> defaultKeys = List.of(
                "emi_calculator",
                "kyc",
                "loan_module",
                "pro_features"
            );

            for (String tenantId : List.of("bank_a", "bank_b")) {
                for (String key : defaultKeys) {
                    String tenantKey = tenantId + ":" + key;
                    if (featureToggleRepository.findByTenantKey(tenantKey).isPresent()) {
                        continue;
                    }

                    FeatureToggle toggle = new FeatureToggle();
                    toggle.setTenantId(tenantId);
                    toggle.setKeyName(key);
                    toggle.setEnabled(true);
                    toggle.setTenantKey(tenantKey);
                    featureToggleRepository.save(toggle);
                }
            }
        };
    }
}
