package com.nexabank.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        // Pad secret to at least 32 bytes for HS256
        String padded = secret;
        while (padded.getBytes(StandardCharsets.UTF_8).length < 32) {
            padded = padded + secret;
        }
        this.key = Keys.hmacShaKeyFor(padded.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(String userId, String fingerprint) {
        return Jwts.builder()
                .subject(userId)
                .claim("fingerprint", fingerprint)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String getUserId(String token) {
        return parseToken(token).getSubject();
    }

    public String getFingerprint(String token) {
        return parseToken(token).get("fingerprint", String.class);
    }

    public boolean isTokenExpired(String token) {
        return parseToken(token).getExpiration().before(new Date());
    }

    public boolean isCloseToExpiry(String token) {
        Date expiration = parseToken(token).getExpiration();
        long remaining = expiration.getTime() - System.currentTimeMillis();
        return remaining < 1800000; // 30 minutes
    }

    public boolean validateToken(String token, String fingerprint) {
        try {
            Claims claims = parseToken(token);
            String tokenFingerprint = claims.get("fingerprint", String.class);
            return fingerprint.equals(tokenFingerprint) && !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public long getExpirationMs() {
        return expirationMs;
    }
}
