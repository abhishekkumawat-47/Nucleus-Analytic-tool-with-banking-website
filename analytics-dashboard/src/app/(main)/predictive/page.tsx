"use client";

import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '@/lib/api';
import { useDashboardData } from '@/hooks/useDashboard';
import { TrendingUp, TrendingDown, Activity, Users, Loader2 } from 'lucide-react';
import ChartContainer from '@/components/ChartContainer';
import { TableSkeleton } from '@/components/Skeletons';

export default function PredictivePage() {
  const { selectedTenant } = useDashboardData();
  const tenantId = selectedTenant || 'nexabank';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const result = await dashboardAPI.getPredictiveAdoption(tenantId);
      setData(result);
      setLoading(false);
    };
    fetch();
  }, [tenantId]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'High Adoption': return 'bg-green-100 text-green-700 border border-green-200';
      case 'Growing': return 'bg-amber-100 text-amber-700 border border-amber-200';
      default: return 'bg-red-100 text-red-700 border border-red-200';
    }
  };

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">Predictive Adoption Insights</h1>
        <TableSkeleton rows={6} />
      </div>
    );
  }

  const predictions = data?.predictions || [];

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">Predictive Adoption Insights</h1>
          <p className="text-sm text-gray-500 mt-1">
            Heuristic scoring: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">Score = Trend(40%) + Users(30%) + Frequency(30%)</code>
          </p>
        </div>
        <div className="px-4 py-2 bg-blue-50 rounded-lg text-sm">
          <span className="text-gray-500">Total Users:</span> <span className="font-bold text-blue-700">{data?.total_users || 0}</span>
        </div>
      </div>

      {/* Predictions */}
      <ChartContainer title="Feature Adoption Predictions" id="predictive-table">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-[13px] text-gray-500 font-medium border-y border-gray-200 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 font-medium">Feature</th>
                <th className="px-4 py-3 font-medium">Adoption Score</th>
                <th className="px-4 py-3 font-medium">Visual</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">7d Trend</th>
                <th className="px-4 py-3 font-medium text-right">User Reach</th>
                <th className="px-4 py-3 font-medium text-right">Consistency</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p: any, i: number) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.feature_name}</td>
                  <td className={`px-4 py-3 font-bold text-lg ${getScoreColor(p.score)}`}>{p.score}</td>
                  <td className="px-4 py-3 w-40">
                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(p.score)}`}
                        style={{ width: `${Math.min(p.score, 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {p.recent_7d >= p.prev_7d ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-mono text-xs">{p.recent_7d} / {p.prev_7d}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{p.users_pct}%</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{p.frequency_score}%</td>
                </tr>
              ))}
              {predictions.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No prediction data available. Ensure events are being tracked.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartContainer>

      {/* Score Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 p-4 bg-gray-50 rounded-lg border border-gray-100">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 rounded-full"></div> <strong>70-100:</strong> High Adoption</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-500 rounded-full"></div> <strong>40-69:</strong> Growing</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 rounded-full"></div> <strong>0-39:</strong> At Risk</div>
      </div>
    </div>
  );
}
