/**
 * Loading skeleton components for the dashboard.
 * Provides shimmer animations while data is being fetched.
 * Each skeleton matches the dimensions of its corresponding component.
 */

import React from 'react';

/** Base skeleton with shimmer animation */
function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-xl ${className}`}
    />
  );
}

/** KPI card loading skeleton */
export function KPICardSkeleton() {
  return (
    <div
      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex flex-col justify-between h-[104px]"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 rounded bg-gray-100 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-24 animate-pulse" />
      </div>
      <div className="flex justify-between items-end mt-2">
        <div className="h-8 bg-gray-100 rounded w-20 animate-pulse" />
        <div className="h-6 bg-gray-100 rounded w-16 animate-pulse" />
      </div>
    </div>
  );
}

/** Chart container loading skeleton */
export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <SkeletonPulse className="h-5 w-40 mb-4" />
      <SkeletonPulse className={`w-full ${height}`} />
    </div>
  );
}

/** Table loading skeleton */
export function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <SkeletonPulse className="h-5 w-40 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <SkeletonPulse className="h-4 w-28" />
            <SkeletonPulse className="h-4 flex-1" />
            <SkeletonPulse className="h-4 w-12" />
            <SkeletonPulse className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sidebar loading skeleton */
export function SidebarSkeleton() {
  return (
    <div className="w-56 bg-white border-r border-gray-100 p-4 space-y-6">
      <SkeletonPulse className="h-8 w-32 mb-8" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonPulse className="w-5 h-5 rounded" />
          <SkeletonPulse className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Full dashboard loading skeleton */
export function DashboardSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <ChartSkeleton height="h-72" />
        </div>
        <ChartSkeleton height="h-72" />
      </div>

      {/* Bottom Row - Map */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <ChartSkeleton height="h-96" />
      </div>

      {/* Bottom Row - Detailed Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartSkeleton height="h-52" />
        <ChartSkeleton height="h-52" />
        <ChartSkeleton height="h-52" />
      </div>
    </div>
  );
}
