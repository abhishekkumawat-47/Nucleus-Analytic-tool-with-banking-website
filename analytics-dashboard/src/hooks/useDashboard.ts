'use client';

/**
 * Custom hooks for the analytics dashboard.
 * Provides reusable data-fetching and state management hooks.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { fetchDashboardData, fetchAIInsightsData, setTimeRange, setSelectedTenant, updateRealTimeUsers, updateKPIMetrics } from '@/lib/dashboardSlice';
import { TimeRange } from '@/types';
import { useSession } from 'next-auth/react';

/**
 * Hook to initialize and access all dashboard data.
 * Dispatches the fetch action on mount and provides typed state access.
 * Auto-sets the tenant to the user's first adminApp.
 */
export function useDashboardData() {
  const dispatch = useAppDispatch();
  const dashboardState = useAppSelector((state) => state.dashboard);
  const { data: session } = useSession();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // On first mount, set the tenant to the user's first assigned app
    if (session?.user?.adminApps && session.user.adminApps.length > 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      dispatch(setSelectedTenant(session.user.adminApps[0]));
    }
    
    dispatch(fetchDashboardData());
    dispatch(fetchAIInsightsData());
  }, [dispatch, session]);

  // Real-time WebSocket Connection
  useEffect(() => {
    const tenantId = dashboardState.selectedTenant;
    if (!tenantId) return;

    // Use environment variable window or NEXT_PUBLIC_ANALYTICS_API fallback
    const baseUrl = 'http://localhost:8001';
    const wsUrl = `${baseUrl.replace(/^http/, 'ws')}/ws/dashboard/${tenantId}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'METRICS_UPDATE') {
          if (data.payload.realtimeUsers !== undefined) {
            dispatch(updateRealTimeUsers(data.payload.realtimeUsers));
          }
          if (data.payload.kpiMetrics && data.payload.kpiMetrics.length) {
            dispatch(updateKPIMetrics(data.payload.kpiMetrics));
          }
        } else if (data.type === 'REALTIME_EVENT') {
          // Additional handling for 1:1 true streaming event payloads!
          // We can animate dashboard states or flash indicators here
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    return () => {
      ws.close();
    };
  }, [dispatch, dashboardState.selectedTenant]);

  const changeTimeRange = useCallback(
    (range: TimeRange) => {
      dispatch(setTimeRange(range));
      // Re-fetch data when time range changes
      dispatch(fetchDashboardData());
      dispatch(fetchAIInsightsData());
    },
    [dispatch]
  );

  const changeTenant = useCallback(
    (tenant: string) => {
      dispatch(setSelectedTenant(tenant));
      dispatch(fetchDashboardData());
      dispatch(fetchAIInsightsData());
    },
    [dispatch]
  );

  return {
    ...dashboardState,
    changeTimeRange,
    changeTenant,
  };
}

/**
 * Hook for generating AI insights based on dashboard data.
 * Uses rule-based logic to produce actionable insights.
 */
export function useAIInsights() {
  const { funnelData, featureActivity, topFeatures } = useAppSelector(
    (state) => state.dashboard
  );

  /** Rule-based insight generation */
  const generateInsights = useCallback(() => {
    const insights: string[] = [];

    // Check for high drop-off in funnel
    funnelData.forEach((step) => {
      if (step.dropOff >= 40) {
        insights.push(`${step.dropOff}% drop-off at ${step.label} step`);
      }
    });

    // Check for high-activity features
    featureActivity.forEach((row) => {
      if (row.level === 'High') {
        insights.push(`${row.feature} has high activity - consider scaling resources`);
      }
    });

    // Check for usage trends
    if (topFeatures.length > 0) {
      const topFeature = topFeatures[0];
      insights.push(`${topFeature.name} leads with ${topFeature.value.toLocaleString()} events`);
    }

    return insights;
  }, [funnelData, featureActivity, topFeatures]);

  return { generateInsights };
}
