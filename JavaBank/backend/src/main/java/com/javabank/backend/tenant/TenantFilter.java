package com.javabank.backend.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

@Component
public class TenantFilter extends OncePerRequestFilter {
    private static final Map<String, String> TENANT_MAP = Map.of(
        "JBANK", "bank_a",
        "OBANK", "bank_b",
        "BANK_A", "bank_a",
        "BANK_B", "bank_b"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
        try {
            String raw = request.getHeader("X-Tenant-ID");
            if (raw != null && !raw.isBlank()) {
                String mapped = TENANT_MAP.getOrDefault(raw.trim().toUpperCase(), raw.trim().toLowerCase());
                TenantContext.setTenant(mapped);
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
