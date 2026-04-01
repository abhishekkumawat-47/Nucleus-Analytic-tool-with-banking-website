'use client';

/**
 * Traffic Overview line/area chart.
 * Displays visitors and page views over time with smooth curves.
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
import { TimeSeriesDataPoint, TimeRange } from '@/types';

interface TrafficChartProps {
  data: TimeSeriesDataPoint[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

const timeRangeOptions: TimeRange[] = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'Custom'];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="text-gray-500 font-medium mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600 capitalize">{entry.dataKey}:</span>
          <span className="font-semibold text-gray-900">
            {(entry.value / 1000).toFixed(1)}K
          </span>
        </div>
      ))}
    </div>
  );
}

function formatYAxis(value: number): string {
  if (value >= 1000) return `${value / 1000}k`;
  return value.toString();
}

function TrafficChart({ data, timeRange, onTimeRangeChange }: TrafficChartProps) {
  const timeRangeActions = (
    <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-200 cursor-pointer">
      {timeRangeOptions.map((range) => (
        <button
          key={range}
          onClick={() => onTimeRangeChange(range)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${
            range === timeRange
              ? 'bg-[#1a73e8] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  );

  const totalVisitors = data.reduce((sum, item) => sum + (item.visitors || 0), 0);
  const totalPageViews = data.reduce((sum, item) => sum + (item.pageViews || 0), 0);
  const formatTotal = (val: number) => val >= 1000 ? (val / 1000).toFixed(1) + 'K' : val.toString();

  return (
    <ChartContainer
      title="Traffic Overview"
      actions={timeRangeActions}
      id="traffic-overview-chart"
    >
      <div className="h-72 min-h-[288px] w-full mt-2 cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#1a73e8" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="pageViewsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4285F4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#4285F4" stopOpacity={0.02} />
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

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="pageViews"
              stroke="#8AB4F8"
              strokeWidth={2}
              fill="url(#pageViewsGradient)"
              dot={false}
              activeDot={{ r: 4, stroke: '#8AB4F8', strokeWidth: 2, fill: '#fff', cursor: 'pointer' }}
            />

            <Area
              type="monotone"
              dataKey="visitors"
              stroke="#1a73e8"
              strokeWidth={2.5}
              fill="url(#visitorsGradient)"
              dot={{ r: 3, stroke: '#1a73e8', strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 5, stroke: '#1a73e8', strokeWidth: 2, fill: '#fff', cursor: 'pointer' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-6 mt-2 px-1">
        <div className="flex items-center gap-2 cursor-pointer group hover:opacity-80 transition-opacity">
          <span className="w-3 h-3 rounded-full bg-[#1a73e8]" />
          <span className="text-xs text-gray-500 font-medium group-hover:text-gray-900 transition-colors">{formatTotal(totalVisitors)}</span>
          <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">Visitors</span>
        </div>
        <div className="flex items-center gap-2 cursor-pointer group hover:opacity-80 transition-opacity">
          <span className="w-3 h-3 rounded-full bg-[#4285F4]" />
          <span className="text-xs text-gray-500 font-medium group-hover:text-gray-900 transition-colors">{formatTotal(totalPageViews)}</span>
          <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">Page Views</span>
        </div>
      </div>
    </ChartContainer>
  );
}

export default memo(TrafficChart);
