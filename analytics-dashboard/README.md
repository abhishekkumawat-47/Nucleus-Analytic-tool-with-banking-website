# FinInsights Analytics Dashboard (Individual Docker Runbook)

This README is specific to the analytics dashboard module. It explains:

- Docker run options for this module
- Required configuration
- How the dashboard works
- Which visuals map to each dashboard page

## 1. Mandatory First Step (Do This Before Analysis)

Before using the dashboard for review, populate data from NexaBank simulation.

1. Open `http://localhost:3002/admin/simulate`
2. Select `NexaBank (bank_a)`
3. Set `User Count = 20`
4. Set `Historical Days = 10`
5. Click `Run Simulation`
6. Repeat for `SafeX Bank (bank_b)` with the same values

This is required to ensure both tenants have fresh comparable data.

## 2. Docker Run Options

### 2.1 Recommended: Full Stack from Root Compose

From the repository root:

```bash
docker compose up --build
```

Dashboard URL:

- `http://localhost:3001`

In this mode, the dashboard is already wired to:

- Analytics API (`analytics-api:8001`)
- Ingestion API (`ingestion-api:8000`)
- Shared RBAC file (`/rbac.json` mount)

### 2.2 Dashboard-Only Container (Advanced)

If you only want this module container and already have APIs running elsewhere:

```bash
cd analytics-dashboard
docker build -t fininsights-dashboard .
docker run --rm -it -p 3001:3001 --env-file .env.local fininsights-dashboard
```

Note: In dashboard-only mode you must ensure API hosts in env are reachable from this container/network.

## 3. Configuration

Create or update `analytics-dashboard/.env.local`:

```env
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="REPLACE_WITH_A_LONG_RANDOM_SECRET"
NEXT_PUBLIC_API_URL="/api"
NEXT_PUBLIC_ANALYTICS_WS_URL="ws://localhost:8001"
NEXT_PUBLIC_NEXABANK_URL="http://localhost:3002"
```

RBAC source:

- Root-level `rbac.json` is mounted into the dashboard container in root compose mode.

## 4. Validation Checklist

1. Open `http://localhost:3001`
2. Login via configured auth provider
3. Verify top tenant selector includes both banks
4. Open each core module page and confirm metrics render
5. Confirm real-time widget updates over WebSocket

## 5. Working Explanation

The dashboard is an analytics consumer layer.

1. It requests tenant-scoped metrics from Analytics API
2. It receives fast aggregated results from ClickHouse-backed endpoints
3. It streams real-time updates from WebSocket channels
4. It merges deterministic metrics with AI-generated summaries

## 6. Visual Mapping (Wireframes)

### 6.1 Platform Architecture

<p align="center">
	<img src="../wireframes/architecture.jpeg" alt="FinInsights Architecture" width="94%" />
</p>

### 6.2 Dashboard Overview

<p align="center">
	<img src="../wireframes/dashboard.png" alt="Dashboard Overview" width="94%" />
</p>

### 6.3 Feature Analytics

<p align="center">
	<img src="../wireframes/feature-analysis.png" alt="Feature Analytics" width="94%" />
</p>

### 6.4 Funnel Analysis

<p align="center">
	<img src="../wireframes/funnel.png" alt="Funnel Analysis" width="94%" />
</p>

### 6.5 Predictive Insights

<p align="center">
	<img src="../wireframes/predictive.png" alt="Predictive Insights" width="94%" />
</p>

### 6.6 Tenants Comparison

<p align="center">
	<img src="../wireframes/tenants.png" alt="Tenants Comparison" width="94%" />
</p>

### 6.7 Trust and Transparency

<p align="center">
	<img src="../wireframes/transparency.png" alt="Trust and Transparency" width="94%" />
</p>

### 6.8 AI Report

<p align="center">
	<img src="../wireframes/ai-report.jpeg" alt="AI Report" width="94%" />
</p>

## 7. Quick Troubleshooting

1. Empty charts:
	 run the admin simulation for both banks (20 users, 10 days).
2. Login denied:
	 verify your email in `rbac.json` and auth env variables.
3. API unavailable:
	 verify `http://localhost:8001/health` and dashboard-to-API host mapping.
