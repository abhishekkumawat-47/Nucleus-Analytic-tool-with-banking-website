'use client';

/**
 * User Acquisition horizontal bar chart.
 * Shows acquisition channels with colored bars and formatted values.
 * Matches the Google Analytics design.
 */

import React, { memo } from 'react';
import ChartContainer from './ChartContainer';
import { AcquisitionChannel } from '@/types';

interface UserAcquisitionChartProps {
  data: AcquisitionChannel[];
}

/** Color gradient for acquisition channels */
const channelColors = ['#0EA5A4', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#14B8A6'];

function UserAcquisitionChart({ data }: UserAcquisitionChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="User Acquisition" id="user-acquisition">
        <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
          No acquisition data available yet.
        </div>
      </ChartContainer>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <ChartContainer title="User Acquisition" id="user-acquisition">
      <div className="space-y-3.5 mt-3">
        {data.map((channel, index) => (
          <div key={channel.name} className="flex items-center gap-3 group cursor-pointer">
            {/* Channel name */}
            <span className="text-sm text-gray-600 w-28 flex-shrink-0 font-medium group-hover:text-slate-900 transition-colors">
              {channel.name}
            </span>

            {/* Bar + Value */}
            <div className="flex-1 flex items-center gap-2">
              <div
                className="h-7 rounded-md flex items-center justify-end px-2 transition-all duration-500 group-hover:opacity-90"
                style={{
                  width: `${(channel.value / maxValue) * 100}%`,
                  backgroundColor: channelColors[index] || '#3B82F6',
                  minWidth: '60px',
                }}
              >
                <span className="text-white text-xs font-semibold">
                  {channel.formattedValue}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ChartContainer>
  );
}

export default memo(UserAcquisitionChart);
