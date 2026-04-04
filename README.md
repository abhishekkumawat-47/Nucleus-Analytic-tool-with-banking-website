<p align="center">
  <img src="analytics-dashboard/public/logo1.png" alt="Nucleus Logo" width="80" />
</p>

<h1 align="center">FinInsights — Multi-Tenant Growth Analytics & Feature Intelligence Platform</h1>

<p align="center">
  <b>Enterprise-grade, real-time feature analytics and growth intelligence platform seamlessly integrated with NexaBank, a production-grade multi-tenant digital banking application — powered by AI insights, real-time dashboards, and full-stack analytics orchestrated via Docker Compose.</b>
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
- [🚀 Local Setup & Deployment Guide](#-local-setup--deployment-guide)
- [Quick Start — Run Everything](#-quick-start--run-everything)
- [First-Time Setup: NexaBank Admin & Analytics Access](#-first-time-setup-nexabank-admin--analytics-access)
- [Project Structure](#-project-structure)
- [API Reference (Key Endpoints)](#-api-reference-key-endpoints)
- [Multi-Tenant Architecture](#-multi-tenant-architecture)
- [RBAC & Access Control](#-rbac--access-control)
- [Environment Variables](#-environment-variables)
- [Troubleshooting](#-troubleshooting)

---

## 🧠 What Is This Project?

**FinInsights** is a production-grade **Feature Intelligence & Growth Analytics** platform purpose-built for multi-tenant SaaS environments. It solves the critical challenge of understanding *how users interact with product features in real-time* — across multiple independent tenants — and transforms raw telemetry into **actionable growth insights, conversion funnels, retention cohorts, feature adoption trends, and AI-powered reports**.

The platform is production-validated through **NexaBank** — a fully functional, multi-tenant digital banking application that serves as both the primary client application and a live demonstration of the Nucleus analytics pipeline in action.

### What It Does (End-to-End)

1. **NexaBank Application** (banking app running at `:3002`) generates real user events — account logins, fund transfers, KYC flows, loan applications, card transactions, investment activities, etc.
2. Events are ingested via the **Ingestion API** (`:8000`) and published to **Kafka** for reliable, fault-tolerant, decoupled processing.
3. A **Processor Worker** consumes Kafka messages and batch-inserts them into **ClickHouse** (columnar OLAP database optimized for analytics).
4. The **Analytics API** (`:8001`) reads from ClickHouse to power real-time dashboards with KPIs, conversion funnels, retention cohorts, feature heatmaps, segmentation analysis, and predictive adoption scores.
5. The **Analytics Dashboard** (`:3001`) provides a premium, role-based UI for admins to visualize everything — including **AI-generated executive reports** powered by a local **Ollama LLM** (llama3.2:1b).
6. Real-time WebSocket connections push dashboard updates as new events arrive.

### Key Features

| Feature | Description |
|---------|-------------|
| **Real-time Event Ingestion** | Sub-second event ingestion via Kafka with declarative schema tracking |
| **Multi-Tenant Isolation** | Complete data isolation, per-tenant scoped analytics, tenant-specific dashboards |
| **Funnel Analysis** | ClickHouse `windowFunnel()` for multi-step conversion tracking across user journeys |
| **Retention & Cohorts** | Day-over-day, week-over-week, and month-over-month retention analysis with cohort breakdowns |
| **Feature Heatmaps** | Visual adoption matrices showing feature usage intensity across time and tenant dimensions |
| **Growth Intelligence** | Automated growth score calculations, trend detection, and anomaly flagging |
| **AI-Powered Reports** | LLM-generated analytical reports with executive summaries, insights, and recommendations (Ollama) |
| **Predictive Adoption** | ML-driven feature adoption scoring and forecasting |
| **RBAC** | Google OAuth 2.0 + granular role-based access control (Super Admin / App Admin / User) |
| **License vs Usage Tracking** | Track which paid features are provisioned vs actually being used |
| **Real-Time Dashboards** | WebSocket-backed dashboards with sub-second updates |
| **Production Banking App** | Full-featured NexaBank with accounts, transfers, loans, KYC, and investments |

---

## 🏗 Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT APPLICATIONS                              │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │         NexaBank Multi-Tenant Banking Platform                     │    │
│  │         (React/Next.js Frontend + Node.js/Express Backend)         │    │
│  │         :3002 (Frontend) | :5000 (Backend)                         │    │
│  │         • Account Management • Fund Transfers • KYC Flows          │    │
│  │         • Loan Applications • Investment Products                  │    │
│  │         • Card Management • Transaction History                    │    │
│  └────────────────────┬───────────────────────────────────────────────┘    │
│                       │ HTTP Events (real user actions)                    │
└───────────────────────┼────────────────────────────────────────────────────┘
                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│               NUCLEUS ANALYTICS BACKEND (Multi-Tenant)                     │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  Ingestion Pipeline                                              │      │
│  │  ┌─────────────────┐    ┌────────────┐    ┌──────────────────┐   │      │
│  │  │ Ingestion API   │───▶│   Kafka    │───▶│   Processor     │   │      │
│  │  │ (FastAPI)       │    │   Broker   │    │   Worker         │   │      │
│  │  │ :8000           │    │ :9092      │    │ (Python Consumer)│   │      │
│  │  └─────────────────┘    └────────────┘    └────────┬─────────┘   │      │
│  │                                                    │             │      │
│  │                                    ┌───────────────▼──────────┐  │      │
│  │                                    │   ClickHouse (OLAP)      │  │      │
│  │                                    │   • Multi-Tenant Schema  │  │      │
│  │                                    │   • Materialized Views   │  │      │
│  │                                    │   • windowFunnel()       │  │      │
│  │                                    │   :8123/:9000            │  │      │
│  │                                    └────────┬─────────────────┘  │      │
│  │                                             │                    │      │
│  │  ┌────────────────────────────────────────▼──────────────────┐   │      │
│  │  │  Analytics API (FastAPI) :8001                            │   │      │
│  │  │  • KPI Metrics • Funnels • Retention • Heatmaps           │   │      │
│  │  │  • Feature Usage • Segmentation • Predictive Scoring      │   │      │
│  │  │  • WebSocket Real-Time Push                               │   │      │
│  │  └────────────────┬───────────────────────────────────────── ┘   │      │
│  │                   │                                              │      │
│  │  ┌────────────────┴──────────────┐                               │      │
│  │  │                               │                               │      │
│  │  ▼                               ▼                               │      │
│  │ ┌──────────────┐           ┌──────────────────┐                  │      │
│  │ │    Ollama    │           │ Real-Time WebSocket                 │      │
│  │ │   (LLM AI)   │           │ Manager & Push Scheduler            │      │
│  │ │  :11434      │           │ (Event Broadcasting)                │      │
│  │ │              │           │                                     │      │
│  │ └──────────────┘           └──────────────────┘                  │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────── ┘
                                  │
                    ┌─────────────▼───────────────┐
                    │  Analytics Dashboard        │
                    │  (Next.js + React)          │
                    │  :3001                      │
                    │  • Multi-Tenant View        │
                    │  • Role-Based Access        │
                    │  • AI Report Generation     │
                    │  • Google OAuth RBAC        │
                    │  • Real-Time Updates        │
                    └─────────────────────────────┘
```

### Data Flow Diagram

```
User Action in NexaBank
       ▼
(Login → Dashboard → Transfer → Loan Application)
       ▼
NexaBank Backend Event Emission
       ▼
POST /events (Ingestion API)
       ▼
Kafka Broker (Publish)
       ▼
Processor Worker (Subscribe & Consume)
       ▼
Batch Insert to ClickHouse
       ▼
Materialized Views & Aggregations
       ▼
Nucleus Analytics API Queries
       ▼
Analytics Dashboard Visualization
       ▼
AI Report Generation (Ollama LLM)
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

| Layer | Technology | Purpose |
|-------|-----------|---------||
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons | Banking UI & Analytics Dashboard |
| **Banking Backend** | Node.js, Express.js, Prisma ORM, PostgreSQL (Supabase), JWT | Banking REST API & Event Emission |
| **Analytics Backend** | Python 3.11, FastAPI, uvicorn, async/await | Event ingestion & analytics queries |
| **Message Broker** | Apache Kafka (Confluent 7.4) + Zookeeper | Event streaming & decoupling |
| **Data Warehouse** | ClickHouse 24.3 (columnar OLAP) | Time-series analytics with windowFunnel(), materialized views |
| **AI / LLM** | Ollama (llama3.2:1b) | Local, no-cloud AI report generation |
| **Authentication** | Google OAuth 2.0, JWT, bcrypt | Secure auth for dashboard & banking app |
| **Database (NexaBank)** | Supabase PostgreSQL (via Prisma) | Persistent banking data storage |
| **Orchestration** | Docker Compose (11 services) | Local development & deployment |

---

## ✅ Prerequisites

Before running the project, ensure you have:

| Requirement | Version | How to Check |
|-------------|---------|------------||
| **Docker Desktop** | 4.x+ | `docker --version` |
| **Docker Compose** | v2+ (included with Docker Desktop) | `docker compose version` |
| **Git** | Any | `git --version` |
| **Python** | 3.10+ (optional — for admin utility scripts) | `python --version` |
| **Available RAM** | 8 GB minimum | 10–12 GB recommended (Ollama + Kafka + ClickHouse are memory-intensive) |
| **Available Disk** | 10–15 GB free | For Docker images, Ollama model (~1.3GB), and data volumes |

> **Note:** Node.js installation is **not required** — all Node-based services (NexaBank Frontend/Backend, Analytics Dashboard) run inside Docker containers.

### Optional: External Dependencies

- **Supabase Account** with PostgreSQL database (for NexaBank data persistence) — configured via `DATABASE_URL` in NexaBank backend `.env`
- **Google OAuth Credentials** (for Analytics Dashboard login) — optional if you want to enforce authentication

---

## 🚀 Local Setup & Deployment Guide

This section provides detailed, step-by-step instructions to get the entire Nucleus + NexaBank stack running locally on your machine.

### Phase 1: Prerequisites & Environment Preparation

#### Step 1.1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/abhishekkumawat-47/Nucleus-Analytic-tool-with-banking-website.git

# Navigate to the project directory
cd Nucleus-Analytic-tool-with-banking-website

# Verify Docker and Docker Compose are installed
docker --version
docker compose version
```

#### Step 1.2: Verify System Resources

Before starting, ensure your machine has sufficient resources:

```bash
# Windows (PowerShell)
$totalMemory = (Get-CimInstance CIM_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB
"Total RAM: $totalMemory GB"

# Linux/Mac
free -h    # View available memory
df -h      # View available disk space
```

⚠️ **Requirements:**
- **Minimum 8 GB RAM** (recommended 12+ GB)
- **Minimum 15 GB free disk space**
- If your machine has less, you may need to close other applications or increase Docker's memory allocation

#### Step 1.3: Configure Docker Desktop Resources (Windows/Mac)

1. Open **Docker Desktop Settings**
2. Navigate to **Resources** tab
3. Set:
   - **Memory:** At least 8–10 GB (e.g., if you have 16GB total, allocate 10GB to Docker)
   - **Swap:** 2 GB
   - **CPU**: 4+ cores

Save and restart Docker Desktop.

### Phase 2: Quick Start — Run Everything

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
| **Ingestion API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger UI for event ingestion |
| **Analytics API Docs** | [http://localhost:8001/docs](http://localhost:8001/docs) | Swagger UI for analytics queries |

### 5. Stop All Services

```bash
docker compose down        # Stop containers (data persists in volumes)
docker compose down -v     # Stop containers AND delete all data volumes
```

---

---

## 🔑 First-Time Setup: NexaBank Admin & Analytics Access

Follow these steps to create a **new user account** in the NexaBank app, **promote them to Admin**, and then **access the full analytics dashboard** with their email.

### Step 1: Create a New NexaBank Account

1. **Open** [http://localhost:3002](http://localhost:3002) in your browser.
2. **Click** "Get Started" or go to [http://localhost:3002/register](http://localhost:3002/register).
3. **Fill the 3-step registration form:**

   **Step 1 — Personal Info:**
   | Field | Example | Notes |
   |-------|---------|-------|
   | Full Name | `John Reviewer` | Min 2 characters |
   | Email | `john@example.com` | Must be unique |
   | Phone | `9876543210` | 10 digits, unique |
   | Date of Birth | `1995-01-15` | Valid date format |

   **Step 2 — Financial Info:**
   | Field | Example | Notes |
   |-------|---------|-------|
   | PAN | `ABCDE1234F` | Uppercase, exact format required |
   | Annual Income | `₹1,000,000` | Numeric, optional |

   **Step 3 — Security:**
   | Field | Example | Notes |
   |-------|---------|-------|
   | Create Password | `SecurePass@123` | Min 8 chars, 1 uppercase, 1 number, 1 symbol |
   | Re-enter Password | `SecurePass@123` | Must match |

4. **Submit** and you will be logged in automatically.

### Step 2: Promote User to Admin Role

Run the utility script to promote this user to `ADMIN` role:

```bash
# Install dependencies (one-time only)
pip install psycopg2-binary tabulate

# Promote the user to ADMIN
python scripts/nexbank_user_lookup.py "john@example.com"
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
├── 📊 Analytics Backend
│   ├── api/                      # Analytics API (FastAPI, port 8001)
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
├── 🐳 Docker & Orchestration
│   ├── docker-compose.yml        # All 11 services orchestrated
│   ├── Dockerfile                # Python services build (ingestion, analytics, processor)
│   └── .dockerignore              # Docker ignore patterns
│
├── 🔐 Configuration
│   ├── rbac.json                 # Analytics dashboard role-based access control
│   ├── requirements.txt          # Python dependencies
│   └── broker_inspect.json       # Kafka broker configuration snapshot
│
├── 🛠️ Utilities & Scripts
│   └── scripts/
│       ├── nexbank_user_lookup.py    # User lookup + admin promotion tool
│       ├── seed_data.py              # Test data seeder
│       ├── seed_licenses.py          # License data seeder
│       └── seed_safexbank.py         # SafeX Bank demo data
│
└── 📚 Documentation
    └── README.md                 # This file
```

---

## 📡 API Reference (Key Endpoints)

### Ingestion API (`:8000`)

**Base URL:** `http://localhost:8000`

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|---------------|
| `POST` | `/events` | Ingest a single telemetry event | `{ "tenant_id": "nexabank", "user_id": "...", "event_type": "login", ... }` |
| `POST` | `/events/batch` | Ingest multiple events atomically | `[{ event1 }, { event2 }, ...]` |
| `GET` | `/health` | Health check | — |
| `GET` | `/docs` | OpenAPI documentation | — |

**Example: Ingest an Event**

```bash
curl -X POST "http://localhost:8000/events" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "nexabank",
    "user_id": "user_12345",
    "event_type": "transfer_initiated",
    "amount": 1000,
    "currency": "INR",
    "timestamp": "2025-04-05T10:30:00Z"
  }'
```

### Analytics API (Port `:8001`)

**Base URL:** `http://localhost:8001`

| Method | Endpoint | Category | Description |
|--------|----------|-------------|
| `GET` | `/metrics/kpi?tenants=nexabank&range=30d` | KPIs | Primary metrics (total events, unique users, response time, error rate) |
| `GET` | `/metrics/secondary_kpi` | KPIs | Secondary metrics (visits, sessions, time-on-feature, bounce rate) |
| `GET` | `/metrics/traffic?granularity=hourly` | Traffic | Time-series event traffic with granular breakdown |
| `GET` | `/metrics/growth?metric=dau&tenant=nexabank` | Growth | User growth curves, DAU/MAU trends |
| `GET` | `/funnels?steps=login,kyc_start,kyc_complete,transfer&tenant=nexabank` | Funnels | Multi-step conversion analysis with drop-off rates |
| `GET` | `/features/usage?tenant=nexabank&range=7d` | Features | Top features by usage count |
| `GET` | `/features/heatmap?tenant=nexabank` | Features | Feature adoption matrix (features × time × segments) |
| `GET` | `/features/activity?tenant=nexabank` | Features | Per-feature adoption score and trend |
| `GET` | `/metrics/retention?cohort=signup_week&tenant=nexabank` | Retention | Retention curves for cohorts (D1, D7, D30, D60, D90) |
| `GET` | `/predictive/adoption?tenant=nexabank` | Predictive | ML feature adoption forecast and score |
| `GET` | `/segmentation?tenant=nexabank` | Segmentation | User cohorts and breakdowns |
| `GET` | `/locations?tenant=nexabank&top_n=10` | Geography | Top geographic regions by user count |
| `GET` | `/license/usage?tenant=nexabank` | License | Paid features vs actual engagement |
| `GET` | `/ai_report?tenants=nexabank&format=executive` | AI Reports | LLM-generated summary report (Ollama) |
| `GET` | `/insights?tenants=nexabank` | AI Insights | AI-generated rule-based insights (anomalies, trends) |
| `GET` | `/audit_logs?limit=50` | Admin | Configuration change audit trail |
| `GET` | `/tenants/available` | Metadata | List all active tenants with event counts |
| `WS` | `/ws/dashboard/{tenant_id}` | Real-Time | WebSocket: push updates as events arrive |
| `GET` | `/docs` | Documentation | OpenAPI/Swagger UI |
| `GET` | `/health` | Health | Service readiness check |

**Example: Get KPI Metrics**

```bash
curl "http://localhost:8001/metrics/kpi?tenants=nexabank&range=30d"
```

**Example: WebSocket Real-Time Dashboard**

```javascript
const ws = new WebSocket("ws://localhost:8001/ws/dashboard/nexabank");
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Dashboard update:", data);
  // Update UI with new metrics
};
```

### NexaBank Backend (Port `:5000`)

**Base URL:** `http://localhost:5000`

| Method | Endpoint | Description |
|--------|----------|-------------||
| `POST` | `/api/auth/register` | Sign up new customer (3-step form) |
| `POST` | `/api/auth/login` | Log in and receive JWT token (httpOnly cookie) |
| `POST` | `/api/auth/logout` | Log out (clear session) |
| `GET` | `/api/user/profile` | Get current user profile |
| `GET` | `/api/accounts` | Get all accounts for current user |
| `POST` | `/api/transactions/transfer` | Execute fund transfer between accounts |
| `POST` | `/api/loans/apply` | Submit loan application |
| `GET` | `/api/loans` | Get user's loan applications and status |
| `POST` | `/api/kyc/verify` | Submit KYC verification |
| `POST` | `/api/cards/create` | Create new debit/credit card |
| `GET` | `/api/cards` | List user's cards |
| `POST` | `/api/investments/buy` | Purchase investment product |
| `POST` | `/api/events/simulate?days=7` | Generate bulk telemetry events for testing |
| `GET` | `/api/tenants` | List all tenant applications |
| `GET` | `/api/health` | Health check |

**Example: Sign Up**

```bash
curl -X POST "http://localhost:5000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "dob": "1995-01-15",
    "pan": "ABCDE1234F",
    "password": "SecurePass@123"
  }'
```

---

## 🏛️ Multi-Tenant Architecture

Nucleus is purpose-built for **true multi-tenancy** with complete data isolation, independent analytics, and configurable role hierarchies.

### Tenant Identity

Every event, user, and metric in the system is scoped to a **tenant ID**. Currently configured tenants:

| Tenant ID | Application | Database | Status |
|-----------|-------------|----------|--------|
| `nexabank` | NexaBank Banking Platform | Supabase PostgreSQL | Primary application |
| `safexbank` | SafeX Bank (Demo) | Supabase PostgreSQL | Demo tenant (seed data available) |

### Data Isolation

- **ClickHouse Schema:** Each tenant has its own logical partition with materialized views per tenant
- **Analytics Dashboard:** Role-based filters ensure admins only see their assigned tenant(s)
- **Event Ingestion:** Tenant ID is validated on every event; cross-tenant events are rejected
- **Compliance:** GDPR-compliant tenant data deletion available via admin endpoints

### Adding a New Tenant

1. **Define in Configuration:**
   ```python
   # core/config.py
   AVAILABLE_TENANTS = ["nexabank", "safexbank", "your_new_tenant"]
   ```

2. **Initialize ClickHouse Schema:**
   ```sql
   -- storage/schema.sql
   -- Add tenant-scoped tables and views
   CREATE TABLE events_your_new_tenant (...)
   ```

3. **Seed Initial Data (Optional):**
   ```bash
   python scripts/seed_data.py --tenant=your_new_tenant
   ```

4. **Add RBAC Permissions:**
   ```jsonc
   // rbac.json
   {
     "app_admins": {
       "your_new_tenant": ["admin@example.com"]
     }
   }
   ```

---

## 🔐 RBAC & Access Control

### NexaBank Application Roles

Managed in the `nexabank` PostgreSQL database (Supabase) via Prisma:

| Role | Access Level | Permissions |
|------|--------------|-------------||
| **USER** | Standard customer | Account viewing, transfers, KYC, loan application, card management |
| **ADMIN** | Bank administrator | All USER permissions + user management, transaction auditing, system alerts |
| **SUPER_ADMIN** | System administrator | All permissions + tenant configuration, role assignment, analytics access |

**Role Promotion:**
```bash
python scripts/nexbank_user_lookup.py "email@example.com"
# Automatically promotes USER → ADMIN
```

### Analytics Dashboard Roles

Managed via `rbac.json` file (hotloaded, no restart needed):

```jsonc
{
  "super_admins": [
    "founder@company.com"
    // ├─ Access to: All tenants, cloud overview, all reports
    // └─ Can manage: rbac.json, audit logs, system config
  ],
  
  "app_admins": {
    "nexabank": [
      "nexabank_admin@company.com",
      "analytics_lead@company.com"
      // ├─ Access to: nexabank tenant only
      // ├─ See: All dashboards, funnels, reports
      // └─ Can analyze: nexabank user behavior, feature adoption
    ],
    
    "safexbank": [
      "safexbank_admin@company.com"
      // ├─ Access to: safexbank tenant only
      // └─ Independent analytics from nexabank
    ]
  }
}
```

**Authentication:** Google OAuth 2.0 via NextAuth.js

| Role | Auth Required | Dashboard Access |
|------|---------------|------------------|
| Unauthenticated | Not signed in | ❌ Redirected to login |
| User (not in RBAC) | Signed in with Google | ❌ "Unauthorized" message |
| App Admin | Signed in + in `rbac.json` | ✅ Full tenant access |
| Super Admin | Signed in + in `super_admins` list | ✅ All tenants, system config |

---

## ⚙️ Environment Variables

### Root Level (Project Root)

These are automatically set for Docker Compose services:

| Variable | Default | Description |
|----------|---------|-------------|
| `DEPLOYMENT_MODE` | `CLOUD` | `CLOUD` or `ON_PREM` |
| `KAFKA_BROKER_URL` | `broker:29092` | Kafka bootstrap server |
| `CLICKHOUSE_HOST` | `clickhouse` | ClickHouse hostname |
| `CLICKHOUSE_USER` | `default` | ClickHouse username |
| `CLICKHOUSE_PASSWORD` | `clickhouse` | ClickHouse password |

### Analytics Dashboard (`.env.local`)

Located at: `analytics-dashboard/.env.local`

```bash
# Google OAuth Configuration (for login)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Authentication
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-super-secret-key-min-32-chars

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_INGESTION_API_URL=http://localhost:8000
```

**Note:** If Google OAuth variables are not set, the dashboard will show a dev-mode warning but still work with local login.

### NexaBank Backend (`.env`)

Located at: `NexaBank/backend/.env`

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:password@supabase-db.com:5432/nexabank?schema=public
DIRECT_URL=postgresql://user:password@supabase-db.com:5432/nexabank

# Security
JWT_SECRET=your-jwt-signing-secret
JWT_EXPIRY=7d

# Server
PORT=5000
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:3002

# Telemetry
TELEMETRY_ENABLED=true
INGESTION_API_URL=http://ingestion-api:8000
```

### NexaBank Frontend (`.env.local`)

Located at: `NexaBank/frontend/.env.local`

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_ANALYTICS_URL=http://localhost:3001

# Authentication
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=frontend-secret
```

---

## 🔧 Troubleshooting

### Services Fail to Start

**Problem:** Docker containers exit immediately or show "unhealthy"

**Solution:**

```bash
# Check which containers exited
docker compose ps

# View detailed logs for a service
docker compose logs analytics-api --tail=50
docker compose logs processor-worker --tail=50
docker compose logs nexabank-backend --tail=50

# Restart everything fresh
docker compose down -v      # Remove volumes to reset state
docker compose up --build   # Rebuild and start
```

### Kafka Topic Not Created

**Problem:** Ingestion API cannot publish events; "feature-events topic not found"

**Solution:**

```bash
# Kafka needs ~30 seconds to become ready
docker compose logs init-kafka

# If still failing, restart Kafka
docker compose restart broker
docker compose restart init-kafka

# Manually verify topics
docker exec nucleus-broker kafka-topics --list --bootstrap-server localhost:9092
```

### High Memory Usage / Out of Memory Errors

**Problem:** Docker reports OOM (out of memory), ClickHouse crashes

**Solution:**
1. **Increase Docker allocation** in Docker Desktop Settings (Resources tab)
2. **Reduce Ollama model size:**
   ```bash
   # Use smaller model (phi instead of llama3.2)
   docker exec nucleus-ollama ollama pull phi
   ```
3. **Reduce ClickHouse initial data:**
   ```bash
   # Comment out seed data in docker-compose.yml
   ```

### Ollama Not Loading / AI Reports Unavailable

**Problem:** Analytics Dashboard shows "LLM model not available"

**Solution:**

```bash
# Check if Ollama service is running
docker compose ps | grep ollama

# Check manually pulled models
docker exec nucleus-ollama ollama list

# Pull the model again (1–2 minutes)
docker exec nucleus-ollama ollama pull llama3.2:1b

# Test Ollama endpoint
curl http://localhost:11434/api/tags
```

### Analytics Dashboard Shows "Unauthorized"

**Problem:** Google OAuth login works, but dashboard shows "Unauthorized"

**Solution:**

- Verify your Google email is listed in `rbac.json` under `app_admins.nexabank[]`
- Email must match **exactly** (check for typos, capitalization)
- After editing `rbac.json`, refresh the dashboard page (no docker restart needed)
- Check browser console for auth errors: Press `F12` → **Console** tab

### NexaBank Registration Fails

**Problem:** "Sorry, registration failed" error message

**Common causes:**
- **PAN format invalid:** Must be `ABCDE1234F` (5 uppercase letters, 4 digits, 1 uppercase letter)
- **Email or phone already registered:** Use a unique email/phone
- **Password too weak:** Must be 8+ chars with uppercase, number, and symbol
- **Supabase connection issue:** Check `DATABASE_URL` in NexaBank backend `.env`

**Solution:**

```bash
# Check NexaBank backend logs
docker compose logs nexabank-backend --tail=100 | grep -i register

# Verify database connection
docker compose exec nexabank-backend \
  npm run prisma -- db push --skip-generate
```

### Port Conflicts on Local Machine

**Problem:** `Address already in use` error for a port

**Solution (Windows PowerShell):**
```powershell
# Find process using port 3002
netstat -ano | findstr :3002

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Alternatively, change the port in docker-compose.yml
# Change "3002:3002" to "3003:3002" for NexaBank frontend
```

**Solution (Linux/Mac):**
```bash
# Find and kill process using port
lsof -i :3002
kill -9 <PID>
```

### Rebuilding After Code Changes

**Problem:** Changes to Python or Node code don't reflect in running containers

**Solution:**
```bash
# Stop all containers
docker compose down

# Rebuild everything
docker compose up --build

# Or rebuild specific service
docker compose up --build analytics-api
```

### WebSocket Connection Failures

**Problem:** Real-time dashboard updates not working, console shows WebSocket errors

**Solution:**
```bash
# Verify Analytics API WebSocket is running
curl http://localhost:8001/health

# Check WebSocket endpoint directly (browser console)
const ws = new WebSocket("ws://localhost:8001/ws/dashboard/nexabank");
ws.onopen = () => console.log("Connected!");
ws.onerror = (e) => console.log("Error:", e);
```

### Debugging ClickHouse Queries

**Problem:** Analytics show no data or confusing results

**Solution:**
1. **Access ClickHouse UI:** [http://localhost:8123](http://localhost:8123)
2. **Run diagnostic query:**
   ```sql
   -- Check event volume per tenant
   SELECT tenant_id, COUNT(*) as event_count, MAX(timestamp) as latest
   FROM events
   GROUP BY tenant_id
   ORDER BY event_count DESC;
   
   -- Check if data is arriving in real-time
   SELECT COUNT(*) FROM events WHERE timestamp > now() - INTERVAL 5 MINUTE;
   ```

---

## 🚀 Next Steps

### After Initial Setup

1. **Explore NexaBank:**
   - Create multiple accounts
   - Perform various transactions
   - Test KYC flows and loan applications
   - Generate telemetry data

2. **Analyze in Dashboard:**
   - Watch KPI metrics update in real-time
   - Explore funnels (login → transfer journeys)
   - Check feature adoption heatmaps
   - Generate AI-powered reports

3. **Customize RBAC:**
   - Add your team members to `rbac.json`
   - Test different admin access levels
   - Verify role-based view restrictions

4. **Add Custom Tenants:**
   - Follow the multi-tenant guide above
   - Ingest custom application data
   - Build tenant-specific dashboards

5. **Deploy to Production:**
   - Use managed Kafka (Confluent Cloud, AWS MSK)
   - Use managed ClickHouse (ClickHouse Cloud)
   - Use managed PostgreSQL (AWS RDS, Supabase)
   - Deploy via Kubernetes or ECS

---

## 👥 Team

Built by [Abhishek Kumawat](https://github.com/abhishekkumawat-47) and [Omesh Mehta](https://github.com/Omesh2004) and [Varada Patel](https://github.com/Varada2908).

Nucleus powers real-time feature intelligence for **modern fintech and SaaS platforms**.

---

<p align="center">
  <sub>Built using Python, TypeScript, Kafka, ClickHouse, and Docker containers.</sub>
</p>
