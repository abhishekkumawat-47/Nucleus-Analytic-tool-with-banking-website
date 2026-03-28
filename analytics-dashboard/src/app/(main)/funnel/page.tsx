'use client';

import React from 'react';
import { useDashboardData } from '@/hooks/useDashboard';
import { DashboardSkeleton } from '@/components/Skeletons';
import FunnelChart from '@/components/FunnelChart';

export default function FunnelPage() {
  const { isLoading, funnelData } = useDashboardData();

  if (isLoading && funnelData.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-6">Funnel Analysis</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunnelChart data={funnelData} />
      </div>
    </div>
  );
}
