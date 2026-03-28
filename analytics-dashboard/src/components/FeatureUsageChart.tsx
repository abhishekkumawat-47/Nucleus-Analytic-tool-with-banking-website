'use client';

/**
 * Feature Usage Over Time line chart.
 * Displays feature usage trends with a filled area and smooth curve.
 * Updated to show clearer X/Y axes per user request.
 */

import React, { memo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ChartContainer from './ChartContainer';
import { FeatureUsageDataPoint } from '@/types';

interface FeatureUsageChartProps {
  data: FeatureUsageDataPoint[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.[0]) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-gray-900 font-semibold">
        {payload[0].value.toLocaleString()} events
      </p>
    </div>
  );
}

function formatYAxis(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

function FeatureUsageChart({ data }: FeatureUsageChartProps) {
  return (
    <ChartContainer title="Feature Usage Over Time" id="feature-usage-chart">
      <div className="h-64 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="featureUsageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#1a73e8" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={true} horizontal={true}/>

            <XAxis
              dataKey="date"
              axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
              tickLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
              tick={{ fill: '#6B7280', fontSize: 12 }}
              dy={8}
            />

            <YAxis
              axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
              tickLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickFormatter={formatYAxis}
              dx={-8}
              width={55}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }} />

            <Area
              type="monotone"
              dataKey="usage"
              stroke="#1a73e8"
              strokeWidth={2.5}
              fill="url(#featureUsageGradient)"
              dot={{ r: 3, stroke: '#1a73e8', strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 5, stroke: '#1a73e8', strokeWidth: 2, fill: '#fff', cursor: 'pointer' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}

export default memo(FeatureUsageChart);
