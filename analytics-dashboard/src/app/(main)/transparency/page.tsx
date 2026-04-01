'use client';

/**
 * Trust & Transparency Page
 *
 * Allows App Admins to see exactly what data the Super Admin can access.
 * Toggle between On-Prem (full detailed view) and Cloud (aggregated-only view).
 *
 * On-Prem  → Renders the complete analytics dashboard as-is.
 * Cloud    → Renders only the aggregated data the super admin sees, with
 *            blocked-data placeholders to show what is NOT shared.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useAppSelector } from '@/lib/store';
import { dashboardAPI } from '@/lib/api';
import { useDashboardData } from '@/hooks/useDashboard';
import { DashboardSkeleton } from '@/components/Skeletons';
import AuthGuard from '@/components/AuthGuard';
import KPICard from '@/components/KPICard';
import TrafficChart from '@/components/TrafficChart';
import AIInsightsPanel from '@/components/AIInsightsPanel';
import RealTimeUsers from '@/components/RealTimeUsers';
import TopPages from '@/components/TopPages';
import DeviceBreakdownChart from '@/components/DeviceBreakdownChart';
import UserAcquisitionChart from '@/components/UserAcquisitionChart';
import TopLocations from '@/components/TopLocations';
import FeatureUsageChart from '@/components/FeatureUsageChart';
import TopFeaturesChart from '@/components/TopFeaturesChart';
import FunnelChart from '@/components/FunnelChart';
import FeatureHeatmap from '@/components/FeatureHeatmap';
import {
  Cloud,
  Server,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Info,
  BarChart3,
  Users,
  Activity,
  Database,
  MapPin,
  FileText,
  Smartphone,
  Globe,
  Filter,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Zap,
  Layers,
  Shield,
} from 'lucide-react';

type ViewMode = 'on-prem' | 'cloud';

/** Categories of data and their cloud visibility status */
const dataCategories = [
  {
    name: 'Aggregated KPI Metrics',
    icon: BarChart3,
    cloudVisible: true,
    description: 'Total events, active features, response times — aggregated counts only.',
    sensitivity: 'low' as const,
    examples: 'Total Events: 14.2K, Active Features: 8',
  },
  {
    name: 'AI-Generated Insights',
    icon: Activity,
    cloudVisible: true,
    description: 'Rule-based alerts on feature trends. No user-level or path-level data exposed.',
    sensitivity: 'low' as const,
    examples: '"Feature X adoption dropped 15%"',
  },
  {
    name: 'Tenant Volume Summary',
    icon: Users,
    cloudVisible: true,
    description: 'Per-tenant event counts for billing and capacity planning.',
    sensitivity: 'low' as const,
    examples: 'twitter: 12.4K events, beta-app: 3.1K events',
  },
  {
    name: 'Traffic & Page Views',
    icon: Globe,
    cloudVisible: false,
    description: 'Time-series traffic data, page views, and visitor counts. Stays on-prem.',
    sensitivity: 'high' as const,
    examples: 'Daily visitors, hourly pageviews, session durations',
  },
  {
    name: 'Real-Time Active Users',
    icon: Activity,
    cloudVisible: false,
    description: 'Live user session counts. Never leaves your infrastructure.',
    sensitivity: 'high' as const,
    examples: '42 users online now, pages/min sparkline',
  },
  {
    name: 'Geographic Locations & IPs',
    icon: MapPin,
    cloudVisible: false,
    description: 'User IP addresses, country-level geolocation mapping, and heatmaps.',
    sensitivity: 'critical' as const,
    examples: 'India: 1,245 visits, US: 892 visits, IP logs',
  },
  {
    name: 'Audit Logs & User Activity',
    icon: FileText,
    cloudVisible: false,
    description: 'Individual user actions, emails, roles, login timestamps, and behavioral trails.',
    sensitivity: 'critical' as const,
    examples: 'user@example.com logged in at 14:32',
  },
  {
    name: 'Device & Channel Breakdown',
    icon: Smartphone,
    cloudVisible: false,
    description: 'Device types (mobile/desktop), referral channels, and acquisition sources.',
    sensitivity: 'medium' as const,
    examples: 'Desktop 62%, Mobile 34%, Tablet 4%',
  },
  {
    name: 'Funnel & Conversion Data',
    icon: Filter,
    cloudVisible: false,
    description: 'Step-by-step user journey funnels and drop-off analysis.',
    sensitivity: 'high' as const,
    examples: 'Login→Feed→Post: 68% → 42% → 18%',
  },
  {
    name: 'Feature Configs & Governance',
    icon: Database,
    cloudVisible: false,
    description: 'Feature routing rules, rollout configs, and governance policies.',
    sensitivity: 'medium' as const,
    examples: '/api/tweet → post_tweet, rollout: 100%',
  },
];

