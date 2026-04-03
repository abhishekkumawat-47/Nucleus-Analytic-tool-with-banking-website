'use client';

/**
 * User Acquisition horizontal bar chart.
 * Shows acquisition channels with a clean blue-scale design.
 * Matches the blue/black/white dashboard design system.
 */

import React, { memo } from 'react';
import ChartContainer from './ChartContainer';
import { AcquisitionChannel } from '@/types';

interface UserAcquisitionChartProps {
  data: AcquisitionChannel[];
}

/** Blue-scale palette for channel bars */
const CHANNEL_COLORS = [
  '#1a73e8', // Primary blue
  '#2b7de9',
  '#4285F4',
  '#5a95f5',
  '#8AB4F8',
  '#C2D9FC',
];

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
        {data.map((channel, index) => {
          const barColor = CHANNEL_COLORS[index % CHANNEL_COLORS.length];
          const widthPct = Math.max((channel.value / maxValue) * 100, 8);

          return (
            <div key={channel.name} className="flex items-center gap-3 group cursor-pointer">
              {/* Channel name */}
              <span className="text-sm text-gray-600 w-28 flex-shrink-0 font-medium group-hover:text-gray-900 transition-colors truncate">
                {channel.name}
              </span>

              {/* Bar */}
              <div className="flex-1 flex items-center gap-2">
                <div
                  className="h-6 rounded flex items-center justify-end px-2 transition-all duration-500 group-hover:opacity-90"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: barColor,
                    minWidth: '48px',
                  }}
                >
                  <span className="text-white text-[11px] font-semibold whitespace-nowrap">
                    {channel.formattedValue}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ChartContainer>
  );
}

export default memo(UserAcquisitionChart);
