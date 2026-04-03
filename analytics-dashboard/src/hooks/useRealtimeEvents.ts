"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppSelector } from "@/lib/store";

export interface RealtimeEvent {
  type: string;
  data: {
    eventName: string;
    tenantId: string;
    userId: string;
    metadata?: {
      country?: string;
      city?: string;
      continent?: string;
      device_type?: string;
    };
  };
  timestamp: number;
}

interface UseRealtimeEventsOptions {
  maxEvents?: number;
  reconnectDelay?: number;
}

export function useRealtimeEvents(options: UseRealtimeEventsOptions = {}) {
  const { maxEvents = 50, reconnectDelay = 3000 } = options;
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const selectedTenants = useAppSelector((state) => state.dashboard.selectedTenants);
  const selectedTenant = selectedTenants.length > 0 ? selectedTenants[0] : 'nexabank';

  const connect = useCallback(() => {
    if (!selectedTenant) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_ANALYTICS_WS_URL || "ws://localhost:8001";
      const wsUrl = `${baseUrl.replace(/^http/, "ws")}/ws/dashboard/${selectedTenant}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          
          if (parsed.type === "REALTIME_EVENT" && parsed.payload) {
             const rtEvent: RealtimeEvent = {
                 type: parsed.type,
                 data: {
                     eventName: parsed.payload.event_name,
                     tenantId: parsed.payload.tenant_id,
                     userId: parsed.payload.user_id,
                     metadata: parsed.payload.metadata
                 },
                 timestamp: Date.now()
             }
             setLastEvent(rtEvent);
             setEvents((prev) => {
               const updated = [rtEvent, ...prev];
               return updated.slice(0, maxEvents);
             });
          }
        } catch {
          // Ignore unparseable messages
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (reconnectDelay > 0) {
          reconnectTimerRef.current = setTimeout(connect, reconnectDelay);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // SSR
    }
  }, [maxEvents, reconnectDelay, selectedTenant]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  return {
    events,
    lastEvent,
    isConnected,
    clearEvents,
    eventCount: events.length,
  };
}
