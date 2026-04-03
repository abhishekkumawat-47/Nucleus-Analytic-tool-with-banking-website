/**
 * Axios API client abstraction.
 * Provides a configured axios instance and typed API methods.
 * All data is fetched from the backend — no mock fallbacks.
 */

import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import {
  KPIMetric,
  TimeSeriesDataPoint,
  FeatureUsageDataPoint,
  BarDataPoint,
  FunnelStep,
  FeatureActivityRow,
  Tenant,
  AIInsight,
  PagesPerMinuteDataPoint,
  TopPage,
  DeviceBreakdown,
  AcquisitionChannel,
  LocationData,
  AuditLog,
  FeatureConfig,
  RetentionData,
  AvailableTenant,
} from '@/types';

/** Base API configuration */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

/** Configured axios instance with interceptors */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const { getSession } = await import('next-auth/react');
      const session = await getSession();
      if (session?.user) {
        config.headers.set('X-User-Email', session.user.email);
        if (session.user.role) {
          config.headers.set('X-User-Role', session.user.role);
        }
        if (session.user.adminApps) {
          config.headers.set('X-Admin-Apps', (session.user.adminApps as string[]).join(','));
        }
      }
    } catch {
      // Ignore if called in non-browser context
    }
    return config;
  },
  (error: Error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: Error & { response?: { status: number; data?: { detail?: string } }; config?: { url?: string } }) => {
    const status = error.response?.status;
    const url = error.config?.url || 'unknown';
    const detail = error.response?.data?.detail || error.message;
    
    // Only show toast for non-403 errors (403 = RBAC restriction, expected)
    if (status === 403) {
      console.warn(`[RBAC] Access denied for ${url}`);
    } else if (status === 500) {
      toast.error(`Server error`, { description: detail, duration: 4000 });
    } else if (status && status >= 400) {
      toast.error(`Request failed (${status})`, { description: detail, duration: 3000 });
    }
    
    return Promise.reject(error);
  }
);

/* ─────────────── Helper Types ─────────────── */

interface BackendFeatureUsageItem {
  event_name: string;
  total_interactions: number;
  unique_users: number;
}

interface BackendFunnelStep {
  step: number;
  event_name: string;
  users_completed: number;
  drop_off_pct: number;
}

interface BackendInsight {
  type: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
}

interface BackendAIReportResponse {
  tenant_id: string;
  report: string;
  cached?: boolean;
  generated_at?: string | null;
  insights?: BackendInsight[];
}

interface AIReportPayload {
  tenant_id: string;
  report: string;
  cached?: boolean;
  generated_at?: string | null;
  insights: AIInsight[];
}

interface BackendTrafficRow {
  date: string;
  visitors: number;
  pageViews: number;
}

interface BackendFeatureUsageRow {
  date: string;
  usage: number;
}

interface BackendDeviceRow {
  device: string;
  value: number;
}

interface BackendChannelRow {
  name: string;
  value: number;
  formattedValue: string;
}

interface BackendTopPageRow {
  pageUrl: string;
  totalEvents: number;
  comparisonPct: number;
  rank: number;
  features: { feature: string; displayName: string; count: number; inPagePct: number }[];
}

interface BackendPPMRow {
  hour: string;
  value: number;
}

interface BackendActivityRow {
  feature: string;
  segments: { color: string; width: number }[];
  level: string;
}

export interface DeploymentInfoResponse {
  mode: string;
  is_cloud: boolean;
  is_on_prem: boolean;
  local_tenant: string | null;
}

interface AdminSummaryResponse {
  total_tenants: number;
  total_events: number;
  top_tenants: Array<{ id: string; name: string; events: number }>;
}

interface AdminAppSummaryResponse {
  kpi: KPIMetric[];
  insights: BackendInsight[];
}

interface TransparencyCategory {
  category: string;
  is_synced: boolean;
  details: string;
}

interface TransparencyResponse {
  message: string;
  visible_categories: TransparencyCategory[];
}

