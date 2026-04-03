import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import axios from "axios";
import { prisma } from "../prisma";

const INGESTION_API_URL = process.env.INGESTION_API_URL || "http://localhost:8000/events";

/**
 * Hashes a userId using SHA-256 for analytics privacy.
 */
export function hashUserId(userId: string): string {
  return crypto.createHash("sha256").update(userId).digest("hex");
}

/**
 * Maps Prisma tenant IDs to analytics-dashboard tenant IDs.
 * Prisma DB uses bank_a/bank_b; analytics dashboard uses nexabank/safexbank.
 */
const TENANT_ANALYTICS_MAP: Record<string, string> = {
  bank_a: "nexabank",
  bank_b: "safexbank",
};

function resolveAnalyticsTenantId(prismaId: string): string {
  return TENANT_ANALYTICS_MAP[prismaId] || prismaId;
}

/* ═══════════════════════════════════════════════════════════════════
 * REALISTIC GLOBAL USER SIMULATION
 * Users from different regions use different devices, at different
 * times, and interact with different features at different rates.
 * ═══════════════════════════════════════════════════════════════════ */

interface GeoProfile {
  country: string;
  continent: string;
  city: string;
  weight: number;       // relative probability of being selected
  deviceBias: { desktop: number; mobile: number; tablet: number };
  channelBias: string[];
  peakHours: number[];  // UTC hours when this region is most active
}

