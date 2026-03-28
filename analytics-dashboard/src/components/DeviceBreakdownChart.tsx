'use client';

/**
 * Device Breakdown donut chart.
 * Displays device distribution with a clean donut/pie chart.
 * Matches the Google Analytics design with labeled segments.
 */

import React, { memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import ChartContainer from './ChartContainer';
import { DeviceBreakdown } from '@/types';

interface DeviceBreakdownChartProps {
  data: DeviceBreakdown[];
}

/** Custom tooltip */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}) {
  if (!active || !payload?.[0]) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: payload[0].payload.color }}
        />
        <span className="text-gray-600">{payload[0].name}:</span>
        <span className="font-semibold text-gray-900">{payload[0].value}%</span>
      </div>
    </div>
  );
}

function DeviceBreakdownChart({ data }: DeviceBreakdownChartProps) {
  return (
    <ChartContainer title="Device Breakdown" id="device-breakdown">
      <div className="flex items-center justify-center md:mt-8 gap-4 cursor-pointer">
        {/* Donut chart */}
        <div className="w-36 h-36 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={60}
                dataKey="value"
                strokeWidth={2}
                stroke="#fff"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="space-y-2.5">
          {data.map((device) => (
            <div key={device.name} className="flex items-center gap-2 cursor-pointer group">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 transition-transform group-hover:scale-110"
                style={{ backgroundColor: device.color }}
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{device.name}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartContainer>
  );
}

export default memo(DeviceBreakdownChart);
