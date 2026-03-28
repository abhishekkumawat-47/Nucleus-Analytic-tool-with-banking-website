# Feature Intelligence & Usage Analytics Framework

An enterprise-grade, high-throughput backend architecture designed to ingest, process, and analyze feature usage events in real-time.

## 🏗️ Architecture
- **Ingestion API (FastAPI, Port 8000)**: Asynchronous, non-blocking ingestion endpoint (`POST /events`) that validates via Pydantic, strips PII, and streams directly to Kafka.
- **Message Broker (Kafka)**: Ensures reliable decoupling of incoming events from the downstream databases.
- **Worker (Python `confluent-kafka`)**: A processor daemon that batches Kafka messages and inserts them into ClickHouse efficiently.
- **Storage / OLAP (ClickHouse)**: A columnar DB highly optimized for analytical read queries like Funnels and aggregations.
- **Analytics API (FastAPI, Port 8001)**: Dedicated read-heavy API for querying usage, generating drop-off funnels via `windowFunnel`, and executing Rule-Based ML queries.

## 🚀 Running Locally (Docker Compose)

1. **Spin up the stack**:
   ```bash
   docker-compose up -d --build
   ```
   *This starts Zookeeper, Kafka, Clickhouse, Ingestion API, Processor, and Analytics API.*

2. **Wait a few seconds** for Kafka and ClickHouse to initialize.

3. **Seed Test Data**:
   Ensure you have the `requests` library installed locally, then run the seeder:
   ```bash
   pip install requests
   python scripts/seed_data.py
   ```
   *This simulates hundreds of user sessions with realistic drop-offs and feature usage over a 7-day period.*

## 📊 Example API Usage

**1. Ingest a Single Event**
```bash
curl -X POST http://localhost:8000/events \
     -H "Content-Type: application/json" \
     -d '{
           "event_name": "export_csv",
           "tenant_id": "initech",
           "user_id": "usr_999",
           "timestamp": 1718361234.56,
           "channel": "web",
           "metadata": {"email": "boss@initech.com"}
         }'
```
*(Notice the email will be masked automatically before being pushed to Kafka)*

**2. Analyze a Funnel**
```bash
curl "http://localhost:8001/funnels?tenant_id=acme_corp&steps=login,apply,kyc,approval&window_minutes=60"
```
*Expected Response (`drop_off_pct` indicates the drop-off from the previous step):*
```json
{
  "tenant_id": "acme_corp",
  "funnel": [
    { "step": 1, "event_name": "login", "users_completed": 120, "drop_off_pct": 0.0 },
    { "step": 2, "event_name": "apply", "users_completed": 95, "drop_off_pct": 20.83 },
    { "step": 3, "event_name": "kyc", "users_completed": 45, "drop_off_pct": 52.63 },
    { "step": 4, "event_name": "approval", "users_completed": 15, "drop_off_pct": 66.67 }
  ]
}
```

**3. Discover Rule-Based Insights**
```bash
curl "http://localhost:8001/insights?tenant_id=globex"
```
*Expected Response:*
```json
{
  "tenant_id": "globex",
  "insights": [
    {
      "type": "Low Adoption",
      "severity": "medium",
      "feature": "change_theme",
      "message": "Feature 'change_theme' has very low adoption (5 interactions last 7 days). Consider a tooltip or UI surfacing."
    }
  ]
}
```

**4. Compare Tenants**
```bash
curl "http://localhost:8001/tenants/compare?feature=login"
```
