/**
 * Axios API client abstraction.
 * Provides a configured axios instance and typed API methods.
 * Currently uses mock data but structured for easy backend integration.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
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
import * as mockData from './mock-data';

/** Base API configuration */
const API_BASE_URL = 'http://localhost:8001';

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
  async (config) => {
    try {
      // Safely import getSession
      const { getSession } = await import('next-auth/react');
      const session = await getSession();
      if (session?.user) {
        config.headers['X-User-Email'] = session.user.email;
        if (session.user.role) {
          config.headers['X-User-Role'] = session.user.role;
        }
      }
    } catch (err) {
      // Ignore if called in non-browser context
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    // Centralized error handling
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

/**
 * Simulates API delay to test loading states.
 * Replace with actual API calls when backend is ready.
 */
function simulateDelay<T>(data: T, delayMs = 800): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delayMs));
}

/* ─────────────── API Methods ─────────────── */

export const dashboardAPI = {
  /** Fetch KPI metrics for the dashboard header */
  async getKPIMetrics(tenantId: string = 'twitter'): Promise<KPIMetric[]> {
    try {
      const response = await apiClient.get(`/metrics/kpi?tenant_id=${tenantId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch KPI metrics, using mock', err);
      return mockData.kpiMetrics;
    }
  },

  /** Fetch Secondary KPI metrics */
  async getSecondaryKPIMetrics(tenantId: string = 'twitter'): Promise<KPIMetric[]> {
    try {
      const response = await apiClient.get(`/metrics/secondary_kpi?tenant_id=${tenantId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch Secondary KPI metrics, using mock', err);
      return mockData.secondaryKpiMetrics;
    }
  },

  /** Fetch traffic overview time series data */
  async getTrafficData(tenantId: string = 'twitter'): Promise<TimeSeriesDataPoint[]> {
    try {
      const response = await apiClient.get(`/metrics/traffic?tenant_id=${tenantId}&days=7`);
      return response.data.map((r: any) => ({
        date: r.date,
        visitors: Number(r.visitors),
        pageViews: Number(r.pageViews)
      }));
    } catch (err) {
      console.error('Failed to fetch traffic data, using mock', err);
      return mockData.trafficData;
    }
  },

  /** Fetch feature usage over time data */
  async getFeatureUsageData(tenantId: string = 'twitter'): Promise<FeatureUsageDataPoint[]> {
    try {
      const response = await apiClient.get(`/metrics/feature_usage_series?tenant_id=${tenantId}&days=7`);
      return response.data.map((r: any) => ({
        date: r.date,
        usage: Number(r.usage)
      }));
    } catch (err) {
      console.error('Failed to fetch feature usage, using mock', err);
      return mockData.featureUsageData;
    }
  },

  /** Fetch top features ranking using backend /features/usage endpoint */
  async getTopFeatures(tenantId: string = 'twitter'): Promise<BarDataPoint[]> {
    try {
      const response = await apiClient.get(`/features/usage?tenant_id=${tenantId}&days=7`);
      const backendUsage = response.data.usage || [];
      
      // Map to frontend shape
      return backendUsage.map((item: any) => ({
        name: item.event_name,
        value: item.total_interactions,
        trend: 0, 
        status: 'stable', 
      }));
    } catch (err) {
      console.error('Failed to fetch top features from backend, using mock', err);
      return mockData.topFeatures;
    }
  },

  /** Fetch user journey funnel data using backend /funnels endpoint */
  async getFunnelData(tenantId: string = 'twitter'): Promise<FunnelStep[]> {
    try {
      // Dynamically resolve funnel steps from APP_REGISTRY
      const { APP_REGISTRY } = await import('./feature-map');
      const appConfig = APP_REGISTRY[tenantId];
      const steps = appConfig?.funnelSteps?.join(',') || 'login,view_feed,post_tweet,like_tweet';
      
      const response = await apiClient.get(`/funnels?tenant_id=${tenantId}&steps=${steps}&window_minutes=60`);
      const funnel = response.data.funnel || [];
      
      return funnel.map((step: any) => ({
        step: step.step,
        label: step.event_name,
        value: step.users_completed,
        dropOff: step.drop_off_pct,
        timeToNextStep: '-',
      }));
    } catch (err) {
      console.error('Failed to fetch funnel from backend, using mock', err);
      return mockData.funnelData;
    }
  },

  /** Fetch feature activity heatmap data */
  async getFeatureActivity(tenantId: string = 'twitter'): Promise<FeatureActivityRow[]> {
    try {
      const response = await apiClient.get(`/features/activity?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      return mockData.featureActivity;
    }
  },

  /** Fetch tenant comparison data — scoped to the selected tenant for app_admins */
  async getTenants(tenantId?: string): Promise<Tenant[]> {
    try {
      const response = await apiClient.get('/tenants');
      const allTenants: Tenant[] = response.data;
      
      // If a specific tenantId is selected, filter to only show that tenant
      if (tenantId) {
        return allTenants.filter(
          (t: Tenant) => t.id === tenantId || t.name?.toLowerCase() === tenantId.toLowerCase()
        );
      }
      return allTenants;
    } catch (err) {
      console.error('Failed to fetch tenants, using mock', err);
      return mockData.tenants;
    }
  },

  /** Fetch AI-generated insights using backend /insights endpoint */
  async getAIInsights(tenantId: string = 'twitter'): Promise<AIInsight[]> {
    try {
      const response = await apiClient.get(`/insights?tenant_id=${tenantId}`, { timeout: 1200000 });
      const insights = response.data.insights || [];
      return insights.map((insight: any, ix: number) => ({
        id: `ai-${ix}`,
        type: insight.severity === 'high' ? 'warning' : insight.severity === 'medium' ? 'info' : 'success',
        title: insight.type || 'Backend Insight',
        message: insight.message || insight,
        impact: insight.severity === 'high' ? 'High' : 'Medium',
        actionRequired: insight.severity === 'high',
      }));
    } catch (err) {
      console.error('Failed to fetch AI Insights, using mock', err);
      return mockData.aiInsights;
    }
  },

  /** Fetch AI Summarization Report */
  async getAIReport(tenantId: string = 'nexabank'): Promise<string> {
    try {
      const response = await apiClient.get(`/ai_report?tenant_id=${tenantId}`, { timeout: 1200000 });
      return response.data.report || '';
    } catch (err) {
      console.error('Failed to fetch AI Report', err);
      return '# AI Report Unavailable\n\nThe summarization model is currently unavailable or generating the report failed.';
    }
  },

  /** Fetch real-time active user count */
  async getRealTimeUsers(tenantId: string = 'twitter'): Promise<number> {
    try {
      const response = await apiClient.get(`/metrics/realtime_users?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      return 0;
    }
  },

  /** Fetch pages per minute data */
  async getPagesPerMinute(tenantId: string = 'twitter'): Promise<PagesPerMinuteDataPoint[]> {
    try {
      const response = await apiClient.get(`/metrics/pages_per_minute?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      return [];
    }
  },

  /** Fetch top pages data */
  async getTopPages(tenantId: string = 'twitter'): Promise<TopPage[]> {
    try {
      const response = await apiClient.get(`/metrics/top_pages?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      return mockData.topPages;
    }
  },

  /** Fetch device breakdown data */
  async getDeviceBreakdown(tenantId: string = 'twitter'): Promise<DeviceBreakdown[]> {
    try {
      const response = await apiClient.get(`/metrics/devices?tenant_id=${tenantId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch device breakdown, using mock', err);
      return mockData.deviceBreakdown;
    }
  },

  /** Fetch user acquisition channel data */
  async getAcquisitionChannels(tenantId: string = 'twitter'): Promise<AcquisitionChannel[]> {
    try {
      const response = await apiClient.get(`/metrics/channels?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      return mockData.acquisitionChannels;
    }
  },

  /** Fetch top locations data from backend */
  async getLocations(tenantId: string = 'twitter'): Promise<LocationData[]> {
    try {
      const response = await apiClient.get(`/locations?tenant_id=${tenantId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch Locations, using mock', err);
      return mockData.locations;
    }
  },

  /** Fetch audit logs from backend */
  async getAuditLogs(tenantId: string = 'twitter'): Promise<AuditLog[]> {
    try {
      const response = await apiClient.get(`/audit_logs?tenant_id=${tenantId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch AuditLogs, using mock', err);
      return mockData.auditLogs;
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
      return mockData.featureConfigs;
    }
  },

  /** Fetch cohort retention data */
  async getRetentionData(tenantId: string = 'twitter'): Promise<RetentionData[]> {
    try {
      const response = await apiClient.get(`/metrics/retention?tenant_id=${tenantId}`);
      return response.data;
    } catch {
      return mockData.retentionData;
    }
  },

  /** ─────────────── Deployment & Admin APIs ─────────────── */

  /** Fetch current backend deployment mode and local tenant (if on-prem) */
  async getDeploymentInfo(): Promise<{ mode: string; is_cloud: boolean; is_on_prem: boolean; local_tenant: string | null }> {
    try {
      const response = await apiClient.get('/deployment/info');
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch deployment info, assuming CLOUD mode', err);
      return { mode: 'CLOUD', is_cloud: true, is_on_prem: false, local_tenant: null };
    }
  },

  /** Fetch global admin summary (CLOUD mode only) */
  async getAdminSummary(): Promise<{ total_tenants: number; total_events: number; top_tenants: any[] }> {
    try {
      const response = await apiClient.get('/admin/summary');
      return response.data;
    } catch (err) {
      console.error('Failed to fetch admin summary', err);
      return { total_tenants: 0, total_events: 0, top_tenants: [] };
    }
  },

  /** Fetch single app lightweight summary (CLOUD mode only) */
  async getAdminAppSummary(tenantId: string): Promise<{ kpi: KPIMetric[]; insights: AIInsight[] }> {
    try {
      const response = await apiClient.get(`/admin/app/${tenantId}/summary`);
      const payload = response.data;
      
      const insights = (payload.insights || []).map((insight: any, ix: number) => ({
        id: `ai-${ix}`,
        type: insight.severity === 'high' ? 'warning' : insight.severity === 'medium' ? 'info' : 'success',
        title: insight.type || 'Backend Insight',
        description: insight.message || insight,
        impact: insight.severity === 'high' ? 'High' : 'Medium',
        actionRequired: insight.severity === 'high',
      }));

      return { kpi: payload.kpi || mockData.kpiMetrics, insights };
    } catch (err) {
      console.error('Failed to fetch admin app summary', err);
      return { kpi: mockData.kpiMetrics, insights: mockData.aiInsights };
    }
  },

  /** Fetch transparency info showing what data goes to the cloud */
  async getTransparencyInfo(tenantId: string = 'twitter'): Promise<any> {
    try {
      const response = await apiClient.get(`/transparency/cloud-data?tenant_id=${tenantId}`);
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch transparency info', err);
      return null;
    }
  },

  /* ─────────────── License vs Usage ─────────────── */

  async getLicenseUsage(tenantId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/license/usage?tenant_id=${tenantId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch license usage', err);
      return { summary: { total_licensed: 0, total_used: 0, waste_pct: 0 }, licensed: [], unused_licensed: [], unlicensed_used: [] };
    }
  },

  async syncLicenses(tenantId: string, features: any[]): Promise<any> {
    try {
      const response = await apiClient.post('/license/sync', { tenant_id: tenantId, features });
      return response.data;
    } catch (err) {
      console.error('Failed to sync licenses', err);
      return { status: 'error' };
    }
  },

  /* ─────────────── Tracking Toggles ─────────────── */

  async getTrackingToggles(tenantId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/tracking/toggles?tenant_id=${tenantId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch tracking toggles', err);
      return { toggles: [] };
    }
  },

  async setTrackingToggle(tenantId: string, featureName: string, isEnabled: boolean, actorEmail: string): Promise<any> {
    try {
      const response = await apiClient.post('/tracking/toggles', {
        tenant_id: tenantId,
        feature_name: featureName,
        is_enabled: isEnabled,
        actor_email: actorEmail,
      });
      return response.data;
    } catch (err) {
      console.error('Failed to set tracking toggle', err);
      return { status: 'error' };
    }
  },

  /* ─────────────── Config Audit Log ─────────────── */

  async getConfigAuditLog(tenantId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/config/audit-log?tenant_id=${tenantId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch config audit log', err);
      return { logs: [] };
    }
  },

  /* ─────────────── User Journey ─────────────── */

  async getUserJourney(tenantId: string, userId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/journey/user?tenant_id=${tenantId}&user_id=${userId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch user journey', err);
      return { events: [], sessions: [], total_events: 0, total_sessions: 0 };
    }
  },

  async getJourneyUsers(tenantId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/journey/users?tenant_id=${tenantId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch journey users', err);
      return { users: [] };
    }
  },

  /* ─────────────── Segmentation ─────────────── */

  async getSegmentationComparison(tenantId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/segmentation/compare?tenant_id=${tenantId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch segmentation', err);
      return { segments: [] };
    }
  },

  /* ─────────────── Predictive Adoption ─────────────── */

  async getPredictiveAdoption(tenantId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/predictive/adoption?tenant_id=${tenantId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch predictive adoption', err);
      return { predictions: [], total_users: 0 };
    }
  },
};

export default apiClient;
