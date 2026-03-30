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
 * Forwards an event to the Pathway ingestion API (Kafka → ClickHouse)
 * so the analytics dashboard can visualize NexaBank data.
 * Fire-and-forget — analytics should never break the primary app.
 */
async function forwardToIngestionAPI(
  eventName: string,
  userId: string,
  tenantId: string,
  metadata: Record<string, any>
): Promise<void> {
  try {
    await axios.post(INGESTION_API_URL, {
      event_name: eventName,
      tenant_id: "nexabank",
      user_id: userId,
      timestamp: Date.now() / 1000,
      channel: "web",
      metadata: {
        ...metadata,
        source_tenant: tenantId,
        role: metadata.role || "user",
        device_type: metadata.device_type || "desktop",
      },
    }, { timeout: 3000 });
    console.log(`[EVENT_TRACKER] Forwarded to ingestion: ${eventName}`);
  } catch (err: any) {
    console.warn("[EVENT_TRACKER] Ingestion API forwarding failed:", err.message || err);
  }
}

/**
 * Tracks an analytics event to the DB and forwards to Pathway ingestion API.
 */
export async function trackEvent(
  eventName: string,
  customerId: string | null,
  tenantId: string,
  metadata: Record<string, any>
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
      },
    });

    // Also forward to the Pathway analytics pipeline (fire-and-forget)
    forwardToIngestionAPI(eventName, hashedUserId, tenantId, metadata).catch(() => {});
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
          metadata: logEntry,
        },
      }).catch(() => {});
    }

    return originalEnd(...args);
  };

  next();
}
