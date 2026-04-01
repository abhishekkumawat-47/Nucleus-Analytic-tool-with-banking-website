"use client";

import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '@/lib/api';
import { useDashboardData } from '@/hooks/useDashboard';
import { TableSkeleton } from '@/components/Skeletons';
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
        <TableSkeleton rows={6} />
      </div>
    );
  }

  const summary = data?.summary || {};
  const hasWastedLicenses = (summary.waste_pct || 0) > 20;

  const handleSeedLicenses = async () => {
    try {
      setLoading(true);
      const features = [
        { feature_name: "login", is_licensed: true, plan_tier: "basic" },
        { feature_name: "transfer_funds", is_licensed: true, plan_tier: "basic" },
        { feature_name: "view_dashboard", is_licensed: true, plan_tier: "basic" },
        { feature_name: "apply_loan", is_licensed: true, plan_tier: "premium" },
        { feature_name: "ai_insights", is_licensed: true, plan_tier: "enterprise" },
        { feature_name: "wealth_management_pro", is_licensed: true, plan_tier: "enterprise" },
        { feature_name: "crypto_trading", is_licensed: true, plan_tier: "premium" }
      ];
      await dashboardAPI.syncLicenses(tenantId, features);
      const result = await dashboardAPI.getLicenseUsage(tenantId);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">License vs. Usage</h1>
          <p className="text-sm text-gray-500 mt-1">Compare what features are paid for vs. what is actually used.</p>
        </div>
      </div>

      {hasWastedLicenses && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">Underutilized Licenses Detected</h3>
            <p className="text-sm mt-1">
              You are currently paying for <strong>{data?.unused_licensed?.length || 0}</strong> features that are not being used. 
              Review your enterprise plan to optimize costs and eliminate up to <strong>{summary.waste_pct}%</strong> in wasted licensing fees.
            </p>
          </div>
        </div>
      )}

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
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-gray-50 rounded-full">
                        <Key className="h-6 w-6 text-gray-400" />
                      </div>
                      <p>No license data found for this tenant.</p>
                      <button 
                        onClick={handleSeedLicenses}
                        disabled={loading}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Seed Demo Licenses
                      </button>
                    </div>
                  </td>
                </tr>
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
