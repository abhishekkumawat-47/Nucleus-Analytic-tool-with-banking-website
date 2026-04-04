<p align="center">
  <img src="analytics-dashboard/public/logo1.png" alt="Nucleus Logo" width="80" />
</p>

<h1 align="center">Nucleus — Feature Intelligence & Usage Analytics Platform</h1>

<p align="center">
  <b>Enterprise-grade, real-time feature analytics platform with an integrated multi-tenant banking application (NexaBank), AI-powered reporting, and a full-stack analytics dashboard — all orchestrated via Docker Compose.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/ClickHouse-24.3-FFCC01?logo=clickhouse&logoColor=black" />
  <img src="https://img.shields.io/badge/Kafka-7.4-231F20?logo=apachekafka&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Ollama-LLM-FF6F61" />
</p>

---

## 📋 Table of Contents

- [What Is This Project?](#-what-is-this-project)
- [Architecture Overview](#-architecture-overview)
- [Service Port Map](#-service-port-map)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start — Run Everything](#-quick-start--run-everything)
- [🔑 Setting Up a New Admin for NexaBank (For Judges)](#-setting-up-a-new-admin-for-nexabank-for-judges)
- [Project Structure](#-project-structure)
- [API Reference (Key Endpoints)](#-api-reference-key-endpoints)
- [RBAC & Access Control](#-rbac--access-control)
- [Environment Variables](#-environment-variables)
- [Troubleshooting](#-troubleshooting)

---

## 🧠 What Is This Project?

**Nucleus** is a production-grade **Feature Intelligence & Usage Analytics** platform built for multi-tenant SaaS environments. It solves the problem of understanding *how users interact with product features in real-time* — across multiple client apps — and turns that raw telemetry into **actionable insights, funnel analysis, retention metrics, and AI-powered reports**.

The platform is demonstrated through a fully functional **NexaBank** — a multi-tenant digital banking application that acts as the "client app" generating real telemetry events that flow through the Nucleus analytics pipeline.

### What It Does (End-to-End)

1. **NexaBank** (the banking app) generates real user events — logins, transfers, KYC flows, loan applications, etc.
2. Events are ingested via the **Ingestion API** and streamed through **Kafka** for reliable, decoupled processing.
3. A **Processor Worker** consumes Kafka messages and batch-inserts them into **ClickHouse** (columnar OLAP database).
4. The **Analytics API** reads from ClickHouse to power real-time dashboards with KPIs, funnels, heatmaps, segmentation, retention, predictive scores, and more.
5. The **Analytics Dashboard** visualizes everything with a premium, role-based UI — including **AI-generated reports** powered by a local **Ollama LLM** (llama3.2:1b).
6. A **Twitter/X Demo App** showcases the SDK integration in a social media context.

### Key Features

| Feature | Description |
|---------|-------------|
| **Real-time Event Streaming** | Kafka-backed ingestion with WebSocket push to dashboards |
| **Funnel Analysis** | ClickHouse `windowFunnel()` for multi-step conversion tracking |
| **Retention Cohorts** | Day-over-day and week-over-week user retention analysis |
| **Feature Heatmaps** | Visual adoption matrices across features and tenants |
| **AI Reports** | LLM-powered analytical reports with executive summaries (Ollama) |
| **Predictive Adoption** | ML-driven feature adoption scoring and forecasting |
| **RBAC** | Google OAuth + role-based access (Super Admin / App Admin / User) |
| **Multi-Tenant** | Full tenant isolation with per-tenant scoped analytics |
| **License vs Usage** | Track which paid features are actually being used |
| **NexaBank** | Full banking app: accounts, transfers, loans, KYC, investments |

---

## 🏗 Architecture Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           CLIENT APPLICATIONS                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐    │
│  │  NexaBank App    │  │  Twitter/X Demo  │  │  Any Future App      │    │
│  │  (React/Next.js) │  │  (Next.js)       │  │  (SDK Integration)   │    │
│  │  :3002           │  │  :3000           │  │                      │    │
│  └──────┬───────────┘  └──────┬───────────┘  └──────────────────────┘    │
│         │ HTTP Events         │ HTTP Events                              │
└─────────┼─────────────────────┼──────────────────────────────────────────┘
          ▼                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        NUCLEUS ANALYTICS BACKEND                         │
│                                                                          │
│  ┌──────────────┐    ┌─────────┐    ┌──────────────┐    ┌────────────┐  │
│  │ Ingestion API│───▶│  Kafka  │───▶│   Processor  │───▶│ ClickHouse │  │
│  │ (FastAPI)    │    │ Broker  │    │   Worker     │    │   (OLAP)   │  │
│  │ :8000        │    │ :9092   │    │ (Consumer)   │    │ :8123/:9000│  │
│  └──────────────┘    └─────────┘    └──────────────┘    └─────┬──────┘  │
│                                                               │         │
│  ┌──────────────┐                                    ┌────────▼───────┐ │
│  │    Ollama    │◀───────────────────────────────────│ Analytics API  │ │
│  │  (LLM AI)   │          LLM Queries               │   (FastAPI)    │ │
│  │ :11434      │                                     │   :8001        │ │
│  └──────────────┘                                    └────────┬───────┘ │
│                                                               │         │
└───────────────────────────────────────────────────────────────┼─────────┘
                                                                │
                                                    ┌───────────▼──────────┐
                                                    │  Analytics Dashboard │
                                                    │  (Next.js + React)   │
                                                    │  :3001               │
                                                    │  Google OAuth RBAC   │
                                                    └──────────────────────┘
```

### Data Flow

```
User Action → NexaBank Frontend → NexaBank Backend → Ingestion API → Kafka → Processor Worker → ClickHouse
                                                                                                      ↓
                        Analytics Dashboard ← Analytics API ← ClickHouse ← Ollama (AI Reports)
```

---

## 🔌 Service Port Map

| Port | Service | Technology | Description |
|------|---------|-----------|-------------|
| **3002** | NexaBank Frontend | Next.js 15 | Full banking app UI (login, dashboard, transfers, loans, KYC) |
| **5000** | NexaBank Backend | Node.js / Express / Prisma | Banking REST API + WebSocket (Supabase PostgreSQL) |
| **3001** | Analytics Dashboard | Next.js 15 | Admin analytics UI with charts, funnels, AI reports |
| **3000** | Twitter/X Demo | Next.js | Social media demo app showcasing SDK integration |
| **8000** | Ingestion API | Python / FastAPI | Event ingestion endpoint → Kafka producer |
| **8001** | Analytics API | Python / FastAPI | Read-heavy analytics queries → ClickHouse |
| **9092** | Kafka Broker | Confluent Kafka 7.4 | Message broker for event streaming |
| **2181** | Zookeeper | Confluent Zookeeper | Kafka coordination service |
| **8123** | ClickHouse (HTTP) | ClickHouse 24.3 | OLAP database HTTP interface |
| **9000** | ClickHouse (Native) | ClickHouse 24.3 | OLAP database native interface |
| **11434** | Ollama | Ollama (llama3.2:1b) | Local LLM server for AI report generation |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons |
| **Banking Backend** | Node.js, Express.js, Prisma ORM, PostgreSQL (Supabase), WebSocket |
| **Analytics Backend** | Python 3.11, FastAPI, uvicorn, WebSocket |
| **Message Broker** | Apache Kafka (Confluent 7.4) + Zookeeper |
| **OLAP Database** | ClickHouse 24.3 (columnar, MergeTree, windowFunnel, materialized views) |
| **AI / LLM** | Ollama (llama3.2:1b) — local, no cloud API keys needed |
| **Auth** | Google OAuth 2.0 (NextAuth.js) for analytics dashboard |
| **Auth (NexaBank)** | JWT + bcrypt + HTTP-only cookies |
| **Database (NexaBank)** | Supabase (hosted PostgreSQL) via Prisma |
| **Orchestration** | Docker Compose (12 services) |

---

## ✅ Prerequisites

Before running the project, ensure you have:

| Requirement | Version | Check |
|-------------|---------|-------|
| **Docker Desktop** | 4.x+ | `docker --version` |
| **Docker Compose** | v2+ (bundled with Docker Desktop) | `docker compose version` |
| **Git** | Any | `git --version` |
| **Python** | 3.10+ (for admin utility script only) | `python --version` |
| **RAM** | 8 GB minimum (Ollama + Kafka + ClickHouse are memory-intensive) | — |
| **Disk** | ~10 GB free (Docker images + Ollama model) | — |

> **No Node.js installation required** — all Node services run inside Docker containers.

---

## 🚀 Quick Start — Run Everything

### 1. Clone the Repository

```bash
git clone https://github.com/abhishekkumawat-47/Nucleus-Analytic-tool-with-banking-website.git
cd Nucleus-Analytic-tool-with-banking-website
```

### 2. Start All Services

```bash
docker compose up --build
```

> ⏳ **First run takes 5–10 minutes** to pull all Docker images, build containers, and download the Ollama LLM model (~1.3GB). Subsequent runs are much faster.

### 3. Wait for Services to Initialize

Watch the logs for these indicators that everything is ready:

```
✅ Kafka topic "feature-events" created
✅ ClickHouse schema initialized
🚀 Server running on http://localhost:5000     (NexaBank Backend)
🚀 Ingestion API ready on :8000
🚀 Analytics API ready on :8001
```

### 4. Access the Applications

| Application | URL | Purpose |
|------------|-----|---------|
| **NexaBank App** | [http://localhost:3002](http://localhost:3002) | Banking application (sign up, login, use features) |
| **Analytics Dashboard** | [http://localhost:3001](http://localhost:3001) | Admin analytics (Google OAuth login required) |
| **Twitter/X Demo** | [http://localhost:3000](http://localhost:3000) | Social media demo (Google OAuth login) |
| **Ingestion API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger UI for event ingestion |
| **Analytics API Docs** | [http://localhost:8001/docs](http://localhost:8001/docs) | Swagger UI for analytics queries |

### 5. Stop All Services

```bash
docker compose down        # Stop containers (data persists in volumes)
docker compose down -v     # Stop containers AND delete all data volumes
```

---

## 🔑 Setting Up a New Admin for NexaBank (For Judges)

Follow these steps to create a **new user account** in the NexaBank app, **promote them to Admin**, and then **access the full analytics dashboard** with their email.

### Step 1: Sign Up on NexaBank

1. Open [http://localhost:3002](http://localhost:3002) in your browser.
2. Click **"Get Started"** or navigate to [http://localhost:3002/register](http://localhost:3002/register).
3. Fill in the 3-step registration form:

   | Field | Example Value | Notes |
   |-------|--------------|-------|
   | **Full Name** | `Judge Reviewer` | Minimum 2 characters |
   | **Email** | `judge@gmail.com` | Must be a valid, unique email |
   | **Phone** | `9876543210` | Minimum 10 digits, must be unique |
   | **Date of Birth** | `1995-01-15` | Any valid date |
   | **PAN** | `ABCDE1234F` | Format: 5 uppercase letters + 4 digits + 1 uppercase letter |
   | **Password** | `Judge@2026` | Minimum 8 characters |

4. After completing all 3 steps, you will be logged in and redirected to the NexaBank dashboard.

### Step 2: Promote the User to Admin Role

The newly signed-up user has `role: USER` by default. To promote them to `ADMIN` and access the analytics dashboard, use the provided utility script:

```bash
# Install dependencies (one-time only)
pip install psycopg2-binary tabulate

# Run the script with the registered email
python scripts/nexbank_user_lookup.py "judge@gmail.com"
```

This script will:
- ✅ Connect to the NexaBank Supabase database
- ✅ **Automatically promote the user's role from `USER` → `ADMIN`**
- ✅ Display the full user profile, accounts, transactions, and more

You should see output like:
```
🔗  Connecting to NexBank Supabase database...

  🔄  Role updated: USER → ADMIN

══════════════════════════════════════════════════════════════════════
  👤  Customer Profile
══════════════════════════════════════════════════════════════════════
╒════════════════╤═══════════════════════════════════════╕
│ Field          │ Value                                 │
╞════════════════╪═══════════════════════════════════════╡
│ Name           │ Judge Reviewer                        │
│ Email          │ judge@gmail.com                       │
│ Role           │ ADMIN (was: USER)                     │
│ ...            │ ...                                   │
╘════════════════╧═══════════════════════════════════════╛
```

### Step 3: Add the Email to Analytics Dashboard RBAC

To grant the new admin access to the **Nucleus Analytics Dashboard**, add their email to the `rbac.json` file in the project root:

```jsonc
// rbac.json
{
  "super_admins": [
    "omeshmehta70@gmail.com"
  ],
  "app_admins": {
    "twitter": [
      "omeshmehta03@gmail.com"
    ],
    "nexabank": [
      "omeshmehta69@gmail.com",
      "abhishekkumawat1008@gmail.com",
      "judge@gmail.com"              // ← Add judge's email here
    ],
    "safexbank": [
      "omeshmehta69@gmail.com",
      "abhishekkumawat1008@gmail.com",
      "judge@gmail.com"              // ← And here for SafeX Bank access
    ]
  }
}
```

> **Important:** The email must exactly match the Google account email used to log in to the analytics dashboard.

### Step 4: Access the Analytics Dashboard

1. Open [http://localhost:3001](http://localhost:3001).
2. Click **"Continue with Google"** and log in with the same email you added to `rbac.json`.
3. You will be redirected to the **admin dashboard** with full access to:

   | Feature | What You Can See |
   |---------|-----------------|
   | **Dashboard** | KPIs, traffic charts, feature usage, real-time event counters |
   | **Funnels** | User journey drop-off analysis (login → KYC → approval) |
   | **Heatmaps** | Feature adoption intensity matrix |
   | **Retention** | Cohort-based user retention analysis |
   | **Predictive** | AI-powered feature adoption predictions |
   | **AI Report** | Full LLM-generated analytical report with executive summary |
   | **Locations** | Geographic distribution of users |
   | **License vs Usage** | Which paid features are being utilized |
   | **Audit Logs** | System configuration change history |

### Step 5: Generate Telemetry Data (Optional but Recommended)

If the dashboard shows empty data, use NexaBank to generate real telemetry:

1. **Log in** to NexaBank at [http://localhost:3002/login](http://localhost:3002/login) with the account you created.
2. **Use the app** — browse the dashboard, check balances, attempt a transfer, start KYC, apply for a loan.
3. **Each action generates telemetry events** that flow through the Nucleus pipeline and appear in the analytics dashboard within seconds.

For bulk test data, run the simulation endpoint in the NexaBank backend:
```bash
curl -X POST http://localhost:5000/api/events/simulate?days=7
```

---

## 📁 Project Structure

```
Nucleus-Analytic-tool-with-banking-website/
│
├── api/                          # Analytics API (FastAPI, port 8001)
│   ├── main.py                   #   All analytics endpoints (2700+ lines)
│   ├── insights.py               #   AI insight generation (Ollama integration)
│   ├── page_map.py               #   Event → page name resolution
│   └── websocket_manager.py      #   Real-time WebSocket push manager
│
├── ingestion/                    # Ingestion API (FastAPI, port 8000)
│   └── main.py                   #   POST /events → Kafka producer
│
├── processing/                   # Kafka Consumer Worker
│   └── worker.py                 #   Batch-consumes Kafka → inserts into ClickHouse
│
├── storage/                      # ClickHouse schema & client
│   ├── schema.sql                #   DDL: tables, materialized views, AI reports
│   └── client.py                 #   Python ClickHouse client wrapper
│
├── core/                         # Shared config & middleware
│   ├── config.py                 #   Environment settings (Pydantic)
│   └── middleware.py             #   Tenant access & deployment mode checks
│
├── NexaBank/                     # Full Banking Application
│   ├── backend/                  #   Express.js + Prisma + Supabase (port 5000)
│   │   ├── src/
│   │   │   ├── controllers/      #     User, Account, Transaction, Loan controllers
│   │   │   ├── routes/           #     REST API routes + event simulation
│   │   │   ├── middleware/       #     Auth, event tracking, rate limiting
│   │   │   └── server.ts         #     HTTP + WebSocket server entry
│   │   └── prisma/
│   │       ├── schema.prisma     #     Database models (Customer, Account, Transaction, Loan...)
│   │       └── seed.js           #     Initial data seeding
│   │
│   └── frontend/                 #   Next.js 15 banking UI (port 3002)
│       ├── app/                  #     App router pages (dashboard, transfers, loans, KYC)
│       └── components/           #     Reusable UI components
│
├── analytics-dashboard/          # Analytics Dashboard (Next.js, port 3001)
│   ├── src/
│   │   ├── app/                  #   App router (dashboard, funnels, AI report, admin)
│   │   ├── components/           #   Charts, heatmaps, tables, KPI cards
│   │   └── lib/                  #   API client, auth, mock data
│   └── .env.local                #   Google OAuth credentials
│
├── twitter-demo/                 # Twitter/X Clone Demo (Next.js, port 3000)
│
├── scripts/                      # Utility Scripts
│   └── nexbank_user_lookup.py    #   User lookup + role promotion tool
│
├── docker-compose.yml            # All 12 services orchestrated
├── rbac.json                     # Analytics dashboard role-based access control
├── Dockerfile                    # Python services (ingestion, analytics, processor)
└── requirements.txt              # Python dependencies
```

---

## 📡 API Reference (Key Endpoints)

### Ingestion API (`:8000`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/events` | Ingest a single telemetry event (→ Kafka) |
| `POST` | `/events/batch` | Ingest multiple events at once |

### Analytics API (`:8001`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/metrics/kpi?tenants=nexabank&range=30d` | Primary KPI cards (events, features, response time, error rate) |
| `GET` | `/metrics/secondary_kpi` | Secondary KPIs (visits, unique visitors, session time, bounce rate) |
| `GET` | `/metrics/traffic` | Time-series traffic data |
| `GET` | `/funnels?steps=login,apply,kyc,approve` | Multi-step funnel with drop-off analysis |
| `GET` | `/features/usage` | Feature usage aggregations |
| `GET` | `/features/heatmap` | Feature × time/tenant heatmap matrix |
| `GET` | `/features/activity` | Per-feature adoption breakdown |
| `GET` | `/metrics/retention` | Retention cohort analysis |
| `GET` | `/predictive/adoption` | Predictive feature adoption scores |
| `GET` | `/ai_report?tenants=nexabank` | AI-generated analytical report (Ollama LLM) |
| `GET` | `/insights?tenants=nexabank` | AI/rule-based actionable insights |
| `GET` | `/locations` | Geographic user distribution |
| `GET` | `/license/usage` | License vs actual usage tracking |
| `GET` | `/segmentation` | User segmentation data |
| `GET` | `/audit_logs` | Configuration change audit trail |
| `GET` | `/tenants/available` | List all tenants with event counts |
| `WS`  | `/ws/dashboard/{tenant_id}` | Real-time dashboard WebSocket |

### NexaBank Backend (`:5000`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Sign up a new NexaBank customer |
| `POST` | `/api/auth/login` | Log in and receive JWT cookie |
| `GET`  | `/api/user/profile` | Get current user profile |
| `GET`  | `/api/accounts` | Get user's bank accounts |
| `POST` | `/api/transactions/transfer` | Transfer funds between accounts |
| `POST` | `/api/loans/apply` | Apply for a loan |
| `POST` | `/api/events/simulate` | Simulate bulk telemetry events |

---

## 🔐 RBAC & Access Control

### NexaBank Roles (Supabase/Prisma)

| Role | Access |
|------|--------|
| `USER` | Normal banking features (default on signup) |
| `ADMIN` | Banking features + NexaBank admin panel + telemetry access |

### Analytics Dashboard Roles (`rbac.json`)

| Role | Access | Configured Via |
|------|--------|---------------|
| **Super Admin** | Aggregated cloud overview across all tenants, AI reports | `rbac.json → super_admins[]` |
| **App Admin** | Full detailed analytics for assigned tenant(s) | `rbac.json → app_admins.{nexabank/safexbank/twitter}[]` |
| **User** | No access (blocked by middleware) | Default for unregistered emails |

> Authentication is via **Google OAuth** (NextAuth.js). The user's Google email must appear in `rbac.json` to access any analytics.

---

## ⚙️ Environment Variables

### Root Level (`.env.example`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DEPLOYMENT_MODE` | `CLOUD` | `CLOUD` or `ON_PREM` |
| `KAFKA_BROKER_URL` | `broker:29092` | Kafka bootstrap server |
| `CLICKHOUSE_HOST` | `clickhouse` | ClickHouse hostname |
| `CLICKHOUSE_USER` | `default` | ClickHouse username |
| `CLICKHOUSE_PASSWORD` | `clickhouse` | ClickHouse password |

### Analytics Dashboard (`analytics-dashboard/.env.local`)

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `NEXTAUTH_URL` | Dashboard URL (`http://localhost:3001`) |
| `NEXTAUTH_SECRET` | NextAuth encryption secret |
| `NEXT_PUBLIC_API_URL` | Analytics API URL (`http://localhost:8001`) |

### NexaBank Backend (`NexaBank/backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL pooled connection string |
| `DIRECT_URL` | Supabase direct connection (for migrations) |
| `JWT_SEC` | JWT signing secret |
| `PORT` | Backend port (`5000`) |
| `FRONTEND_URL` | NexaBank frontend URL (`http://localhost:3002`) |

---

## 🔧 Troubleshooting

### Services fail to start

```bash
# Check which containers are running
docker compose ps

# View logs for a specific service
docker compose logs analytics-api
docker compose logs nexabank-backend
docker compose logs broker

# Restart everything fresh
docker compose down -v
docker compose up --build
```

### Kafka not ready / topic creation fails

Kafka needs ~30 seconds to become ready. The `init-kafka` service auto-retries. If it keeps failing:

```bash
docker compose restart broker
docker compose restart init-kafka
```

### Ollama model not loading

The `init-ollama` service pulls the `llama3.2:1b` model (~1.3GB). If AI reports show "Model unavailable":

```bash
# Check if model is downloaded
docker exec nucleus-ollama ollama list

# Manually pull if needed
docker exec nucleus-ollama ollama pull llama3.2:1b
```

### Analytics Dashboard shows "Unauthorized"

- Ensure your Google email is listed in `rbac.json` under the correct role.
- The file is hot-mounted into the container — changes take effect on next page load.

### NexaBank registration fails

- PAN must match format: `ABCDE1234F` (5 letters + 4 digits + 1 letter, all uppercase).
- Email, phone, and PAN must all be unique in the database.
- Password must be at least 8 characters.

### Port conflicts

If any port is already in use on your machine:

```bash
# Find what's using a port (Windows)
netstat -ano | findstr :3002

# Find what's using a port (Linux/Mac)
lsof -i :3002
```

---

## 👥 Team

Built by [Abhishek Kumawat](https://github.com/abhishekkumawat-47) and [Omesh Mehta](https://github.com/omeshmehta).

---

<p align="center">
  <sub>Built using Python, TypeScript, Kafka, ClickHouse, and a lot of Docker containers.</sub>
</p>
