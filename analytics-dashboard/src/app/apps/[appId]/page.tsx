'use client';

/**
 * Dynamic Per-App Analytics Dashboard
 * Route: /apps/[appId]
 * 
 * Renders the full analytics dashboard scoped to a specific app's data.
 * All widgets pull live data from the backend filtered by tenant_id = appId.
 * Polls every 10 seconds for near-real-time updates.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { APP_REGISTRY } from '@/lib/feature-map';
import { ArrowLeft, RefreshCw, Zap, TrendingUp, Users, Activity, Clock, BarChart3 } from 'lucide-react';
import axios from 'axios';

const POLL_INTERVAL = 10_000; // 10 seconds

interface KPI { id: string; label: string; value: string; change: number; icon: string; }
interface TrafficPoint { date: string; pageViews: number; visitors: number; }
interface TopFeature { name: string; value: number; }
interface FunnelStep { step: number; event_name: string; users_completed: number; drop_off_pct: number; }
interface Insight { type: string; severity: string; feature: string; message: string; }

export default function AppDashboardPage() {
  const params = useParams();
  const appId = params.appId as string;
  const appConfig = APP_REGISTRY[appId];

  const [kpis, setKpis] = useState<KPI[]>([]);
  const [traffic, setTraffic] = useState<TrafficPoint[]>([]);
  const [topFeatures, setTopFeatures] = useState<TopFeature[]>([]);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [realtimeUsers, setRealtimeUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [kpiRes, trafficRes, featuresRes, funnelRes, insightsRes, realtimeRes] = await Promise.all([
        axios.get(`/api/metrics/kpi?tenant_id=${appId}`),
        axios.get(`/api/metrics/traffic?tenant_id=${appId}&days=7`),
        axios.get(`/api/features/usage?tenant_id=${appId}&days=7`),
        axios.get(`/api/funnels?tenant_id=${appId}&steps=${(appConfig?.funnelSteps || ['login', 'view_feed', 'post_tweet', 'like_tweet']).join(',')}&window_minutes=1440`),
        axios.get(`/api/insights?tenant_id=${appId}`),
        axios.get(`/api/metrics/kpi?tenant_id=${appId}`), // reuse for realtime estimate
      ]);

      setKpis(kpiRes.data || []);
      setTraffic(trafficRes.data || []);
      
      const usage = featuresRes.data?.usage || [];
      setTopFeatures(usage.map((u: any) => ({ name: u.event_name, value: u.total_interactions })));

      setFunnel(funnelRes.data?.funnel || []);
      setInsights(insightsRes.data?.insights || []);

      // Estimate realtime from total events
      const totalEvt = kpiRes.data?.find((k: any) => k.id === 'total-events');
      setRealtimeUsers(totalEvt ? Math.min(parseInt(totalEvt.value?.replace(/,/g, '') || '0'), 999) : 0);

      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error('[AppDashboard] Fetch error:', err);
      setLoading(false);
    }
  }, [appId, appConfig]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  if (!appConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-700">App &quot;{appId}&quot; not found</h1>
          <Link href="/" className="text-blue-600 mt-4 inline-block">← Back to Apps</Link>
        </div>
      </div>
    );
  }

  const iconMap: Record<string, React.ReactNode> = {
    'activity': <Activity size={18} />,
    'layers': <BarChart3 size={18} />,
    'clock': <Clock size={18} />,
    'alert-triangle': <TrendingUp size={18} />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="p-2 rounded-lg hover:bg-gray-100 transition">
              <ArrowLeft size={18} className="text-gray-600" />
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: appConfig.color + '20' }}>
                <Zap size={16} style={{ color: appConfig.color }} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{appConfig.displayName} Analytics</h1>
                <p className="text-xs text-gray-500">Live Feature Intelligence Dashboard</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link href={`/${appId}`} className="text-sm text-blue-600 hover:underline">
              Open {appConfig.displayName} →
            </Link>
            <div className="flex items-center space-x-1.5 text-xs text-gray-400">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(kpis.length > 0 ? kpis : [
            { id: 'loading-1', label: 'Total Events', value: '—', change: 0, icon: 'activity' },
            { id: 'loading-2', label: 'Active Features', value: '—', change: 0, icon: 'layers' },
            { id: 'loading-3', label: 'Avg Response', value: '—', change: 0, icon: 'clock' },
            { id: 'loading-4', label: 'Error Rate', value: '—', change: 0, icon: 'alert-triangle' },
          ]).map(kpi => (
            <div key={kpi.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{kpi.label}</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  {iconMap[kpi.icon] || <Activity size={18} />}
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              {kpi.change !== 0 && (
                <p className={`text-xs mt-1 ${kpi.change > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {kpi.change > 0 ? '↑' : '↓'} {Math.abs(kpi.change)}% from last period
                </p>
              )}
            </div>
          ))}
        </section>

        {/* Traffic + Realtime */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Event Traffic (Last 7 Days)</h3>
            {traffic.length > 0 ? (
              <div className="space-y-2">
                {traffic.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 w-24">{t.date}</span>
                    <div className="flex-1 mx-4">
                      <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                          style={{ width: `${Math.min(100, (t.pageViews / Math.max(...traffic.map(x => x.pageViews))) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-gray-900 font-medium w-16 text-right">{t.pageViews}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No traffic data yet — interact with {appConfig.displayName} to generate events!</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Total Events Tracked</h3>
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <p className="text-5xl font-bold" style={{ color: appConfig.color }}>{realtimeUsers}</p>
                <p className="text-xs text-gray-500 mt-2">events ingested (last 7 days)</p>
              </div>
            </div>
            <div className="mt-2 p-2 bg-green-50 rounded-lg text-center">
              <span className="text-xs font-medium text-green-700">🟢 Live — polling every 10s</span>
            </div>
          </div>
        </section>

        {/* Top Features + Funnel */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Features */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Features by Usage</h3>
            {topFeatures.length > 0 ? (
              <div className="space-y-3">
                {topFeatures.slice(0, 8).map((f, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                      <span className="text-sm font-medium text-gray-800 truncate">{f.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${(f.value / topFeatures[0].value) * 100}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-12 text-right">{f.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No feature usage data yet</p>
            )}
          </div>

          {/* Funnel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">User Journey Funnel</h3>
            {funnel.length > 0 ? (
              <div className="space-y-3">
                {funnel.map((step, i) => {
                  const maxUsers = funnel[0]?.users_completed || 1;
                  const pct = (step.users_completed / maxUsers) * 100;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-800">
                          <span className="text-gray-400 mr-1">{step.step}.</span>
                          {step.event_name}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-700">{step.users_completed} users</span>
                          {step.drop_off_pct > 0 && (
                            <span className="text-xs text-red-500 font-medium">↓{step.drop_off_pct}%</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: i === funnel.length - 1 ? '#22c55e' : appConfig.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No funnel data yet — complete the login → feed → post → like flow</p>
            )}
          </div>
        </section>

        {/* AI Insights */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">🧠 AI-Powered Insights</h3>
          {insights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border text-sm ${
                    insight.severity === 'high' || insight.severity === 'medium'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}
                >
                  <span className="font-semibold">{insight.type}:</span> {insight.message}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">Insights will appear once enough data is collected</p>
          )}
        </section>
      </main>
    </div>
  );
}
