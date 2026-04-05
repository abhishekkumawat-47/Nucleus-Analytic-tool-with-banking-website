/**
 * Mock data for the analytics dashboard.
 * This simulates real analytics data that would come from a backend API.
 * Structured to match the design reference images exactly.
 */

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
  LocationData,
  AuditLog,
  FeatureConfig,
  RetentionData,
} from '@/types';

/* ─────────────── KPI Metrics ─────────────── */

export const kpiMetrics: KPIMetric[] = [
  {
    id: 'total-events',
    label: 'Total Events',
    value: '34,520',
    change: 12,
    changeDirection: 'up',
    icon: 'activity',
  },
  {
    id: 'active-features',
    label: 'Active Features',
    value: '18',
    change: 5,
    changeDirection: 'up',
    icon: 'layers',
  },
  {
    id: 'avg-response',
    label: 'Avg Response Time',
    value: '320 ms',
    change: 8,
    changeDirection: 'down',
    icon: 'clock',
  },
  {
    id: 'error-rate',
    label: 'Error Rate',
    value: '2.3%',
    change: 1.2,
    changeDirection: 'up',
    icon: 'alert-triangle',
  },
];

/** Secondary KPI set matching the first design image */
export const secondaryKpiMetrics: KPIMetric[] = [
  {
    id: 'total-visits',
    label: 'Total Visits',
    value: '82.4K',
    change: 15.8,
    changeDirection: 'up',
    icon: 'globe',
  },
  {
    id: 'unique-visitors',
    label: 'Unique Visitors',
    value: '45.3K',
    change: 12.4,
    changeDirection: 'up',
    icon: 'users',
  },
  {
    id: 'avg-session',
    label: 'Avg. Session Time',
    value: '3m 12s',
    change: 5.2,
    changeDirection: 'down',
    icon: 'clock',
  },
  {
    id: 'bounce-rate',
    label: 'Bounce Rate',
    value: '32.5%',
    change: 3.5,
    changeDirection: 'up',
    icon: 'trending-down',
  },
];

/* ─────────────── Traffic Overview (Line Chart) ─────────────── */

export const trafficData: TimeSeriesDataPoint[] = [
  { date: 'Mon', visitors: 28000, pageViews: 42000 },
  { date: 'Tue', visitors: 45000, pageViews: 68000 },
  { date: 'Wed', visitors: 32000, pageViews: 48000 },
  { date: 'Thu', visitors: 38000, pageViews: 55000 },
  { date: 'Fri', visitors: 52000, pageViews: 72000 },
  { date: 'Sat', visitors: 48000, pageViews: 65000 },
  { date: 'Sun', visitors: 35000, pageViews: 50000 },
];

/* ─────────────── Feature Usage Over Time ─────────────── */

export const featureUsageData: FeatureUsageDataPoint[] = [
  { date: 'Apr 10', usage: 1800 },
  { date: 'Apr 11', usage: 2200 },
  { date: 'Apr 12', usage: 2000 },
  { date: 'Apr 13', usage: 2400 },
  { date: 'Apr 14', usage: 4800 },
  { date: 'Apr 15', usage: 5200 },
  { date: 'Apr 16', usage: 5000 },
];

/* ─────────────── Top Features (Horizontal Bar) ─────────────── */

export const topFeatures: BarDataPoint[] = [
  { name: 'Loan Application', value: 4500, color: '#1a73e8' },
  { name: 'KYC Verification', value: 3800, color: '#1a73e8' },
  { name: 'Payment Gateway', value: 2700, color: '#1a73e8' },
  { name: 'Report Download', value: 1500, color: '#1a73e8' },
];

/* ─────────────── Funnel Data ─────────────── */

export const funnelData: FunnelStep[] = [
  { label: 'Login', value: 8000, dropOff: 35, color: '#1a73e8' },
  { label: 'Apply Loan', value: 5200, dropOff: 35, color: '#4285F4' },
  { label: 'Submit Form', value: 3100, dropOff: 40, color: '#8AB4F8' },
  { label: 'Approved', value: 1200, dropOff: 35, color: '#34A853' },
];

/* ─────────────── Feature Activity Heatmap ─────────────── */

export const featureActivity: FeatureActivityRow[] = [
  {
    feature: 'Loan Application',
    segments: [
      { color: '#F59E0B', width: 40 },
      { color: '#EF4444', width: 35 },
      { color: '#F59E0B', width: 25 },
    ],
    level: 'High',
  },
  {
    feature: 'KYC Verification',
    segments: [
      { color: '#1a73e8', width: 45 },
      { color: '#4285F4', width: 35 },
      { color: '#8AB4F8', width: 20 },
    ],
    level: 'Med',
  },
  {
    feature: 'EMI Calculator',
    segments: [
      { color: '#10B981', width: 30 },
      { color: '#34D399', width: 25 },
      { color: '#6EE7B7', width: 20 },
      { color: '#A7F3D0', width: 25 },
    ],
    level: 'Low',
  },
];

/* ─────────────── Tenant Comparison ─────────────── */

export const tenants: Tenant[] = [
  {
    id: 'nexabank',
    name: 'NexaBank',
    featureUsage: 78,
    errors: 12,
    adoptionRate: 85,
    plan: 'enterprise',
  },
];

