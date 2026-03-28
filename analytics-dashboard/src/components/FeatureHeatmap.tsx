'use client';

/**
 * Feature Activity Heatmap component.
 * Displays feature activity intensity using distinct discrete colored blocks
 * separated by gaps, matching the requested professional layout.
 */

import React, { memo } from 'react';
import ChartContainer from './ChartContainer';
import { FeatureActivityRow } from '@/types';

interface FeatureHeatmapProps {
  data: FeatureActivityRow[];
}

const levelColors: Record<string, { bg: string; text: string }> = {
  High: { bg: 'bg-orange-50', text: 'text-orange-600 border border-orange-100' },
  Med: { bg: 'bg-blue-50', text: 'text-blue-600 border border-blue-100' },
  Low: { bg: 'bg-emerald-50', text: 'text-emerald-600 border border-emerald-100' },
};

function FeatureHeatmap({ data }: FeatureHeatmapProps) {
  return (
    <ChartContainer title="Feature Activity Heatmap" id="feature-heatmap">
      <div className="space-y-6 mt-4">
        {data.map((row) => {
          const levelStyle = levelColors[row.level] || levelColors.Low;

          return (
            <div key={row.feature} className="group cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-800 font-medium group-hover:text-blue-600 transition-colors">{row.feature}</span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${levelStyle.bg} ${levelStyle.text}`}
                >
                  {row.level}
                </span>
              </div>

              {/* Discrete Blocks separated by whitespace */}
              <div className="flex gap-1 h-5 w-full">
                {row.segments.map((segment, index) => (
                  <div
                    key={index}
                    className="h-full rounded-sm transition-all duration-300 hover:brightness-110"
                    style={{
                      width: `${segment.width}%`,
                      backgroundColor: segment.color,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ChartContainer>
  );
}

export default memo(FeatureHeatmap);
