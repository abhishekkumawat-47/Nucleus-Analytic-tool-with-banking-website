<p align="center">
  <img src="analytics-dashboard/public/logo1.png" alt="Nucleus Logo" width="80" />
</p>

<h1 align="center">FinInsights — Multi-Tenant Growth Analytics & Feature Intelligence Platform</h1>

<p align="center">
  <b>Enterprise-grade, real-time analytics + NexaBank (production banking app) in Docker. Powered by ClickHouse, Kafka, AI insights, and real-time dashboards.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/ClickHouse-24.3-FFCC01?logo=clickhouse&logoColor=black" />
  <img src="https://img.shields.io/badge/Kafka-7.4-231F20?logo=apachekafka&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" />
</p>

---

## 🚀 Quick Start — Run Everything in 3 Steps

### 1. Prerequisites
- **Docker Desktop** 4.x+ ([Get it](https://www.docker.com/products/docker-desktop))
- **8+ GB RAM** (10+ GB recommended for all services)
- **15 GB+ free disk space**

### 2. Clone & Run
```bash
git clone https://github.com/abhishekkumawat-47/Nucleus-Analytic-tool-with-banking-website.git
cd Nucleus-Analytic-tool-with-banking-website

# Start all 11 services
docker compose up --build
```
⏳ **First run: 5–10 minutes** (downloads images & Ollama LLM). Subsequent runs are faster.

### 3. Access Applications
| App | URL | Purpose |
|-----|-----|---------|
| **NexaBank** | [http://localhost:3002](http://localhost:3002) | Banking app (sign up, transfers, loans, KYC) |
| **Analytics Dashboard** | [http://localhost:3001](http://localhost:3001) | Admin analytics (requires rbac setup) |
| **API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) , [8001/docs](http://localhost:8001/docs) | Swagger UI |

---

## 📋 Table of Contents

- [Quick Start](#-quick-start--run-everything-in-3-steps)
- [Project Overview](#-project-overview)
- [Service Port Map](#-service-port-map)
- [First-Time Setup](#-first-time-setup-nexabank-admin--analytics-access)
- [API Reference](#-api-reference-key-endpoints)
- [Architecture](#-architecture-overview)
- [Troubleshooting](#-troubleshooting)

---

## 🧠 Project Overview

**FinInsights** is a feature intelligence & growth analytics platform for multi-tenant SaaS. It connects to **NexaBank** (a full banking application) and extracts real-time insights: user funnels, feature adoption, retention cohorts, growth trends, and AI-powered reports.

**How it works:** User events (account creation, transfers, loans, KYC) flow through Kafka → ClickHouse analytics data warehouse → APIs → dashboards with AI insights.

### Key Capabilities
- ✅ **Real-time event ingestion** (Kafka)
- ✅ **Multi-tenant isolation** (complete data separation)
- ✅ **Funnel analysis** (conversion tracking via `windowFunnel()`)
- ✅ **Retention & cohorts** (D1, D7, D30, D60, D90)
- ✅ **Feature heatmaps** (adoption intensity by time/segment)
- ✅ **AI reports** (LLM-generated insights via local Ollama)
- ✅ **RBAC** (Google OAuth + role-based access)
- ✅ **Real-time WebSocket** dashboards
- ✅ **Production banking app** (NexaBank with accounts, transfers, loans)

---

## 🏗 Architecture Overview

```
NexaBank App (:3002)  ──Events──>  Ingestion API (:8000)
                                         │
                                      Kafka Broker (:9092)
                                         │
                    Processor Worker ────┘
                         │
                      ClickHouse (:8123)
                         │
          Analytics API (:8001) ──┬─> Dashboard (:3001)
                                  └─> Ollama LLM (:11434)
```

**Flow:** Users generate events in NexaBank → Events published to Kafka → Processor consumes and batches to ClickHouse → Analytics API queries data → Dashboard displays + WebSocket real-time updates

---

## 🔌 Service Port Map

| Port | Service | Technology | Description |
|------|---------|-----------|-------------|
| **3002** | NexaBank Frontend | Next.js 15 | Full banking app UI (login, dashboard, transfers, loans, KYC) |
| **5000** | NexaBank Backend | Node.js / Express / Prisma | Banking REST API + WebSocket (Supabase PostgreSQL) |
| **3001** | Analytics Dashboard | Next.js 15 | Admin analytics UI with charts, funnels, AI reports |
| **8000** | Ingestion API | Python / FastAPI | Event ingestion endpoint → Kafka producer |
| **8001** | Analytics API | Python / FastAPI | Read-heavy analytics queries → ClickHouse |
| **9092** | Kafka Broker | Confluent Kafka 7.4 | Message broker for event streaming |
| **2181** | Zookeeper | Confluent Zookeeper | Kafka coordination service |
| **8123** | ClickHouse (HTTP) | ClickHouse 24.3 | OLAP database HTTP interface |
| **9000** | ClickHouse (Native) | ClickHouse 24.3 | OLAP database native interface |
| **11434** | Ollama | Ollama (llama3.2:1b) | Local LLM server for AI report generation |

---

## � First-Time Setup

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

Built by [Abhishek Kumawat](https://github.com/abhishekkumawat-47) , [Omesh Mehta](https://github.com/Omesh2004) and [Varada Patel](https://github.com/Varada2908).

FinInsights powers real-time feature intelligence for **modern fintech and SaaS platforms**.

---

<p align="center">
  <sub>Built using Python, TypeScript, Kafka, ClickHouse, and Docker containers for FinSpark - Season 1 by Nucleus Softwares.</sub>
</p>
