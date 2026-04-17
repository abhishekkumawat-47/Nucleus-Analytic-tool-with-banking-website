package com.nexabank.controller;

import com.nexabank.entity.Customer;
import com.nexabank.security.JwtAuthFilter;
import com.nexabank.security.JwtUtil;
import com.nexabank.service.CustomerService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final CustomerService customerService;
    private final JwtUtil jwtUtil;

    public AuthController(CustomerService customerService, JwtUtil jwtUtil) {
        this.customerService = customerService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpServletRequest request, HttpServletResponse response) {
        try {
            String email = body.get("email");
            String password = body.get("password");
            if (email == null || password == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email and password required"));
            }

            Customer customer = customerService.login(email, password);
            String fingerprint = JwtAuthFilter.generateFingerprint(request);
            String token = jwtUtil.generateToken(customer.getId().toString(), fingerprint);

            Cookie cookie = new Cookie("token", token);
            cookie.setHttpOnly(true);
            cookie.setPath("/");
            cookie.setMaxAge((int) (jwtUtil.getExpirationMs() / 1000));
            response.addCookie(cookie);

            return ResponseEntity.ok(Map.of(
                    "userId", customer.getId().toString(),
                    "role", customer.getRole().name(),
                    "tenantId", customer.getTenantId()
            ));
        } catch (RuntimeException e) {
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
            }
            if (e.getMessage().contains("Invalid")) {
                return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(500).body(Map.of("error", "Internal Server Error"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> body, HttpServletRequest request, HttpServletResponse response) {
        try {
            Customer customer = customerService.register(
                    (String) body.get("name"),
                    (String) body.get("email"),
                    (String) body.get("phone"),
                    (String) body.get("password"),
                    (String) body.get("dateOfBirth"),
                    (String) body.get("pan"),
                    (String) body.getOrDefault("tenantId", "bank_a"),
                    (Map<String, Object>) body.get("settingConfig"),
                    (Map<String, Object>) body.get("address")
            );

            String fingerprint = JwtAuthFilter.generateFingerprint(request);
            String token = jwtUtil.generateToken(customer.getId().toString(), fingerprint);

            Cookie cookie = new Cookie("token", token);
            cookie.setHttpOnly(true);
            cookie.setPath("/");
            cookie.setMaxAge((int) (jwtUtil.getExpirationMs() / 1000));
            response.addCookie(cookie);

            Map<String, Object> result = new HashMap<>();
            result.put("id", customer.getId().toString());
            result.put("name", customer.getName());
            result.put("email", customer.getEmail());
            result.put("phone", customer.getPhone());
            result.put("pan", customer.getPan());
            result.put("role", customer.getRole().name());
            result.put("tenantId", customer.getTenantId());

            return ResponseEntity.status(201).body(result);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("already exists")) {
                return ResponseEntity.status(409).body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(500).body(Map.of("error", "Internal Server Error"));
        }
    }

    @GetMapping("/cookieReturn")
    public ResponseEntity<?> cookieReturn() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        Map<String, Object> details = (Map<String, Object>) auth.getDetails();
        return ResponseEntity.ok(details);
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        String userId = auth.getPrincipal().toString();
        return customerService.findById(UUID.fromString(userId))
                .map(customer -> {
                    Map<String, Object> profile = new HashMap<>();
                    profile.put("id", customer.getId().toString());
                    profile.put("name", customer.getName());
                    profile.put("email", customer.getEmail());
                    profile.put("phone", customer.getPhone());
                    profile.put("address", customer.getAddress());
                    profile.put("dateOfBirth", customer.getDateOfBirth());
                    profile.put("pan", customer.getPan());
                    profile.put("role", customer.getRole().name());
                    profile.put("tenantId", customer.getTenantId());
                    profile.put("customerType", customer.getCustomerType().name());
                    profile.put("settingConfig", customer.getSettingConfig());
                    return ResponseEntity.ok((Object) profile);
                })
                .orElse(ResponseEntity.status(404).body(Map.of("error", "User not found")));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("token", null);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PutMapping("/updateUser")
    public ResponseEntity<?> updateUser(@RequestBody Map<String, Object> body) {
        try {
            String id = (String) body.get("id");
            Customer updated = customerService.updateUser(
                    UUID.fromString(id),
                    (String) body.get("name"),
                    (String) body.get("email"),
                    (String) body.get("phone"),
                    (String) body.get("dateOfBirth"),
                    (String) body.get("pan"),
                    (Map<String, Object>) body.get("settingConfig"),
                    (Map<String, Object>) body.get("address")
            );
            Map<String, Object> result = new HashMap<>();
            result.put("id", updated.getId().toString());
            result.put("name", updated.getName());
            result.put("email", updated.getEmail());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/updatePassword")
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, String> body) {
        try {
            customerService.updatePassword(
                    UUID.fromString(body.get("id")),
                    body.get("oldPassword"),
                    body.get("newPassword")
            );
            return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
        } catch (RuntimeException e) {
            if (e.getMessage().contains("Invalid")) {
                return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
