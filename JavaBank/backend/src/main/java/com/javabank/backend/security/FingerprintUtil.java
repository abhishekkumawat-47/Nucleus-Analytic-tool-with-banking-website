package com.javabank.backend.security;

import jakarta.servlet.http.HttpServletRequest;

public final class FingerprintUtil {
    private FingerprintUtil() {}

    public static String generate(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent") == null ? "" : request.getHeader("User-Agent");
        String ip = request.getRemoteAddr() == null ? "" : request.getRemoteAddr();
        return Integer.toString((ip + ":" + userAgent).hashCode());
    }
}
