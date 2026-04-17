package com.nexabank.security;

import com.nexabank.entity.Customer;
import com.nexabank.repository.CustomerRepository;
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
import java.util.*;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final CustomerRepository customerRepository;

    public JwtAuthFilter(JwtUtil jwtUtil, CustomerRepository customerRepository) {
        this.jwtUtil = jwtUtil;
        this.customerRepository = customerRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractTokenFromCookie(request);
        if (token != null) {
            try {
                String fingerprint = generateFingerprint(request);
                if (jwtUtil.validateToken(token, fingerprint)) {
                    String userId = jwtUtil.getUserId(token);
                    Optional<Customer> customerOpt = customerRepository.findById(UUID.fromString(userId));

                    if (customerOpt.isPresent()) {
                        Customer customer = customerOpt.get();
                        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + customer.getRole().name()));

                        Map<String, Object> details = new HashMap<>();
                        details.put("id", customer.getId().toString());
                        details.put("role", customer.getRole().name());
                        details.put("tenantId", customer.getTenantId());
                        details.put("pan", customer.getPan());
                        details.put("email", customer.getEmail());

                        UsernamePasswordAuthenticationToken auth =
                                new UsernamePasswordAuthenticationToken(customer.getId().toString(), null, authorities);
                        auth.setDetails(details);
                        SecurityContextHolder.getContext().setAuthentication(auth);

                        // Rotate token if close to expiry
                        if (jwtUtil.isCloseToExpiry(token)) {
                            String newToken = jwtUtil.generateToken(userId, fingerprint);
                            Cookie cookie = new Cookie("token", newToken);
                            cookie.setHttpOnly(true);
                            cookie.setPath("/");
                            cookie.setMaxAge((int) (jwtUtil.getExpirationMs() / 1000));
                            response.addCookie(cookie);
                        }
                    }
                }
            } catch (Exception e) {
                // Invalid token — continue without auth
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("token".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    public static String generateFingerprint(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        if (userAgent == null) userAgent = "";
        String ip = request.getRemoteAddr();
        if (ip == null) ip = "";
        String raw = ip + ":" + userAgent;

        int hash = 0;
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            hash = ((hash << 5) - hash) + c;
            hash = hash & hash; // Convert to 32bit int
        }
        return String.valueOf(hash);
    }
}
