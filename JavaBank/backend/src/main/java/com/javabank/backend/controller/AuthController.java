package com.javabank.backend.controller;

import com.javabank.backend.model.entity.Customer;
import com.javabank.backend.model.enums.CustomerRole;
import com.javabank.backend.repository.CustomerRepository;
import com.javabank.backend.security.AuthUser;
import com.javabank.backend.security.FingerprintUtil;
import com.javabank.backend.security.JwtService;
import com.javabank.backend.security.SecurityUtils;
import com.javabank.backend.tenant.TenantContext;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final CustomerRepository customerRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthController(CustomerRepository customerRepository, JwtService jwtService) {
        this.customerRepository = customerRepository;
        this.jwtService = jwtService;
    }

    @GetMapping("/cookieReturn")
    public ResponseEntity<?> cookieReturn() {
        AuthUser user = SecurityUtils.getAuthUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));
        }
        return ResponseEntity.ok(Map.of(
            "id", user.getId().toString(),
            "role", user.getRole(),
            "tenantId", user.getTenantId(),
            "pan", user.getPan() == null ? "" : user.getPan(),
            "email", user.getEmail()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, Object> body, HttpServletRequest request, HttpServletResponse response) {
        String email = String.valueOf(body.getOrDefault("email", ""));
        String password = String.valueOf(body.getOrDefault("password", ""));

        Optional<Customer> userOpt = customerRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        Customer user = userOpt.get();
        if (!encoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid password"));
        }

        String fingerprint = FingerprintUtil.generate(request);
        String token = jwtService.generateToken(user.getId(), fingerprint);
        Cookie cookie = new Cookie("token", token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(12 * 60 * 60);
        response.addCookie(cookie);

        user.setLastLogin(Instant.now());
        customerRepository.save(user);

        return ResponseEntity.ok(Map.of(
            "userId", user.getId().toString(),
            "role", user.getRole().name(),
            "tenantId", user.getTenantId()
        ));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> body, HttpServletRequest request, HttpServletResponse response) {
        try {
            String email = String.valueOf(body.getOrDefault("email", ""));
            String phone = String.valueOf(body.getOrDefault("phone", ""));
            String pan = String.valueOf(body.getOrDefault("pan", ""));

            if (customerRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "User with this email already exists"));
            }
            if (customerRepository.findByPhone(phone).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "User with this phone number already exists"));
            }
            if (customerRepository.findByPan(pan).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "User with this PAN already exists"));
            }

            Customer c = new Customer();
            c.setName(String.valueOf(body.getOrDefault("name", "")));
            c.setEmail(email);
            c.setPhone(phone);
            c.setPassword(encoder.encode(String.valueOf(body.getOrDefault("password", ""))));
            c.setPan(pan);
            c.setRole(CustomerRole.USER);
            c.setTenantId(String.valueOf(body.getOrDefault("tenantId", TenantContext.getTenant() == null ? "bank_a" : TenantContext.getTenant())));

            Object dobObj = body.get("dateOfBirth");
            if (dobObj != null) {
                c.setDateOfBirth(LocalDate.parse(String.valueOf(dobObj).substring(0, 10)));
            }

            if (body.get("settingConfig") instanceof Map<?, ?> settings) {
                Map<String, Object> map = new HashMap<>();
                settings.forEach((k, v) -> map.put(String.valueOf(k), v));
                c.setSettingConfig(map);
            }

            if (body.get("address") instanceof Map<?, ?> address) {
                Map<String, Object> map = new HashMap<>();
                address.forEach((k, v) -> map.put(String.valueOf(k), v));
                c.setAddress(map);
            }

            Customer saved = customerRepository.save(c);

            String token = jwtService.generateToken(saved.getId(), FingerprintUtil.generate(request));
            Cookie cookie = new Cookie("token", token);
            cookie.setHttpOnly(true);
            cookie.setPath("/");
            cookie.setMaxAge(12 * 60 * 60);
            response.addCookie(cookie);

            Map<String, Object> res = new HashMap<>();
            res.put("id", saved.getId().toString());
            res.put("name", saved.getName());
            res.put("email", saved.getEmail());
            res.put("phone", saved.getPhone());
            res.put("dateOfBirth", saved.getDateOfBirth());
            res.put("pan", saved.getPan());
            res.put("tenantId", saved.getTenantId());
            res.put("role", saved.getRole().name());
            res.put("settingConfig", saved.getSettingConfig());
            res.put("address", saved.getAddress());
            return ResponseEntity.status(HttpStatus.CREATED).body(res);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Internal Server Error"));
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> profile() {
        AuthUser auth = SecurityUtils.getAuthUser();
        if (auth == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        return customerRepository.findById(auth.getId())
            .<ResponseEntity<?>>map(c -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", c.getId().toString());
                map.put("name", c.getName());
                map.put("email", c.getEmail());
                map.put("phone", c.getPhone());
                map.put("address", c.getAddress());
                map.put("dateOfBirth", c.getDateOfBirth());
                map.put("pan", c.getPan());
                map.put("role", c.getRole().name());
                map.put("tenantId", c.getTenantId());
                map.put("customerType", c.getCustomerType().name());
                map.put("settingConfig", c.getSettingConfig());
                return ResponseEntity.ok(map);
            })
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found")));
    }

    @PutMapping("/updateUser")
    public ResponseEntity<?> updateUser(@RequestBody Map<String, Object> body) {
        String id = String.valueOf(body.getOrDefault("id", ""));
        Optional<Customer> userOpt = customerRepository.findById(UUID.fromString(id));
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        Customer c = userOpt.get();
        if (body.containsKey("name")) c.setName(String.valueOf(body.get("name")));
        if (body.containsKey("email")) c.setEmail(String.valueOf(body.get("email")));
        if (body.containsKey("phone")) c.setPhone(String.valueOf(body.get("phone")));
        if (body.containsKey("pan")) c.setPan(String.valueOf(body.get("pan")));
        if (body.containsKey("dateOfBirth")) c.setDateOfBirth(LocalDate.parse(String.valueOf(body.get("dateOfBirth")).substring(0, 10)));
        if (body.get("settingConfig") instanceof Map<?, ?> settings) {
            Map<String, Object> map = new HashMap<>();
            settings.forEach((k, v) -> map.put(String.valueOf(k), v));
            c.setSettingConfig(map);
        }
        if (body.get("address") instanceof Map<?, ?> address) {
            Map<String, Object> map = new HashMap<>();
            address.forEach((k, v) -> map.put(String.valueOf(k), v));
            c.setAddress(map);
        }

        Customer updated = customerRepository.save(c);
        Map<String, Object> res = new HashMap<>();
        res.put("id", updated.getId().toString());
        res.put("name", updated.getName());
        res.put("email", updated.getEmail());
        res.put("phone", updated.getPhone());
        res.put("dateOfBirth", updated.getDateOfBirth());
        res.put("pan", updated.getPan());
        res.put("tenantId", updated.getTenantId());
        res.put("role", updated.getRole().name());
        res.put("settingConfig", updated.getSettingConfig());
        res.put("address", updated.getAddress());
        return ResponseEntity.ok(res);
    }

    @PutMapping("/updatePassword")
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, Object> body) {
        String id = String.valueOf(body.getOrDefault("id", ""));
        String oldPassword = String.valueOf(body.getOrDefault("oldPassword", ""));
        String newPassword = String.valueOf(body.getOrDefault("newPassword", ""));

        Optional<Customer> userOpt = customerRepository.findById(UUID.fromString(id));
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        Customer c = userOpt.get();
        if (!encoder.matches(oldPassword, c.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid password"));
        }

        c.setPassword(encoder.encode(newPassword));
        customerRepository.save(c);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("token", "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}
