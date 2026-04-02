/**
 * Feature Mapping Configuration
 * Maps technical routes to business-level feature names.
 * This is the configurable layer that translates raw URL paths
 * into meaningful feature names for the analytics dashboard.
 * 
 * To add a new app, simply add a new key with its route mappings.
 */

export interface FeatureMapping {
  pattern: string;        // URL pattern (supports simple glob with *)
  featureName: string;    // Business-level feature name
  category: 'navigation' | 'interaction' | 'transaction' | 'system';
  funnel?: number;        // Optional funnel step order (1-based)
}

export interface AppConfig {
  appId: string;
  displayName: string;
  description: string;
  tenantId: string;       // Maps to tenant_id in ClickHouse
  icon: string;           // Lucide icon name
  color: string;          // Brand color
  appUrl: string;         // The URL to open the app (e.g., http://localhost:3002/nexabank)
  funnelSteps: string[];  // Ordered funnel event names
  routes: FeatureMapping[];
}

/**
 * Registry of all connected applications.
 * Add new apps here — no code changes needed elsewhere.
 */
export const APP_REGISTRY: Record<string, AppConfig> = {
  nexabank: {
    appId: 'nexabank',
    displayName: 'NexaBank',
    description: 'Modern digital banking platform with pro features',
    tenantId: 'nexabank',
    icon: 'wallet',
    color: '#7C3AED',
    appUrl: process.env.NEXT_PUBLIC_NEXABANK_URL || 'http://localhost:3002',
    funnelSteps: ['login', 'dashboard_view', 'loan_applied', 'kyc_started', 'kyc_completed'],
    routes: [
      // Core Banking
      { pattern: '/login',            featureName: 'auth.login.view',              category: 'navigation',    funnel: 1 },
      { pattern: '/register',         featureName: 'auth.register.view',           category: 'navigation' },
      { pattern: '/dashboard',        featureName: 'core.dashboard.view',          category: 'navigation',    funnel: 2 },
      { pattern: '/accounts',         featureName: 'core.accounts.view',           category: 'navigation' },
      { pattern: '/transactions',     featureName: 'core.transactions.view',       category: 'navigation' },
      { pattern: '/payees',           featureName: 'core.payees.view',             category: 'navigation' },
      { pattern: '/profile',          featureName: 'core.profile.view',            category: 'navigation' },

      // Loans
      { pattern: '/loans',            featureName: 'loans.dashboard.view',         category: 'navigation',    funnel: 3 },

      // Pro Features — Granular Routes
      { pattern: '/pro-feature',      featureName: 'pro.dashboard.view',           category: 'navigation',    funnel: 4 },

      // Pro Feature: Finance Library (ai-insights)
      { pattern: '/pro-feature?id=ai-insights',            featureName: 'pro.finance-library.view',     category: 'navigation' },

      // Pro Feature: Crypto Trading
      { pattern: '/pro-feature?id=crypto-trading',          featureName: 'pro.crypto-trading.view',      category: 'navigation' },

      // Pro Feature: Wealth Management
      { pattern: '/pro-feature?id=wealth-management-pro',   featureName: 'pro.wealth-management.view',   category: 'navigation' },

      // Pro Feature: Payroll Pro
      { pattern: '/pro-feature?id=bulk-payroll-processing', featureName: 'pro.payroll-pro.view',         category: 'navigation' },

      // Admin
      { pattern: '/admin*',           featureName: 'admin.dashboard.view',         category: 'system' },
    ],
  },
};

/**
 * Resolves a URL path to its business-level feature name.
 * Returns null if no mapping found.
 */
export function resolveFeature(pathname: string): { appId: string; featureName: string; category: string } | null {
  for (const [appId, config] of Object.entries(APP_REGISTRY)) {
    for (const route of config.routes) {
      // Handle query-param based patterns (e.g., /pro-feature?id=crypto-trading)
      if (route.pattern.includes('?')) {
        const [patternPath, patternQuery] = route.pattern.split('?');
        const urlObj = (() => {
          try { return new URL(`http://x${pathname}`); }
          catch { return null; }
        })();
        
        if (urlObj && urlObj.pathname === patternPath) {
          const params = new URLSearchParams(patternQuery);
          const urlParams = urlObj.searchParams;
          let allMatch = true;
          for (const [key, value] of params.entries()) {
            if (urlParams.get(key) !== value) {
              allMatch = false;
              break;
            }
          }
          if (allMatch) {
            return { appId, featureName: route.featureName, category: route.category };
          }
        }
        continue;
      }
      
      const regex = new RegExp('^' + route.pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(pathname)) {
        return { appId, featureName: route.featureName, category: route.category };
      }
    }
  }
  return null;
}

/**
 * Reverse lookup to find a URL pattern for a given feature name.
 * E.g., 'core.payees.view' => '/payees'
 */
export function resolveUrlFromFeature(featureName: string, appId: string = 'nexabank'): string | null {
  const app = APP_REGISTRY[appId];
  if (!app) return null;

  for (const route of app.routes) {
    if (route.featureName === featureName) {
      // Remove trailing asterisk if it's a wildcard pattern for clean clicking
      return route.pattern.replace(/\*$/, '');
    }
  }
  return null;
}