/* ─────────────── AI Insights ─────────────── */

export const aiInsights: AIInsight[] = [
  {
    id: 'ai-1',
    title: 'High Drop-off Rate',
    message: '40% drop-off at Submit Form step',
    type: 'warning',
    priority: 'high',
  },
  {
    id: 'ai-2',
    title: 'KYC Verification Surge',
    message: 'KYC Verification usage up by 20%',
    type: 'success',
    priority: 'medium',
  },
  {
    id: 'ai-3',
    title: 'Unused Feature Detected',
    message: 'Feature X not used in last 30 days',
    type: 'info',
    priority: 'low',
  },
  {
    id: 'ai-4',
    title: 'Peak Usage Times',
    message: 'Peak usage detected on Fridays between 2-4 PM',
    type: 'info',
    priority: 'medium',
  },
  {
    id: 'ai-5',
    title: 'Error Rate Spike',
    message: 'Error rate spike correlates with Payment Gateway usage',
    type: 'warning',
    priority: 'high',
  },
];

/* ─────────────── Real-Time Users ─────────────── */

export const realTimeUsers = 128;

/* ─────────────── Pages Per Minute ─────────────── */

export const pagesPerMinute: PagesPerMinuteDataPoint[] = [
  { hour: '18', value: 15 },
  { hour: '22', value: 18 },
  { hour: '15', value: 12 },
  { hour: '12', value: 12 },
  { hour: '12', value: 8 },
];

/* ─────────────── Top Pages ─────────────── */

export const topPages: TopPage[] = [
  { pageUrl: '/home', totalEvents: 24500, features: [], comparisonPct: 100, rank: 1 },
  { pageUrl: '/product', totalEvents: 18300, features: [], comparisonPct: 75, rank: 2 },
  { pageUrl: '/blog', totalEvents: 12900, features: [], comparisonPct: 53, rank: 3 },
  { pageUrl: '/contact', totalEvents: 8400, features: [], comparisonPct: 35, rank: 4 },
];

/* ─────────────── Device Breakdown ─────────────── */

export const deviceBreakdown: DeviceBreakdown[] = [
  { name: 'Desktop', value: 62, color: '#1a73e8' },
  { name: 'Mobile', value: 28, color: '#4285F4' },
  { name: 'Tablet', value: 10, color: '#8AB4F8' },
];


/* ─────────────── Top Locations ─────────────── */

export const locations: LocationData[] = [
  { country: 'USA', visits: 82400 },
  { country: 'Germany', visits: 54200 },
  { country: 'United Kingdom', visits: 48900 },
  { country: 'India', visits: 32500 },
  { country: 'Canada', visits: 28400 },
  { country: 'France', visits: 22100 },
  { country: 'Japan', visits: 18500 },
  { country: 'Australia', visits: 15200 },
  { country: 'Brazil', visits: 12800 },
];

/* ─────────────── Navigation Items ─────────────── */

export const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', href: '/dashboard', active: true },
  { id: 'features', label: 'Feature Analytics', icon: 'bar-chart-3', href: '/features' },
  { id: 'funnel', label: 'Funnel Analysis', icon: 'filter', href: '/funnel' },
  { id: 'tenants', label: 'Tenants', icon: 'users', href: '/tenants' },
  { id: 'config', label: 'Configuration', icon: 'settings', href: '/settings' },
  { id: 'governance', label: 'Governance', icon: 'shield', href: '/governance' },
];

/* ─────────────── Configuration & Governance ─────────────── */

export const auditLogs: AuditLog[] = [
  { id: 'al-1', user: 'admin@acme.com', action: 'Update Route Config', resource: '/api/v1/auth', timestamp: '10 mins ago', details: 'Mapped to KYC feature' },
  { id: 'al-2', user: 'system', action: 'Daily Sync', resource: 'Event Pipeline', timestamp: '1 hour ago', details: 'Processed 34.5k events' },
  { id: 'al-3', user: 'security@acme.com', action: 'Toggle PII Masking', resource: 'Global Settings', timestamp: '2 hours ago', details: 'Enabled masking for IP addresses' },
  { id: 'al-4', user: 'jdoe@beta.ind', action: 'Create Filter', resource: 'Dashboard', timestamp: '5 hours ago', details: 'Created custom segment' },
];

export const featureConfigs: FeatureConfig[] = [
  { id: 'fc-1', pattern: '/api/v1/loan/apply', featureName: 'Loan Application', category: 'transaction', isActive: true },
  { id: 'fc-2', pattern: '/api/v1/verify/kyc', featureName: 'KYC Verification', category: 'security', isActive: true },
  { id: 'fc-3', pattern: '/pages/dashboard/emi', featureName: 'EMI Calculator', category: 'interaction', isActive: false },
  { id: 'fc-4', pattern: '/api/payment/process', featureName: 'Payment Gateway', category: 'transaction', isActive: true },
];

export const retentionData: RetentionData[] = [
  { cohort: 'Jan 2026', users: 1200, month1: 85, month2: 72, month3: 60 },
  { cohort: 'Feb 2026', users: 1540, month1: 88, month2: 74, month3: 65 },
  { cohort: 'Mar 2026', users: 1800, month1: 90, month2: 80, month3: 75 },
];
