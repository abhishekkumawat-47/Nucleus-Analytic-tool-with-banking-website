/**
 * Dashboard Redux slice.
 * Manages all dashboard state including filters, data, and UI state.
 * Uses createAsyncThunk for API calls with proper loading/error handling.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  DashboardState,
  TimeRange,
  DeploymentMode,
  KPIMetric,
  TimeSeriesDataPoint,
  FeatureUsageDataPoint,
  BarDataPoint,
  FunnelStep,
  FeatureActivityRow,
  Tenant,
  PagesPerMinuteDataPoint,
  TopPage,
  DeviceBreakdown,
  AcquisitionChannel,
  LocationData,
  AuditLog,
  FeatureConfig,
  RetentionData,
} from '@/types';
import { dashboardAPI } from './api';

/** Explicitly typed payload from the fetchDashboardData thunk */
interface DashboardDataPayload {
  kpiMetrics: KPIMetric[];
  secondaryKpiMetrics: KPIMetric[];
  trafficData: TimeSeriesDataPoint[];
  featureUsageData: FeatureUsageDataPoint[];
  topFeatures: BarDataPoint[];
  funnelData: FunnelStep[];
  featureActivity: FeatureActivityRow[];
  tenants: Tenant[];
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

interface DeploymentInfoPayload {
  mode: string;
  is_cloud: boolean;
  is_on_prem: boolean;
  local_tenant: string | null;
}

/** Initial state with empty arrays - data loads via async thunks */
const initialState: DashboardState = {
  timeRange: 'Last 7 Days',
  selectedTenant: 'nexabank',
  deploymentMode: 'cloud',
  isLoading: true,
  isFetching: false,
  sidebarCollapsed: false,
  kpiMetrics: [],
  secondaryKpiMetrics: [],
  trafficData: [],
  featureUsageData: [],
  topFeatures: [],
  funnelData: [],
  featureActivity: [],
  tenants: [],
  aiInsights: [],
  realTimeUsers: 0,
  pagesPerMinute: [],
  topPages: [],
  deviceBreakdown: [],
  acquisitionChannels: [],
  locations: [],
  auditLogs: [],
  featureConfigs: [],
  retentionData: [],
};

/* ─────────────── Async Thunks ─────────────── */

export const fetchDashboardData = createAsyncThunk<DashboardDataPayload, void, { state: { dashboard: DashboardState } }>(
  'dashboard/fetchAll',
  async (_, { getState }) => {
    const state = getState();
    const tenantId = state.dashboard.selectedTenant;

    const [
      kpiMetrics,
      secondaryKpiMetrics,
      trafficData,
      featureUsageData,
      topFeatures,
      funnelData,
      featureActivity,
      tenants,
      realTimeUsers,
      pagesPerMinute,
      topPages,
      deviceBreakdown,
      acquisitionChannels,
      locations,
      auditLogs,
      featureConfigs,
      retentionData,
    ] = await Promise.all([
      dashboardAPI.getKPIMetrics(tenantId),
      dashboardAPI.getSecondaryKPIMetrics(tenantId),
      dashboardAPI.getTrafficData(tenantId),
      dashboardAPI.getFeatureUsageData(tenantId),
      dashboardAPI.getTopFeatures(tenantId),
      dashboardAPI.getFunnelData(tenantId),
      dashboardAPI.getFeatureActivity(tenantId),
      dashboardAPI.getTenants(tenantId),
      dashboardAPI.getRealTimeUsers(tenantId),
      dashboardAPI.getPagesPerMinute(tenantId),
      dashboardAPI.getTopPages(tenantId),
      dashboardAPI.getDeviceBreakdown(tenantId),
      dashboardAPI.getAcquisitionChannels(tenantId),
      dashboardAPI.getLocations(tenantId),
      dashboardAPI.getAuditLogs(tenantId),
      dashboardAPI.getFeatureConfigs(tenantId),
      dashboardAPI.getRetentionData(tenantId),
    ]);

    return {
      kpiMetrics,
      secondaryKpiMetrics,
      trafficData,
      featureUsageData,
      topFeatures,
      funnelData,
      featureActivity,
      tenants,
      realTimeUsers,
      pagesPerMinute,
      topPages,
      deviceBreakdown,
      acquisitionChannels,
      locations,
      auditLogs,
      featureConfigs,
      retentionData,
    };
  }
);

export const fetchAIInsightsData = createAsyncThunk<ReturnType<typeof dashboardAPI.getAIInsights> extends Promise<infer T> ? T : never, void, { state: { dashboard: DashboardState } }>(
  'dashboard/fetchAIInsights',
  async (_, { getState }) => {
    const state = getState();
    const tenantId = state.dashboard.selectedTenant;
    return await dashboardAPI.getAIInsights(tenantId);
  }
);

export const fetchDeploymentInfo = createAsyncThunk<DeploymentInfoPayload>(
  'dashboard/fetchDeploymentInfo',
  async () => {
    return await dashboardAPI.getDeploymentInfo();
  }
);

/* ─────────────── Slice Definition ─────────────── */

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    /** Updates the selected time range filter */
    setTimeRange(state, action: PayloadAction<TimeRange>) {
      state.timeRange = action.payload;
    },
    /** Updates the selected tenant filter */
    setSelectedTenant(state, action: PayloadAction<string>) {
      state.selectedTenant = action.payload;
    },
    /** Toggles between cloud and on-prem deployment mode */
    setDeploymentMode(state, action: PayloadAction<DeploymentMode>) {
      state.deploymentMode = action.payload;
    },
    /** Toggles sidebar collapsed state */
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    /** Updates real-time user count (for live updates) */
    updateRealTimeUsers(state, action: PayloadAction<number>) {
      state.realTimeUsers = action.payload;
    },
    /** Updates KPI metrics dynamically from WebSockets */
    updateKPIMetrics(state, action: PayloadAction<KPIMetric[]>) {
      state.kpiMetrics = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        if (state.kpiMetrics.length === 0) {
          state.isLoading = true;
        }
        state.isFetching = true;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isFetching = false;
        state.kpiMetrics = action.payload.kpiMetrics;
        state.secondaryKpiMetrics = action.payload.secondaryKpiMetrics;
        state.trafficData = action.payload.trafficData;
        state.featureUsageData = action.payload.featureUsageData;
        state.topFeatures = action.payload.topFeatures;
        state.funnelData = action.payload.funnelData;
        state.featureActivity = action.payload.featureActivity;
        state.tenants = action.payload.tenants;
        state.realTimeUsers = action.payload.realTimeUsers;
        state.pagesPerMinute = action.payload.pagesPerMinute;
        state.topPages = action.payload.topPages;
        state.deviceBreakdown = action.payload.deviceBreakdown;
        state.acquisitionChannels = action.payload.acquisitionChannels;
        state.locations = action.payload.locations;
        state.auditLogs = action.payload.auditLogs;
        state.featureConfigs = action.payload.featureConfigs;
        state.retentionData = action.payload.retentionData;
      })
      .addCase(fetchAIInsightsData.fulfilled, (state, action) => {
        state.aiInsights = action.payload;
      })
      .addCase(fetchDashboardData.rejected, (state) => {
        state.isLoading = false;
        state.isFetching = false;
      })
      .addCase(fetchDeploymentInfo.fulfilled, (state, action) => {
        state.deploymentMode = action.payload.mode.toLowerCase() as DeploymentMode;
        if (action.payload.is_on_prem && action.payload.local_tenant) {
          state.selectedTenant = action.payload.local_tenant;
        }
      });
  },
});

export const {
  setTimeRange,
  setSelectedTenant,
  setDeploymentMode,
  toggleSidebar,
  updateRealTimeUsers,
  updateKPIMetrics,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
