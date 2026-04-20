package com.javabank.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class NexaTableAlignmentRunner implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(NexaTableAlignmentRunner.class);

    private final JdbcTemplate jdbcTemplate;

    public NexaTableAlignmentRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Map<String, String> renameMap = buildRenameMap();
        List<String> legacyTables = findExistingLegacyTables(renameMap.keySet());

        if (legacyTables.isEmpty()) {
            return;
        }

        log.warn("[SCHEMA_ALIGN] Legacy JavaBank tables found: {}", legacyTables);
        log.warn("[SCHEMA_ALIGN] Truncating legacy tables before renaming to NexaBank table names.");

        jdbcTemplate.execute("TRUNCATE TABLE " + String.join(", ", legacyTables) + " CASCADE");

        for (Map.Entry<String, String> entry : renameMap.entrySet()) {
            String oldName = entry.getKey();
            String newName = entry.getValue();

            if (!legacyTables.contains(oldName)) {
                continue;
            }

            boolean targetExists = tableExists(newName);
            if (targetExists) {
                jdbcTemplate.execute("DROP TABLE IF EXISTS " + oldName + " CASCADE");
                log.warn("[SCHEMA_ALIGN] Target table \"{}\" already exists, dropped legacy table {}.", newName, oldName);
                continue;
            }

            jdbcTemplate.execute("ALTER TABLE " + oldName + " RENAME TO \"" + newName + "\"");
            log.info("[SCHEMA_ALIGN] Renamed {} -> \"{}\"", oldName, newName);
        }
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?",
            Integer.class,
            tableName
        );
        return count != null && count > 0;
    }

    private List<String> findExistingLegacyTables(Iterable<String> tableNames) {
        List<String> existing = new ArrayList<>();
        for (String tableName : tableNames) {
            if (tableExists(tableName)) {
                existing.add(tableName);
            }
        }
        return existing;
    }

    private Map<String, String> buildRenameMap() {
        Map<String, String> map = new LinkedHashMap<>();
        map.put("customers", "Customer");
        map.put("accounts", "Account");
        map.put("transactions", "Transaction");
        map.put("loans", "Loan");
        map.put("loan_applications", "LoanApplication");
        map.put("payees", "Payee");
        map.put("events", "Event");
        map.put("user_locations", "UserLocation");
        map.put("user_licenses", "UserLicense");
        map.put("feature_toggles", "FeatureToggle");
        map.put("tenants", "Tenant");
        return map;
    }
}
