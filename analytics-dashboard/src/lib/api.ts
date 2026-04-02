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

interface BackendAIReportResponse {
  tenant_id: string;
  report: string;
  cached?: boolean;
  generated_at?: string | null;
  insights?: BackendInsight[];
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
  url: string;
  visits: string;
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

interface DeploymentInfoResponse {
  mode: string;
  is_cloud: boolean;
  is_on_prem: boolean;
  local_tenant: string | null;
}

interface AdminSummaryResponse {
  total_tenants: number;
  total_events: number;
  top_tenants: Tenant[];
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
  licensed: unknown[];
  unused_licensed: unknown[];
  unlicensed_used: unknown[];
  nexabank_context?: {
    last_event_at?: string | null;
    pro_events_30d?: number;
    pro_feature_catalog?: unknown[];
    top_relevant_features?: unknown[];
  };
}

interface TrackingToggleResponse {
  toggles: unknown[];
}

interface ConfigAuditResponse {
  logs: unknown[];
}

interface UserJourneyResponse {
  events: unknown[];
  sessions: unknown[];
  total_events: number;
  total_sessions: number;
}

interface JourneyUsersResponse {
  users: unknown[];
}

interface SegmentationResponse {
  segments: unknown[];
}

interface PredictiveResponse {
  predictions: unknown[];
  total_users: number;
}

/* ─────────────── API Methods ─────────────── */

export const dashboardAPI = {
  /** Fetch KPI metrics for the dashboard header */
  async getKPIMetrics(tenantId: string = 'twitter'): Promise<KPIMetric[]> {
    try {
      const response = await apiClient.get<KPIMetric[]>(`/metrics/kpi?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      console.error('Failed to fetch KPI metrics');
      return [];
    }
  },

  /** Fetch Secondary KPI metrics */
  async getSecondaryKPIMetrics(tenantId: string = 'twitter'): Promise<KPIMetric[]> {
    try {
      const response = await apiClient.get<KPIMetric[]>(`/metrics/secondary_kpi?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      console.error('Failed to fetch Secondary KPI metrics');
      return [];
    }
  },

  /** Fetch traffic overview time series data */
  async getTrafficData(tenantId: string = 'twitter'): Promise<TimeSeriesDataPoint[]> {
    try {
      const response = await apiClient.get<BackendTrafficRow[]>(`/metrics/traffic?tenant_id=${tenantId}&days=7`);
      return response.data.map((r: BackendTrafficRow) => ({
        date: r.date,
        visitors: Number(r.visitors),
        pageViews: Number(r.pageViews)
      }));
    } catch {
      console.error('Failed to fetch traffic data');
      return [];
    }
  },

  /** Fetch feature usage over time data */
  async getFeatureUsageData(tenantId: string = 'twitter'): Promise<FeatureUsageDataPoint[]> {
    try {
      const response = await apiClient.get<BackendFeatureUsageRow[]>(`/metrics/feature_usage_series?tenant_id=${tenantId}&days=7`);
      return response.data.map((r: BackendFeatureUsageRow) => ({
        date: r.date,
        usage: Number(r.usage)
      }));
    } catch {
      console.error('Failed to fetch feature usage');
      return [];
    }
  },

  /** Fetch top features ranking using backend /features/usage endpoint */
  async getTopFeatures(tenantId: string = 'twitter'): Promise<BarDataPoint[]> {
    try {
      const response = await apiClient.get<{ usage: BackendFeatureUsageItem[] }>(`/features/usage?tenant_id=${tenantId}&days=7`);
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
  async getFunnelData(tenantId: string = 'twitter'): Promise<FunnelStep[]> {
    try {
      const { APP_REGISTRY } = await import('./feature-map');
      const appConfig = APP_REGISTRY[tenantId];
      const steps = appConfig?.funnelSteps?.join(',') || 'login,view_feed,post_tweet,like_tweet';
      
      const response = await apiClient.get<{ funnel: BackendFunnelStep[] }>(`/funnels?tenant_id=${tenantId}&steps=${steps}&window_minutes=60`);
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
  async getFeatureActivity(tenantId: string = 'twitter'): Promise<FeatureActivityRow[]> {
    try {
      const response = await apiClient.get<BackendActivityRow[]>(`/features/activity?tenant_id=${tenantId}`);
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
  async getFeatureHeatmap(tenantIds: string): Promise<{ is_compare: boolean; groups: string[]; activities: unknown[] }> {
    try {
      const response = await apiClient.get(`/features/heatmap?tenant_id=${tenantIds}`);
      return response.data;
    } catch {
      return {
        is_compare: false,
        groups: ['Error'],
        activities: []
      };
    }
  },

  /** Fetch tenant comparison data — passes tenant_id for RBAC */
  async getTenants(tenantId?: string): Promise<Tenant[]> {
    try {
      const params = tenantId ? `?tenant_id=${tenantId}` : '';
      const response = await apiClient.get<Tenant[]>(`/tenants${params}`);
      return response.data;
    } catch {
      return [];
    }
  },

  /** Fetch AI-generated insights using backend /insights endpoint */
  async getAIInsights(tenantId: string = 'twitter'): Promise<AIInsight[]> {
    try {
      const response = await apiClient.get<{ insights: BackendInsight[] }>(`/insights?tenant_id=${tenantId}`, { timeout: 1200000 });
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
    } catch {
      console.error('Failed to fetch AI Insights');
      return [];
    }
  },

  /** Fetch AI Summarization Report */
  async getAIReport(tenantId: string = 'nexabank'): Promise<string> {
    try {
      const response = await apiClient.get<BackendAIReportResponse>(`/ai_report?tenant_id=${tenantId}`, { timeout: 1200000 });
      return response.data.report || '';
    } catch {
      console.error('Failed to fetch AI Report');
      return '# AI Report Unavailable\n\nThe summarization model is currently unavailable or generating the report failed.';
    }
  },

  /** Fetch the latest stored AI report snapshot */
  async getLatestAIReport(tenantId: string = 'nexabank'): Promise<BackendAIReportResponse> {
    try {
      const response = await apiClient.get<BackendAIReportResponse>(`/ai_report?tenant_id=${tenantId}`, { timeout: 1200000 });
      return response.data;
    } catch {
      return { tenant_id: tenantId, report: '', cached: true, generated_at: null, insights: [] };
    }
  },

  /** Generate a fresh AI report on demand */
  async generateAIReport(tenantId: string = 'nexabank'): Promise<BackendAIReportResponse> {
    try {
      const response = await apiClient.get<BackendAIReportResponse>(`/ai_report?tenant_id=${tenantId}&force_refresh=true`, { timeout: 1200000 });
      return response.data;
    } catch {
      console.error('Failed to generate AI Report');
      return { tenant_id: tenantId, report: '', cached: false, generated_at: null, insights: [] };
    }
  },

  /** Fetch real-time active user count */
  async getRealTimeUsers(tenantId: string = 'twitter'): Promise<number> {
    try {
      const response = await apiClient.get<number>(`/metrics/realtime_users?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      return 0;
    }
  },

  /** Fetch pages per minute data */
  async getPagesPerMinute(tenantId: string = 'twitter'): Promise<PagesPerMinuteDataPoint[]> {
    try {
      const response = await apiClient.get<BackendPPMRow[]>(`/metrics/pages_per_minute?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      return [];
    }
  },

  /** Fetch top pages data */
  async getTopPages(tenantId: string = 'twitter'): Promise<TopPage[]> {
    try {
      const response = await apiClient.get<BackendTopPageRow[]>(`/metrics/top_pages?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      return [];
    }
  },

  /** Fetch device breakdown data */
  async getDeviceBreakdown(tenantId: string = 'twitter'): Promise<DeviceBreakdown[]> {
    try {
      const response = await apiClient.get<DeviceBreakdown[]>(`/metrics/devices?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      console.error('Failed to fetch device breakdown');
      return [];
    }
  },

  /** Fetch user acquisition channel data */
  async getAcquisitionChannels(tenantId: string = 'twitter'): Promise<AcquisitionChannel[]> {
    try {
      const response = await apiClient.get<BackendChannelRow[]>(`/metrics/channels?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      return [];
    }
  },

  /** Fetch top locations data from backend */
  async getLocations(tenantId: string = 'twitter'): Promise<LocationData[]> {
    try {
      const response = await apiClient.get<LocationData[]>(`/locations?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      console.error('Failed to fetch Locations');
      return [];
    }
  },

  /** Fetch audit logs from backend */
  async getAuditLogs(tenantId: string = 'twitter'): Promise<AuditLog[]> {
    try {
      const response = await apiClient.get<AuditLog[]>(`/audit_logs?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      console.error('Failed to fetch AuditLogs');
      return [];
    }
  },

  /** Fetch feature routing configurations dynamically from APP_REGISTRY */
  async getFeatureConfigs(tenantId: string = 'twitter'): Promise<FeatureConfig[]> {
    try {
      const { APP_REGISTRY } = await import('./feature-map');
      const appConfig = APP_REGISTRY[tenantId];
      if (!appConfig) return [];
      
      return appConfig.routes.map((route, idx) => ({
        id: `fc-${idx}`,
        pattern: route.pattern,
        featureName: route.featureName,
        category: route.category,
        isActive: true,
      }));
    } catch {
      return [];
    }
  },

  /** Fetch cohort retention data */
  async getRetentionData(tenantId: string = 'twitter'): Promise<RetentionData[]> {
    try {
      const response = await apiClient.get<RetentionData[]>(`/metrics/retention?tenant_id=${tenantId}`);
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

  async getAdminAppSummary(tenantId: string): Promise<{ kpi: KPIMetric[]; insights: AIInsight[] }> {
    try {
      const response = await apiClient.get<AdminAppSummaryResponse>(`/admin/app/${tenantId}/summary`);
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
  async getTransparencyInfo(tenantId: string = 'twitter'): Promise<TransparencyResponse | null> {
    try {
      const response = await apiClient.get<TransparencyResponse>(`/transparency/cloud-data?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      console.warn('Failed to fetch transparency info');
      return null;
    }
  },

  /* ─────────────── License vs Usage ─────────────── */

  async getLicenseUsage(tenantId: string): Promise<LicenseUsageResponse> {
    try {
      const response = await apiClient.get<LicenseUsageResponse>(`/license/usage?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      console.error('Failed to fetch license usage');
      return { summary: { total_licensed: 0, total_used: 0, waste_pct: 0 }, licensed: [], unused_licensed: [], unlicensed_used: [] };
    }
  },

  async syncLicenses(tenantId: string, features: { feature_name: string; plan_tier: string; is_licensed?: boolean }[]): Promise<{ status: string }> {
    try {
      const response = await apiClient.post<{ status: string }>('/license/sync', { tenant_id: tenantId, features });
      return response.data;
    } catch {
      console.error('Failed to sync licenses');
      return { status: 'error' };
    }
  },

  /* ─────────────── Tracking Toggles ─────────────── */

  async getTrackingToggles(tenantId: string): Promise<TrackingToggleResponse> {
    try {
      const response = await apiClient.get<TrackingToggleResponse>(`/tracking/toggles?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      console.error('Failed to fetch tracking toggles');
      return { toggles: [] };
    }
  },

  async setTrackingToggle(tenantId: string, featureName: string, isEnabled: boolean, actorEmail: string): Promise<{ status: string }> {
    try {
      const response = await apiClient.post<{ status: string }>('/tracking/toggles', {
        tenant_id: tenantId,
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

  async getConfigAuditLog(tenantId: string): Promise<ConfigAuditResponse> {
    try {
      const response = await apiClient.get<ConfigAuditResponse>(`/config/audit-log?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      console.error('Failed to fetch config audit log');
      return { logs: [] };
    }
  },

  /* ─────────────── User Journey ─────────────── */

  async getUserJourney(tenantId: string, userId: string): Promise<UserJourneyResponse> {
    try {
      const response = await apiClient.get<UserJourneyResponse>(`/journey/user?tenant_id=${tenantId}&user_id=${userId}`);
      return response.data;
    } catch {
      console.error('Failed to fetch user journey');
      return { events: [], sessions: [], total_events: 0, total_sessions: 0 };
    }
  },

  async getJourneyUsers(tenantId: string): Promise<JourneyUsersResponse> {
    try {
      const response = await apiClient.get<JourneyUsersResponse>(`/journey/users?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      console.error('Failed to fetch journey users');
      return { users: [] };
    }
  },

  /* ─────────────── Segmentation ─────────────── */

  async getSegmentationComparison(tenantId: string): Promise<SegmentationResponse> {
    try {
      const response = await apiClient.get<SegmentationResponse>(`/segmentation/compare?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      console.error('Failed to fetch segmentation');
      return { segments: [] };
    }
  },

  /* ─────────────── Predictive Adoption ─────────────── */

  async getPredictiveAdoption(tenantId: string): Promise<PredictiveResponse> {
    try {
      const response = await apiClient.get<PredictiveResponse>(`/predictive/adoption?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      console.error('Failed to fetch predictive adoption');
      return { predictions: [], total_users: 0 };
    }
  },
};

export default apiClient;
