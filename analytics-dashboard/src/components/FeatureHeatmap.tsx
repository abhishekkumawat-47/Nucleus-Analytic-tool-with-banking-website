'use client';

/**
 * Grid-based Feature Activity Heatmap
 * Displays feature usage across time or tenants with intensity cells.
 * Uses a blue-to-red sequential color scale for easy visual comparison.
 */

import React, { memo, useState, useMemo, useEffect } from 'react';
import ChartContainer from './ChartContainer';
import { ChevronDown, Filter, X, Loader2 } from 'lucide-react';
import { dashboardAPI } from '@/lib/api';
import { useDashboardData } from '@/hooks/useDashboard';
import { useSession } from 'next-auth/react';

interface HeatmapSegment {
  group_key: string;
  count: number;
  percentile: number;
  level: string;
  color_scale: string;
}

interface HeatmapActivity {
  feature: string;
  total_usage: number;
  level: string;
  segments: HeatmapSegment[];
}

interface HeatmapData {
  is_compare: boolean;
  groups: string[];
  activities: HeatmapActivity[];
}

/**
 * Returns a background color based on percentile using a sequential blue scale.
 * 0 = light gray (no usage), 100 = deep navy (max usage).
 */
function getIntensityColor(pct: number, scale: string = 'blue'): string {
  if (pct <= 0) return '#f3f4f6';        // gray-100, no activity
  
  if (scale === 'orange') {
    // Overridden to use blue scale as per design guidelines
  }

  // Default blue
  if (pct <= 15) return '#dbeafe';        // blue-100
  if (pct <= 30) return '#bfdbfe';        // blue-200
  if (pct <= 45) return '#93c5fd';        // blue-300
  if (pct <= 60) return '#60a5fa';        // blue-400
  if (pct <= 75) return '#3b82f6';        // blue-500
  if (pct <= 90) return '#2563eb';        // blue-600
  return '#1e3a8a';                        // blue-900, peak
}

function getTextColor(pct: number): string {
  return pct > 60 ? '#ffffff' : '#1f2937';
}

function FeatureHeatmap() {
  const { selectedTenants, timeRange } = useDashboardData();
  const { data: session } = useSession();

  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchHeatmap = async () => {
      setLoading(true);
      let targetTenants = selectedTenants.length > 0 ? selectedTenants : ['nexabank'];
      if (compareMode && session?.user?.adminApps) {
        targetTenants = session.user.adminApps;
      }

      const rangeStr = timeRange === 'Last 30 Days' ? '30d' : timeRange === 'Last 90 Days' ? '90d' : '7d';
      
      const result = await dashboardAPI.getFeatureHeatmap(targetTenants, rangeStr);
      if (isMounted) {
        setData(result as HeatmapData);
        setLoading(false);
      }
    };

    fetchHeatmap();
    return () => { isMounted = false; };
  }, [selectedTenants, timeRange, compareMode, session]);

  const activities = data?.activities || [];
  const groups = data?.groups || [];
  const allFeatures = useMemo(() => activities.map((r) => r.feature), [activities]);

  const filteredData = useMemo(() => {
    if (selectedFeatures.length === 0) return activities;
    return activities.filter((r) => selectedFeatures.includes(r.feature));
  }, [activities, selectedFeatures]);

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
    <ChartContainer title="Feature Adoption Heatmap" id="feature-heatmap">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-3 mb-6">

        {/* Dropdown Filter */}
        <div className="flex items-center gap-2">
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

        {/* Compare Toggle */}
        <div className="bg-gray-100/80 p-1 rounded-lg flex items-center shadow-inner border border-gray-200/50">
          <button
            onClick={() => setCompareMode(false)}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${!compareMode ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'} cursor-pointer`}
          >
            Single Tenant
          </button>
          <button
            onClick={() => setCompareMode(true)}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${compareMode ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'} cursor-pointer`}
          >
            Compare Tenants
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-blue-500">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="relative overflow-x-auto pb-4">
          {/* Color Scale Legend */}
          <div className="flex items-center justify-end gap-2 mb-5 text-xs font-medium text-gray-500">
            <span>No activity</span>
            <div className="flex gap-0.5 h-4 items-center">
              <div className="w-8 h-4 bg-[#f3f4f6] rounded-l border border-gray-200" />
              <div className="w-8 h-4 bg-[#dbeafe]" />
              <div className="w-8 h-4 bg-[#93c5fd]" />
              <div className="w-8 h-4 bg-[#3b82f6]" />
              <div className="w-8 h-4 bg-[#1e3a8a] rounded-r" />
            </div>
            <span>Peak</span>
          </div>

          <table className="w-full text-left text-sm whitespace-nowrap border-spacing-1 border-separate" style={{ minWidth: groups.length * 72 + 200 }}>
            <thead>
              <tr>
                <th className="font-semibold text-gray-600 pb-3 w-48 sticky left-0 bg-white z-10 border-b border-gray-100 text-xs uppercase tracking-wider">
                  Feature
                </th>
                {groups.map((g) => (
                  <th key={g} className="font-medium text-gray-500 pb-3 text-center text-[11px] border-b border-gray-100">
                    {g.length > 10 ? g.substring(5) : g}
                  </th>
                ))}
                <th className="font-semibold text-gray-600 pb-3 text-right text-xs uppercase tracking-wider border-b border-gray-100 pr-2">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => (
                <tr key={row.feature} className="group">
                  <td className="font-medium text-gray-800 pr-4 py-1 sticky left-0 bg-white z-10 group-hover:text-[#1a73e8] transition-colors text-[13px]">
                    {row.feature.replace(/_/g, ' ')}
                  </td>

                  {row.segments.map((segment, index) => {
                    const pct = segment.percentile;
                    const bgColor = getIntensityColor(pct, segment.color_scale);
                    const textColor = getTextColor(pct);

                    return (
                      <td key={index} className="p-0.5">
                        <div
                          className="h-10 w-full rounded-md flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer relative group/cell"
                          style={{ backgroundColor: bgColor, color: textColor }}
                          title={`${row.feature} x ${segment.group_key}: ${segment.count.toLocaleString()} events (${pct}% intensity)`}
                        >
                          <span className="text-[11px] font-semibold opacity-0 group-hover/cell:opacity-100 transition-opacity">
                            {segment.count > 0 ? segment.count.toLocaleString() : '-'}
                          </span>
                        </div>
                      </td>
                    );
                  })}

                  <td className="py-1 pr-2 text-right">
                    <span className="text-xs font-mono font-semibold text-gray-700">
                      {row.total_usage?.toLocaleString() || 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredData.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-lg mt-2">
              No features match the current filter.
            </div>
          )}
        </div>
      )}
    </ChartContainer>
  );
}

export default memo(FeatureHeatmap);
