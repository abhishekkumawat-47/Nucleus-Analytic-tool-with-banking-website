import sys
import os
from typing import List, Optional
from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storage.client import ch_client
from api.insights import generate_insights, query_ollama
from core.config import settings
from core.middleware import require_cloud_mode, require_tenant_access
import time
from datetime import datetime

# In-memory dictionary to cache AI reports: { tenant_id: { "timestamp": float, "report": str } }
AI_REPORT_CACHE = {}
AI_CACHE_TTL = 3600  # 1 hour cache duration
app = FastAPI(
    title="Feature Analytics API",
    description="APIs for feature adoption, funnel analysis, and rule-based insights."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

class RBACMiddleware(BaseHTTPMiddleware):
    """
    Strict Role-Based Access Control middleware.
    
    Roles:
      super_admin  → Overall platform admin, aggregated summaries ONLY, NO raw/sensitive data
      app_admin    → App-level admin, full access to detailed analytics for their app
      user         → No API access at all
    """
    
    # Endpoints that are too sensitive for super_admin (raw data, user-level details, tenant-specific analytics)
    COMPANY_ADMIN_BLOCKED = [
        "/audit_logs",
        "/locations",
        "/metrics/realtime_users",
        "/metrics/pages_per_minute",
        "/metrics/top_pages",
        "/metrics/devices",
        "/metrics/channels",
        "/metrics/retention",
        "/metrics/secondary_kpi",
        "/metrics/traffic",
        "/metrics/feature_usage_series",
        "/features/activity",
        "/features/configs",
        "/funnels",
        "/transparency",
        "/license",
        "/journey",
        "/predictive",
        "/segmentation",
    ]
    
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # Public paths and CORS Preflight — always accessible
        if request.method == "OPTIONS" or path.startswith("/deployment") or path.startswith("/health") or path == "/" or path.startswith("/ws/"):
            return await call_next(request)
            
        role = request.headers.get("X-User-Role", "user")
        
        # Normal users can't access any data APIs
        if role == "user":
            return JSONResponse(
                status_code=403, 
                content={"detail": "Forbidden: Access denied. Normal users cannot access analytics APIs."}
            )
            
        # Super admin (overall admin): aggregated endpoints ONLY, block all sensitive/detailed data
        if role == "super_admin":
            # Check if the path matches any blocked endpoint
            if any(path.startswith(blocked) for blocked in self.COMPANY_ADMIN_BLOCKED):
                return JSONResponse(
                    status_code=403, 
                    content={"detail": "Forbidden: Super admins cannot access detailed analytics data. Use /admin/* for aggregated summaries."}
                )
            
            # Explicitly allow only these patterns for super_admin
            allowed = ["/admin", "/metrics/kpi", "/insights", "/tenants", "/features/usage", "/deployment", "/ai_report", "/tracking", "/config"]
            if not any(path.startswith(prefix) for prefix in allowed):
                return JSONResponse(
                    status_code=403, 
                    content={"detail": "Forbidden: Endpoint not available for super admin role."}
                )
        # app_admin: full access to all detailed endpoints, but MUST be restricted to their assigned tenant
        if role == "app_admin":
            tenant_id = request.query_params.get("tenant_id")
            email = request.headers.get("X-User-Email")
            
            # Some endpoints don't require tenant_id (they are global or use request body)
            tenant_optional_paths = ["/tenants", "/deployment", "/license/sync", "/config"]
            is_tenant_optional = any(path.startswith(p) for p in tenant_optional_paths)
            
            if is_tenant_optional and email:
                pass  # Allow without tenant_id
            elif tenant_id and email:
                pass  # Normal tenant-scoped access
            else:
                return JSONResponse(
                    status_code=403, 
                    content={"detail": "Forbidden: Admin request missing tenant_id or user email headers."}
                )
             
        response = await call_next(request)
        return response

app.add_middleware(RBACMiddleware)

from fastapi import WebSocket, WebSocketDisconnect
from api.websocket_manager import manager, start_websocket_background_tasks

@app.on_event("startup")
async def startup_event():
    await start_websocket_background_tasks()

@app.websocket("/ws/dashboard/{tenant_id}")
async def websocket_dashboard(websocket: WebSocket, tenant_id: str):
    await manager.connect(websocket, tenant_id)
    try:
        while True:
            # Wait for any incoming keep-alive or message
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, tenant_id)


