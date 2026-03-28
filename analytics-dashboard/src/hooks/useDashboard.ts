'use client';

/**
 * Custom hooks for the analytics dashboard.
 * Provides reusable data-fetching and state management hooks.
 */

import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { fetchDashboardData, setTimeRange, setSelectedTenant } from '@/lib/dashboardSlice';
import { TimeRange } from '@/types';

/**
 * Hook to initialize and access all dashboard data.
 * Dispatches the fetch action on mount and provides typed state access.
 */
export function useDashboardData() {
  const dispatch = useAppDispatch();
  const dashboardState = useAppSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardData());
    
    // Auto-refresh every 10 seconds for real-time updates
    const interval = setInterval(() => {
      dispatch(fetchDashboardData());
    }, 10000);
    
    return () => clearInterval(interval);
  }, [dispatch]);

  const changeTimeRange = useCallback(
    (range: TimeRange) => {
      dispatch(setTimeRange(range));
      // Re-fetch data when time range changes
      dispatch(fetchDashboardData());
    },
    [dispatch]
  );

  const changeTenant = useCallback(
    (tenant: string) => {
      dispatch(setSelectedTenant(tenant));
      dispatch(fetchDashboardData());
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
