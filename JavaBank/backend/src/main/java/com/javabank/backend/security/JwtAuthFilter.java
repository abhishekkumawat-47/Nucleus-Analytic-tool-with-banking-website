package com.javabank.backend.security;

import com.javabank.backend.model.entity.Customer;
import com.javabank.backend.repository.CustomerRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final CustomerRepository customerRepository;

    public JwtAuthFilter(JwtService jwtService, CustomerRepository customerRepository) {
        this.jwtService = jwtService;
        this.customerRepository = customerRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
        try {
            String token = readCookie(request, "token");
            if (token != null) {
                Claims claims = jwtService.parse(token);
                String tokenFingerprint = claims.get("fingerprint", String.class);
                String currentFingerprint = FingerprintUtil.generate(request);

                if (tokenFingerprint != null && tokenFingerprint.equals(currentFingerprint)) {
                    UUID userId = UUID.fromString(claims.getSubject());
                    Optional<Customer> customerOpt = customerRepository.findById(userId);
                    if (customerOpt.isPresent()) {
                        Customer customer = customerOpt.get();
                        AuthUser authUser = new AuthUser(
                            customer.getId(),
                            customer.getRole().name(),
                            customer.getTenantId(),
                            customer.getPan(),
                            customer.getEmail()
                        );
                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            authUser,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + customer.getRole().name()))
                        );
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                }
            }
        } catch (Exception ignored) {
        }

        filterChain.doFilter(request, response);
    }

    private String readCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
