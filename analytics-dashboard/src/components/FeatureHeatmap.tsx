'use client';

/**
 * Feature Activity Heatmap component.
 * Displays feature activity intensity using discrete colored blocks.
 * Includes an interactive dropdown to filter by specific features.
 */

import React, { memo, useState, useMemo } from 'react';
import ChartContainer from './ChartContainer';
import { FeatureActivityRow } from '@/types';
import { ChevronDown, Filter, X } from 'lucide-react';

interface FeatureHeatmapProps {
  data: FeatureActivityRow[];
}

const levelColors: Record<string, { bg: string; text: string }> = {
  High: { bg: 'bg-orange-50', text: 'text-orange-600 border border-orange-100' },
  Med: { bg: 'bg-blue-50', text: 'text-blue-600 border border-blue-100' },
  Low: { bg: 'bg-emerald-50', text: 'text-emerald-600 border border-emerald-100' },
};

function FeatureHeatmap({ data }: FeatureHeatmapProps) {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const allFeatures = useMemo(() => data.map((r) => r.feature), [data]);

  const filteredData = useMemo(() => {
    if (selectedFeatures.length === 0) return data;
    return data.filter((r) => selectedFeatures.includes(r.feature));
  }, [data, selectedFeatures]);

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  };

  const clearFilters = () => {
    setSelectedFeatures([]);
    setDropdownOpen(false);
  };

  return (
    <ChartContainer title="Feature Activity Heatmap" id="feature-heatmap">
      {/* Dropdown Filter */}
      <div className="flex items-center gap-2 mt-3 mb-4">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5 text-gray-500" />
            {selectedFeatures.length > 0
              ? `${selectedFeatures.length} selected`
              : 'All Features'}
            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute z-20 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-56 overflow-y-auto">
              {allFeatures.map((feature) => (
                <label
                  key={feature}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedFeatures.includes(feature)}
                    onChange={() => toggleFeature(feature)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  {feature}
                </label>
              ))}
            </div>
          )}
        </div>

        {selectedFeatures.length > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Heatmap Rows */}
      <div className="space-y-6">
        {filteredData.map((row) => {
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

        {filteredData.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No features match the current filter.
          </div>
        )}
      </div>
    </ChartContainer>
  );
}

export default memo(FeatureHeatmap);
