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
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

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
  (config) => {
    // Add auth token when backend is connected
    // const token = getAuthToken();
    // if (token) config.headers.Authorization = `Bearer ${token}`;
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
      const response = await apiClient.get(`/funnels?tenant_id=${tenantId}&steps=login,view_feed,post_tweet,like_tweet&window_minutes=60`);
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

  /** Fetch tenant comparison data */
  async getTenants(): Promise<Tenant[]> {
    try {
      const response = await apiClient.get('/tenants');
      return response.data;
    } catch (err) {
      console.error('Failed to fetch tenants, using mock', err);
      return mockData.tenants;
    }
  },

  /** Fetch AI-generated insights using backend /insights endpoint */
  async getAIInsights(tenantId: string = 'twitter'): Promise<AIInsight[]> {
    try {
      const response = await apiClient.get(`/insights?tenant_id=${tenantId}`);
      const insights = response.data.insights || [];
      return insights.map((insight: any, ix: number) => ({
        id: `ai-${ix}`,
        type: insight.severity === 'high' ? 'warning' : insight.severity === 'medium' ? 'info' : 'success',
        title: insight.type || 'Backend Insight',
        description: insight.message || insight,
        impact: insight.severity === 'high' ? 'High' : 'Medium',
        actionRequired: insight.severity === 'high',
      }));
    } catch (err) {
      console.error('Failed to fetch AI Insights, using mock', err);
      return mockData.aiInsights;
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

  /** Fetch feature routing configurations */
  async getFeatureConfigs(tenantId: string = 'twitter'): Promise<FeatureConfig[]> {
    try {
      const response = await apiClient.get(`/features/configs?tenant_id=${tenantId}`);
      return response.data;
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
};

export default apiClient;
