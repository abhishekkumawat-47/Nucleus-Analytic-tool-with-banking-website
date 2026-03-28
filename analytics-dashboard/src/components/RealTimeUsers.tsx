'use client';

/**
 * Real-Time Users widget.
 * Shows currently active users count with pages-per-minute bar chart.
 * Matches the Google Analytics style real-time panel.
 */

import React, { memo, useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import ChartContainer from './ChartContainer';
import { PagesPerMinuteDataPoint } from '@/types';

interface RealTimeUsersProps {
  activeUsers: number;
  pagesPerMinute: PagesPerMinuteDataPoint[];
}

function RealTimeUsers({ activeUsers, pagesPerMinute }: RealTimeUsersProps) {
  /** Simulates a live-updating user count */
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    // Animate count from 0 to target
    const steps = 30;
    const increment = activeUsers / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= activeUsers) {
        setDisplayCount(activeUsers);
        clearInterval(interval);
      } else {
        setDisplayCount(Math.floor(current));
      }
    }, 30);

    return () => clearInterval(interval);
  }, [activeUsers]);

  return (
    <ChartContainer title="Real-Time Users" id="real-time-users">
      {/* Active users count */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 font-medium mb-1">Currently Active</p>
        <p className="text-5xl font-bold text-gray-900 tracking-tight">
          {displayCount}
        </p>
      </div>

      {/* Pages per minute bar chart */}
      <div>
        <p className="text-xs text-gray-500 font-semibold mb-3">Pages per Minute</p>
        <div className="h-32 min-h-[128px] w-full cursor-pointer">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pagesPerMinute}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="hour"
                axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                tickLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                tick={{ fill: '#6B7280', fontSize: 11 }}
              />
              <YAxis
                axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                tickLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                tick={{ fill: '#6B7280', fontSize: 11 }}
                domain={[0, 'auto']}
                width={25}
              />
              <Tooltip
                cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }}
                contentStyle={{
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
              />
              <Bar
                dataKey="value"
                fill="#1a73e8"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartContainer>
  );
}

export default memo(RealTimeUsers);
