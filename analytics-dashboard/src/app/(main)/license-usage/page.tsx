"use client";

import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '@/lib/api';
import { useDashboardData } from '@/hooks/useDashboard';
import { Key, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import ChartContainer from '@/components/ChartContainer';

export default function LicenseUsagePage() {
  const { selectedTenant } = useDashboardData();
  const tenantId = selectedTenant || 'nexabank';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const result = await dashboardAPI.getLicenseUsage(tenantId);
      setData(result);
      setLoading(false);
    };
    fetch();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">License vs. Usage</h1>
        <div className="flex items-center justify-center p-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">License vs. Usage</h1>
          <p className="text-sm text-gray-500 mt-1">Compare what features are paid for vs. what is actually used.</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Key className="h-5 w-5 text-blue-600" /></div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Licensed</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary.total_licensed || 0}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Used</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary.total_used || 0}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle className="h-5 w-5 text-emerald-600" /></div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Active Licensed</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary.total_used_licensed || 0}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Waste %</p>
          </div>
          <p className="text-3xl font-bold text-red-600">{summary.waste_pct || 0}%</p>
        </div>
      </div>

      {/* Licensed Features Table */}
      <ChartContainer title="Licensed Features Comparison" id="license-table">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-[13px] text-gray-500 font-medium border-y border-gray-200 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 font-medium">Feature</th>
                <th className="px-4 py-3 font-medium">Plan Tier</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Usage Count</th>
                <th className="px-4 py-3 font-medium text-right">Unique Users</th>
              </tr>
            </thead>
            <tbody>
              {(data?.licensed || []).map((f: any, i: number) => (
                <tr key={i} className={`border-b border-gray-100 transition-colors ${!f.is_used ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{f.feature_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${f.plan_tier === 'enterprise' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {f.plan_tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {f.is_used ? (
                      <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle className="h-4 w-4" /> Active</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 font-medium"><XCircle className="h-4 w-4" /> Unused</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{f.usage_count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{f.unique_users.toLocaleString()}</td>
                </tr>
              ))}
              {(data?.licensed || []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No license data found. Use the API to sync license records.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartContainer>

      {/* Used but Unlicensed */}
      {(data?.unlicensed_used || []).length > 0 && (
        <ChartContainer title="⚠️ Used but Unlicensed Features" id="unlicensed-used">
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-[13px] text-gray-500 font-medium border-y border-gray-200 bg-amber-50/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Feature</th>
                  <th className="px-4 py-3 font-medium text-right">Usage Count</th>
                </tr>
              </thead>
              <tbody>
                {(data?.unlicensed_used || []).map((f: any, i: number) => (
                  <tr key={i} className="border-b border-gray-100 bg-amber-50/30 hover:bg-amber-50">
                    <td className="px-4 py-3 font-medium text-amber-800">{f.feature_name}</td>
                    <td className="px-4 py-3 text-right font-mono text-amber-700">{f.usage_count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartContainer>
      )}
    </div>
  );
}
