'use client';

/**
 * Main Dashboard page component.
 * Assembles all dashboard widgets in a responsive grid layout.
 * Uses Redux for state management and displays loading skeletons.
 */

import React from 'react';
import { useDashboardData } from '@/hooks/useDashboard';
import { DashboardSkeleton } from '@/components/Skeletons';
import KPICard from '@/components/KPICard';
import TrafficChart from '@/components/TrafficChart';
import AIInsightsPanel from '@/components/AIInsightsPanel';
import RealTimeUsers from '@/components/RealTimeUsers';
import TopPages from '@/components/TopPages';
import DeviceBreakdownChart from '@/components/DeviceBreakdownChart';
import UserAcquisitionChart from '@/components/UserAcquisitionChart';
import TopLocations from '@/components/TopLocations';

export default function DashboardContent() {
  const {
    isLoading,
    kpiMetrics,
    secondaryKpiMetrics,
    trafficData,
    aiInsights,
    realTimeUsers,
    pagesPerMinute,
    topPages,
    deviceBreakdown,
    acquisitionChannels,
    locations,
    timeRange,
    changeTimeRange,
  } = useDashboardData();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* ═══════════ KPI METRICS ROW ═══════════ */}
      <section id="kpi-section" aria-label="Key Performance Indicators">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiMetrics.map((metric: any) => (
            <KPICard key={metric.id} metric={metric} />
          ))}
        </div>
      </section>

      {/* ═══════════ TRAFFIC OVERVIEW + REAL-TIME ROW ═══════════ */}
      <section id="traffic-section" aria-label="Traffic Analytics">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <TrafficChart
              data={trafficData}
              timeRange={timeRange}
              onTimeRangeChange={changeTimeRange}
            />
          </div>
          <div>
            <RealTimeUsers
              activeUsers={realTimeUsers}
              pagesPerMinute={pagesPerMinute}
            />
          </div>
        </div>
      </section>

      {/* ═══════════ AI INSIGHTS ROW ═══════════ */}
      <section id="insights-section" aria-label="AI Insights">
        <div className="grid grid-cols-1 gap-4">
          <AIInsightsPanel insights={aiInsights} />
        </div>
      </section>

      {/* ═══════════ LOCATIONS (MAP) FULL WIDTH ═══════════ */}
      <section id="locations-section" aria-label="Geographic Distribution">
        <div className="grid grid-cols-1 gap-4">
          <TopLocations data={locations} />
        </div>
      </section>

      {/* ═══════════ BOTTOM ROW: PAGES + DEVICE + ACQUISITION ═══════════ */}
      <section id="detail-section" aria-label="Detailed Analytics">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TopPages data={topPages} />
          <DeviceBreakdownChart data={deviceBreakdown} />
          <UserAcquisitionChart data={acquisitionChannels} />
        </div>
      </section>



      {/* ═══════════ SECONDARY KPI METRICS ROW ═══════════ */}
      <section id="secondary-kpi-section" aria-label="Secondary Metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {secondaryKpiMetrics.map((metric) => (
            <KPICard key={metric.id} metric={metric} />
          ))}
        </div>
      </section>
    </div>
  );
}