const GEO_PROFILES: GeoProfile[] = [
  // Asia (high mobile, peak UTC 3-9)
  { country: "India", continent: "Asia", city: "Mumbai", weight: 18, deviceBias: { desktop: 25, mobile: 65, tablet: 10 }, channelBias: ["direct", "mobile_app", "social"], peakHours: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
  { country: "India", continent: "Asia", city: "Bangalore", weight: 12, deviceBias: { desktop: 40, mobile: 50, tablet: 10 }, channelBias: ["direct", "referral"], peakHours: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { country: "Japan", continent: "Asia", city: "Tokyo", weight: 8, deviceBias: { desktop: 35, mobile: 55, tablet: 10 }, channelBias: ["direct", "organic"], peakHours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { country: "Singapore", continent: "Asia", city: "Singapore", weight: 5, deviceBias: { desktop: 45, mobile: 45, tablet: 10 }, channelBias: ["direct", "referral"], peakHours: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { country: "UAE", continent: "Asia", city: "Dubai", weight: 4, deviceBias: { desktop: 40, mobile: 50, tablet: 10 }, channelBias: ["direct", "social"], peakHours: [4, 5, 6, 7, 8, 9, 10, 11, 12] },
  // North America (balanced, peak UTC 13-22)
  { country: "USA", continent: "North America", city: "New York", weight: 15, deviceBias: { desktop: 55, mobile: 35, tablet: 10 }, channelBias: ["direct", "organic", "email"], peakHours: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22] },
  { country: "USA", continent: "North America", city: "San Francisco", weight: 8, deviceBias: { desktop: 60, mobile: 30, tablet: 10 }, channelBias: ["direct", "organic"], peakHours: [16, 17, 18, 19, 20, 21, 22, 23, 0, 1] },
  { country: "Canada", continent: "North America", city: "Toronto", weight: 5, deviceBias: { desktop: 50, mobile: 40, tablet: 10 }, channelBias: ["direct", "email"], peakHours: [13, 14, 15, 16, 17, 18, 19, 20, 21] },
  // Europe (desktop-heavy, peak UTC 7-16)
  { country: "United Kingdom", continent: "Europe", city: "London", weight: 10, deviceBias: { desktop: 55, mobile: 35, tablet: 10 }, channelBias: ["direct", "organic", "email"], peakHours: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16] },
  { country: "Germany", continent: "Europe", city: "Berlin", weight: 6, deviceBias: { desktop: 60, mobile: 30, tablet: 10 }, channelBias: ["direct", "organic"], peakHours: [7, 8, 9, 10, 11, 12, 13, 14, 15] },
  { country: "France", continent: "Europe", city: "Paris", weight: 4, deviceBias: { desktop: 50, mobile: 40, tablet: 10 }, channelBias: ["direct", "social"], peakHours: [7, 8, 9, 10, 11, 12, 13, 14, 15] },
  // South America (mobile-heavy, peak UTC 12-20)
  { country: "Brazil", continent: "South America", city: "São Paulo", weight: 6, deviceBias: { desktop: 30, mobile: 60, tablet: 10 }, channelBias: ["direct", "social", "mobile_app"], peakHours: [12, 13, 14, 15, 16, 17, 18, 19, 20] },
  // Africa (mobile dominant, peak UTC 6-14)
  { country: "Nigeria", continent: "Africa", city: "Lagos", weight: 3, deviceBias: { desktop: 20, mobile: 70, tablet: 10 }, channelBias: ["mobile_app", "social"], peakHours: [6, 7, 8, 9, 10, 11, 12, 13, 14] },
  { country: "South Africa", continent: "Africa", city: "Cape Town", weight: 2, deviceBias: { desktop: 40, mobile: 50, tablet: 10 }, channelBias: ["direct", "organic"], peakHours: [6, 7, 8, 9, 10, 11, 12, 13, 14] },
  // Oceania
  { country: "Australia", continent: "Oceania", city: "Sydney", weight: 4, deviceBias: { desktop: 50, mobile: 40, tablet: 10 }, channelBias: ["direct", "organic", "email"], peakHours: [21, 22, 23, 0, 1, 2, 3, 4, 5, 6] },
];

/**
 * Weighted random selection from geo profiles.
 */
function selectGeoProfile(): GeoProfile {
  const totalWeight = GEO_PROFILES.reduce((s, g) => s + g.weight, 0);
  let r = Math.random() * totalWeight;
  for (const profile of GEO_PROFILES) {
    r -= profile.weight;
    if (r <= 0) return profile;
  }
  return GEO_PROFILES[0];
}

/**
 * Select a device type based on the geo profile's device bias.
 */
function selectDevice(profile: GeoProfile): string {
  const r = Math.random() * 100;
  if (r < profile.deviceBias.desktop) return "desktop";
  if (r < profile.deviceBias.desktop + profile.deviceBias.mobile) return "mobile";
  return "tablet";
}

/**
 * Log-normal response time simulation.
 * Produces a natural distribution concentrated around ~55ms with a long tail to ~300ms.
 * Uses Box-Muller transform to generate normally distributed values,
 * then exponentiates to get log-normal distribution.
 */
function simulateResponseTime(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  // Box-Muller transform: generates N(0,1)
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  // Log-normal: exp(mu + sigma * z), mu=4.0 (median ~55ms), sigma=0.7
  const raw = Math.exp(4.0 + z * 0.7);
  return Math.max(15, Math.min(300, Math.round(raw)));
}

/**
 * Normalizes simulated channel values to the ingestion API enum.
 */
function normalizeChannel(channel: unknown): "web" | "mobile" | "api" | "batch" {
  const value = String(channel || "").trim().toLowerCase();

  if (value === "mobile" || value === "mobile_app" || value === "app") {
    return "mobile";
  }

  if (value === "api" || value === "batch") {
    return value;
  }

  return "web";
}

/**
 * Validates and auto-corrects event names to [domain].[feature].[status] taxonomy.
 * Logs a warning when correction happens so developers can fix instrumentation.
 */
function enforceTaxonomy(eventName: string): string {
  const taxonomyRegex = /^[a-z0-9_-]+(\.[a-z0-9_-]+){2,}$/;

  if (taxonomyRegex.test(eventName)) {
    return eventName;
  }

  // Explicit legacy → canonical mappings
  const LEGACY_MAP: Record<string, string> = {
    'login':                'free.auth.login.success',
    'login_success':        'free.auth.login.success',
    'login_failed':         'free.auth.login.failed',
    'register':             'free.auth.register.success',
    'register_success':     'free.auth.register.success',
    'dashboard_view':       'free.dashboard.view',
    'accounts_view':        'free.accounts.view',
    'account_view':         'free.accounts.view',
    'transactions_view':    'free.transactions.view',
    'transaction_view':     'free.transactions.view',
    'payees_view':          'free.payees.view',
    'payee_added':          'free.payees.add_success',
    'payee_edited':         'free.payees.edit_success',
    'payee_deleted':        'free.payees.delete_success',
    'payee_removed':        'free.payees.delete_success',
    'payees':               'free.payment.success',
    'payment_completed':    'free.payment.success',
    'payment_failed':       'free.payment.failed',
    'loan_applied':         'free.loan.applied',
    'loans_page_view':      'free.loans.view',
    'kyc_started':          'free.loan.kyc_started',
    'kyc_completed':        'free.loan.kyc_completed',
    'kyc_failed':           'free.loan.kyc_failed',
    'kyc_abandoned':        'free.loan.kyc_abandoned',
    'profile_view':         'free.profile.view',
    'profile_updated':      'free.profile.edit_success',
    'pro_unlocked':         'pro.features_unlock.success',
    'pro_license_unlocked': 'pro.features_unlock.success',
    'pro_feature_usage':    'pro.features.view',
    'feature_view':         'pro.features.view',
    'wealth_rebalance':     'pro.wealth_rebalance.success',
    'ai_insight_download':  'pro.finance_library_book.access',
    'crypto-trading':       'pro.crypto_portfolio.view',
    'wealth-management-pro': 'pro.wealth_insights.view',
    'bulk-payroll-processing': 'pro.payroll_payees.view',
    'ai-insights':          'pro.finance_library_stats.view',
    'page_view':            'free.dashboard.view',
    'location_captured':    'free.profile.location',
  };

  const mapped = LEGACY_MAP[eventName];
  if (mapped) {
    console.warn(`[TAXONOMY] Auto-corrected "${eventName}" → "${mapped}"`);
    return mapped;
  }

  // Generic fallback: wrap unknown events so they still have 3 segments
  const safe = `core.${eventName.replace(/[^a-z0-9_-]/g, '_')}.action`;
  console.warn(`[TAXONOMY] Unknown event "${eventName}" → "${safe}"`);
  return safe;
}

/**
 * Derive metadata.path from the mapped event name.
 * Covers all NexaBank and SafexBank pages.
 */
function derivePathFromEvent(eventName: string): string {
  // Auth
  if (eventName.startsWith('auth.login')) return '/login';
  if (eventName.startsWith('auth.register') || eventName.startsWith('auth.registration')) return '/register';
  // Core pages
  if (eventName.startsWith('core.dashboard')) return '/dashboard';
  if (eventName.startsWith('core.accounts')) return '/accounts';
  if (eventName.startsWith('core.payees') || eventName.includes('payee')) return '/payees';
  if (eventName.startsWith('core.profile')) return '/profile';
  if (eventName.startsWith('core.transfers')) return '/transfers';
  if (eventName.startsWith('core.approvals')) return '/approvals';
  if (eventName.startsWith('core.cards')) return '/cards';
  // Payments / transactions
  if (eventName.startsWith('payments.history') || eventName.startsWith('core.transactions') || eventName.includes('payment')) return '/transactions';
  // Lending
  if (eventName.startsWith('lending.') || eventName.startsWith('loans')) return '/loans';
  // Pro features
  if (eventName.startsWith('pro.')) return '/pro-features';
  // Legacy
  if (eventName === 'dashboard_view' || eventName === 'page_view') return '/dashboard';
  if (eventName === 'accounts_view') return '/accounts';
  if (eventName === 'transactions_view') return '/transactions';
  if (eventName === 'payees_view' || eventName === 'payees') return '/payees';
  if (eventName === 'loan_applied' || eventName === 'loans_page_view') return '/loans';
  if (eventName === 'profile_view') return '/profile';
  // Generic background or cross-page features map to dashboard
  if (eventName.includes('.location') || eventName.includes('.stats') || eventName.includes('.features_unlock')) return '/dashboard';
  
  // Derive from second segment, fallback to /dashboard if unexpected segment length
  const parts = eventName.split('.');
  if (parts.length >= 2) {
      // Map known sub-spaces back to their major pages to avoid fragment paths
      const sub = parts[1];
      if (sub === 'loan') return '/loans';
      if (sub === 'payment' || sub === 'history' || sub === 'transactions') return '/transactions';
      if (sub === 'profile' || sub === 'dashboard') return `/${sub}`;
      if (sub === 'payees') return '/payees';
      if (sub === 'crypto_portfolio' || sub === 'crypto_trade_execution') return '/pro-features';
      if (sub.includes('wealth')) return '/pro-features';
      if (sub.includes('payroll')) return '/pro-features';
      if (sub.includes('finance_library')) return '/pro-features';
      
      // otherwise, default to dashboard
      return '/dashboard';
  }
  return '/dashboard';
}

/**
 * Forwards an event to the Pathway ingestion API (Kafka → ClickHouse)
 * so the analytics dashboard can visualize NexaBank data.
 * Fire-and-forget — analytics should never break the primary app.
 */
async function forwardToIngestionAPI(
  eventName: string,
  userId: string,
  tenantId: string,
  metadata: Record<string, unknown>,
  timestampOverride?: number,
  tier?: string
): Promise<void> {
  // Enforce taxonomy
  const mappedEventName = enforceTaxonomy(eventName);

  // Simulate realistic global user context
  const geo = selectGeoProfile();
  const deviceType = (metadata.device_type as string) || selectDevice(geo);
  const simTime = simulateResponseTime();
  const channel = normalizeChannel((metadata.channel as string) || geo.channelBias[Math.floor(Math.random() * geo.channelBias.length)]);

  try {
    const analyticsTenantId = resolveAnalyticsTenantId(tenantId);
    await axios.post(INGESTION_API_URL, {
      event_name: mappedEventName,
      tenant_id: analyticsTenantId,
      user_id: userId,
      timestamp: timestampOverride || Date.now() / 1000,
      channel: channel,
      metadata: {
        ...metadata,
        source_tenant: tenantId,
        role: metadata.role || "user",
        device_type: deviceType,
        // Geographic context for continent-level analytics
        location: metadata.country || geo.country,
        continent: metadata.continent || geo.continent,
        city: metadata.city || geo.city,
        // Performance metrics
        response_time_ms: metadata.response_time_ms || simTime,
        // Page-level path for Top Pages aggregation
        path: metadata.path || derivePathFromEvent(mappedEventName),
        tier: tier || metadata.tier
      },
    }, { timeout: 3000 });
  } catch (_err: unknown) {
    // Silent fail — analytics should never break the primary app
  }
}

/**
 * Tracks an analytics event to the DB and forwards to Pathway ingestion API.
 * Also broadcasts via WebSocket for real-time dashboard updates.
 */
export async function trackEvent(
  eventName: string,
  customerId: string | null,
  tenantId: string,
  metadata: Record<string, unknown>,
  timestampOverride?: number,
  tier?: 'free' | 'pro' | 'enterprise'
): Promise<void> {
  try {
    const hashedUserId = customerId ? hashUserId(customerId) : "anonymous";
    await prisma.event.create({
      data: {
        eventName,
        tenantId,
        userId: hashedUserId,
        customerId: customerId || null,
        metadata: { ...metadata, tier } as any,
        timestamp: timestampOverride ? new Date(timestampOverride * 1000) : undefined,
      },
    });

    // Forward to the Pathway analytics pipeline (fire-and-forget)
    forwardToIngestionAPI(eventName, hashedUserId, tenantId, metadata, timestampOverride, tier).catch(() => { });

    // Broadcast via WebSocket for real-time updates (lazy import to avoid circular deps)
    try {
      const { broadcastEvent } = require("../server");
      if (broadcastEvent) {
        broadcastEvent("event", {
          eventName,
          tenantId,
          userId: hashedUserId,
          metadata: {
            country: metadata.country,
            city: metadata.city,
            continent: metadata.continent,
            device_type: metadata.device_type,
          },
        });
      }
    } catch {
      // broadcastEvent not available yet during startup — safe to ignore
    }
  } catch (err) {
    console.error("[EVENT_TRACKER] Failed to store event:", err);
  }
}

/**
 * API call tracking middleware — logs every request's method, path, status, and duration.
 */
export function apiTrackingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const originalEnd = res.end.bind(res);

  // @ts-ignore
  res.end = function (...args: any[]) {
    const duration = Date.now() - startTime;
    const logEntry = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers["user-agent"]?.substring(0, 100) ?? "unknown",
    };

    // Skip health check route logging
    if (req.path !== "/") {
      console.log(`[API] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
    }

    // Store significant events (errors + slow requests) to DB async
    if (res.statusCode >= 400 || duration > 2000) {
      prisma.event.create({
        data: {
          eventName: "api_call",
          tenantId: "system",
          userId: "system",
          metadata: { ...logEntry, response_time_ms: duration },
        },
      }).catch(() => { });
    }

    return originalEnd(...args);
  };

  next();
}
