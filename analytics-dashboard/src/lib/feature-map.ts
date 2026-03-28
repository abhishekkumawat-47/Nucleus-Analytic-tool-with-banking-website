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
  funnelSteps: string[];  // Ordered funnel event names
  routes: FeatureMapping[];
}

/**
 * Registry of all connected applications.
 * Add new apps here — no code changes needed elsewhere.
 */
export const APP_REGISTRY: Record<string, AppConfig> = {
  twitter: {
    appId: 'twitter',
    displayName: 'TwitClone',
    description: 'Social media microblogging platform',
    tenantId: 'twitter',
    icon: 'twitter',
    color: '#1DA1F2',
    funnelSteps: ['login', 'view_feed', 'post_tweet', 'like_tweet'],
    routes: [
      { pattern: '/twitter',           featureName: 'login',           category: 'navigation',  funnel: 1 },
      { pattern: '/twitter/feed',      featureName: 'view_feed',       category: 'navigation',  funnel: 2 },
      { pattern: '/twitter/feed/*',    featureName: 'view_tweet',      category: 'navigation' },
      { pattern: '/twitter/compose',   featureName: 'compose_tweet',   category: 'interaction' },
      { pattern: '/twitter/admin',     featureName: 'view_admin_panel', category: 'navigation' },
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
      const regex = new RegExp('^' + route.pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(pathname)) {
        return { appId, featureName: route.featureName, category: route.category };
      }
    }
  }
  return null;
}