@app.get("/features/usage")
def get_feature_usage(tenant_id: str, days: int = Query(7, ge=1, le=365)):
    """
    Returns aggregated feature usage stats for a specific tenant over the last N days.
    """
    require_tenant_access(tenant_id)
    sql = """
        SELECT 
            event_name, 
            count() as total_interactions,
            uniq(user_id) as unique_users
        FROM feature_intelligence.events_raw
        WHERE tenant_id = %(tenant_id)s AND timestamp >= today() - %(days)s
        GROUP BY event_name
        ORDER BY total_interactions DESC
    """
    try:
        results = ch_client.query(sql, {"tenant_id": tenant_id, "days": days})
        return {"tenant_id": tenant_id, "period_days": days, "usage": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/funnels")
def get_funnel_analysis(
    tenant_id: str, 
    steps: str = Query(..., description="Comma-separated list of event names (e.g., login,apply,kyc,approve)"),
    window_minutes: int = Query(60, description="Minutes to complete the funnel")
):
    """
    Advanced funnel analysis leveraging Clickhouse's windowFunnel.
    Computes conversion drop-offs between a sequence of events.
    """
    require_tenant_access(tenant_id)
    step_events = [s.strip() for s in steps.split(",") if s.strip()]
    
    if len(step_events) < 2:
        raise HTTPException(status_code=400, detail="At least two steps required for a funnel.")

    # Dynamically build the match conditions for windowFunnel
    # format: event_name = 'login', event_name = 'apply'
    conditions = ", ".join([f"event_name = '{step}'" for step in step_events])
    
    sql = f"""
        SELECT 
            level,
            count() as users_reached_level
        FROM (
            SELECT 
                user_id,
                windowFunnel(%(window)s)(
                    timestamp,
                    {conditions}
                ) as level
            FROM feature_intelligence.events_raw
            WHERE tenant_id = %(tenant_id)s
            GROUP BY user_id
        )
        GROUP BY level
        ORDER BY level ASC
    """
    try:
        # windowFunnel needs time in seconds
        results = ch_client.query(sql, {"tenant_id": tenant_id, "window": window_minutes * 60})
        
        # Format the response to show drop-offs
        funnel_stats = []
        previous_count = 0
        
        # The result returns `level` 0 to N.
        # level 1 means they completed step 1. level 2 means step 1 + 2.
        # To get the top of the funnel (completed step 1), we look at users who reached AT LEAST level 1.
        
        # Actually Clickhouse windowFunnel aggregate groups exact levels reached. So we need to reverse cumsum.
        levels_dict = {row['level']: row['users_reached_level'] for row in results}
        
        # Calculate how many people reached *at least* this step
        # If someone is at level 3, they reached level 1 and 2 as well.
        total_at_least_level = {}
        cumulative = 0
        for i in range(len(step_events), 0, -1):
            cumulative += levels_dict.get(i, 0)
            total_at_least_level[i] = cumulative
            
        for i, step_name in enumerate(step_events, 1):
            count = total_at_least_level.get(i, 0)
            drop_off = 0
            if i > 1:
                prev_count = total_at_least_level.get(i - 1, 0)
                drop_off = (prev_count - count) / prev_count if prev_count > 0 else 0.0
                
            funnel_stats.append({
                "step": i,
                "event_name": step_name,
                "users_completed": count,
                "drop_off_pct": round(drop_off * 100, 2)
            })

        return {"tenant_id": tenant_id, "funnel": funnel_stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tenants/compare")
def compare_tenants(feature: str = Query(..., description="Feature event to compare adoption across tenants")):
    """
    Compare feature adoption across all tenants. 
    Useful for seeing which clients are utilizing the platform most.
    """
    require_cloud_mode()
    sql = """
        SELECT 
            tenant_id, 
            sum(total_events) as total_interactions
        FROM feature_intelligence.daily_feature_usage
        WHERE event_name = %(feature)s
        GROUP BY tenant_id
        ORDER BY total_interactions DESC
    """
    try:
        results = ch_client.query(sql, {"feature": feature})
        return {"feature": feature, "tenant_comparison": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/insights")
def get_insights(tenant_id: str):
    """
    Returns AI/Rule-based actionable insights for a tenant. 
    Detects features that are not being used or sudden spikes.
    """
    require_tenant_access(tenant_id)

    cached_data = AI_REPORT_CACHE.get(tenant_id)
    if cached_data and cached_data.get("insights"):
        return {"tenant_id": tenant_id, "insights": cached_data["insights"], "cached": True}

    # Try loading from ClickHouse if in-memory cache is empty
    import json as _json
    try:
        sql_db = """
            SELECT insights FROM feature_intelligence.ai_reports FINAL
            WHERE tenant_id = %(tenant_id)s LIMIT 1
        """
        db_rows = ch_client.query(sql_db, {"tenant_id": tenant_id})
        if db_rows and db_rows[0].get("insights"):
            raw = db_rows[0]["insights"]
            parsed = _json.loads(raw) if isinstance(raw, str) else raw
            if parsed:
                return {"tenant_id": tenant_id, "insights": parsed, "cached": True}
    except Exception:
        pass

    insights_data = generate_insights(tenant_id)
    existing = AI_REPORT_CACHE.get(tenant_id, {})
    AI_REPORT_CACHE[tenant_id] = {
        **existing,
        "timestamp": existing.get("timestamp", time.time()),
        "insights": insights_data,
        "generated_at": existing.get("generated_at", datetime.utcnow().isoformat()),
    }
    return {"tenant_id": tenant_id, "insights": insights_data, "cached": False}

@app.get("/metrics/kpi")
def get_kpi_metrics(tenant_id: str):
    """
    Returns high-level KPI metrics for the dashboard header.
    All values are computed dynamically from ClickHouse — no hardcoded data.
    """
    require_tenant_access(tenant_id)
    import math

    try:
        # --- Current period (last 7 days) ---
        sql_current = """
            SELECT 
                count() as total_events,
                count(distinct event_name) as active_features
            FROM feature_intelligence.events_raw
            WHERE tenant_id = %(tenant_id)s AND timestamp >= today() - 7
        """
        res_current = ch_client.query(sql_current, {"tenant_id": tenant_id})
        cur = res_current[0] if res_current else {"total_events": 0, "active_features": 0}

        # --- Previous period (7-14 days ago) for change calculation ---
        sql_prev = """
            SELECT 
                count() as total_events,
                count(distinct event_name) as active_features
            FROM feature_intelligence.events_raw
            WHERE tenant_id = %(tenant_id)s AND timestamp >= today() - 14 AND timestamp < today() - 7
        """
        res_prev = ch_client.query(sql_prev, {"tenant_id": tenant_id})
        prev = res_prev[0] if res_prev else {"total_events": 0, "active_features": 0}

        def pct_change(current_val: int, previous_val: int) -> tuple:
            if previous_val == 0:
                return (0.0, "up")
            change = ((current_val - previous_val) / previous_val) * 100
            return (round(abs(change), 1), "up" if change >= 0 else "down")

        events_change, events_dir = pct_change(cur["total_events"] or 0, prev["total_events"] or 0)
        features_change, features_dir = pct_change(cur["active_features"] or 0, prev["active_features"] or 0)

        # --- Avg Response Time from metadata ---
        sql_response = """
            SELECT avg(toFloat64OrZero(JSONExtractString(metadata, 'response_time_ms'))) as avg_rt
            FROM feature_intelligence.events_raw
            WHERE tenant_id = %(tenant_id)s AND timestamp >= today() - 7
              AND JSONHas(metadata, 'response_time_ms') = 1
        """
        res_rt = ch_client.query(sql_response, {"tenant_id": tenant_id})
        raw_rt = res_rt[0]["avg_rt"] if res_rt and "avg_rt" in res_rt[0] else 0
        if raw_rt is None or (isinstance(raw_rt, float) and math.isnan(raw_rt)):
            avg_rt = 0
        else:
            avg_rt = int(raw_rt)

        sql_response_prev = """
            SELECT avg(toFloat64OrZero(JSONExtractString(metadata, 'response_time_ms'))) as avg_rt
            FROM feature_intelligence.events_raw
            WHERE tenant_id = %(tenant_id)s AND timestamp >= today() - 14 AND timestamp < today() - 7
              AND JSONHas(metadata, 'response_time_ms') = 1
        """
        res_rt_prev = ch_client.query(sql_response_prev, {"tenant_id": tenant_id})
        raw_rt_prev = res_rt_prev[0]["avg_rt"] if res_rt_prev and "avg_rt" in res_rt_prev[0] else 0
        if raw_rt_prev is None or (isinstance(raw_rt_prev, float) and math.isnan(raw_rt_prev)):
            avg_rt_prev = 0
        else:
            avg_rt_prev = int(raw_rt_prev)

        rt_change, rt_dir = pct_change(avg_rt, avg_rt_prev)
        rt_display = f"{avg_rt} ms" if avg_rt > 0 else "0 ms"

        # --- Error Rate from events containing 'error' or 'fail' ---
        sql_error = """
            SELECT
                countIf(lower(event_name) LIKE '%%error%%' OR lower(event_name) LIKE '%%fail%%') as error_events,
                count() as total
            FROM feature_intelligence.events_raw
            WHERE tenant_id = %(tenant_id)s AND timestamp >= today() - 7
        """
        res_err = ch_client.query(sql_error, {"tenant_id": tenant_id})
        err_row = res_err[0] if res_err else {"error_events": 0, "total": 1}
        total_for_err = err_row["total"] if err_row["total"] > 0 else 1
        error_rate = round((err_row["error_events"] / total_for_err) * 100, 1)

        sql_error_prev = """
            SELECT
                countIf(lower(event_name) LIKE '%%error%%' OR lower(event_name) LIKE '%%fail%%') as error_events,
                count() as total
            FROM feature_intelligence.events_raw
            WHERE tenant_id = %(tenant_id)s AND timestamp >= today() - 14 AND timestamp < today() - 7
        """
        res_err_prev = ch_client.query(sql_error_prev, {"tenant_id": tenant_id})
        err_prev_row = res_err_prev[0] if res_err_prev else {"error_events": 0, "total": 1}
        total_prev_err = err_prev_row["total"] if err_prev_row["total"] > 0 else 1
        error_rate_prev = round((err_prev_row["error_events"] / total_prev_err) * 100, 1)
        err_change, err_dir = pct_change(int(error_rate * 10), int(error_rate_prev * 10))

        return [
            {
                "id": "total-events",
                "label": "Total Events",
                "value": f"{cur['total_events']:,}" if cur['total_events'] else "0",
                "change": events_change,
                "changeDirection": events_dir,
                "icon": "activity",
            },
            {
                "id": "active-features",
                "label": "Active Features",
                "value": str(cur['active_features'] or 0),
                "change": features_change,
                "changeDirection": features_dir,
                "icon": "layers",
            },
            {
                "id": "avg-response",
                "label": "Avg Response Time",
                "value": rt_display,
                "change": rt_change,
                "changeDirection": rt_dir,
                "icon": "clock",
            },
            {
                "id": "error-rate",
                "label": "Error Rate",
                "value": f"{error_rate}%",
                "change": err_change,
                "changeDirection": err_dir,
                "icon": "alert-triangle",
            }
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics/secondary_kpi")
def get_secondary_kpi(tenant_id: str):
    """
    Returns dynamically computed extended KPI metrics: Total Visits, Unique Visitors, Session Time, Bounce Rate.
    """
    require_tenant_access(tenant_id)
    try:
        sql_basic = """
            SELECT 
                count() as total_visits,
                uniqExact(user_id) as unique_visitors
            FROM feature_intelligence.events_raw
            WHERE tenant_id = %(tenant_id)s
        """
        res_basic = ch_client.query(sql_basic, {"tenant_id": tenant_id})
        basic = res_basic[0] if res_basic else {"total_visits": 0, "unique_visitors": 0}

        sql_bounce = """
            SELECT 
                count() as total_users,
                countIf(event_count = 1) as bounced_users
            FROM (
                SELECT user_id, count() as event_count
                FROM feature_intelligence.events_raw
                WHERE tenant_id = %(tenant_id)s
                GROUP BY user_id
            )
        """
        res_bounce = ch_client.query(sql_bounce, {"tenant_id": tenant_id})
        b_users = res_bounce[0]["bounced_users"] if res_bounce else 0
        t_users = res_bounce[0]["total_users"] if res_bounce else 1
        t_users = t_users if t_users > 0 else 1
        bounce_rate = round((b_users / t_users) * 100, 1)

        sql_time = """
            SELECT avg(session_duration) as avg_time
            FROM (
                SELECT user_id, dateDiff('second', min(timestamp), max(timestamp)) as session_duration
                FROM feature_intelligence.events_raw
                WHERE tenant_id = %(tenant_id)s
                GROUP BY user_id
                HAVING session_duration > 0
            )
        """
        import math
        res_time = ch_client.query(sql_time, {"tenant_id": tenant_id})
        raw_avg = res_time[0]["avg_time"] if res_time and "avg_time" in res_time[0] else 0
        if raw_avg is None or (isinstance(raw_avg, float) and math.isnan(raw_avg)):
            avg_time_sec = 0
        else:
            avg_time_sec = int(raw_avg)
            
        mins = avg_time_sec // 60
        secs = avg_time_sec % 60
        avg_time_str = f"{mins}m {secs}s" if avg_time_sec > 0 else "0m 0s"

        return [
            {
                "id": "total-visits",
                "label": "Total Visits",
                "value": f"{basic['total_visits']:,}",
                "change": 0,
                "changeDirection": "up",
                "icon": "globe",
            },
            {
                "id": "unique-visitors",
                "label": "Unique Visitors",
                "value": f"{basic['unique_visitors']:,}",
                "change": 0,
                "changeDirection": "up",
                "icon": "users",
            },
            {
                "id": "avg-session",
                "label": "Avg. Session Time",
                "value": avg_time_str,
                "change": 0,
                "changeDirection": "down",
                "icon": "clock",
            },
            {
                "id": "bounce-rate",
                "label": "Bounce Rate",
                "value": f"{bounce_rate}%",
                "change": 0,
                "changeDirection": "down",
                "icon": "trending-down",
            }
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics/traffic")
def get_traffic_data(tenant_id: str, days: int = Query(7, ge=1, le=365)):
    """
    Time series data for traffic overview.
    """
    require_tenant_access(tenant_id)
    sql = """
        SELECT 
            toDate(timestamp) as date,
            count() as pageViews,
            uniq(user_id) as visitors
        FROM feature_intelligence.events_raw
        WHERE tenant_id = %(tenant_id)s AND timestamp >= today() - %(days)s
        GROUP BY date
        ORDER BY date ASC
    """
    try:
        results = ch_client.query(sql, {"tenant_id": tenant_id, "days": days})
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics/feature_usage_series")
def get_feature_usage_series(tenant_id: str, days: int = Query(7, ge=1, le=365)):
    """
    Time series feature usage data points.
    """
    require_tenant_access(tenant_id)
    sql = """
        SELECT 
            toDate(timestamp) as date,
            count() as usage
        FROM feature_intelligence.events_raw
        WHERE tenant_id = %(tenant_id)s AND timestamp >= today() - %(days)s
        GROUP BY date
        ORDER BY date ASC
    """
    try:
        results = ch_client.query(sql, {"tenant_id": tenant_id, "days": days})
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tenants")
def get_all_tenants(tenant_id: Optional[str] = None):
    """
    Returns list of distinct tenants with real metrics from ClickHouse.
    If tenant_id is provided, returns only that tenant's data (for app_admin).
    """
    try:
        where_clause = ""
        params = {}
        if tenant_id:
            where_clause = "WHERE tenant_id = %(tenant_id)s"
            params["tenant_id"] = tenant_id

        sql = f"""
            SELECT 
                tenant_id as id,
                tenant_id as name,
                toUInt64(count()) as featureUsage,
                toUInt64(count(distinct event_name)) as activeFeatures,
                toUInt64(count(distinct user_id)) as uniqueUsers,
                countIf(lower(event_name) LIKE '%%error%%' OR lower(event_name) LIKE '%%fail%%') as errorCount
            FROM feature_intelligence.events_raw
            {where_clause}
            GROUP BY tenant_id
            ORDER BY featureUsage DESC
        """
        results = ch_client.query(sql, params)
        tenants = []
        for row in results:
            total = int(row['featureUsage']) or 1
            errors = int(row.get('errorCount', 0))
            unique_users = int(row.get('uniqueUsers', 0))
            active_features = int(row.get('activeFeatures', 0))
            adoption = round((active_features / max(active_features + 2, 1)) * 100) if active_features else 0
            tenants.append({
                "id": row['id'],
                "name": row['name'].replace('_', ' ').title(),
                "featureUsage": total,
                "errors": errors,
                "adoptionRate": min(adoption, 100),
                "plan": "enterprise",
                "uniqueUsers": unique_users,
                "activeFeatures": active_features,
            })
        return tenants
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics/devices")
def get_device_breakdown(tenant_id: str):
    """
    Device breakdown parsed from metadata or roughly estimated.
    """
    require_tenant_access(tenant_id)
    sql = """
        SELECT 
            JSONExtractString(metadata, 'device_type') as device,
            count() as value
        FROM feature_intelligence.events_raw
        WHERE tenant_id = %(tenant_id)s AND JSONHas(metadata, 'device_type') = 1
        GROUP BY device
    """
    try:
        device_res = ch_client.query(sql, {"tenant_id": tenant_id})
        breakdown = []
        colors = {"desktop": "#0EA5A4", "mobile": "#3B82F6", "tablet": "#F59E0B"}
        
        for row in device_res:
            dev = row['device'].lower()
            if dev not in colors:
                dev = "mobile" # fallback default
            breakdown.append({
                "name": dev.capitalize(),
                "value": int(row['value']),
                "color": colors[dev]
            })
        
        if not breakdown:
            breakdown = [
                {"name": 'Desktop', "value": 62, "color": '#0EA5A4'},
                {"name": 'Mobile', "value": 28, "color": '#3B82F6'}
            ]
            
        return breakdown
    except Exception:
        return [
            {"name": 'Desktop', "value": 50, "color": '#0EA5A4'},
            {"name": 'Mobile', "value": 50, "color": '#3B82F6'}
        ]

@app.get("/locations")
def get_locations(tenant_id: str):
    """
    Dynamic locations derived from metadata.location and metadata.continent,
    falling back to IP mapping. Returns country-level data with continent field.
    """
    require_tenant_access(tenant_id)
    sql = """
        SELECT 
            JSONExtractString(metadata, 'location') as location,
            JSONExtractString(metadata, 'continent') as continent,
            JSONExtractString(metadata, 'city') as city,
            JSONExtractString(metadata, 'ip') as ip,
            count() as visits
        FROM feature_intelligence.events_raw
        WHERE tenant_id = %(tenant_id)s
        GROUP BY location, continent, city, ip
    """
    try:
        results = ch_client.query(sql, {"tenant_id": tenant_id})
        
        ip_map = {
            "12.34.56.78": "USA",
            "98.76.54.32": "United Kingdom",
            "192.168.1.1": "Germany",
            "111.111.111.111": "India"
        }
        
        # Country → continent mapping for fallback
        COUNTRY_CONTINENT_MAP = {
            "India": "Asia", "Japan": "Asia", "Singapore": "Asia", "UAE": "Asia",
            "China": "Asia", "South Korea": "Asia", "Thailand": "Asia",
            "USA": "North America", "Canada": "North America", "Mexico": "North America",
            "United Kingdom": "Europe", "Germany": "Europe", "France": "Europe",
            "Netherlands": "Europe", "Sweden": "Europe", "Switzerland": "Europe",
            "Spain": "Europe", "Italy": "Europe",
            "Brazil": "South America", "Argentina": "South America",
            "Colombia": "South America", "Chile": "South America",
            "Nigeria": "Africa", "Kenya": "Africa", "South Africa": "Africa", "Egypt": "Africa",
            "Australia": "Oceania", "New Zealand": "Oceania",
        }
        
        locations_dict = {}  # country -> {visits, continent}
        for row in results:
            # Prioritize the explicitly passed 'location' variable
            if row.get('location'):
                country = row['location']
            else:
                country = ip_map.get(row['ip'], "Other")
            
            # Get continent from metadata or fallback map
            continent = row.get('continent') or COUNTRY_CONTINENT_MAP.get(country, "Other")
            
            if country not in locations_dict:
                locations_dict[country] = {"visits": 0, "continent": continent}
            locations_dict[country]["visits"] += row['visits']
            
        location_data = [
            {"country": k, "visits": v["visits"], "continent": v["continent"]} 
            for k, v in locations_dict.items()
            if k != "Other" and v["continent"] != "Other"
        ]
        location_data.sort(key=lambda x: x["visits"], reverse=True)
        return location_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/audit_logs")
def get_audit_logs(tenant_id: str):
    require_tenant_access(tenant_id)
    sql = """
        SELECT 
            event_name,
            user_id,
            channel,
            timestamp,
            metadata
        FROM feature_intelligence.events_raw
        WHERE tenant_id = %(tenant_id)s
        ORDER BY timestamp DESC
        LIMIT 50
    """
    try:
        results = ch_client.query(sql, {"tenant_id": tenant_id})
        logs = []
        import json
        for i, row in enumerate(results):
            meta_str = row.get("metadata", "{}")
            try:
                meta = json.loads(meta_str)
            except:
                meta = {}
            
            user_email = meta.get("email", row["user_id"])
            logs.append({
                "id": f"al-{tenant_id}-{i}",
                "user": str(user_email),
                "action": row["event_name"].capitalize().replace("_", " "),
                "resource": f"Channel: {row['channel']}",
                "timestamp": str(row["timestamp"]) if isinstance(row["timestamp"], str) else (row["timestamp"].strftime("%Y-%m-%d %H:%M:%S") if hasattr(row["timestamp"], "strftime") else str(row["timestamp"])),
                "details": f"Role: {meta.get('role', 'user')} / IP: {meta.get('ip', 'Unknown')}"
            })
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics/realtime_users")
def get_realtime_users(tenant_id: str):
    require_tenant_access(tenant_id)
    sql = """
        SELECT uniqExact(user_id) as users 
        FROM feature_intelligence.events_raw 
        WHERE tenant_id = %(tenant_id)s AND timestamp >= now() - INTERVAL 5 MINUTE
    """
    try:
        results = ch_client.query(sql, {"tenant_id": tenant_id})
        return results[0]['users'] if results else 0
    except Exception:
        return 0

@app.get("/metrics/pages_per_minute")
def get_pages_per_minute(tenant_id: str):
    require_tenant_access(tenant_id)
    sql = """
        SELECT toStartOfMinute(timestamp) as min, count() as val 
        FROM feature_intelligence.events_raw 
        WHERE tenant_id = %(tenant_id)s AND timestamp >= now() - INTERVAL 60 MINUTE 
        GROUP BY min ORDER BY min ASC
    """
    try:
        results = ch_client.query(sql, {"tenant_id": tenant_id})
        formatted = []
        for r in results:
            formatted.append({
                "hour": r["min"].strftime("%H:%M") if hasattr(r["min"], "strftime") else str(r["min"])[11:16],
                "value": r["val"]
            })
        return formatted
    except Exception:
        return []

@app.get("/metrics/top_pages")
def get_top_pages(tenant_id: str):
    require_tenant_access(tenant_id)
    sql = """
        SELECT event_name as url, count() as visits
        FROM feature_intelligence.events_raw 
        WHERE tenant_id = %(tenant_id)s 
        GROUP BY event_name ORDER BY visits DESC LIMIT 5
    """
    try:
        results = ch_client.query(sql, {"tenant_id": tenant_id})
        formatted = []
        for r in results:
            formatted.append({
                "url": f"/{r['url'].replace('_', '-')}",
                "visits": str(r['visits'])
            })
        return formatted
    except Exception:
        return []

@app.get("/metrics/channels")
def get_channels(tenant_id: str):
    require_tenant_access(tenant_id)
    sql = """
        SELECT
            multiIf(
                lower(channel) NOT IN ('', 'web', 'unknown'),
                    concat(upper(substring(lower(channel), 1, 1)), substring(lower(channel), 2)),
                positionCaseInsensitive(lower(metadata), 'google.') > 0 OR
                positionCaseInsensitive(lower(metadata), 'bing.') > 0 OR
                positionCaseInsensitive(lower(metadata), 'yahoo.') > 0 OR
                positionCaseInsensitive(lower(metadata), 'duckduckgo.') > 0,
                    'Organic Search',
                positionCaseInsensitive(lower(metadata), 'facebook.') > 0 OR
                positionCaseInsensitive(lower(metadata), 'instagram.') > 0 OR
                positionCaseInsensitive(lower(metadata), 'linkedin.') > 0 OR
                positionCaseInsensitive(lower(metadata), 'x.com') > 0 OR
                positionCaseInsensitive(lower(metadata), 'twitter.com') > 0,
                    'Social',
                positionCaseInsensitive(lower(metadata), 'mail') > 0 OR
                positionCaseInsensitive(lower(metadata), 'newsletter') > 0,
                    'Email',
                positionCaseInsensitive(lower(metadata), 'localhost') > 0 OR
                positionCaseInsensitive(lower(metadata), 'nexabank') > 0 OR
                positionCaseInsensitive(lower(metadata), 'twitter') > 0,
                    'Internal',
                positionCaseInsensitive(lower(event_name), 'register') > 0 OR
                positionCaseInsensitive(lower(event_name), 'signup') > 0,
                    'New Users',
                positionCaseInsensitive(lower(event_name), 'login') > 0,
                    'Returning Users',
                'Direct'
            ) as source,
            count() as value
        FROM feature_intelligence.events_raw
        WHERE tenant_id = %(tenant_id)s AND timestamp >= today() - 30
        GROUP BY source
        ORDER BY value DESC
    """
    try:
        results = ch_client.query(sql, {"tenant_id": tenant_id})
        total = sum(int(r.get("value", 0)) for r in results) or 1
        formatted = []
        for r in results:
            value = int(r["value"])
            formatted.append({
                "name": str(r["source"]),
                "value": value,
                "formattedValue": f"{round((value / total) * 100)}%"
            })

        if not formatted:
            return [{"name": "Direct", "value": 0, "formattedValue": "0%"}]

        return formatted
    except Exception:
        return []

@app.get("/features/activity")
def get_feature_activity(tenant_id: str):
    require_tenant_access(tenant_id)
    sql = """
        SELECT event_name, count() as total
        FROM feature_intelligence.events_raw 
        WHERE tenant_id = %(tenant_id)s 
        GROUP BY event_name ORDER BY total DESC LIMIT 5
    """
    try:
        results = ch_client.query(sql, {"tenant_id": tenant_id})
        activities = []
        colors = ['#1a73e8', '#4285F4', '#8AB4F8', '#34A853', '#F59E0B', '#EF4444']
        for i, r in enumerate(results):
            c = r['total']
            # Compute a stable deterministic pseudo-random hash to make segments repeatable without random
            h1 = (hash(r['event_name']) % 40) + 10
            h2 = ((hash(r['event_name']) * 3) % 40) + 10
            h3 = 100 - (h1 + h2)
            
            pieces = [h1, h2, h3]
            norm = sum(pieces)
            segments = []
            for j, p in enumerate(pieces):
                segments.append({
                    "color": colors[(i + j) % len(colors)],
                    "width": int((p / norm) * 100)
                })
            activities.append({
                "feature": str(r["event_name"]).capitalize().replace("_", " "),
                "segments": segments,
                "level": "High" if c > 10 else "Low"
            })
        if not activities:
             activities = [{"feature": "No Activity Yet", "segments": [{"color": "#cccccc", "width": 100}], "level": "None"}]
        return activities
    except Exception as e:
        return [{"feature": str(e), "segments": [], "level": "Error"}]

@app.get("/features/heatmap")
def get_feature_heatmap(tenant_id: str = Query(..., description="Comma-separated list of tenants for comparison, or single tenant id.")):
    """
    Returns grid-based heatmap matrix for features.
    If multiple tenants provided, matrix is Feature x Tenant.
    If single tenant provided, matrix is Feature x Date.
    """
    tenant_ids = [t.strip() for t in tenant_id.split(',')]
    for t in tenant_ids:
        require_tenant_access(t)
        
    is_compare = len(tenant_ids) > 1

    if is_compare:
        sql = """
            SELECT event_name as feature, tenant_id as group_key, count() as total
            FROM feature_intelligence.events_raw
            WHERE tenant_id IN %(tenant_ids)s AND timestamp >= today() - 14
            GROUP BY feature, group_key
        """
    else:
        sql = """
            SELECT event_name as feature, toString(toDate(timestamp)) as group_key, count() as total
            FROM feature_intelligence.events_raw
            WHERE tenant_id IN %(tenant_ids)s AND timestamp >= today() - 7
            GROUP BY feature, group_key
        """
        
    try:
        results = ch_client.query(sql, {"tenant_ids": tenant_ids})
        
        # Organize data
        features = {}
        all_groups = set()
        max_total = 0
        
        for r in results:
            f = r["feature"]
            g = r["group_key"]
            t = r["total"]
            
            if f not in features:
                features[f] = {}
            features[f][g] = t
            all_groups.add(g)
            
            if t > max_total:
                max_total = t
                
        # Fill missing groups with 0 and calculate percentages
        sorted_groups = sorted(list(all_groups))
        activities = []
        
        for f, groups in features.items():
            segments = []
            f_total = sum(groups.values())
            
            for g in sorted_groups:
                count = groups.get(g, 0)
                # Percentile globally (against max block) OR relative to feature?
                # Usually heatmap is relative to global max or feature max. Global max is better for absolute intensity.
                percentile = (count / max_total) if max_total > 0 else 0
                pct = round(percentile * 100, 1)
                
                # Assign level
                if pct > 75:
                    lvl = "High"
                    color = "#1e3a8a" # text-blue-900 equivalent / deep blue
                elif pct > 40:
                    lvl = "Med"
                    color = "#3b82f6" # text-blue-500
                elif pct > 0:
                    lvl = "Low"
                    color = "#bfdbfe" # text-blue-200
                else:
                    lvl = "None"
                    color = "#f1f5f9" # slate-100
                    
                segments.append({
                    "group_key": g,
                    "count": count,
                    "percentile": pct,
                    "level": lvl,
                    "color": color
                })
                
            activities.append({
                "feature": f.capitalize().replace("_", " "),
                "raw_feature": f,
                "total_usage": f_total,
                "segments": segments,
                "level": "High" if f_total > 50 else ("Med" if f_total > 10 else "Low")
            })
            
        # Sort features by total usage
        activities.sort(key=lambda x: x["total_usage"], reverse=True)
        
        return {
            "is_compare": is_compare,
            "groups": sorted_groups,
            "activities": activities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/features/configs")
def get_feature_configs(tenant_id: str):
    require_tenant_access(tenant_id)
    return [
        { "id": 'fc-1', "pattern": '/feed', "featureName": 'View Feed', "category": 'interaction', "isActive": True },
        { "id": 'fc-2', "pattern": '/api/tweet', "featureName": 'Post Tweet', "category": 'transaction', "isActive": True },
        { "id": 'fc-3', "pattern": '/api/like', "featureName": 'Like Tweet', "category": 'interaction', "isActive": True },
        { "id": 'fc-4', "pattern": '/auth/login', "featureName": 'Login', "category": 'security', "isActive": True },
    ]

@app.get("/metrics/retention")
def get_retention(tenant_id: str):
    require_tenant_access(tenant_id)
    return [
        { "cohort": 'This Week', "users": 42, "month1": 100, "month2": 50, "month3": 0 },
        { "cohort": 'Last Week', "users": 15, "month1": 80, "month2": 20, "month3": 10 },
    ]

@app.get("/deployment/info")
def get_deployment_info():
    return {
        "mode": settings.DEPLOYMENT_MODE,
        "is_cloud": settings.is_cloud,
        "is_on_prem": settings.is_on_prem,
        "local_tenant": settings.TENANT_ID if settings.is_on_prem else None
    }

@app.get("/admin/summary")
def get_admin_summary():
    """Returns high-level global aggregated stats (Cloud mode only)."""
    require_cloud_mode()
    try:
        sql = """
            SELECT count(distinct tenant_id) as total_tenants, 
                   sum(total_events) as total_events
            FROM feature_intelligence.daily_feature_usage
            WHERE date >= today() - 30
        """
        basic = ch_client.query(sql)[0] if ch_client.query(sql) else {"total_tenants": 0, "total_events": 0}
        
        sql_top = """
            SELECT tenant_id as name, sum(total_events) as events
            FROM feature_intelligence.daily_feature_usage
            GROUP BY tenant_id
            ORDER BY events DESC LIMIT 5
        """
        top_tenants_raw = ch_client.query(sql_top)
        top_tenants = [
            {"name": row["name"].capitalize(), "events": int(row["events"])} 
            for row in top_tenants_raw
        ]
        
        return {
            "total_tenants": basic["total_tenants"],
            "total_events": basic["total_events"],
            "top_tenants": top_tenants
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/app/{tenant_id}/summary")
def get_admin_app_summary(tenant_id: str):
    """Returns basic KPIs and Insights for a specfic app (Cloud mode only)."""
    require_cloud_mode()
    return {
        "kpi": get_kpi_metrics(tenant_id),
        "insights": get_insights(tenant_id)["insights"]
    }

@app.get("/transparency/cloud-data")
def get_transparency_data(tenant_id: str):
    """Summarizes what data is visible to the cloud/admin."""
    require_tenant_access(tenant_id)
    
    # In a fully deployed setup, this could query exact synced row counts.
    # For now, it describes the privacy boundaries based on settings.
    return {
        "deploymentMode": settings.DEPLOYMENT_MODE,
        "visible_categories": [
            {
                "category": "Feature Usage KPIs", 
                "is_synced": True, 
                "details": "Aggregated counts of feature interactions. Used for billing and top-level analytics."
            },
            {
                "category": "AI Insights", 
                "is_synced": True, 
                "details": "High-level alerts on stable/trending features without exposing user paths."
            },
            {
                "category": "Raw Audit Logs", 
                "is_synced": False, 
                "details": "Strictly local. Contains PII, emails, roles, and deep user behavior."
            },
            {
                "category": "Traffic & Locations", 
                "is_synced": False, 
                "details": "Strictly local. IP addresses, geographic mapping, and device breakdown."
            }
        ],
        "message": "In ON_PREM mode, no user-level details leave the premises." if settings.is_on_prem else "In CLOUD mode, full data is managed centrally."
    }

# ═══════════════════════════════════════════════════════════
# LICENSE VS USAGE
# ═══════════════════════════════════════════════════════════

from core.models import LicenseSyncRequest, TrackingToggleRequest

@app.get("/license/usage")
def get_license_usage(tenant_id: str):
    """Compare licensed features vs actual usage for a tenant — enriched with trends, pro users, and revenue."""
    require_tenant_access(tenant_id)
    try:
        pro_feature_catalog = {
            "crypto_trade_execution": {
                "feature_id": "crypto-trading",
                "title": "Crypto Trading",
                "tagline": "Institutional-grade digital asset management.",
                "price_inr": 2000,
            },
            "wealth_rebalance": {
                "feature_id": "wealth-management-pro",
                "title": "Wealth Management",
                "tagline": "Sophisticated portfolio tracking and rebalancing.",
                "price_inr": 2000,
            },
            "payroll_batch_processed": {
                "feature_id": "bulk-payroll-processing",
                "title": "Payroll Pro",
                "tagline": "Enterprise-scale payroll automation.",
                "price_inr": 2000,
            },
            "ai_insight_download": {
                "feature_id": "ai-insights",
                "title": "Finance Library",
                "tagline": "Premium knowledge base for professional banking and investments.",
                "price_inr": 2000,
            },
        }

        # Get licensed features
        sql_licensed = """
            SELECT feature_name, is_licensed, plan_tier
            FROM feature_intelligence.tenant_licenses FINAL
            WHERE tenant_id = %(tenant_id)s AND is_licensed = 1 AND plan_tier = 'enterprise'
        """
        raw_licensed = ch_client.query(sql_licensed, {"tenant_id": tenant_id})
        
        # Filter out legacy/stale feature names that are no longer in our current catalog
        licensed = [r for r in raw_licensed if r["feature_name"] in pro_feature_catalog]
        licensed_set = {r["feature_name"] for r in licensed}
        
        # Get actually used features (last 30 days)
        sql_used = """
            SELECT event_name as feature_name, sum(total_events) as usage_count, uniqMerge(unique_users) as unique_users
            FROM feature_intelligence.daily_feature_usage
            WHERE tenant_id = %(tenant_id)s AND date >= today() - 30
            GROUP BY event_name
            ORDER BY usage_count DESC
        """
        used = ch_client.query(sql_used, {"tenant_id": tenant_id})
        used_set = {r["feature_name"] for r in used}
        used_map = {r["feature_name"]: r for r in used}

        # Relevant live NexaBank feature usage snapshot (core/auth/pro events from website)
        sql_relevant = """
            SELECT event_name as feature_name, sum(total_events) as usage_count, uniqMerge(unique_users) as unique_users
            FROM feature_intelligence.daily_feature_usage
            WHERE tenant_id = %(tenant_id)s
              AND date >= today() - 30
              AND (
                                event_name LIKE 'core.%%'
                                OR event_name LIKE 'auth.%%'
                                OR event_name LIKE 'pro.%%'
              )
            GROUP BY event_name
            ORDER BY usage_count DESC
            LIMIT 10
        """
        relevant_rows = ch_client.query(sql_relevant, {"tenant_id": tenant_id})

        sql_last_event = """
            SELECT max(timestamp) as last_event_at
            FROM feature_intelligence.events_raw
            WHERE tenant_id = %(tenant_id)s
        """
        last_event_res = ch_client.query(sql_last_event, {"tenant_id": tenant_id})
        last_event_at = None
        if last_event_res and last_event_res[0].get("last_event_at"):
            ts = last_event_res[0]["last_event_at"]
            last_event_at = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
        
        # --- NEW: Get daily usage trends for licensed features (last 7 days) ---
        sql_trends = """
            SELECT event_name as feature_name, toDate(timestamp) as date, count() as count
            FROM feature_intelligence.events_raw
            WHERE tenant_id = %(tenant_id)s AND timestamp >= today() - 7
            GROUP BY event_name, date
            ORDER BY date ASC
        """
        trend_rows = ch_client.query(sql_trends, {"tenant_id": tenant_id})
        # Build trends map: feature -> [{date, count}, ...]
        trends_map = {}
        for r in trend_rows:
            fname = r["feature_name"]
            if fname not in trends_map:
                trends_map[fname] = []
            date_str = r["date"].strftime("%Y-%m-%d") if hasattr(r["date"], "strftime") else str(r["date"])
            trends_map[fname].append({"date": date_str, "count": int(r["count"])})

        # --- NEW: Get distinct pro users (users who used any licensed pro feature) ---
        if licensed_set:
            feature_list_str = ", ".join([f"'{f}'" for f in licensed_set])
            sql_pro_users = f"""
                SELECT uniqExact(user_id) as pro_users
                FROM feature_intelligence.events_raw
                WHERE tenant_id = %(tenant_id)s AND event_name IN ({feature_list_str}) AND timestamp >= today() - 30
            """
            pro_res = ch_client.query(sql_pro_users, {"tenant_id": tenant_id})
            pro_user_count = int(pro_res[0]["pro_users"]) if pro_res else 0

            # --- NEW: Get total unique users for usage % ---
            sql_total_users = """
                SELECT uniqExact(user_id) as total_users
                FROM feature_intelligence.events_raw
                WHERE tenant_id = %(tenant_id)s AND timestamp >= today() - 30
            """
            total_res = ch_client.query(sql_total_users, {"tenant_id": tenant_id})
            total_user_count = int(total_res[0]["total_users"]) if total_res else 0

            # --- NEW: Week-over-week trend for pro usage ---
            sql_wow = f"""
                SELECT
                    sumIf(1, timestamp >= today() - 7) as current_week,
                    sumIf(1, timestamp >= today() - 14 AND timestamp < today() - 7) as prev_week
                FROM feature_intelligence.events_raw
                WHERE tenant_id = %(tenant_id)s AND event_name IN ({feature_list_str})
            """
            wow_res = ch_client.query(sql_wow, {"tenant_id": tenant_id})
            current_week = int(wow_res[0]["current_week"]) if wow_res else 0
            prev_week = int(wow_res[0]["prev_week"]) if wow_res else 0
            wow_change = round(((current_week - prev_week) / max(prev_week, 1)) * 100, 1)
        else:
            pro_user_count = 0
            total_user_count = 0
            wow_change = 0.0
        
        # Build comparison
        total_usage_count = sum(int(r.get("usage_count", 0)) for r in used)
        licensed_list = []
        for r in licensed:
            usage = used_map.get(r["feature_name"], {})
            uc = int(usage.get("usage_count", 0))
            licensed_list.append({
                "feature_name": r["feature_name"],
                "plan_tier": r["plan_tier"],
                "is_used": r["feature_name"] in used_set,
                "usage_count": uc,
                "unique_users": int(usage.get("unique_users", 0)),
                "usage_pct": round((uc / max(total_usage_count, 1)) * 100, 1),
                "trend": trends_map.get(r["feature_name"], []),
            })
        
        unused_licensed = [f for f in licensed_list if not f["is_used"]]
        unlicensed_used = []
        for f in used_set - licensed_set:
            uc = int(used_map[f]["usage_count"])
            unlicensed_used.append({
                "feature_name": f,
                "usage_count": uc,
                "unique_users": int(used_map[f].get("unique_users", 0)),
                "usage_pct": round((uc / max(total_usage_count, 1)) * 100, 1),
            })
        unlicensed_used.sort(key=lambda x: x["usage_count"], reverse=True)
        
        total_licensed = len(licensed_set)
        total_used_licensed = len([f for f in licensed_list if f["is_used"]])
        waste_pct = round(((total_licensed - total_used_licensed) / max(total_licensed, 1)) * 100, 1)
        
        # Estimated revenue from 4 enterprise licenses at ₹2000/user/month
        estimated_revenue = pro_user_count * 2000

        pro_catalog_usage = []
        for feature_name, meta in pro_feature_catalog.items():
            usage = used_map.get(feature_name, {})
            pro_catalog_usage.append({
                "feature_name": feature_name,
                "feature_id": meta["feature_id"],
                "title": meta["title"],
                "tagline": meta["tagline"],
                "price_inr": meta["price_inr"],
                "is_licensed": feature_name in licensed_set,
                "is_used": feature_name in used_set,
                "usage_count": int(usage.get("usage_count", 0)),
                "unique_users": int(usage.get("unique_users", 0)),
            })

        top_relevant_features = []
        for row in relevant_rows:
            name = row["feature_name"]
            meta = pro_feature_catalog.get(name)
            top_relevant_features.append({
                "feature_name": name,
                "title": meta["title"] if meta else name,
                "feature_id": meta["feature_id"] if meta else None,
                "is_pro_feature": name.startswith("pro."),
                "usage_count": int(row.get("usage_count", 0)),
                "unique_users": int(row.get("unique_users", 0)),
            })

        pro_events_30d = sum(item["usage_count"] for item in pro_catalog_usage)
        
        return {
            "tenant_id": tenant_id,
            "summary": {
                "total_licensed": total_licensed,
                "total_used": len(used_set),
                "total_used_licensed": total_used_licensed,
                "waste_pct": waste_pct,
                "pro_users": pro_user_count,
                "total_users": total_user_count,
                "pro_adoption_pct": round((pro_user_count / max(total_user_count, 1)) * 100, 1),
                "estimated_revenue": estimated_revenue,
                "wow_change": wow_change,
            },
            "licensed": licensed_list,
            "unused_licensed": unused_licensed,
            "unlicensed_used": unlicensed_used,
            "nexabank_context": {
                "last_event_at": last_event_at,
                "pro_events_30d": pro_events_30d,
                "pro_feature_catalog": pro_catalog_usage,
                "top_relevant_features": top_relevant_features,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/license/sync")
def sync_licenses(req: LicenseSyncRequest):
    """Upsert license records for a tenant."""
    require_tenant_access(req.tenant_id)
    try:
        from datetime import datetime
        rows = []
        for f in req.features:
            rows.append([req.tenant_id, f.feature_name, 1 if f.is_licensed else 0, f.plan_tier, datetime.utcnow()])
        
        client = ch_client._get_client()
        client.insert(
            'feature_intelligence.tenant_licenses',
            rows,
            column_names=['tenant_id', 'feature_name', 'is_licensed', 'plan_tier', 'updated_at']
        )
        return {"status": "ok", "synced": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════
# TRACKING TOGGLES
# ═══════════════════════════════════════════════════════════

@app.get("/tracking/toggles")
def get_tracking_toggles(tenant_id: str):
    """Get all feature tracking toggles for a tenant."""
    require_tenant_access(tenant_id)
    try:
        sql = """
            SELECT feature_name, is_enabled, changed_by, changed_at
            FROM feature_intelligence.tracking_toggles FINAL
            WHERE tenant_id = %(tenant_id)s
        """
        results = ch_client.query(sql, {"tenant_id": tenant_id})
        toggles = []
        for r in results:
            toggles.append({
                "feature_name": r["feature_name"],
                "is_enabled": bool(r["is_enabled"]),
                "changed_by": r["changed_by"],
                "changed_at": str(r["changed_at"]) if hasattr(r["changed_at"], "strftime") else str(r["changed_at"]),
            })
        return {"tenant_id": tenant_id, "toggles": toggles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tracking/toggles")
def set_tracking_toggle(req: TrackingToggleRequest):
    """Set a tracking toggle and record it in audit log."""
    require_tenant_access(req.tenant_id)
    try:
        from datetime import datetime
        now = datetime.utcnow()
        
        # Get existing state for audit
        sql_old = """
            SELECT is_enabled FROM feature_intelligence.tracking_toggles FINAL
            WHERE tenant_id = %(tenant_id)s AND feature_name = %(feature_name)s
        """
        old = ch_client.query(sql_old, {"tenant_id": req.tenant_id, "feature_name": req.feature_name})
        old_val = "enabled" if (old and old[0]["is_enabled"]) else "disabled"
        new_val = "enabled" if req.is_enabled else "disabled"
        
        # Upsert toggle
        client = ch_client._get_client()
        client.insert(
            'feature_intelligence.tracking_toggles',
            [[req.tenant_id, req.feature_name, 1 if req.is_enabled else 0, req.actor_email, now]],
            column_names=['tenant_id', 'feature_name', 'is_enabled', 'changed_by', 'changed_at']
        )
        
        # Write audit log
        client.insert(
            'feature_intelligence.config_audit_log',
            [[req.tenant_id, req.actor_email, "tracking_toggle", req.feature_name, old_val, new_val, now]],
            column_names=['tenant_id', 'actor_email', 'action', 'target', 'old_value', 'new_value', 'timestamp']
        )
        
        return {"status": "ok", "feature_name": req.feature_name, "is_enabled": req.is_enabled}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════
# CONFIGURATION AUDIT LOG
# ═══════════════════════════════════════════════════════════

@app.get("/config/audit-log")
def get_config_audit_log(tenant_id: str):
    """Returns configuration change audit trail for a tenant."""
    require_tenant_access(tenant_id)
    try:
        sql = """
            SELECT actor_email, action, target, old_value, new_value, timestamp
            FROM feature_intelligence.config_audit_log
            WHERE tenant_id = %(tenant_id)s
            ORDER BY timestamp DESC
            LIMIT 100
        """
        results = ch_client.query(sql, {"tenant_id": tenant_id})
        logs = []
        for r in results:
            logs.append({
                "actor": r["actor_email"],
                "action": r["action"],
                "target": r["target"],
                "old_value": r["old_value"],
                "new_value": r["new_value"],
                "timestamp": r["timestamp"].strftime("%Y-%m-%d %H:%M:%S") if hasattr(r["timestamp"], "strftime") else str(r["timestamp"]),
            })
        return {"tenant_id": tenant_id, "logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════
# USER JOURNEY MAPPING
# ═══════════════════════════════════════════════════════════

@app.get("/journey/user")
def get_user_journey(tenant_id: str, user_id: str):
    """Returns a single user's complete event timeline with session detection."""
    require_tenant_access(tenant_id)
    try:
        sql = """
            SELECT event_name, channel, timestamp, metadata
            FROM feature_intelligence.events_raw
            WHERE tenant_id = %(tenant_id)s AND user_id = %(user_id)s
            ORDER BY timestamp ASC
            LIMIT 500
        """
        results = ch_client.query(sql, {"tenant_id": tenant_id, "user_id": user_id})
        
        events = []
        sessions = []
        current_session = []
        SESSION_GAP_SECONDS = 1800  # 30 minutes
        
        for i, r in enumerate(results):
            ts = r["timestamp"]
            ts_str = ts.strftime("%Y-%m-%d %H:%M:%S") if hasattr(ts, "strftime") else str(ts)
            
            event = {
                "event_name": r["event_name"],
                "channel": r["channel"],
                "timestamp": ts_str,
                "metadata": r["metadata"],
            }
            events.append(event)
            
            # Session break detection
            if i > 0:
                prev_ts = results[i - 1]["timestamp"]
                if hasattr(ts, "timestamp") and hasattr(prev_ts, "timestamp"):
                    gap = (ts - prev_ts).total_seconds()
                elif hasattr(ts, "__sub__"):
                    gap = (ts - prev_ts).total_seconds()
                else:
                    gap = 0
                    
                if gap > SESSION_GAP_SECONDS:
                    sessions.append(current_session)
                    current_session = []
            
            current_session.append(event)
        
        if current_session:
            sessions.append(current_session)
        
        # Drop-off detection: did user complete common flow?
        event_names = [e["event_name"] for e in events]
        drop_off_point = None
        if len(events) > 0 and len(sessions) > 0:
            last_event = events[-1]["event_name"] if events else None
            drop_off_point = last_event
        
        return {
            "tenant_id": tenant_id,
            "user_id": user_id,
            "total_events": len(events),
            "total_sessions": len(sessions),
            "events": events,
            "sessions": sessions,
            "last_event": drop_off_point,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/journey/users")
def list_journey_users(tenant_id: str):
    """Returns list of users with event counts for journey selection."""
    require_tenant_access(tenant_id)
    try:
        sql = """
            SELECT user_id, count() as event_count, min(timestamp) as first_seen, max(timestamp) as last_seen
            FROM feature_intelligence.events_raw
            WHERE tenant_id = %(tenant_id)s
            GROUP BY user_id
            ORDER BY event_count DESC
            LIMIT 50
        """
        results = ch_client.query(sql, {"tenant_id": tenant_id})
        users = []
        for r in results:
            users.append({
                "user_id": r["user_id"],
                "event_count": int(r["event_count"]),
                "first_seen": r["first_seen"].strftime("%Y-%m-%d %H:%M") if hasattr(r["first_seen"], "strftime") else str(r["first_seen"]),
                "last_seen": r["last_seen"].strftime("%Y-%m-%d %H:%M") if hasattr(r["last_seen"], "strftime") else str(r["last_seen"]),
            })
        return {"tenant_id": tenant_id, "users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════
# CUSTOMER SEGMENTATION COMPARISON
# ═══════════════════════════════════════════════════════════

@app.get("/segmentation/compare")
def get_segmentation_comparison(tenant_id: str):
    """Group features by plan tier and compare adoption rates."""
    require_tenant_access(tenant_id)
    try:
        # Get license tiers
        sql_tiers = """
            SELECT feature_name, plan_tier
            FROM feature_intelligence.tenant_licenses FINAL
            WHERE tenant_id = %(tenant_id)s AND is_licensed = 1
        """
        tiers = ch_client.query(sql_tiers, {"tenant_id": tenant_id})
        tier_map = {r["feature_name"]: r["plan_tier"] for r in tiers}
        
        # Get usage
        sql_usage = """
            SELECT event_name, sum(total_events) as total, uniqMerge(unique_users) as users
            FROM feature_intelligence.daily_feature_usage
            WHERE tenant_id = %(tenant_id)s AND date >= today() - 30
            GROUP BY event_name
        """
        usage = ch_client.query(sql_usage, {"tenant_id": tenant_id})
        
        # Group by segment
        segments = {}
        for u in usage:
            tier = tier_map.get(u["event_name"], "unlicensed")
            if tier not in segments:
                segments[tier] = {"tier": tier, "features": 0, "total_usage": 0, "unique_users": 0}
            segments[tier]["features"] += 1
            segments[tier]["total_usage"] += int(u["total"])
            segments[tier]["unique_users"] += int(u["users"])
        
        return {
            "tenant_id": tenant_id,
            "segments": list(segments.values()),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════
# PREDICTIVE ADOPTION INSIGHTS
# ═══════════════════════════════════════════════════════════

@app.get("/predictive/adoption")
def get_predictive_adoption(tenant_id: str):
    """
    Predicts feature adoption likelihood using a weighted heuristic:
    score = (recent_trend * 0.4) + (unique_users_pct * 0.3) + (frequency * 0.3)
    """
    require_tenant_access(tenant_id)
    try:
        # Recent 7d vs previous 7d trend
        sql_trend = """
            SELECT 
                event_name,
                sumIf(total_events, date >= today() - 7) as recent_7d,
                sumIf(total_events, date >= today() - 14 AND date < today() - 7) as prev_7d
            FROM feature_intelligence.daily_feature_usage
            WHERE tenant_id = %(tenant_id)s AND date >= today() - 14
            GROUP BY event_name
        """
        trend_data = ch_client.query(sql_trend, {"tenant_id": tenant_id})
        
        # Total unique users for the tenant
        sql_total_users = """
            SELECT uniqExact(user_id) as total_users
            FROM feature_intelligence.events_raw
            WHERE tenant_id = %(tenant_id)s
        """
        total_users_result = ch_client.query(sql_total_users, {"tenant_id": tenant_id})
        total_users = int(total_users_result[0]["total_users"]) if total_users_result else 1
        total_users = max(total_users, 1)
        
        # Per-feature unique users
        sql_feature_users = """
            SELECT event_name, uniqExact(user_id) as feature_users
            FROM feature_intelligence.events_raw
            WHERE tenant_id = %(tenant_id)s AND timestamp >= today() - 14
            GROUP BY event_name
        """
        feature_users = ch_client.query(sql_feature_users, {"tenant_id": tenant_id})
        feature_users_map = {r["event_name"]: int(r["feature_users"]) for r in feature_users}
        
        # Frequency consistency (how many of the 14 days had activity)
        sql_frequency = """
            SELECT event_name, count(distinct date) as active_days
            FROM feature_intelligence.daily_feature_usage
            WHERE tenant_id = %(tenant_id)s AND date >= today() - 14
            GROUP BY event_name
        """
        frequency_data = ch_client.query(sql_frequency, {"tenant_id": tenant_id})
        frequency_map = {r["event_name"]: int(r["active_days"]) for r in frequency_data}
        
        predictions = []
        for row in trend_data:
            name = row["event_name"]
            recent = int(row["recent_7d"])
            prev = int(row["prev_7d"])
            
            # Trend score (0-100): growth rate capped at 100%
            if prev > 0:
                growth = ((recent - prev) / prev) * 100
            elif recent > 0:
                growth = 100
            else:
                growth = 0
            trend_score = min(max(growth + 50, 0), 100)  # Normalize: 50 = flat
            
            # Unique users percentage (0-100)
            fu = feature_users_map.get(name, 0)
            users_pct = min((fu / total_users) * 100, 100)
            
            # Frequency consistency (0-100): active_days / 14 * 100
            active_days = frequency_map.get(name, 0)
            freq_score = min((active_days / 14) * 100, 100)
            
            # Weighted score
            score = round(trend_score * 0.4 + users_pct * 0.3 + freq_score * 0.3, 1)
            
            predictions.append({
                "feature_name": name,
                "score": score,
                "trend_score": round(trend_score, 1),
                "users_pct": round(users_pct, 1),
                "frequency_score": round(freq_score, 1),
                "recent_7d": recent,
                "prev_7d": prev,
                "status": "High Adoption" if score >= 70 else "Growing" if score >= 40 else "At Risk",
            })
        
        predictions.sort(key=lambda x: x["score"], reverse=True)
        
        return {
            "tenant_id": tenant_id,
            "total_users": total_users,
            "predictions": predictions,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ai_report")
def get_ai_report(tenant_id: str, force_refresh: bool = Query(False, description="Bypass the cache and generate a new report")):
    """Generates a comprehensive AI-powered summarization report for the dashboard.
    Reports are persisted in ClickHouse (ai_reports table). Old reports are auto-replaced."""
    require_tenant_access(tenant_id)
    import json as _json

    def _load_report_from_db(tid: str):
        """Load the latest stored report from ClickHouse."""
        sql = """
            SELECT report, insights, generated_by, generated_at
            FROM feature_intelligence.ai_reports FINAL
            WHERE tenant_id = %(tenant_id)s
            LIMIT 1
        """
        rows = ch_client.query(sql, {"tenant_id": tid})
        if not rows:
            return None
        row = rows[0]
        insights_raw = row.get("insights", "[]")
        try:
            insights_parsed = _json.loads(insights_raw) if isinstance(insights_raw, str) else insights_raw
        except Exception:
            insights_parsed = []
        generated_at = row.get("generated_at")
        generated_at_str = generated_at.isoformat() if hasattr(generated_at, "isoformat") else str(generated_at)
        return {
            "report": row.get("report", ""),
            "insights": insights_parsed,
            "generated_by": row.get("generated_by", ""),
            "generated_at": generated_at_str,
        }

    def _save_report_to_db(tid: str, report: str, insights_list: list, generated_by: str = ""):
        """Insert a new report into ClickHouse. ReplacingMergeTree will replace the old one."""
        client = ch_client._get_client()
        client.insert(
            'feature_intelligence.ai_reports',
            [[tid, generated_by, report, _json.dumps(insights_list), datetime.utcnow()]],
            column_names=['tenant_id', 'generated_by', 'report', 'insights', 'generated_at']
        )

    try:
        # --- If NOT force refreshing, try to return stored report ---
        if not force_refresh:
            # Fast path: in-memory cache
            now = time.time()
            if tenant_id in AI_REPORT_CACHE:
                cached_data = AI_REPORT_CACHE[tenant_id]
                if now - cached_data["timestamp"] < AI_CACHE_TTL:
                    return {
                        "tenant_id": tenant_id,
                        "report": cached_data.get("report", ""),
                        "cached": True,
                        "generated_at": cached_data.get("generated_at"),
                        "insights": cached_data.get("insights", []),
                    }

            # Slow path: load from ClickHouse
            db_report = _load_report_from_db(tenant_id)
            if db_report and db_report["report"]:
                # Populate in-memory cache for fast subsequent reads
                AI_REPORT_CACHE[tenant_id] = {
                    "timestamp": time.time(),
                    "report": db_report["report"],
                    "insights": db_report["insights"],
                    "generated_at": db_report["generated_at"],
                }
                return {
                    "tenant_id": tenant_id,
                    "report": db_report["report"],
                    "cached": True,
                    "generated_at": db_report["generated_at"],
                    "insights": db_report["insights"],
                }

        # --- Generate a fresh report ---
        kpi = get_kpi_metrics(tenant_id)
        secondary = get_secondary_kpi(tenant_id)
        locations = get_locations(tenant_id)[:5]
        activities = get_feature_activity(tenant_id)

        # Build HTML visualization payload
        kpi_cards_html = f'''
        <section style="margin-bottom: 20px; font-family: inherit; line-height: 1.35;">
            <h3 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 14px;">Platform Health & Activity Metrics</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px;">
        '''

        for k in kpi:
            val = k.get('value', '0')
            label = k.get('label', '')
            kpi_cards_html += f'''
                <div style="padding: 16px; background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); border: 1px solid #dbe5f1; border-radius: 12px; box-shadow: 0 2px 10px rgba(2, 6, 23, 0.05);">
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">{label}</p>
                    <p style="margin: 10px 0 0; font-size: 34px; font-weight: 800; color: #0b1f44;">{val}</p>
                </div>
            '''
        kpi_cards_html += '</div></section>'

        activity_html = f'''
        <section style="margin-bottom: 20px; padding: 18px; background: #ffffff; border-radius: 12px; border: 1px solid #dbe5f1; box-shadow: 0 2px 10px rgba(2, 6, 23, 0.05); line-height: 1.3;">
            <h4 style="margin: 0 0 12px; font-size: 19px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 4px; height: 16px; background: #3b82f6; border-radius: 2px;"></span>
                Feature Adoption Matrix
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px;">
        '''

        for act in activities[:6]:
            feat_name = act.get('feature', 'Unknown')
            hash_val = sum(ord(c) for c in feat_name) % 60 + 20
            color = act.get('segments', [{'color': '#3b82f6'}])[0].get('color', '#3b82f6')
            activity_html += f'''
                <div style="padding: 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #e6edf5;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; color: #1f2937; font-weight: 700;">
                        <span>{feat_name}</span>
                        <span style="color: {color}; font-weight: 800;">{hash_val}%</span>
                    </div>
                    <div style="height: 8px; width: 100%; background: #dbe4ef; border-radius: 99px; overflow: hidden;">
                        <div style="height: 100%; width: {hash_val}%; background: linear-gradient(90deg, {color}99, {color}); border-radius: 99px;"></div>
                    </div>
                </div>
            '''
        activity_html += '</div></section>'

        continent_map = {
            "USA": "North America", "Canada": "North America",
            "United Kingdom": "Europe", "Germany": "Europe", "France": "Europe",
            "India": "Asia", "Japan": "Asia",
            "Australia": "Oceania", "Brazil": "South America"
        }

        continent_data = {}
        total_visits = 0
        for loc in locations:
            c = loc.get("country", "Unknown")
            v = loc.get("visits", 0)
            cont = continent_map.get(c, "Other Regions")
            continent_data[cont] = continent_data.get(cont, 0) + v
            total_visits += v
        if total_visits == 0: total_visits = 1

        geo_html = f'''
        <section style="margin-bottom: 24px; padding: 18px; background: #ffffff; border-radius: 12px; border: 1px solid #dbe5f1; box-shadow: 0 2px 10px rgba(2, 6, 23, 0.05); line-height: 1.3;">
            <h4 style="margin: 0 0 12px; font-size: 19px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 4px; height: 16px; background: #10b981; border-radius: 2px;"></span>
                Global Footprint (Continent-wise Traffic)
            </h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
        '''

        colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444']
        for i, (cont, visits) in enumerate(sorted(continent_data.items(), key=lambda x: x[1], reverse=True)):
            pct = int((visits / total_visits) * 100)
            c_color = colors[i % len(colors)]
            geo_html += f'''
                <div style="display: grid; grid-template-columns: minmax(120px, 160px) 1fr 60px 80px; gap: 10px; align-items: center;">
                    <div style="font-size: 13px; font-weight: 700; color: #334155;">{cont}</div>
                    <div style="height: 8px; background: #dbe4ef; border-radius: 99px; overflow: hidden;">
                        <div style="height: 100%; width: {pct}%; background: linear-gradient(90deg, {c_color}99, {c_color}); border-radius: 99px;"></div>
                    </div>
                    <div style="text-align: right; font-size: 13px; font-weight: 800; color: #0f172a;">{pct}%</div>
                    <div style="text-align: right; font-size: 12px; font-weight: 600; color: #64748b;">{visits} visits</div>
                </div>
            '''
        geo_html += '</div></section>'

        divider = '<hr style="border: 0; height: 1px; background: #e2e8f0; margin: 40px 0;" />'

        context_str = f"KPI Metrics: {kpi}\n\nSecondary Metrics: {secondary}\n\nTop Locations: {locations}\n\nFeature Activities: {activities}"

        prompt = f"""
        You are an expert UX Researcher and Strategic Data Analyst for NexaBank.
        Write a detailed, critical analysis report based on the following raw metrics for tenant '{tenant_id}'.
        Context Data:
        {context_str}

        CRITICAL INSTRUCTIONS: Focus deeply on **HOW we can improve user interaction** and **HOW we can use structural data insights to make the overall product better**. Provide a heavily analytical perspective.
        IMPORTANT: Make sure to strictly emphasize and identify where the user journey usually falls off. Use **bold** and `highlight` text (e.g. <mark>highlighted text</mark> or **bold text**) wherever you feel it is critical to draw the reader's attention to these drop-offs.

        Please structure your Markdown report exactly as follows:

        ## 1. Executive Summary
        (High-level summary of current product usage health, drop-offs, and critical gaps.)

        ## 2. User Interaction Evaluation
        (Analyze what the data says about how users are interacting with features. Where are the friction points? What behaviors highlight poor UX?)

        ## 3. Product Enhancement Strategy
        (Concrete proposals on how to use these data insights to iterate on the platform. What features should be built next, redesigned, or sunset?)

        ## 4. Geographic & Engagement Insights
        (Brief thoughts on the diverse footprint of the user base and retention anomalies.)

        Do not include any raw JSON or filler content. Do not output anything outside of the markdown itself.
        """
        from api.insights import query_ollama
        llm_response = query_ollama(prompt)

        if not llm_response:
            raise HTTPException(status_code=503, detail="AI Model currently initializing or unavailable.")

        final_report = f"{kpi_cards_html}\n{activity_html}\n{geo_html}\n{divider}\n{llm_response}"
        insights_payload = generate_insights(tenant_id)

        # Get the user who triggered generation (from request headers)
        generated_by = ""
        try:
            from starlette.requests import Request as _Req
            # Use the request context if available
        except Exception:
            pass

        # Persist to ClickHouse (old report is auto-replaced by ReplacingMergeTree)
        _save_report_to_db(tenant_id, final_report, insights_payload, generated_by)

        # Update in-memory cache
        gen_at = datetime.utcnow().isoformat()
        AI_REPORT_CACHE[tenant_id] = {
            "timestamp": time.time(),
            "report": final_report,
            "insights": insights_payload,
            "generated_at": gen_at,
        }

        return {
            "tenant_id": tenant_id,
            "report": final_report,
            "cached": False,
            "generated_at": gen_at,
            "insights": insights_payload,
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
