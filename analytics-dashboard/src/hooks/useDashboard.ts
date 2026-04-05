'use client';

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { setTimeRange, setSelectedTenants, updateRealTimeUsers, updateKPIMetrics } from '@/lib/dashboardSlice';
import { TimeRange } from '@/types';
import { useSession } from 'next-auth/react';
import { dashboardAPI } from '@/lib/api';
import { resolveAnalyticsWsBaseUrl } from '@/lib/ws-url';

/**
 * Converts the human-readable TimeRange into the API range param.
 */
function timeRangeToParam(tr: TimeRange): string {
  switch (tr) {
    case 'Last 30 Days': return '30d';
    case 'Last 90 Days': return '90d';
    default: return '7d';
  }
}

/**
 * Central dashboard hook. Single source of truth for tenants + timeRange.
 * All pages MUST use this hook — never derive tenant arrays locally.
 */
export function useDashboardData() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const dashboardState = useAppSelector((state) => state.dashboard);
  const { data: session } = useSession();
  const lastInvalidateAtRef = useRef(0);
  const tenantAliasMap: Record<string, string> = {
    bank_a: 'nexabank',
    bank_b: 'safexbank',
  };

  // Auto-pin app_admins to their assigned tenants
  useEffect(() => {
    if (session?.user?.role === 'app_admin') {
      const adminApps = (session.user.adminApps || [])
        .filter(Boolean)
        .map((app) => tenantAliasMap[String(app).toLowerCase()] || String(app).toLowerCase());
      if (adminApps.length > 0 && dashboardState.selectedTenants.length === 0) {
        dispatch(setSelectedTenants([adminApps[0]]));
      }
    }
  }, [dispatch, session, dashboardState.selectedTenants]);

  // ─── Derived API params (stable references) ───
  const tenantsParam: string[] = useMemo(() => {
    return dashboardState.selectedTenants.length > 0
      ? dashboardState.selectedTenants
      : ['nexabank'];
  }, [dashboardState.selectedTenants]);

  const rangeParam: string = useMemo(() => {
    return timeRangeToParam(dashboardState.timeRange);
  }, [dashboardState.timeRange]);

  // ─── Core dashboard data (React Query) ───
  const { data: dashboardData, isLoading, isFetching } = useQuery({
    queryKey: ['dashboardData', tenantsParam, rangeParam],
    queryFn: async () => {
      const [
        kpiMetrics,
        secondaryKpiMetrics,
        trafficData,
        featureUsageData,
        topFeatures,
        funnelData,
        featureActivity,
        tenants,
        realTimeUsersData,
        pagesPerMinute,
        topPages,
        deviceBreakdown,
        acquisitionChannels,
        locations,
        auditLogs,
        featureConfigs,
        retentionData,
      ] = await Promise.all([
        dashboardAPI.getKPIMetrics(tenantsParam, rangeParam),
        dashboardAPI.getSecondaryKPIMetrics(tenantsParam, rangeParam),
        dashboardAPI.getTrafficData(tenantsParam, rangeParam),
        dashboardAPI.getFeatureUsageData(tenantsParam, rangeParam),
        dashboardAPI.getTopFeatures(tenantsParam, rangeParam),
        dashboardAPI.getFunnelData(tenantsParam, rangeParam),
        dashboardAPI.getFeatureActivity(tenantsParam, rangeParam),
        dashboardAPI.getTenants(tenantsParam, rangeParam),
        dashboardAPI.getRealTimeUsers(tenantsParam),
        dashboardAPI.getPagesPerMinute(tenantsParam),
        dashboardAPI.getTopPages(tenantsParam, rangeParam),
        dashboardAPI.getDeviceBreakdown(tenantsParam, rangeParam),
        dashboardAPI.getAcquisitionChannels(tenantsParam, rangeParam),
        dashboardAPI.getLocations(tenantsParam, rangeParam),
        dashboardAPI.getAuditLogs(tenantsParam, rangeParam),
        dashboardAPI.getFeatureConfigs(tenantsParam, rangeParam),
        dashboardAPI.getRetentionData(tenantsParam, rangeParam),
      ]);

      return {
        kpiMetrics,
        secondaryKpiMetrics,
        trafficData,
        featureUsageData,
        topFeatures,
        funnelData,
        featureActivity,
        tenants,
        realTimeUsers: realTimeUsersData.count,
        realTimeUsersTimestampIST: realTimeUsersData.timestampIST ?? null,
        pagesPerMinute,
        topPages,
        deviceBreakdown,
        acquisitionChannels,
        locations,
        auditLogs,
        featureConfigs,
        retentionData,
      };
    },
    // Keep data responsive while avoiding noisy re-fetching.
    staleTime: 15 * 1000,
    refetchInterval: 15 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const { data: aiInsightsData } = useQuery({
    queryKey: ['aiInsights', tenantsParam, rangeParam],
    queryFn: () => dashboardAPI.getAIInsights(tenantsParam, rangeParam),
    staleTime: 10 * 60 * 1000,
  });

  // ─── WebSocket for real-time metrics ───
  useEffect(() => {
    const selectedTenantRaw =
      dashboardState.selectedTenants.length > 0
        ? dashboardState.selectedTenants[0]
        : 'nexabank';
    const tenantId = tenantAliasMap[String(selectedTenantRaw).toLowerCase()] || String(selectedTenantRaw).toLowerCase();

    const baseUrl = resolveAnalyticsWsBaseUrl(process.env.NEXT_PUBLIC_ANALYTICS_WS_URL);
    const wsUrl = `${baseUrl}/ws/dashboard/${tenantId}`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'METRICS_UPDATE') {
          if (data.payload.realtimeUsers !== undefined) {
            dispatch(updateRealTimeUsers(data.payload.realtimeUsers));
          }
          if (data.payload.kpiMetrics?.length) {
            dispatch(updateKPIMetrics(data.payload.kpiMetrics));
          }

          // Throttle invalidation to prevent websocket bursts from causing request storms.
          const now = Date.now();
          if (now - lastInvalidateAtRef.current > 5000) {
            lastInvalidateAtRef.current = now;
            queryClient.invalidateQueries({
              queryKey: ['dashboardData', tenantsParam, rangeParam],
              refetchType: 'active',
            });
          }
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    return () => { ws.close(); };
  }, [dispatch, dashboardState.selectedTenants, queryClient, tenantsParam, rangeParam]);

  // ─── Actions ───
  const changeTimeRange = useCallback(
    (range: TimeRange) => { dispatch(setTimeRange(range)); },
    [dispatch]
  );

  const changeTenants = useCallback(
    (tenants: string[] | string) => { dispatch(setSelectedTenants(tenants)); },
    [dispatch]
  );

  return {
    // Redux state (single source of truth)
    selectedTenants: dashboardState.selectedTenants,
    timeRange: dashboardState.timeRange,
    deploymentMode: dashboardState.deploymentMode,
    sidebarCollapsed: dashboardState.sidebarCollapsed,
    // Computed API params — pages MUST use these, never derive their own
    tenantsParam,
    rangeParam,
    // React Query data
    kpiMetrics: dashboardData?.kpiMetrics || [],
    secondaryKpiMetrics: dashboardData?.secondaryKpiMetrics || [],
    trafficData: dashboardData?.trafficData || [],
    featureUsageData: dashboardData?.featureUsageData || [],
    topFeatures: dashboardData?.topFeatures || [],
    funnelData: dashboardData?.funnelData || [],
    featureActivity: dashboardData?.featureActivity || [],
    tenants: dashboardData?.tenants || [],
    realTimeUsers: dashboardData?.realTimeUsers || 0,
    realTimeUsersTimestampIST: dashboardData?.realTimeUsersTimestampIST || null,
    pagesPerMinute: dashboardData?.pagesPerMinute || [],
    topPages: dashboardData?.topPages || [],
    deviceBreakdown: dashboardData?.deviceBreakdown || [],
    acquisitionChannels: dashboardData?.acquisitionChannels || [],
    locations: dashboardData?.locations || [],
    auditLogs: dashboardData?.auditLogs || [],
    featureConfigs: dashboardData?.featureConfigs || [],
    retentionData: dashboardData?.retentionData || [],
    aiInsights: aiInsightsData || [],
    isLoading,
    isFetching,
    // Actions
    changeTimeRange,
    changeTenant: changeTenants,
  };
}

export function useAIInsights() {
  const { funnelData = [], featureActivity = [], topFeatures = [] } = useDashboardData();

  const generateInsights = useCallback(() => {
    const insights: string[] = [];

    funnelData.forEach((step) => {
      if (step.dropOff >= 40) {
        insights.push(`${step.dropOff}% drop-off at ${step.label} step`);
      }
    });

    featureActivity.forEach((row) => {
      if (row.level === 'High') {
        insights.push(`${row.feature} has high activity - consider scaling resources`);
      }
    });

    if (topFeatures.length > 0) {
      const topFeature = topFeatures[0];
      insights.push(`${topFeature.name} leads with ${topFeature.value.toLocaleString()} events`);
    }

    return insights;
  }, [funnelData, featureActivity, topFeatures]);

  return { generateInsights };
}
