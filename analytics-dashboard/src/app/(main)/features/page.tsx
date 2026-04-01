'use client';

import React from 'react';
import { useDashboardData } from '@/hooks/useDashboard';
import { DashboardSkeleton } from '@/components/Skeletons';
import FeatureUsageChart from '@/components/FeatureUsageChart';
import TopFeaturesChart from '@/components/TopFeaturesChart';
import FeatureHeatmap from '@/components/FeatureHeatmap';

export default function FeaturesPage() {
  const { isLoading, featureUsageData, topFeatures, featureActivity } = useDashboardData();

  if (isLoading && featureUsageData.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-6">Feature Analytics</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <FeatureUsageChart data={featureUsageData} />
        </div>
        <div className="lg:col-span-2">
          <TopFeaturesChart data={topFeatures} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <FeatureHeatmap />
      </div>
    </div>
  );
}
