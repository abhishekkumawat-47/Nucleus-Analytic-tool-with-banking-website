'use client';

import React from 'react';
import { useDashboardData } from '@/hooks/useDashboard';
import { DashboardSkeleton } from '@/components/Skeletons';
import ChartContainer from '@/components/ChartContainer';

export default function SettingsPage() {
  const { isLoading, featureConfigs } = useDashboardData();

  if (isLoading && featureConfigs.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">Feature Routing Configuration</h1>
        <button className="bg-[#1a73e8] cursor-pointer text-white px-4 py-2 rounded-md text-[13px] font-medium hover:bg-blue-700 transition">
          + Add Route Map
        </button>
      </div>

      <ChartContainer title="URL Pattern Mapping" id="route-mapping-config">
        <div className="overflow-x-auto cursor-pointer mt-2">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-[13px] text-gray-500 font-medium border-y border-gray-200 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 font-medium">Route Pattern</th>
                <th className="px-4 py-3 font-medium">Mapped Feature</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {featureConfigs.map((config, index) => (
                <tr 
                  key={config.id} 
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index === featureConfigs.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-800">{config.pattern}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{config.featureName}</td>
                  <td className="px-4 py-3 capitalize">{config.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.isActive ? 'bg-white text-gray-700 border border-gray-200' : 'bg-white text-gray-500 border border-gray-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${config.isActive ? 'bg-[#1a73e8]' : 'bg-gray-400'}`}></span>
                      {config.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-[#1a73e8] cursor-pointer hover:underline text-[13px] font-medium mr-3">Edit</button>
                    <button className="text-gray-400 cursor-pointer hover:text-red-600 text-[13px] font-medium">Remove</button>
                  </td>
                </tr>
              ))}
              {featureConfigs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No route mappings found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartContainer>
    </div>
  );
}