const sensitivityConfig = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
};

export default function TransparencyPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('on-prem');
  const [rawAdminSummary, setRawAdminSummary] = useState<{
    total_tenants: number;
    total_events: number;
    top_tenants: any[];
  } | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const { selectedTenant } = useAppSelector((state) => state.dashboard);
  const { data: session } = useSession();

  const userRole = session?.user?.role || 'user';
  const isAppAdmin = userRole === 'app_admin';

  // Full dashboard data for on-prem view
  const dashboardData = useDashboardData();

  // Fetch cloud admin summary when switching to cloud mode
  useEffect(() => {
    if (viewMode === 'cloud' && !rawAdminSummary) {
      setAdminLoading(true);
      dashboardAPI
        .getAdminSummary()
        .then((res) => {
          setRawAdminSummary(res);
          setAdminLoading(false);
        })
        .catch(() => setAdminLoading(false));
    }
  }, [viewMode, rawAdminSummary]);

  /**
   * For App Admins: filter the admin summary to only show their own tenant.
   * This ensures an App Admin cannot see other tenants' data in the cloud preview.
   * Super Admins see the full cross-tenant summary as-is.
   */
  const adminSummary = useMemo(() => {
    if (!rawAdminSummary) return null;
    if (!isAppAdmin || !selectedTenant) return rawAdminSummary;

    const myTenants = rawAdminSummary.top_tenants.filter(
      (t: any) =>
        t.id === selectedTenant ||
        t.name?.toLowerCase() === selectedTenant.toLowerCase() ||
        t.tenant_id === selectedTenant
    );

    const myTotalEvents = myTenants.reduce(
      (sum: number, t: any) => sum + (t.events || 0),
      0
    );

    return {
      total_tenants: myTenants.length || 1,
      total_events: myTotalEvents,
      top_tenants: myTenants,
    };
  }, [rawAdminSummary, isAppAdmin, selectedTenant]);

  const cloudVisibleCount = dataCategories.filter((c) => c.cloudVisible).length;
  const blockedCount = dataCategories.filter((c) => !c.cloudVisible).length;

  const toggleCategory = useCallback((name: string) => {
    setExpandedCategory((prev) => (prev === name ? null : name));
  }, []);

  return (
    <AuthGuard>
      <div className="animate-in fade-in duration-500 space-y-6">
        {/* ═══════════ HEADER ═══════════ */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-md shadow-blue-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              Trust & Transparency
            </h1>
            <p className="text-gray-500 text-sm mt-2 max-w-xl leading-relaxed">
               {isAppAdmin
                 ? `Audit exactly what data the Super Admin can access about your app (${selectedTenant}) vs. what stays private on your infrastructure.`
                 : 'Audit exactly what data the Super Admin can access vs. what stays private on your infrastructure. Toggle between views to compare.'}
            </p>
          </div>

          {/* ═══════════ ON-PREM / CLOUD TOGGLE ═══════════ */}
          <div className="flex items-center bg-gray-100 rounded-2xl p-1.5 gap-1 shadow-inner">
            <button
              onClick={() => setViewMode('on-prem')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                viewMode === 'on-prem'
                  ? 'bg-white text-gray-900 shadow-md border border-gray-200/80'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              id="toggle-on-prem"
            >
              <Server className={`w-4 h-4 transition-colors ${viewMode === 'on-prem' ? 'text-emerald-600' : ''}`} />
              On-Prem
              {viewMode === 'on-prem' && (
                <span className="flex h-2 w-2 relative ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode('cloud')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                viewMode === 'cloud'
                  ? 'bg-white text-gray-900 shadow-md border border-gray-200/80'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              id="toggle-cloud"
            >
              <Cloud className={`w-4 h-4 transition-colors ${viewMode === 'cloud' ? 'text-blue-600' : ''}`} />
              Cloud
              {viewMode === 'cloud' && (
                <span className="flex h-2 w-2 relative ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ═══════════ STATS BAR ═══════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Total Categories</p>
              <p className="text-lg font-bold text-gray-900">{dataCategories.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Eye className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Cloud Visible</p>
              <p className="text-lg font-bold text-emerald-700">{cloudVisibleCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Lock className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Blocked</p>
              <p className="text-lg font-bold text-red-600">{blockedCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Shield className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Privacy Score</p>
              <p className="text-lg font-bold text-indigo-700">{Math.round((blockedCount / dataCategories.length) * 100)}%</p>
            </div>
          </div>
        </div>

        {/* ═══════════ STATUS BANNER ═══════════ */}
        {viewMode === 'on-prem' ? (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl flex-shrink-0">
              <Lock className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                On-Premise Mode — Full Data Access
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h3>
              <p className="text-xs text-emerald-700 mt-1.5 leading-relaxed">
                You are viewing the <strong>complete analytics dashboard</strong> as it exists on your infrastructure.
                All data below is stored locally and <strong>never leaves your premises</strong>.
                The Super Admin has <strong>zero visibility</strong> into any of this data.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-emerald-100 px-3 py-1.5 rounded-lg flex-shrink-0">
              <Server className="w-3.5 h-3.5 text-emerald-700" />
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Private</span>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl flex-shrink-0">
              <Cloud className="w-5 h-5 text-blue-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                Cloud Mode — Super Admin&apos;s Exact View
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              </h3>
              <p className="text-xs text-blue-700 mt-1.5 leading-relaxed">
                Below is <strong>exactly</strong> what the Super Admin sees when they log in.
                Only <strong>{cloudVisibleCount} out of {dataCategories.length}</strong> data categories are shared.
                The remaining <strong>{blockedCount} categories</strong> are completely blocked and invisible to them.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-blue-100 px-3 py-1.5 rounded-lg flex-shrink-0">
              <Cloud className="w-3.5 h-3.5 text-blue-700" />
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Shared</span>
            </div>
          </div>
        )}

        {/* ═══════════ DATA FLOW VISUALIZATION ═══════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Data Flow Architecture</h3>
          </div>
          <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
            {/* Your App */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Database className="w-7 h-7 text-white" />
              </div>
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Your App</span>
            </div>

            <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0" />

            {/* On-Prem Server */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <Server className="w-7 h-7 text-white" />
              </div>
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">On-Prem</span>
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">All {dataCategories.length} categories</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                <Shield className="w-3 h-3 text-amber-600" />
                <span className="text-[9px] font-bold text-amber-700 uppercase">Firewall</span>
              </div>
            </div>

            {/* Cloud */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Cloud className="w-7 h-7 text-white" />
              </div>
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Cloud</span>
              <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">Only {cloudVisibleCount} categories</span>
            </div>

            <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0" />

            {/* Super Admin */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl flex items-center justify-center shadow-lg shadow-gray-300">
                <Users className="w-7 h-7 text-white" />
              </div>
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Super Admin</span>
            </div>
          </div>
        </div>

        {/* ═══════════ DATA CATEGORY MATRIX ═══════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-400" />
              Data Access Matrix
            </h3>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> Visible to Super Admin
              </span>
              <span className="flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-400" /> Blocked
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {dataCategories.map((cat) => {
              const IconComp = cat.icon;
              const isVisible = cat.cloudVisible;
              const sens = sensitivityConfig[cat.sensitivity];
              const isExpanded = expandedCategory === cat.name;

              return (
                <div key={cat.name}>
                  <button
                    onClick={() => toggleCategory(cat.name)}
                    className={`w-full flex items-center justify-between px-6 py-4 transition-all duration-200 cursor-pointer ${
                      viewMode === 'cloud' && !isVisible
                        ? 'bg-red-50/30'
                        : 'hover:bg-gray-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl transition-colors ${
                          isVisible ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p
                          className={`text-sm font-medium transition-colors ${
                            viewMode === 'cloud' && !isVisible
                              ? 'text-gray-400'
                              : 'text-gray-800'
                          }`}
                        >
                          {cat.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 max-w-md">{cat.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${sens.bg} ${sens.text} ${sens.border}`}
                      >
                        {cat.sensitivity}
                      </span>
                      {isVisible ? (
                        <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">Shared</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-500 bg-red-50 px-2.5 py-1 rounded-lg">
                          <XCircle className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">Blocked</span>
                        </div>
                      )}
                    </div>
                  </button>
                  {/* Expanded detail row */}
                  {isExpanded && (
                    <div className="px-6 pb-4 pt-0 animate-in slide-in-from-top-1 fade-in duration-200">
                      <div className="ml-11 bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs text-gray-600">
                        <span className="font-semibold text-gray-700">Example data: </span>
                        <span className="font-mono">{cat.examples}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════ LIVE PREVIEW ═══════════ */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${viewMode === 'on-prem' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                {viewMode === 'on-prem' ? (
                  <Server className="w-4 h-4 text-emerald-700" />
                ) : (
                  <Cloud className="w-4 h-4 text-blue-700" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {viewMode === 'on-prem'
                    ? 'Your Full Dashboard (On-Prem)'
                    : isAppAdmin
                      ? `Super Admin's View of ${selectedTenant} (Cloud)`
                      : "Super Admin's View (Cloud)"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {viewMode === 'on-prem'
                    ? 'This is the complete data your on-premise installation holds'
                    : isAppAdmin
                      ? `This is exactly what the Super Admin sees about your app — nothing more, nothing less`
                      : 'This is exactly what the Super Admin sees — nothing more, nothing less'}
                </p>
              </div>
            </div>
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border ${
              viewMode === 'on-prem'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  viewMode === 'on-prem' ? 'bg-emerald-400' : 'bg-blue-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  viewMode === 'on-prem' ? 'bg-emerald-500' : 'bg-blue-500'
                }`}></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {viewMode === 'on-prem' ? 'Live On-Prem' : 'Cloud Preview'}
              </span>
            </div>
          </div>

          {viewMode === 'on-prem' ? (
            /* ═══ ON-PREM: Show the COMPLETE detailed dashboard ═══ */
            <>
              {dashboardData.isLoading ? (
                <DashboardSkeleton />
              ) : (
                <div className="space-y-6 rounded-2xl border-2 border-emerald-200 p-5 bg-gradient-to-b from-emerald-50/30 to-white">
                  {/* Label */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100 w-fit">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                      Private — Never leaves your infrastructure
                    </span>
                  </div>

                  {/* KPI Metrics */}
                  <section>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {dashboardData.kpiMetrics.map((metric: any) => (
                        <KPICard key={metric.id} metric={metric} />
                      ))}
                    </div>
                  </section>

                  {/* Traffic + Real-Time */}
                  <section>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2">
                        <TrafficChart
                          data={dashboardData.trafficData}
                          timeRange={dashboardData.timeRange}
                          onTimeRangeChange={dashboardData.changeTimeRange}
                        />
                      </div>
                      <div>
                        <RealTimeUsers
                          activeUsers={dashboardData.realTimeUsers}
                          pagesPerMinute={dashboardData.pagesPerMinute}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Feature Usage + Top Features */}
                  <section>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <FeatureUsageChart data={dashboardData.featureUsageData} />
                      <TopFeaturesChart data={dashboardData.topFeatures} />
                    </div>
                  </section>

                  {/* Funnel + Heatmap */}
                  <section>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <FunnelChart data={dashboardData.funnelData} />
                      <FeatureHeatmap />
                    </div>
                  </section>

                  {/* AI Insights */}
                  <section>
                    <AIInsightsPanel insights={dashboardData.aiInsights} />
                  </section>

                  {/* Locations */}
                  <section>
                    <TopLocations data={dashboardData.locations} />
                  </section>

                  {/* Bottom Row */}
                  <section>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <TopPages data={dashboardData.topPages} />
                      <DeviceBreakdownChart data={dashboardData.deviceBreakdown} />
                      <UserAcquisitionChart data={dashboardData.acquisitionChannels} />
                    </div>
                  </section>

                  {/* Secondary KPIs */}
                  <section>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {dashboardData.secondaryKpiMetrics.map((metric: any) => (
                        <KPICard key={metric.id} metric={metric} />
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </>
          ) : (
            /* ═══ CLOUD: Show only what Super Admin sees ═══ */
            <div className="space-y-6 rounded-2xl border-2 border-blue-200 p-5 bg-gradient-to-b from-blue-50/30 to-white">
              {/* Label */}
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100 w-fit">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  Super Admin can see this data
                </span>
              </div>

              {adminLoading ? (
                <DashboardSkeleton />
              ) : (
                <>
                  {/* Aggregated KPIs — the only metrics super admin gets */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      Aggregated KPI Metrics
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">
                        Visible
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4 hover:shadow-md transition-shadow">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                          <Users size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            {isAppAdmin ? 'Your Tenant' : 'Total Active Tenants'}
                          </p>
                          <h2 className="text-3xl font-bold text-gray-900">
                            {isAppAdmin
                              ? (selectedTenant ? selectedTenant.charAt(0).toUpperCase() + selectedTenant.slice(1) : '—')
                              : (adminSummary?.total_tenants || 0)}
                          </h2>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4 hover:shadow-md transition-shadow">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                          <Activity size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            {isAppAdmin ? `Events (30d) — ${selectedTenant}` : 'Total Events (30d)'}
                          </p>
                          <h2 className="text-3xl font-bold text-gray-900">
                            {(adminSummary?.total_events || 0).toLocaleString()}
                          </h2>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Top Tenants Table */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                       {isAppAdmin ? 'Your Tenant Summary' : 'Tenant Volume Summary'}
                       <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">
                         Visible
                       </span>
                    </h3>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      {adminSummary?.top_tenants &&
                      adminSummary.top_tenants.length > 0 ? (
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                            <tr>
                              <th className="px-6 py-3">Tenant Name</th>
                              <th className="px-6 py-3 text-right">Event Count</th>
                            </tr>
                          </thead>
                          <tbody>
                            {adminSummary.top_tenants.map((t: any, i: number) => (
                              <tr
                                key={i}
                                className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                              >
                                <td className="px-6 py-4 font-medium text-gray-900">
                                  {t.name}
                                </td>
                                <td className="px-6 py-4 text-right tabular-nums">
                                  {t.events.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-gray-500 text-sm p-6">
                          No tenant data available yet.
                        </p>
                      )}
                    </div>
                  </section>

                  {/* AI Insights — also visible to super admin */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      AI-Generated Insights
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">
                        Visible
                      </span>
                    </h3>
                    {!dashboardData.isLoading && (
                      <AIInsightsPanel insights={dashboardData.aiInsights} />
                    )}
                  </section>

                  {/* ═══ BLOCKED SECTIONS ═══ */}
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-100 w-fit">
                      <EyeOff className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">
                        Blocked — Hidden from Super Admin
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dataCategories
                        .filter((c) => !c.cloudVisible)
                        .map((cat) => {
                          const IconComp = cat.icon;
                          const sens = sensitivityConfig[cat.sensitivity];
                          return (
                            <div
                              key={cat.name}
                              className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 flex items-start gap-3 opacity-60 hover:opacity-80 transition-opacity"
                            >
                              <div className="p-2 bg-red-50 text-red-400 rounded-xl flex-shrink-0">
                                <IconComp className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                                  {cat.name}
                                  <Lock className="w-3 h-3 text-red-400 flex-shrink-0" />
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                                  This data never leaves your infrastructure.
                                </p>
                                <span className={`inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${sens.bg} ${sens.text} ${sens.border}`}>
                                  {cat.sensitivity} sensitivity
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Privacy Footer */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 flex gap-4 text-sm text-blue-800">
                    <div className="p-2 bg-blue-100 rounded-xl flex-shrink-0 h-fit">
                      <Database className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-blue-900 text-sm mb-1">Privacy Guarantee</p>
                      <p className="text-xs leading-relaxed text-blue-700">
                        The Super Admin can only view aggregated metadata shown above.
                        User-level PII, exact browsing paths, geographic coordinates, audit trails,
                        and conversion funnels are strictly confined to your on-premise infrastructure.
                        No raw event data, IP addresses, or personal identifiers are ever transmitted
                        to the cloud layer.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
