package com.javabank.backend.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {
    private SecurityUtils() {}

    public static AuthUser getAuthUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthUser principal)) {
            return null;
        }
        return principal;
    }

    public static boolean isAdmin() {
        AuthUser user = getAuthUser();
        return user != null && "ADMIN".equalsIgnoreCase(user.getRole());
    }
}
