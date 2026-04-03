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
  { country: "India", continent: "Asia", city: "Mumbai", weight: 18, deviceBias: { desktop: 25, mobile: 65, tablet: 10 }, channelBias: ["web", "mobile_app", "social"], peakHours: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
  { country: "India", continent: "Asia", city: "Bangalore", weight: 12, deviceBias: { desktop: 40, mobile: 50, tablet: 10 }, channelBias: ["web", "referral"], peakHours: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { country: "Japan", continent: "Asia", city: "Tokyo", weight: 8, deviceBias: { desktop: 35, mobile: 55, tablet: 10 }, channelBias: ["web", "organic"], peakHours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { country: "Singapore", continent: "Asia", city: "Singapore", weight: 5, deviceBias: { desktop: 45, mobile: 45, tablet: 10 }, channelBias: ["web", "referral"], peakHours: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { country: "UAE", continent: "Asia", city: "Dubai", weight: 4, deviceBias: { desktop: 40, mobile: 50, tablet: 10 }, channelBias: ["web", "social"], peakHours: [4, 5, 6, 7, 8, 9, 10, 11, 12] },
  // North America (balanced, peak UTC 13-22)
  { country: "USA", continent: "North America", city: "New York", weight: 15, deviceBias: { desktop: 55, mobile: 35, tablet: 10 }, channelBias: ["web", "organic", "email"], peakHours: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22] },
  { country: "USA", continent: "North America", city: "San Francisco", weight: 8, deviceBias: { desktop: 60, mobile: 30, tablet: 10 }, channelBias: ["web", "organic"], peakHours: [16, 17, 18, 19, 20, 21, 22, 23, 0, 1] },
  { country: "Canada", continent: "North America", city: "Toronto", weight: 5, deviceBias: { desktop: 50, mobile: 40, tablet: 10 }, channelBias: ["web", "email"], peakHours: [13, 14, 15, 16, 17, 18, 19, 20, 21] },
  // Europe (desktop-heavy, peak UTC 7-16)
  { country: "United Kingdom", continent: "Europe", city: "London", weight: 10, deviceBias: { desktop: 55, mobile: 35, tablet: 10 }, channelBias: ["web", "organic", "email"], peakHours: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16] },
  { country: "Germany", continent: "Europe", city: "Berlin", weight: 6, deviceBias: { desktop: 60, mobile: 30, tablet: 10 }, channelBias: ["web", "organic"], peakHours: [7, 8, 9, 10, 11, 12, 13, 14, 15] },
  { country: "France", continent: "Europe", city: "Paris", weight: 4, deviceBias: { desktop: 50, mobile: 40, tablet: 10 }, channelBias: ["web", "social"], peakHours: [7, 8, 9, 10, 11, 12, 13, 14, 15] },
  // South America (mobile-heavy, peak UTC 12-20)
  { country: "Brazil", continent: "South America", city: "São Paulo", weight: 6, deviceBias: { desktop: 30, mobile: 60, tablet: 10 }, channelBias: ["web", "social", "mobile_app"], peakHours: [12, 13, 14, 15, 16, 17, 18, 19, 20] },
  // Africa (mobile dominant, peak UTC 6-14)
  { country: "Nigeria", continent: "Africa", city: "Lagos", weight: 3, deviceBias: { desktop: 20, mobile: 70, tablet: 10 }, channelBias: ["mobile_app", "social"], peakHours: [6, 7, 8, 9, 10, 11, 12, 13, 14] },
  { country: "South Africa", continent: "Africa", city: "Cape Town", weight: 2, deviceBias: { desktop: 40, mobile: 50, tablet: 10 }, channelBias: ["web", "organic"], peakHours: [6, 7, 8, 9, 10, 11, 12, 13, 14] },
  // Oceania
  { country: "Australia", continent: "Oceania", city: "Sydney", weight: 4, deviceBias: { desktop: 50, mobile: 40, tablet: 10 }, channelBias: ["web", "organic", "email"], peakHours: [21, 22, 23, 0, 1, 2, 3, 4, 5, 6] },
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
 * Validates and auto-corrects event names to [domain].[feature].[status] taxonomy.
 * Logs a warning when correction happens so developers can fix instrumentation.
 */
function enforceTaxonomy(eventName: string): string {
  const taxonomyRegex = /^[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+$/;

  if (taxonomyRegex.test(eventName)) {
    return eventName;
  }

  let mapped = eventName;
  if (eventName.includes('login')) mapped = 'auth.login.success';
  else if (eventName.includes('register')) mapped = 'auth.registration.success';
  else if (eventName.includes('dashboard')) mapped = 'core.dashboard.viewed';
  else if (eventName.includes('account')) mapped = 'core.accounts.viewed';
  else if (eventName.includes('transaction')) mapped = 'payments.history.viewed';
  else if (eventName.includes('payee')) mapped = 'core.payees.viewed';
  else if (eventName.includes('loan')) mapped = 'lending.loan.applied';
  else if (eventName.includes('profile')) mapped = 'core.profile.viewed';
  else mapped = `core.${eventName.replace(/[\.\s]/g, '_')}.action`;

  console.warn(`[TAXONOMY] Auto-corrected "${eventName}" → "${mapped}"`);
  return mapped;
}

/**
 * Derive metadata.path from the mapped event name.
 * e.g. "core.dashboard.viewed" → "/dashboard"
 *      "pro.crypto-trading.trade_execute" → "/pro-feature"
 */
function derivePathFromEvent(eventName: string): string {
  const PATH_MAP: Record<string, string> = {
    'core.dashboard.viewed': '/dashboard',
    'core.dashboard.view': '/dashboard',
    'core.accounts.viewed': '/accounts',
    'core.accounts.view': '/accounts',
    'payments.history.viewed': '/transactions',
    'core.transactions.view': '/transactions',
    'core.payees.viewed': '/dashboard/payees',
    'core.payees.view': '/dashboard/payees',
    'lending.loan.applied': 'loans',
    'loans.dashboard.view': 'loans',
    'auth.login.success': '/login',
    'auth.login.view': '/login',
    'auth.registration.success': '/register',
    'auth.register.view': '/register',
    'core.profile.viewed': '/profile',
    'core.profile.view': '/profile',
  };

  if (PATH_MAP[eventName]) return PATH_MAP[eventName];
  if (eventName.startsWith('pro.')) return '/pro-feature';
  return `/${eventName.replace(/\./g, '/').replace(/_/g, '-')}`;
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
  metadata: Record<string, any>,
  timestampOverride?: number
): Promise<void> {
  // Enforce taxonomy
  const mappedEventName = enforceTaxonomy(eventName);

  // Simulate realistic global user context
  const geo = selectGeoProfile();
  const deviceType = metadata.device_type || selectDevice(geo);
  const simTime = simulateResponseTime();
  const channel = metadata.channel || geo.channelBias[Math.floor(Math.random() * geo.channelBias.length)];

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
      },
    }, { timeout: 3000 });
  } catch (err: any) {
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
  metadata: Record<string, any>,
  timestampOverride?: number
): Promise<void> {
  try {
    const hashedUserId = customerId ? hashUserId(customerId) : "anonymous";
    await prisma.event.create({
      data: {
        eventName,
        tenantId,
        userId: hashedUserId,
        customerId: customerId || null,
        metadata,
        timestamp: timestampOverride ? new Date(timestampOverride * 1000) : undefined,
      },
    });

    // Forward to the Pathway analytics pipeline (fire-and-forget)
    forwardToIngestionAPI(eventName, hashedUserId, tenantId, metadata, timestampOverride).catch(() => { });

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
