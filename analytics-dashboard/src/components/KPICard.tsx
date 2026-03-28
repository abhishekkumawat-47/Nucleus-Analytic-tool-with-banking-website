'use client';

/**
 * KPI Card component.
 * Displays a single key performance indicator with value, trend, and icon.
 * Features subtle hover animation and color-coded trend indicators.
 */

import React, { memo } from 'react';
import {
  Activity,
  Layers,
  Clock,
  AlertTriangle,
  Globe,
  Users,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { KPIMetric } from '@/types';

/** Maps icon string names to Lucide components */
const iconMap: Record<string, React.ElementType> = {
  activity: Activity,
  layers: Layers,
  clock: Clock,
  'alert-triangle': AlertTriangle,
  globe: Globe,
  users: Users,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
};

interface KPICardProps {
  metric: KPIMetric;
}

function KPICard({ metric }: KPICardProps) {
  const IconComponent = iconMap[metric.icon] || Activity;
  const isPositive = metric.changeDirection === 'up';

  // Special case: for error rate and bounce rate, "up" is bad
  const isErrorMetric = metric.id === 'error-rate' || metric.id === 'bounce-rate';
  const trendIsGood = isErrorMetric ? !isPositive : isPositive;

  // For avg response time, "down" is good
  const isResponseMetric = metric.id === 'avg-response' || metric.id === 'avg-session';
  const displayTrendGood = isResponseMetric ? !isPositive : trendIsGood;

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:border-gray-300 hover:shadow transition-all duration-200 flex flex-col justify-between h-full group"
      id={`kpi-card-${metric.id}`}
    >
      {/* Header: Label */}
      <div className="flex items-center gap-2 mb-3">
        <IconComponent className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600 font-medium">{metric.label}</span>
      </div>

      {/* Value + Trend */}
      <div className="flex justify-between items-end mt-1">
        <span className="text-3xl font-medium text-gray-900 tracking-tight">
          {metric.value}
        </span>
        <div
          className={`flex items-center gap-1 text-[13px] font-medium ${
            displayTrendGood ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
          <span>
            {isPositive ? '+' : '-'}
            {metric.change}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(KPICard);
