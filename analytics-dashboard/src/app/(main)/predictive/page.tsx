"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '@/lib/api';
import { useDashboardData } from '@/hooks/useDashboard';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import ChartContainer from '@/components/ChartContainer';
import { TableSkeleton } from '@/components/Skeletons';

interface Prediction {
  feature_name: string;
  score: number;
  trend_score: number;
  users_pct: number;
  frequency_score: number;
  recent_7d: number;
  prev_7d: number;
  status: string;
  growth_rate?: number;
  projected_next_7d?: number;
  anomaly?: boolean;
}

export default function PredictivePage() {
  const { tenantsParam, rangeParam, selectedTenants, timeRange } = useDashboardData();

  const { data, isLoading } = useQuery({
    queryKey: ['predictiveAdoption', tenantsParam, rangeParam],
    queryFn: () => dashboardAPI.getPredictiveAdoption(tenantsParam, rangeParam),
    staleTime: 5 * 60 * 1000,
  });

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-[#1a73e8]';
    if (score >= 40) return 'text-gray-700';
    return 'text-gray-500';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 70) return 'bg-[#1a73e8]';
    if (score >= 40) return 'bg-gray-400';
    return 'bg-gray-300';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'High Adoption': return 'bg-white text-[#1a73e8] border border-[#1a73e8]/30';
      case 'Growing': return 'bg-white text-gray-600 border border-gray-300';
      default: return 'bg-white text-gray-500 border border-gray-200';
    }
  };

  const getGrowthIcon = (rate: number) => {
    if (rate > 5) return <TrendingUp className="h-4 w-4 text-[#1a73e8]" />;
    if (rate < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  if (isLoading) {
    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">Predictive Adoption Insights</h1>
        <TableSkeleton rows={6} />
      </div>
    );
  }

  const predictions: Prediction[] = data?.predictions || [];
  const anomalies = predictions.filter((p) => p.anomaly);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">Predictive Adoption Insights</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tenant: <strong className="text-gray-700">{selectedTenants.join(', ')}</strong> &middot; Range: <strong className="text-gray-700">{timeRange}</strong>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Score = Trend(40%) + Users(30%) + Frequency(30%)
          </p>
        </div>
        <div className="px-4 py-2 border border-[#1a73e8] bg-[#1a73e8]/5 rounded-lg text-sm">
          <span className="text-gray-500">Total Users:</span> <span className="font-bold text-[#1a73e8]">{data?.total_users?.toLocaleString() || 0}</span>
        </div>
      </div>

      {/* Anomaly alerts */}
      {anomalies.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-amber-900">⚠ Anomalies Detected</h3>
          {anomalies.map((a) => (
            <p key={a.feature_name} className="text-xs text-amber-800">
              <strong>{a.feature_name}</strong> — {(a.growth_rate ?? 0) > 0 ? `+${a.growth_rate}%` : `${a.growth_rate}%`} growth (projected: {a.projected_next_7d?.toLocaleString() ?? '—'} events next 7d)
            </p>
          ))}
        </div>
      )}

      {/* Predictions table */}
      <ChartContainer title="Feature Adoption Predictions" id="predictive-table">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-[13px] text-gray-500 font-medium border-y border-gray-200 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 font-medium">Feature</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Visual</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Growth</th>
                <th className="px-4 py-3 font-medium text-right">Projected 7d</th>
                <th className="px-4 py-3 font-medium text-right">User Reach</th>
                <th className="px-4 py-3 font-medium text-right">Consistency</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p, i) => (
                <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${p.anomaly ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.feature_name}
                    {p.anomaly && <span className="ml-1.5 text-amber-600 text-[10px] font-bold">⚠</span>}
                  </td>
                  <td className={`px-4 py-3 font-bold text-lg ${getScoreColor(p.score)}`}>{p.score}</td>
                  <td className="px-4 py-3 w-40">
                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(p.score)}`}
                        style={{ width: `${Math.min(p.score, 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {getGrowthIcon(p.growth_rate ?? 0)}
                      <span className={`font-mono text-xs ${(p.growth_rate ?? 0) > 0 ? 'text-[#1a73e8]' : (p.growth_rate ?? 0) < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {(p.growth_rate ?? 0) > 0 ? '+' : ''}{p.growth_rate ?? 0}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{p.projected_next_7d?.toLocaleString() ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{p.users_pct}%</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{p.frequency_score}%</td>
                </tr>
              ))}
              {predictions.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No prediction data available. Ensure events are being tracked.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartContainer>

      {/* Score Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#1a73e8] rounded-full"></div> <strong>70-100:</strong> High Adoption</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-gray-400 rounded-full"></div> <strong>40-69:</strong> Growing</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-gray-300 rounded-full"></div> <strong>0-39:</strong> At Risk</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-400 rounded-full"></div> <strong>⚠:</strong> Anomaly (&gt;50% change)</div>
      </div>
    </div>
  );
}
