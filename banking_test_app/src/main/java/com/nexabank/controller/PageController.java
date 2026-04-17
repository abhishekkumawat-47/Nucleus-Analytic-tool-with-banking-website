package com.nexabank.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    private boolean isAuthenticated() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal());
    }

    @GetMapping("/")
    public String home() {
        if (isAuthenticated()) return "redirect:/dashboard";
        return "home";
    }

    @GetMapping("/home")
    public String homePage() {
        return "home";
    }

    @GetMapping("/login")
    public String login() {
        if (isAuthenticated()) return "redirect:/dashboard";
        return "login";
    }

    @GetMapping("/register")
    public String register() {
        if (isAuthenticated()) return "redirect:/dashboard";
        return "register";
    }

    @GetMapping("/dashboard")
    public String dashboard(Model model) {
        return "dashboard";
    }

    @GetMapping("/accounts")
    public String accounts() {
        return "accounts";
    }

    @GetMapping("/transactions")
    public String transactions() {
        return "transactions";
    }

    @GetMapping("/payees")
    public String payees() {
        return "payees";
    }

    @GetMapping("/loans")
    public String loans() {
        return "loans";
    }

    @GetMapping("/pro-feature")
    public String proFeature() {
        return "pro-feature";
    }

    @GetMapping("/profile")
    public String profile() {
        return "profile";
    }

    @GetMapping("/admin/simulate")
    public String adminSimulate() {
        return "admin-simulate";
    }

    @GetMapping("/admin/feature-toggles")
    public String adminToggle() {
        return "admin-toggles";
    }

    @GetMapping("/admin/loans")
    public String adminLoans() {
        return "admin-loans";
    }
}
