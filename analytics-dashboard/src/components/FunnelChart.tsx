'use client';

/**
 * User Journey Funnel visualization.
 * Completely custom-built stacked pill bars connected by a vertical line
 * matching the provided expert developer design screenshot.
 */

import React, { memo } from 'react';
import ChartContainer from './ChartContainer';
import { FunnelStep } from '@/types';

interface FunnelChartProps {
  data: FunnelStep[];
}

function FunnelChart({ data }: FunnelChartProps) {
  const maxValue = data[0]?.value || 1;

  // Colors based on the screenshot (Blue -> Lighter Blue -> Lighter Blue -> Green)
  const pillColors = [
    '#1a73e8', // Login
    '#4285F4', // Apply Loan
    '#8AB4F8', // Submit Form
    '#34A853'  // Approved
  ];

  return (
    <ChartContainer title="User Journey Funnel" id="funnel-chart">
      <div className="relative mt-4 pl-4 space-y-5">
        {/* Connector Line backing */}
        <div className="absolute left-[36px] top-4 bottom-8 w-px bg-gray-200" />
        
        {data.map((step, index) => {
          const widthPercent = Math.max((step.value / maxValue) * 100, 30);
          const color = pillColors[index] || '#2563EB';

          return (
            <div key={step.label} className="relative flex items-center group cursor-pointer">
              
              {/* Stat Pill */}
              <div
                className="relative h-8 rounded flex items-center px-3 transition-colors duration-200 z-10 hover:opacity-90"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: color,
                  minWidth: '160px',
                }}
              >
                <span className="text-white text-[13px] font-medium tracking-wide whitespace-nowrap">
                  {step.label}
                </span>
                <span className="text-white/90 text-[13px] ml-auto whitespace-nowrap tabular-nums pl-4">
                  {step.value.toLocaleString()}
                </span>
              </div>

              {/* Drop-off Text on Right */}
              {index < data.length - 1 && (
                <div className="ml-4 flex items-center bg-red-200 py-1 px-1 rounded-xl gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <span className="text-red-600 text-md font-bold">↓</span>
                  <span className="text-gray-600 text-md font-medium">{step.dropOff}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ChartContainer>
  );
}

export default memo(FunnelChart);
