package com.javabank.backend.controller;

import com.javabank.backend.model.entity.Tenant;
import com.javabank.backend.repository.TenantRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TenantController {
    private final TenantRepository tenantRepository;

    public TenantController(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    @GetMapping("/tenants/ifsc-list")
    public ResponseEntity<?> ifscList() {
        List<Map<String, String>> out = tenantRepository.findAll().stream()
            .map(t -> Map.of(
                "bankName", t.getName(),
                "ifsc", t.getIfscPrefix() + t.getBranchCode(),
                "tenantId", t.getId()
            ))
            .toList();
        return ResponseEntity.ok(out);
    }
}
