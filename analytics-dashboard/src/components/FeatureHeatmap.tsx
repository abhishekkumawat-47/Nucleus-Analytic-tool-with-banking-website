'use client';

/**
 * Grid-based Feature Activity Heatmap
 * Displaying feature usage across time or tenants with intensity cells.
 * Integrated directly with getFeatureHeatmap API.
 */

import React, { memo, useState, useMemo, useEffect } from 'react';
import ChartContainer from './ChartContainer';
import { ChevronDown, Filter, X, Loader2, Info } from 'lucide-react';
import { dashboardAPI } from '@/lib/api';
import { useDashboardData } from '@/hooks/useDashboard';
import { useSession } from 'next-auth/react';

interface HeatmapSegment {
  group_key: string;
  count: number;
  percentile: number;
  level: string;
  color: string;
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

function FeatureHeatmap() {
  const { selectedTenant } = useDashboardData();
  const { data: session } = useSession();
  
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Tooltip state
  const [hoverData, setHoverData] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchHeatmap = async () => {
      setLoading(true);
      // Determine tenant target string
      let targetTenants = selectedTenant || 'nexabank';
      if (compareMode && session?.user?.adminApps) {
        // Build comma separated string of all accessible tenants
        targetTenants = session.user.adminApps.join(',');
      }
      
      const result = await dashboardAPI.getFeatureHeatmap(targetTenants);
      if (isMounted) {
        setData(result);
        setLoading(false);
      }
    };
    
    fetchHeatmap();
    return () => { isMounted = false; };
  }, [selectedTenant, compareMode, session]);

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
        <div className="relative overflow-x-auto pb-4" onMouseLeave={() => setHoverData(null)}>
          {/* Legend */}
          <div className="flex items-center justify-end gap-3 mb-4 text-xs font-medium text-gray-500">
             <span>Low</span>
             <div className="flex gap-1 h-3">
               <div className="w-6 bg-[#bfdbfe] rounded-sm"></div>
               <div className="w-6 bg-[#3b82f6] rounded-sm"></div>
               <div className="w-6 bg-[#1e3a8a] rounded-sm"></div>
             </div>
             <span>High</span>
          </div>

          <table className="w-full text-left text-sm whitespace-nowrap border-spacing-y-2 border-separate" style={{ minWidth: groups.length * 60 + 200 }}>
            <thead>
              <tr>
                <th className="font-semibold text-gray-600 pb-2 w-48 sticky left-0 bg-white z-10 border-b border-gray-100">
                  Feature
                </th>
                {groups.map((g) => (
                  <th key={g} className="font-medium text-gray-500 pb-2 text-center text-xs border-b border-gray-100">
                    {g.length > 10 ? g.substring(5) : g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => (
                <tr key={row.feature} className="group">
                  <td className="font-medium text-gray-800 pr-4 py-1 sticky left-0 bg-white z-10 group-hover:text-blue-600 transition-colors">
                    {row.feature}
                  </td>
                  
                  {row.segments.map((segment, index) => {
                    const pct = segment.percentile;
                    // Determine humanized text
                    const usageIntensity = pct > 0 ? `${pct}% of max usage` : 'No usage';
                    
                    return (
                      <td key={index} className="p-0.5">
                        <div 
                          className="h-10 w-full rounded-[4px] border border-black/5 transition-all duration-200 hover:scale-[1.05] hover:shadow-md cursor-pointer hover:border-black/20"
                          style={{ backgroundColor: segment.color }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoverData({
                              x: rect.left + rect.width / 2,
                              y: rect.top - 10,
                              content: (
                                <div className="flex flex-col gap-1">
                                  <div className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-1">
                                    {row.feature} &times; {segment.group_key}
                                  </div>
                                  <div className="flex justify-between gap-4 text-sm">
                                    <span className="text-gray-500">Activity Count:</span>
                                    <span className="font-semibold text-blue-600">{segment.count.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-sm text-gray-500">
                                    <span>Intensity:</span>
                                    <span>{usageIntensity}</span>
                                  </div>
                                </div>
                              )
                            });
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredData.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-lg mt-2">
              No features match the current filter.
            </div>
          )}

          {/* Absolute Tooltip Render */}
          {hoverData && (
            <div 
              className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-white px-4 py-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200/50 min-w-[200px]"
              style={{ left: hoverData.x, top: hoverData.y }}
            >
              <div className="absolute w-3 h-3 bg-white border-r border-b border-gray-200/50 transform rotate-45 -bottom-1.5 left-1/2 -ml-1.5 shadow-[2px_2px_4px_rgba(0,0,0,0.02)]"></div>
              {hoverData.content}
            </div>
          )}
        </div>
      )}
    </ChartContainer>
  );
}

export default memo(FeatureHeatmap);
