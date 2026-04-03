"""
page_map.py — Centralised Feature → Page mapping for NexaBank & SafexBank.

Taxonomy convention: [page_name].[feature].[status]
  - page_name: dashboard | accounts | transactions | payees | loans | pro-feature | profile | admin_loans | admin_feature_toggles | admin_simulate | login | register
  - feature: overview | open_account | transfer_money | filter_by_date | add_payee | crypto-trading | etc...
  - status:  view | success | error | failed | action

"""

from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# TAXONOMY PAGE TO URL MAPPING
# Maps the taxonomy root [page_name] to the actual frontend URL.
# ─────────────────────────────────────────────────────────────────────────────
URL_MAP: dict[str, str] = {
    "dashboard": "/dashboard",
    "accounts": "/accounts",
    "transactions": "/transactions",
    "payees": "/payees",
    "loans": "/loans",
    "pro-feature": "/pro-features", # Analytics tracks this as /pro-features typically
    "profile": "/profile",
    "admin_loans": "/admin/loans",
    "admin_feature_toggles": "/admin/feature-toggles",
    "admin_simulate": "/admin/simulate",
    "login": "/login",
    "register": "/register",
    
    # SafexBank additions
    "transfers": "/transfers",
    "approvals": "/approvals",
    "cards": "/cards",
}

# ─────────────────────────────────────────────────────────────────────────────
# LEGACY FALLBACK MAP
# ─────────────────────────────────────────────────────────────────────────────
FEATURE_PAGE_MAP: dict[str, str] = {
    "login":                        "/login",
    "register":                     "/register",
    "dashboard_view":               "/dashboard",
    "page_view":                    "/dashboard",
    "accounts_view":                "/accounts",
    "transactions_view":            "/transactions",
    "payment_completed":            "/transactions",
    "payees_view":                  "/payees",
    "payee_added":                  "/payees",
    "loan_applied":                 "/loans",
    "loans_page_view":              "/loans",
    "crypto-trading":               "/pro-features",
    "wealth-management-pro":        "/pro-features",
    "bulk-payroll-processing":      "/pro-features",
    "ai-insights":                  "/pro-features",
}

# ─────────────────────────────────────────────────────────────────────────────
# MULTI-PAGE EVENTS
# ─────────────────────────────────────────────────────────────────────────────
FEATURE_MULTI_PAGE: dict[str, list[str]] = {
    "payees.pay_now.success":     ["/payees", "/transactions"],
    "loans.kyc.success":          ["/loans", "/profile"],
}

# ─────────────────────────────────────────────────────────────────────────────
# HUMAN-READABLE DISPLAY NAMES
# Maps explicit event paths to highly readable dashboard names.
# ─────────────────────────────────────────────────────────────────────────────
FEATURE_DISPLAY_NAMES: dict[str, str] = {
    # Dashboard
    "dashboard.page.view": "Dashboard View",
    "dashboard.overview.view": "Dashboard Overview",
    "dashboard.analytics_tab.view": "Dashboard Analytics",

    # Accounts
    "accounts.page.view": "Accounts View",
    "accounts.open_account.success": "Account Opened",
    "accounts.transfer_money.success": "Transfer Success",
    "accounts.transfer_money.error": "Transfer Error",

    # Transactions
    "transactions.page.view": "Transactions View",
    "transactions.filter_by_date.success": "Transactions Filtered",
    "transactions.history.view": "Transaction History Viewed",
    "transactions.search_transactions.success": "Transaction Searched",

    # Payees
    "payees.page.view": "Payees View",
    "payees.add_payee.success": "Payee Added",
    "payees.edit_payee.success": "Payee Edited",
    "payees.remove_payee.success": "Payee Removed",
    "payees.search_payee.success": "Payee Searched",
    "payees.copy_account_number.success": "Account Copied",
    "payees.pay_now.success": "Payment Success",

    # Loans
    "loans.page.view": "Loans View",
    "loans.emi_estimator.action": "EMI Calculated",
    "loans.apply_loan.action": "Loan Flow Started",
    "loans.proceed_to_kyc.action": "Loan KYC Started",
    "loans.submit_application.success": "Loan App Submitted",
    "loans.submit_application.error": "Loan App Error",

    # Pro Features
    "pro-feature.ai-insights.read_online": "AI Insights Read",
    "pro-feature.crypto-trading.buy_success": "Crypto Bought",
    "pro-feature.crypto-trading.sell_success": "Crypto Sold",
    "pro-feature.wealth-management-pro.insights_view": "Wealth Insights",
    "pro-feature.wealth-management-pro.rebalance_success": "Wealth Rebalanced",
    "pro-feature.bulk-payroll-processing.search_by_name": "Payroll Searched",
    "pro-feature.bulk-payroll-processing.add_payee": "Payroll Payee Added",
    "pro-feature.bulk-payroll-processing.pay_all_success": "Bulk Payroll Success",

    # Profile
    "profile.page.view": "Profile View",
    "profile.edit_details.success": "Profile Details Edited",

    # Admin
    "admin_loans.page.view": "Admin Loans View",
    "admin_loans.view_details.view": "Admin Loan Details",
    "admin_loans.approve.success": "Loan Approved",
    "admin_loans.reject.success": "Loan Rejected",
    "admin_feature_toggles.page.view": "Admin Toggles View",
    "admin_feature_toggles.toggle_feature.success": "Feature Toggled",
    "admin_simulate.page.view": "Admin Simulator View",
    "admin_simulate.run_simulation.success": "Simulation Run",

    # Auth
    "login.page.view": "Login Page",
    "login.auth.success": "Login Success",
    "login.auth.error": "Login Error",
    "register.page.view": "Register Page",
    "register.auth.success": "Register Success",
    "register.auth.error": "Register Error",
}

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def resolve_page(event_name: str) -> Optional[str]:
    """
    Resolve an event_name to its canonical page URL.
    Parses strict taxonomy [page_name].[feature].[status] directly.
    """
    if not event_name:
        return None

    # 1. Check legacy/explicit map
    if event_name in FEATURE_PAGE_MAP:
        return FEATURE_PAGE_MAP[event_name]

    # 2. Strict taxonomy parsing
    parts = event_name.split(".")
    if len(parts) >= 2:
        page_root = parts[0]
        # Map roots like admin_loans to /admin/loans
        if page_root in URL_MAP:
            return URL_MAP[page_root]
        
        # Fallback to direct routing for unknown roots
        clean_root = page_root.replace('_', '/')
        return f"/{clean_root}"

    # 3. Give up -> will be filed under /_other
    return None


def resolve_display_name(event_name: str) -> str:
    """
    Returns a human-readable display name for an event.
    Automatically formats unknown taxonomy paths beautifully.
    """
    if not event_name:
        return "Unknown"

    name = FEATURE_DISPLAY_NAMES.get(event_name)
    if name:
        return name

    # Fallback formatter: page.feature.status -> "Page: Feature (Status)"
    parts = event_name.replace("-", "_").split(".")
    if len(parts) == 3:
        page_name = parts[0].replace("_", " ").title()
        feature = parts[1].replace("_", " ").title()
        status = parts[2].title()
        return f"{page_name}: {feature} ({status})"
    elif len(parts) == 2:
        page_name = parts[0].replace("_", " ").title()
        feature = parts[1].replace("_", " ").title()
        return f"{page_name}: {feature}"

    return event_name.replace("_", " ").title()