interface LicenseUsageResponse {
  summary: {
    total_licensed: number;
    total_used: number;
    total_used_licensed?: number;
    waste_pct: number;
    pro_users?: number;
    total_users?: number;
    pro_adoption_pct?: number;
    estimated_revenue?: number;
    wow_change?: number;
  };
  licensed: Array<{ feature_name: string; plan_tier: string; is_used: boolean; usage_count: number; unique_users: number; usage_pct: number; trend: Array<{ date: string; count: number }> }>;
  unused_licensed: Array<{ feature_name: string; plan_tier: string; is_used: boolean; usage_count: number; unique_users: number; usage_pct: number; trend: Array<{ date: string; count: number }> }>;
  unlicensed_used: Array<{ feature_name: string; usage_count: number; unique_users: number; usage_pct: number }>;
  nexabank_context?: {
    last_event_at?: string | null;
    pro_events_30d?: number;
    pro_feature_catalog?: Array<{ feature_id: string; title: string }>;
    top_relevant_features?: Array<{ feature_name: string; usage_count: number }>;
  };
}

interface TrackingToggleResponse {
  toggles: Array<{ feature: string; enabled: boolean; description?: string }>;
}

interface ConfigAuditResponse {
  logs: Array<{ timestamp: string; feature: string; action: string; by: string; reason?: string }>;
}

interface UserJourneyResponse {
  events: Array<{ event_name: string; timestamp: string; channel?: string; metadata?: Record<string, string | number | boolean> }>;
  sessions: Array<{ session_id: string; start_time: string; duration_seconds: number }>;
  total_events: number;
  total_sessions: number;
}

interface JourneyUsersResponse {
  users: Array<{ user_id: string; total_events: number; last_active: string }>;
}

interface SegmentationResponse {
  segments: Array<{ segment: string; users: number }>;
}

interface PredictiveResponse {
  predictions: Array<{
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
  }>;
  total_users: number;
}

/* ─────────────── API Methods ─────────────── */

