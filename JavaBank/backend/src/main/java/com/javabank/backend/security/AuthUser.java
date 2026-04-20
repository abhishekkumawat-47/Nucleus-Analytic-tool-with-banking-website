package com.javabank.backend.security;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.UUID;

@Getter
@AllArgsConstructor
public class AuthUser {
    private UUID id;
    private String role;
    private String tenantId;
    private String pan;
    private String email;
}
