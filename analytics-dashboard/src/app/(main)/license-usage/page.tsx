"use client";

import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '@/lib/api';
import { useDashboardData } from '@/hooks/useDashboard';
import { TableSkeleton } from '@/components/Skeletons';
import { Key, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import ChartContainer from '@/components/ChartContainer';
import { toast } from 'sonner';

/** Typed structures for license data */
interface LicensedFeature {
  feature_name: string;
  plan_tier: string;
  is_used: boolean;
  usage_count: number;
  unique_users: number;
}

interface UnlicensedFeature {
  feature_name: string;
  usage_count: number;
}

interface LicenseSummary {
  total_licensed: number;
  total_used: number;
  total_used_licensed: number;
  waste_pct: number;
}

interface LicenseData {
  summary: LicenseSummary;
  licensed: LicensedFeature[];
  unused_licensed: LicensedFeature[];
  unlicensed_used: UnlicensedFeature[];
}

export default function LicenseUsagePage() {
  const { selectedTenant } = useDashboardData();
  const tenantId = selectedTenant || 'nexabank';
  const [data, setData] = useState<LicenseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await dashboardAPI.getLicenseUsage(tenantId);
      setData(result as LicenseData);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">License vs. Usage</h1>
        <TableSkeleton rows={6} />
      </div>
    );
  }

  const summary = data?.summary || { total_licensed: 0, total_used: 0, total_used_licensed: 0, waste_pct: 0 };
  const hasWastedLicenses = (summary.waste_pct || 0) > 20;

  const handleSeedLicenses = async () => {
    try {
      setLoading(true);
      // Only the 4 real Pro features are enterprise-licensed.
      // Basic banking features (login, transfer, etc.) are FREE and NOT licensed.
      const features = [
        { feature_name: "crypto_trade_execution", is_licensed: true, plan_tier: "enterprise" },
        { feature_name: "wealth_rebalance", is_licensed: true, plan_tier: "enterprise" },
        { feature_name: "payroll_batch_processed", is_licensed: true, plan_tier: "enterprise" },
        { feature_name: "pro_book_download", is_licensed: true, plan_tier: "enterprise" },
      ];
      await dashboardAPI.syncLicenses(tenantId, features);
      const result = await dashboardAPI.getLicenseUsage(tenantId);
      setData(result as LicenseData);
      toast.success('Enterprise licenses synced');
    } catch {
      toast.error('Failed to sync licenses');
    } finally {
      setLoading(false);
    }
  };

  const tierBadge = (tier: string) => {
    if (tier === 'enterprise') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-violet-100 text-violet-700 border border-violet-200">
          Enterprise
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
        Basic
      </span>
    );
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">Enterprise License Usage</h1>
          <p className="text-sm text-gray-500 mt-1">Track usage of paid enterprise (Pro) features against their licensed entitlements.</p>
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
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Enterprise Licensed</p>
          <p className="text-3xl font-bold text-gray-900">{summary.total_licensed || 0}</p>
          <p className="text-[11px] text-gray-400 mt-1">Pro features with active license</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Features Used</p>
          <p className="text-3xl font-bold text-gray-900">{summary.total_used || 0}</p>
          <p className="text-[11px] text-gray-400 mt-1">All features used in last 30 days</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Active Pro Features</p>
          <p className="text-3xl font-bold text-green-600">{summary.total_used_licensed || 0}</p>
          <p className="text-[11px] text-gray-400 mt-1">Licensed features being used</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">License Waste</p>
          <p className={`text-3xl font-bold ${(summary.waste_pct || 0) > 20 ? 'text-red-600' : 'text-green-600'}`}>
            {summary.waste_pct || 0}%
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Paid but unused licenses</p>
        </div>
      </div>

      {/* Licensed Features Table */}
      <ChartContainer title="Enterprise Licensed Features" id="license-table">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-[13px] text-gray-500 font-medium border-y border-gray-200 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 font-medium">Feature</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Usage Count</th>
                <th className="px-4 py-3 font-medium text-right">Unique Users</th>
              </tr>
            </thead>
            <tbody>
              {(data?.licensed || []).map((f: LicensedFeature, i: number) => (
                <tr key={i} className={`border-b border-gray-100 transition-colors ${!f.is_used ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {f.feature_name.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3">{tierBadge(f.plan_tier)}</td>
                  <td className="px-4 py-3">
                    {f.is_used ? (
                      <span className="flex items-center gap-1.5 text-green-600 font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-500 font-medium">
                       Unused
                      </span>
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
                        className="mt-2 px-4 py-2 bg-[#1a73e8] text-white text-sm font-medium rounded-lg hover:bg-[#1557b0] transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Seed Licenses
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
        <ChartContainer title="Free Features (No License Required)" id="unlicensed-used">
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-[13px] text-gray-500 font-medium border-y border-gray-200 bg-amber-50/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Feature</th>
                  <th className="px-4 py-3 font-medium text-right">Usage Count</th>
                </tr>
              </thead>
              <tbody>
                {(data?.unlicensed_used || []).map((f: UnlicensedFeature, i: number) => (
                  <tr key={i} className="border-b border-gray-100 bg-amber-50/30 hover:bg-amber-50">
                    <td className="px-4 py-3 font-medium text-amber-800">{f.feature_name.replace(/_/g, ' ')}</td>
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
