/**
 * Core type definitions for the analytics dashboard.
 * All data models, component props, and API response types are defined here
 * to enforce strict typing across the application.
 */

/* ─────────────── Data Models ─────────────── */

/** Represents a single analytics event tracked in the system */
export interface AnalyticsEvent {
  id: string;
  feature: string;
  usage: number;
  timestamp: string;
  tenantId: string;
  category: 'interaction' | 'navigation' | 'transaction' | 'system';
}

/** Represents a feature in the product being tracked */
export interface Feature {
  id: string;
  name: string;
  totalUsage: number;
  trend: number; // percentage change
  category: string;
}

/** Represents a tenant (customer organization) in the SaaS platform */
export interface Tenant {
  id: string;
  name: string;
  featureUsage: number;
  errors: number;
  adoptionRate: number;
  plan: 'free' | 'pro' | 'enterprise';
}

/* ─────────────── KPI Types ─────────────── */

/** Key performance indicator card data */
export interface KPIMetric {
  id: string;
  label: string;
  value: string;
  change: number; // percentage change from previous period
  changeDirection: 'up' | 'down';
  icon: string;
}

/* ─────────────── Chart Data Types ─────────────── */

/** Data point for time-series line/area charts */
export interface TimeSeriesDataPoint {
  date: string;
  visitors: number;
  pageViews: number;
}

/** Data point for feature usage line chart */
export interface FeatureUsageDataPoint {
  date: string;
  usage: number;
}

/** Data point for horizontal bar charts (top features, acquisition, etc.) */
export interface BarDataPoint {
  name: string;
  value: number;
  color?: string;
}

/** Data point for the pages-per-minute bar chart */
export interface PagesPerMinuteDataPoint {
  hour: string;
  value: number;
}

/** Funnel step in user journey */
export interface FunnelStep {
  label: string;
  value: number;
  dropOff: number; // percentage drop from previous step
  color: string;
}

/** Heatmap cell data */
export interface HeatmapCell {
  feature: string;
  day: string;
  intensity: number; // 0-100 scale
}

/** Feature activity heatmap row */
export interface FeatureActivityRow {
  feature: string;
  segments: { color: string; width: number }[];
  level: 'High' | 'Med' | 'Low';
}

/** Device breakdown data for donut/pie chart */
export interface DeviceBreakdown {
  name: string;
  value: number;
  color: string;
}

/** User acquisition channel */
export interface AcquisitionChannel {
  name: string;
  value: number;
  formattedValue: string;
}

/** Top page entry */
export interface TopPage {
  url: string;
  visits: string;
}

/** Location data for geography section */
export interface LocationData {
  country: string;
  visits: number;
}

/* ─────────────── AI Insights ─────────────── */

/** AI-generated insight */
export interface AIInsight {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  priority: 'high' | 'medium' | 'low';
}

/* ─────────────── Configuration & Governance ─────────────── */

/** Audit Log Entry */
export interface AuditLog {
  id: string;
  user: string;
  action: string;
  resource: string;
  timestamp: string;
  details: string;
}

/** Feature Route Mapping */
export interface FeatureConfig {
  id: string;
  pattern: string;
  featureName: string;
  category: string;
  isActive: boolean;
}

/** Retention & Cohort Data */
export interface RetentionData {
  cohort: string;
  users: number;
  month1: number;
  month2: number;
  month3: number;
}

/* ─────────────── Dashboard State ─────────────── */

/** Time range filter options */
export type TimeRange = 'Last 7 Days' | 'Last 30 Days' | 'Last 90 Days' | 'Custom';

/** Deployment mode toggle */
export type DeploymentMode = 'cloud' | 'on-prem';

/** Sidebar navigation items */
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  active?: boolean;
}

/** Complete dashboard state shape for Redux */
export interface DashboardState {
  timeRange: TimeRange;
  selectedTenant: string;
  deploymentMode: DeploymentMode;
  isLoading: boolean;
  isFetching: boolean;
  sidebarCollapsed: boolean;
  kpiMetrics: KPIMetric[];
  secondaryKpiMetrics: KPIMetric[];
  trafficData: TimeSeriesDataPoint[];
  featureUsageData: FeatureUsageDataPoint[];
  topFeatures: BarDataPoint[];
  funnelData: FunnelStep[];
  featureActivity: FeatureActivityRow[];
  tenants: Tenant[];
  aiInsights: AIInsight[];
  realTimeUsers: number;
  pagesPerMinute: PagesPerMinuteDataPoint[];
  topPages: TopPage[];
  deviceBreakdown: DeviceBreakdown[];
  acquisitionChannels: AcquisitionChannel[];
  locations: LocationData[];
  auditLogs: AuditLog[];
  featureConfigs: FeatureConfig[];
  retentionData: RetentionData[];
}
