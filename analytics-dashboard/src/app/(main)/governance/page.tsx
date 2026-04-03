'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboardData } from '@/hooks/useDashboard';
import { dashboardAPI } from '@/lib/api';
import { DashboardSkeleton, TableSkeleton } from '@/components/Skeletons';
import ChartContainer from '@/components/ChartContainer';
import { Shield, ToggleLeft, ToggleRight, History, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function GovernancePage() {
  const { isLoading, auditLogs, selectedTenants, tenantsParam } = useDashboardData();
  const { data: session } = useSession();
  const actorEmail = session?.user?.email || 'admin@unknown.com';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'toggles' | 'audit' | 'logs'>('toggles');
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null);

  const DEFAULT_FEATURES = [
    { feature_name: "core.payees.view", is_enabled: true, changed_by: 'system', changed_at: '-' },
    { feature_name: "core.transactions.view", is_enabled: true, changed_by: 'system', changed_at: '-' },
    { feature_name: "loans.dashboard.view", is_enabled: true, changed_by: 'system', changed_at: '-' },
    { feature_name: "pro.crypto-trading.view", is_enabled: true, changed_by: 'system', changed_at: '-' },
    { feature_name: "pro.wealth-management.view", is_enabled: true, changed_by: 'system', changed_at: '-' },
  ];

  // Fetch tracking toggles
  const { data: toggles = [], isLoading: loadingToggles } = useQuery({
    queryKey: ['trackingToggles', tenantsParam],
    queryFn: async () => {
      const result = await dashboardAPI.getTrackingToggles(tenantsParam);
      const apiToggles = (result.toggles || []).map((t: any) => ({
        feature_name: t.feature,
        is_enabled: t.enabled,
        changed_by: 'system',
        changed_at: '-'
      }));
      
      const mergedToggles = DEFAULT_FEATURES.map(f => {
        const override = apiToggles.find((a: any) => a.feature_name === f.feature_name);
        return override || f;
      });

      apiToggles.forEach((a: any) => {
        if (!mergedToggles.find(m => m.feature_name === a.feature_name)) {
            mergedToggles.push(a);
        }
      });
      return mergedToggles;
    }
  });

  // Fetch config audit log
  const { data: configLogs = [], isLoading: loadingConfigLogs } = useQuery({
    queryKey: ['configAuditLogs', tenantsParam],
    queryFn: async () => {
      const result = await dashboardAPI.getConfigAuditLog(tenantsParam);
      return result.logs || [];
    },
    enabled: activeTab === 'audit',
  });

  const handleToggle = async (featureName: string, currentState: boolean) => {
    setTogglingFeature(featureName);
    await dashboardAPI.setTrackingToggle(tenantsParam, featureName, !currentState, actorEmail);
    // Refresh toggles
    await queryClient.invalidateQueries({ queryKey: ['trackingToggles', tenantsParam] });
    await queryClient.invalidateQueries({ queryKey: ['configAuditLogs', tenantsParam] });
    setTogglingFeature(null);
  };

  if (isLoading && auditLogs.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">Governance & Security</h1>
          <p className="text-sm text-gray-500 mt-1">Manage tracking controls, privacy settings, and audit trails.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'toggles', label: 'Tracking Controls', icon: Shield },
          { key: 'audit', label: 'Config Audit Log', icon: History },
          { key: 'logs', label: 'Activity Logs', icon: ToggleLeft },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tracking Controls Tab */}
      {activeTab === 'toggles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <ChartContainer title="Data Privacy" id="privacy-controls">
              <div className="space-y-4 mt-2">
                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">PII Masking</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Scrub emails & IPs automatically.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1a73e8]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Cookie Consent</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Enforce banner compliance tracking.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1a73e8]"></div>
                  </label>
                </div>
              </div>
            </ChartContainer>
          </div>

          <div className="lg:col-span-2">
            <ChartContainer title="Feature Tracking Toggles" id="tracking-toggles">
              <p className="text-xs text-gray-500 mt-1 mb-4">Enable or disable tracking for specific features. Changes are recorded in the audit log.</p>
              {loadingToggles ? (
                <div className="p-4"><TableSkeleton rows={4} /></div>
              ) : toggles.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No tracking toggles configured yet.</p>
                  <p className="text-xs mt-1">Toggles are created when you disable tracking for a feature via the API.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {toggles.map((t: any) => (
                    <div key={t.feature_name} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-all">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{t.feature_name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Last changed by <span className="font-medium">{t.changed_by || 'system'}</span> at {t.changed_at}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggle(t.feature_name, t.is_enabled)}
                        disabled={togglingFeature === t.feature_name}
                        className="cursor-pointer"
                      >
                        {togglingFeature === t.feature_name ? (
                          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        ) : t.is_enabled ? (
                          <ToggleRight className="h-8 w-8 text-[#1a73e8]" />
                        ) : (
                          <ToggleLeft className="h-8 w-8 text-gray-400" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ChartContainer>
          </div>
        </div>
      )}

      {/* Config Audit Log Tab */}
      {activeTab === 'audit' && (
        <ChartContainer title="Configuration Change History" id="config-audit">
          {loadingConfigLogs ? (
            <div className="p-4"><TableSkeleton rows={4} /></div>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="text-[13px] text-gray-500 font-medium border-y border-gray-200 bg-gray-50/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Target</th>
                    <th className="px-4 py-3 font-medium">Old Value</th>
                    <th className="px-4 py-3 font-medium">New Value</th>
                  </tr>
                </thead>
                <tbody>
                  {configLogs.map((log: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 font-medium whitespace-nowrap">{log.timestamp}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{log.actor}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1a73e8]/10 text-[#1a73e8] border border-[#1a73e8]/20">{log.action}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{log.target}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-white border border-gray-200 text-gray-500 line-through">{log.old_value}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-white border border-gray-200 text-gray-700">{log.new_value}</span>
                      </td>
                    </tr>
                  ))}
                  {configLogs.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No configuration changes recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </ChartContainer>
      )}

      {/* Activity Logs Tab (existing) */}
      {activeTab === 'logs' && (
        <ChartContainer title="Audit Logs" id="audit-logs">
          <div className="overflow-x-auto cursor-pointer mt-2">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-[13px] text-gray-500 font-medium border-y border-gray-200 bg-gray-50/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Resource</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, index) => (
                  <tr 
                    key={log.id} 
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index === auditLogs.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="px-4 py-3 text-gray-400 font-medium whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{log.user}</td>
                    <td className="px-4 py-3">{log.action}</td>
                    <td className="px-4 py-3 font-mono text-xs">{log.resource}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No logs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartContainer>
      )}
    </div>
  );
}
