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
const channelColors = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'];

function UserAcquisitionChart({ data }: UserAcquisitionChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <ChartContainer title="User Acquisition" id="user-acquisition">
      <div className="space-y-3.5 mt-3">
        {data.map((channel, index) => (
          <div key={channel.name} className="flex items-center gap-3 group cursor-pointer">
            {/* Channel name */}
            <span className="text-sm text-gray-600 w-24 flex-shrink-0 font-medium group-hover:text-blue-600 transition-colors">
              {channel.name}
            </span>

            {/* Bar + Value */}
            <div className="flex-1 flex items-center gap-2">
              <div
                className="h-7 rounded-md flex items-center justify-end px-2 transition-all duration-500 group-hover:opacity-90"
                style={{
                  width: `${(channel.value / maxValue) * 100}%`,
                  backgroundColor: channelColors[index] || '#2563EB',
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
