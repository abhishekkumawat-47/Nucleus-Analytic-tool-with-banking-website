package com.nexabank.security;

import com.nexabank.entity.Customer;
import com.nexabank.enums.CustomerRole;
import com.nexabank.enums.KycStatus;
import com.nexabank.repository.CustomerRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final CustomerRepository customerRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public OAuth2LoginSuccessHandler(CustomerRepository customerRepository, JwtUtil jwtUtil, PasswordEncoder passwordEncoder) {
        this.customerRepository = customerRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        if (email == null || email.isBlank()) {
            response.sendRedirect("/login?error=no_email");
            return;
        }

        // Find or create customer
        Optional<Customer> existing = customerRepository.findByEmail(email);
        Customer customer;
        if (existing.isPresent()) {
            customer = existing.get();
            customer.setLastLogin(LocalDateTime.now());
            customerRepository.save(customer);
        } else {
            // Auto-register from Google
            customer = Customer.builder()
                    .name(name != null ? name : email.split("@")[0])
                    .email(email)
                    .phone("0000000000") // placeholder — user can update later
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .dateOfBirth(LocalDateTime.parse("2000-01-01T00:00:00"))
                    .pan("GOOGLE" + email.hashCode())
                    .tenantId("bank_a")
                    .settingConfig(new HashMap<>())
                    .address(Map.of())
                    .role(CustomerRole.USER)
                    .kycStatus(KycStatus.NOT_STARTED)
                    .lastLogin(LocalDateTime.now())
                    .build();
            customer = customerRepository.save(customer);
        }

        // Generate fingerprint and JWT
        String ua = request.getHeader("User-Agent");
        String ip = request.getRemoteAddr();
        String fingerprint = sha256(ua + "|" + ip);

        String token = jwtUtil.generateToken(customer.getId().toString(), fingerprint);

        Cookie cookie = new Cookie("token", token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(12 * 60 * 60); // 12 hours
        response.addCookie(cookie);

        response.sendRedirect("/dashboard");
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            return input;
        }
    }
}