export const dashboardAPI = {
  /** Fetch KPI metrics for the dashboard header */
  async getKPIMetrics(tenants: string[], range: string): Promise<KPIMetric[]> {
    try {
      const response = await apiClient.get<KPIMetric[]>(`/metrics/kpi?tenants=${tenants.join(',')}&range=${range}`);
      return response.data;
    } catch {
      console.error('Failed to fetch KPI metrics');
      return [];
    }
  },

  /** Fetch Secondary KPI metrics */
  async getSecondaryKPIMetrics(tenants: string[], range: string): Promise<KPIMetric[]> {
    try {
      const response = await apiClient.get<KPIMetric[]>(`/metrics/secondary_kpi?tenants=${tenants.join(',')}&range=${range}`);
      return response.data;
    } catch {
      console.error('Failed to fetch Secondary KPI metrics');
      return [];
    }
  },

  /** Fetch traffic overview time series data */
  async getTrafficData(tenants: string[], range: string): Promise<TimeSeriesDataPoint[]> {
    try {
      const response = await apiClient.get<Record<string, string | number>[]>(`/metrics/traffic?tenants=${tenants.join(',')}&range=${range}`);
      return response.data.map((r: Record<string, string | number>) => {
        const point: Record<string, string | number> = { date: String(r.date) };
        for (const key of Object.keys(r)) {
          if (key !== 'date') {
            point[key] = Number(r[key]) || 0;
          }
        }
        return point as unknown as TimeSeriesDataPoint;
      });
    } catch {
      console.error('Failed to fetch traffic data');
      return [];
    }
  },

  /** Fetch feature usage over time data */
  async getFeatureUsageData(tenants: string[], range: string): Promise<FeatureUsageDataPoint[]> {
    try {
      const response = await apiClient.get<Record<string, string | number>[]>(`/metrics/feature_usage_series?tenants=${tenants.join(',')}&range=${range}`);
      return response.data.map((r: Record<string, string | number>) => {
        const point: Record<string, string | number> = { date: String(r.date) };
        for (const key of Object.keys(r)) {
          if (key !== 'date') {
            point[key] = Number(r[key]) || 0;
          }
        }
        return point as unknown as FeatureUsageDataPoint;
      });
    } catch {
      console.error('Failed to fetch feature usage');
      return [];
    }
  },

  /** Fetch top features ranking using backend /features/usage endpoint */
  async getTopFeatures(tenants: string[], range: string): Promise<BarDataPoint[]> {
    try {
      const response = await apiClient.get<{ usage: BackendFeatureUsageItem[] }>(`/features/usage?tenants=${tenants.join(',')}&range=${range}`);
      const backendUsage = response.data.usage || [];
      return backendUsage.map((item: BackendFeatureUsageItem) => ({
        name: item.event_name,
        value: item.total_interactions,
      }));
    } catch {
      console.error('Failed to fetch top features from backend');
      return [];
    }
  },

  /** Fetch user journey funnel data using backend /funnels endpoint */
  async getFunnelData(tenants: string[], range: string): Promise<FunnelStep[]> {
    try {
      const { APP_REGISTRY } = await import('./feature-map');
      // Use the first tenant for funnel step resolution
      const primaryTenant = tenants.length > 0 ? tenants[0] : 'nexabank';
      const appConfig = APP_REGISTRY[primaryTenant];
      const steps = appConfig?.funnelSteps?.join(',') || 'login,view_feed,post_tweet,like_tweet';
      
      const response = await apiClient.get<{ funnel: BackendFunnelStep[] }>(`/funnels?tenants=${tenants.join(',')}&steps=${steps}&window_minutes=60&range=${range}`);
      const funnel = response.data.funnel || [];
      
      return funnel.map((step: BackendFunnelStep) => ({
        step: step.step,
        label: step.event_name,
        value: step.users_completed,
        dropOff: step.drop_off_pct,
        timeToNextStep: '-',
        color: '#1a73e8',
      }));
    } catch {
      console.error('Failed to fetch funnel from backend');
      return [];
    }
  },

  /** Fetch feature activity heatmap data */
  async getFeatureActivity(tenants: string[], range: string): Promise<FeatureActivityRow[]> {
    try {
      const response = await apiClient.get<BackendActivityRow[]>(`/features/activity?tenants=${tenants.join(',')}&range=${range}`);
      return response.data.map((row: BackendActivityRow) => ({
        feature: row.feature,
        segments: row.segments,
        level: row.level as 'High' | 'Med' | 'Low',
      }));
    } catch {
      return [];
    }
  },

  /** Fetch grid-based heatmap matrix for multi-tenant or time-based single tenant */
  async getFeatureHeatmap(tenants: string[], range: string): Promise<{ is_compare: boolean; groups: string[]; activities: unknown[] }> {
    try {
      const response = await apiClient.get(`/features/heatmap?tenants=${tenants.join(',')}&range=${range}`);
      return response.data;
    } catch {
      return {
        is_compare: false,
        groups: ['Error'],
        activities: []
      };
    }
  },

  /** Fetch tenant comparison data */
  async getTenants(tenants?: string[], range: string = '7d'): Promise<Tenant[]> {
    try {
      const params = tenants && tenants.length > 0 ? `?tenants=${tenants.join(',')}&range=${range}` : `?range=${range}`;
      const response = await apiClient.get<Tenant[]>(`/tenants${params}`);
      return response.data;
    } catch {
      return [];
    }
  },

  async getAvailableTenants(): Promise<AvailableTenant[]> {
    try {
      const response = await apiClient.get<AvailableTenant[]>('/tenants/available');
      return response.data;
    } catch {
      console.error('Failed to fetch available tenants');
      return [
        { id: "nexabank", name: "NexaBank", eventCount: 0, uniqueUsers: 0 },
        { id: "safexbank", name: "SafexBank", eventCount: 0, uniqueUsers: 0 }
      ];
    }
  },

  /** Fetch AI-generated insights using backend /insights endpoint */
  async getAIInsights(tenants: string[], range: string): Promise<AIInsight[]> {
    // Retry once on failure before returning fallback
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await apiClient.get<{ insights: BackendInsight[] }>(
          `/insights?tenants=${tenants.join(',')}&range=${range}`,
          { timeout: attempt === 0 ? 15000 : 30000 } // 15s first try, 30s retry
        );
        const insights = response.data.insights || [];
        return insights.map((insight: BackendInsight, ix: number) => ({
          id: `ai-${ix}`,
          type: insight.severity === 'high' ? 'warning' as const : insight.severity === 'medium' ? 'info' as const : 'success' as const,
          title: insight.type || 'Backend Insight',
          message: insight.message || String(insight),
          impact: insight.severity === 'high' ? 'High' : 'Medium',
          priority: insight.severity,
          actionRequired: insight.severity === 'high',
        }));
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const isTimeout = (err as { code?: string })?.code === 'ECONNABORTED';
        console.warn(`[AI Insights] Attempt ${attempt + 1} failed (status=${status}, timeout=${isTimeout})`);
        
        // Don't retry on 403 (RBAC) or 404 
        if (status === 403 || status === 404) break;
        
        // Wait before retry
        if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    // Return informative fallback insights when backend is unavailable
    console.error('Failed to fetch AI Insights after retries');
    return [{
      id: 'ai-fallback-0',
      type: 'info' as const,
      title: 'Insights Temporarily Unavailable',
      message: 'The AI insights engine is currently processing or unavailable. Insights will appear automatically once the backend is ready.',
      impact: 'Low',
      priority: 'low',
      actionRequired: false,
    }];
  },

  /** Fetch AI Summarization Report */
  async getAIReport(tenants: string[]): Promise<string> {
    try {
      const response = await apiClient.get<BackendAIReportResponse>(`/ai_report?tenants=${tenants.join(',')}`, { timeout: 1200000 });
      return response.data.report || '';
    } catch {
      console.error('Failed to fetch AI Report');
      return '# AI Report Unavailable\n\nThe summarization model is currently unavailable or generating the report failed.';
    }
  },

  /** Fetch the latest stored AI report snapshot */
  async getLatestAIReport(tenants: string[]): Promise<AIReportPayload> {
    try {
      const response = await apiClient.get<BackendAIReportResponse>(`/ai_report?tenants=${tenants.join(',')}`, { timeout: 1200000 });
      const insights: AIInsight[] = (response.data.insights || []).map((ins: BackendInsight, i: number) => ({
        id: `ai-${i}`,
        title: ins.type || 'Insight',
        message: ins.message || String(ins),
        type: ins.severity === 'high' ? 'warning' : ins.severity === 'medium' ? 'info' : 'success',
        priority: ins.severity,
        impact: ins.severity === 'high' ? 'High' : 'Medium',
        actionRequired: ins.severity === 'high',
      }));
      return { ...response.data, insights };
    } catch {
      return { tenant_id: tenants.join(','), report: '', cached: true, generated_at: null, insights: [] };
    }
  },

  /** Generate a fresh AI report on demand */
  async generateAIReport(tenants: string[]): Promise<AIReportPayload> {
    try {
      const response = await apiClient.get<BackendAIReportResponse>(`/ai_report?tenants=${tenants.join(',')}&force_refresh=true`, { timeout: 1200000 });
      const insights: AIInsight[] = (response.data.insights || []).map((ins: BackendInsight, i: number) => ({
        id: `ai-${i}`,
        title: ins.type || 'Insight',
        message: ins.message || String(ins),
        type: ins.severity === 'high' ? 'warning' : ins.severity === 'medium' ? 'info' : 'success',
        priority: ins.severity,
        impact: ins.severity === 'high' ? 'High' : 'Medium',
        actionRequired: ins.severity === 'high',
      }));
      return { ...response.data, insights };
    } catch {
      console.error('Failed to generate AI Report');
      return { tenant_id: tenants.join(','), report: '', cached: false, generated_at: null, insights: [] };
    }
  },

  /** Fetch real-time active user count (returns count + IST timestamp) */
  async getRealTimeUsers(tenants: string[]): Promise<{ count: number; timestampIST: string | null }> {
    try {
      const response = await apiClient.get<{ count: number; timestamp_ist: string | null; timezone: string }>(`/metrics/realtime_users?tenants=${tenants.join(',')}`);
      return {
        count: response.data.count ?? 0,
        timestampIST: response.data.timestamp_ist ?? null,
      };
    } catch {
      return { count: 0, timestampIST: null };
    }
  },

  /** Fetch pages per minute data */
  async getPagesPerMinute(tenants: string[]): Promise<PagesPerMinuteDataPoint[]> {
    try {
      const response = await apiClient.get<BackendPPMRow[]>(`/metrics/pages_per_minute?tenants=${tenants.join(',')}`);
      return response.data;
    } catch {
      return [];
    }
  },

  /** Fetch top pages data — returns page-grouped entries with nested features */
  async getTopPages(tenants: string[], range: string): Promise<TopPage[]> {
    try {
      const response = await apiClient.get<BackendTopPageRow[]>(`/metrics/top_pages?tenants=${tenants.join(',')}&range=${range}`);
      return response.data.map((row: BackendTopPageRow) => ({
        pageUrl: row.pageUrl,
        totalEvents: row.totalEvents,
        comparisonPct: row.comparisonPct ?? 0,
        rank: row.rank ?? 0,
        features: (row.features || []).map(f => ({
          feature: f.feature,
          displayName: f.displayName || f.feature,
          count: f.count,
          inPagePct: f.inPagePct ?? 0,
        })),
      }));
    } catch {
      return [];
    }
  },

  /** Fetch device breakdown data */
  async getDeviceBreakdown(tenants: string[], range: string): Promise<DeviceBreakdown[]> {
    try {
      const response = await apiClient.get<DeviceBreakdown[]>(`/metrics/devices?tenants=${tenants.join(',')}&range=${range}`);
      return response.data;
    } catch {
      console.error('Failed to fetch device breakdown');
      return [];
    }
  },

  /** Fetch user acquisition channel breakdown */
  async getAcquisitionChannels(tenants: string[], range: string): Promise<AcquisitionChannel[]> {
    try {
      const response = await apiClient.get<BackendChannelRow[]>(`/metrics/channels?tenants=${tenants.join(',')}&range=${range}`);
      return (response.data || []).map((row: BackendChannelRow) => ({
        name: row.name,
        value: row.value,
        formattedValue: row.formattedValue || row.value.toLocaleString(),
      }));
    } catch {
      console.error('Failed to fetch acquisition channels');
      return [];
    }
  },

  /** Fetch top locations data from backend */
  async getLocations(tenants: string[], range: string): Promise<LocationData[]> {
    try {
      const response = await apiClient.get<LocationData[]>(`/locations?tenants=${tenants.join(',')}&range=${range}`);
      return response.data;
    } catch {
      console.error('Failed to fetch Locations');
      return [];
    }
  },

  /** Fetch audit logs from backend */
  async getAuditLogs(tenants: string[], range: string): Promise<AuditLog[]> {
    try {
      const response = await apiClient.get<AuditLog[]>(`/audit_logs?tenants=${tenants.join(',')}&range=${range}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch AuditLogs:', error instanceof Error ? error.message : String(error));
      return [];
    }
  },

  /** Fetch top feature configs using backend data */
  async getFeatureConfigs(tenants: string[], range: string): Promise<FeatureConfig[]> {
    try {
      const response = await apiClient.get<FeatureConfig[]>(`/features/configs?tenants=${tenants.join(',')}&range=${range}`);
      return response.data;
    } catch {
      console.error('Failed to fetch feature configs');
      return [];
    }
  },

  /** Fetch retention data */
  async getRetentionData(tenants: string[], range: string): Promise<RetentionData[]> {
    try {
      const response = await apiClient.get<RetentionData[]>(`/metrics/retention?tenants=${tenants.join(',')}&range=${range}`);
      return response.data;
    } catch {
      return [];
    }
  },

  /** ─────────────── Deployment & Admin APIs ─────────────── */

  async getDeploymentInfo(): Promise<DeploymentInfoResponse> {
    try {
      const response = await apiClient.get<DeploymentInfoResponse>('/deployment/info');
      return response.data;
    } catch {
      console.warn('Failed to fetch deployment info, assuming CLOUD mode');
      return { mode: 'CLOUD', is_cloud: true, is_on_prem: false, local_tenant: null };
    }
  },

  async getAdminSummary(): Promise<AdminSummaryResponse> {
    try {
      const response = await apiClient.get<AdminSummaryResponse>('/admin/summary');
      return response.data;
    } catch {
      console.error('Failed to fetch admin summary');
      return { total_tenants: 0, total_events: 0, top_tenants: [] };
    }
  },

  async getAdminAppSummary(tenants: string[]): Promise<{ kpi: KPIMetric[]; insights: AIInsight[] }> {
    try {
      const response = await apiClient.get<AdminAppSummaryResponse>(`/admin/app/${tenants.join(',')}/summary`);
      const payload = response.data;
      
      const insights: AIInsight[] = (payload.insights || []).map((insight: BackendInsight, ix: number) => ({
        id: `ai-${ix}`,
        type: insight.severity === 'high' ? 'warning' as const : insight.severity === 'medium' ? 'info' as const : 'success' as const,
        title: insight.type || 'Backend Insight',
        message: insight.message || String(insight),
        priority: insight.severity,
        impact: insight.severity === 'high' ? 'High' : 'Medium',
        actionRequired: insight.severity === 'high',
      }));

      return { kpi: payload.kpi || [], insights };
    } catch {
      console.error('Failed to fetch admin app summary');
      return { kpi: [], insights: [] };
    }
  },

  /** Fetch transparency info showing what data goes to the cloud */
  async getTransparencyInfo(tenants: string[] | string): Promise<TransparencyResponse | null> {
    try {
      const tenantsStr = Array.isArray(tenants) ? tenants.join(',') : tenants;
      const response = await apiClient.get<TransparencyResponse>(`/transparency/cloud-data?tenants=${tenantsStr}`);
      return response.data;
    } catch {
      console.warn('Failed to fetch transparency info');
      return null;
    }
  },

  /* ─────────────── License vs Usage ─────────────── */

  async getLicenseUsage(tenants: string[], range: string): Promise<LicenseUsageResponse> {
    try {
      const response = await apiClient.get<LicenseUsageResponse>(`/license/usage?tenants=${tenants.join(',')}&range=${range}`);
      return response.data;
    } catch {
      console.error('Failed to fetch license usage');
      return { summary: { total_licensed: 0, total_used: 0, waste_pct: 0 }, licensed: [], unused_licensed: [], unlicensed_used: [] };
    }
  },

  async syncLicenses(tenants: string[], features: { feature_name: string; plan_tier: string; is_licensed?: boolean }[]): Promise<{ status: string }> {
    try {
      const response = await apiClient.post<{ status: string }>('/license/sync', { tenant_id: tenants.join(','), features });
      return response.data;
    } catch {
      console.error('Failed to sync licenses');
      return { status: 'error' };
    }
  },

  /* ─────────────── Tracking Toggles ─────────────── */

  async getTrackingToggles(tenants: string[]): Promise<TrackingToggleResponse> {
    try {
      const response = await apiClient.get<TrackingToggleResponse>(`/tracking/toggles?tenants=${tenants.join(',')}`);
      return response.data;
    } catch {
      console.error('Failed to fetch tracking toggles');
      return { toggles: [] };
    }
  },

  async setTrackingToggle(tenants: string[], featureName: string, isEnabled: boolean, actorEmail: string): Promise<{ status: string }> {
    try {
      const response = await apiClient.post<{ status: string }>('/tracking/toggles', {
        tenant_id: tenants.join(','),
        feature_name: featureName,
        is_enabled: isEnabled,
        actor_email: actorEmail,
      });
      return response.data;
    } catch {
      console.error('Failed to set tracking toggle');
      return { status: 'error' };
    }
  },

  /* ─────────────── Config Audit Log ─────────────── */

  async getConfigAuditLog(tenants: string[]): Promise<ConfigAuditResponse> {
    try {
      const response = await apiClient.get<ConfigAuditResponse>(`/config/audit-log?tenants=${tenants.join(',')}`);
      return response.data;
    } catch {
      console.error('Failed to fetch config audit log');
      return { logs: [] };
    }
  },

  /* ─────────────── User Journey ─────────────── */

  async getUserJourney(tenants: string[], userId: string): Promise<UserJourneyResponse> {
    try {
      const response = await apiClient.get<UserJourneyResponse>(`/journey/user?tenants=${tenants.join(',')}&user_id=${userId}`);
      return response.data;
    } catch {
      console.error('Failed to fetch user journey');
      return { events: [], sessions: [], total_events: 0, total_sessions: 0 };
    }
  },

  async getJourneyUsers(tenants: string[]): Promise<JourneyUsersResponse> {
    try {
      const response = await apiClient.get<JourneyUsersResponse>(`/journey/users?tenants=${tenants.join(',')}`);
      return response.data;
    } catch {
      console.error('Failed to fetch journey users');
      return { users: [] };
    }
  },

  /* ─────────────── Segmentation ─────────────── */

  async getSegmentationComparison(tenants: string[]): Promise<SegmentationResponse> {
    try {
      const response = await apiClient.get<SegmentationResponse>(`/segmentation/compare?tenants=${tenants.join(',')}`);
      return response.data;
    } catch {
      console.error('Failed to fetch segmentation');
      return { segments: [] };
    }
  },

  /* ─────────────── Predictive Adoption ─────────────── */

  async getPredictiveAdoption(tenants: string[], range: string): Promise<PredictiveResponse> {
    try {
      const response = await apiClient.get<PredictiveResponse>(`/predictive/adoption?tenants=${tenants.join(',')}&range=${range}`);
      return response.data;
    } catch {
      console.error('Failed to fetch predictive adoption');
      return { predictions: [], total_users: 0 };
    }
  },

  /* ─────────────── Tenant Comparison ─────────────── */

  async getTenantComparison(tenants: string[], range: string): Promise<{ tenants: Array<{ id: string; name: string; total_events: number; unique_users: number; active_features: number; growth_rate: number; conversion_rate: number; trend: Array<{ date: string; events: number }> }> }> {
    try {
      const response = await apiClient.get(`/tenants/compare?tenants=${tenants.join(',')}&range=${range}`);
      return response.data;
    } catch {
      console.error('Failed to fetch tenant comparison');
      return { tenants: [] };
    }
  },
};

export default apiClient;
