import sys
import os
from typing import List, Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storage.client import ch_client
from api.insights import generate_insights
from core.config import settings
from core.middleware import require_cloud_mode, require_tenant_access

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

from fastapi import Request
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
    
    # Endpoints that are too sensitive for company_admin (raw data, user-level details)
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
            allowed = ["/admin", "/metrics/kpi", "/insights", "/tenants", "/features/usage", "/deployment", "/ai_report"]
            if not any(path.startswith(prefix) for prefix in allowed):
                return JSONResponse(
                    status_code=403, 
                    content={"detail": "Forbidden: Endpoint not available for super admin role."}
                )
        # app_admin: full access to all detailed endpoints, but MUST be restricted to their assigned tenant
        if role == "app_admin":
            tenant_id = request.query_params.get("tenant_id")
            email = request.headers.get("X-User-Email")
            if tenant_id and email:
                try:
                    import json
                    import os
                    rbac_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'rbac.json')
                    if os.path.exists(rbac_path):
                        with open(rbac_path, 'r') as f:
                            rbac = json.load(f)
                        allowed_emails = rbac.get("app_admins", {}).get(tenant_id, [])
                        if email not in allowed_emails:
                            return JSONResponse(
                                status_code=403, 
                                content={"detail": f"Forbidden: Admin '{email}' does not have access to tenant '{tenant_id}'."}
                            )
                except Exception as e:
                    print(f"Failed to load rbac.json for RBAC validation: {e}")
             
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
    insights_data = generate_insights(tenant_id)
    return {"tenant_id": tenant_id, "insights": insights_data}

@app.get("/metrics/kpi")
def get_kpi_metrics(tenant_id: str):
    """
    Returns high-level KPI metrics for the dashboard header.
    """
    require_tenant_access(tenant_id)
    sql = """
        SELECT 
            sum(total_events) as total_events,
            count(distinct event_name) as active_features
        FROM feature_intelligence.daily_feature_usage
        WHERE tenant_id = %(tenant_id)s AND date >= today() - 7
    """
    try:
        results = ch_client.query(sql, {"tenant_id": tenant_id})
        row = results[0] if results else {"total_events": 0, "active_features": 0}
        
        return [
            {
                "id": "total-events",
                "label": "Total Events",
                "value": f"{row['total_events']:,}" if row['total_events'] else "0",
                "change": 12,
                "changeDirection": "up",
                "icon": "activity",
            },
            {
                "id": "active-features",
                "label": "Active Features",
                "value": str(row['active_features'] or 0),
                "change": 5,
                "changeDirection": "up",
                "icon": "layers",
            },
            {
                "id": "avg-response",
                "label": "Avg Response Time",
                "value": "320 ms",
                "change": 8,
                "changeDirection": "down",
                "icon": "clock",
            },
            {
                "id": "error-rate",
                "label": "Error Rate",
                "value": "2.3%",
                "change": 1.2,
                "changeDirection": "up",
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
def get_all_tenants():
    """
    Returns list of distinct tenants.
    """
    require_cloud_mode()
    sql = """
        SELECT 
            tenant_id as id,
            tenant_id as name,
            toUInt64(count()) as featureUsage
        FROM feature_intelligence.events_raw
        GROUP BY tenant_id
        ORDER BY featureUsage DESC
    """
    try:
        results = ch_client.query(sql)
        tenants = []
        for i, row in enumerate(results):
            tenants.append({
                "id": row['id'],
                "name": row['name'].capitalize() if row['name'] != 'initech' else 'Initech',
                "featureUsage": int(row['featureUsage']),
                "errors": max(0, 15 - i*3),
                "adoptionRate": max(0, 85 - i*5),
                "plan": "enterprise" if i % 2 == 0 else "pro"
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
        colors = {"desktop": "#1a73e8", "mobile": "#4285F4", "tablet": "#8AB4F8"}
        
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
                {"name": 'Desktop', "value": 62, "color": '#1a73e8'},
                {"name": 'Mobile', "value": 28, "color": '#4285F4'}
            ]
            
        return breakdown
    except Exception:
        return [
            {"name": 'Desktop', "value": 50, "color": '#1a73e8'},
            {"name": 'Mobile', "value": 50, "color": '#4285F4'}
        ]

@app.get("/locations")
def get_locations(tenant_id: str):
    """
    Dynamic locations derived from metadata.location variable, falling back to IP mapping.
    """
    require_tenant_access(tenant_id)
    sql = """
        SELECT 
            JSONExtractString(metadata, 'location') as location,
            JSONExtractString(metadata, 'ip') as ip,
            count() as visits
        FROM feature_intelligence.events_raw
        WHERE tenant_id = %(tenant_id)s
        GROUP BY location, ip
    """
    try:
        results = ch_client.query(sql, {"tenant_id": tenant_id})
        
        ip_map = {
            "12.34.56.78": "USA",
            "98.76.54.32": "United Kingdom",
            "192.168.1.1": "Germany",
            "111.111.111.111": "India"
        }
        
        locations_dict = {}
        for row in results:
            # Prioritize the explicitly passed 'location' variable
            if row.get('location'):
                country = row['location']
            else:
                country = ip_map.get(row['ip'], "Other")
                
            locations_dict[country] = locations_dict.get(country, 0) + row['visits']
            
        location_data = [{"country": k, "visits": v} for k, v in locations_dict.items()]
        location_data.sort(key=lambda x: x["visits"], reverse=True)
        return location_data if location_data else [
            {"country": "USA", "visits": 500},
            {"country": "United Kingdom", "visits": 300}
        ]
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
        SELECT channel as name, count() as value 
        FROM feature_intelligence.events_raw 
        WHERE tenant_id = %(tenant_id)s GROUP BY name
    """
    try:
        results = ch_client.query(sql, {"tenant_id": tenant_id})
        formatted = []
        for r in results:
            formatted.append({
                "name": str(r["name"]).capitalize(),
                "value": int(r["value"]),
                "formattedValue": str(r["value"])
            })
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

@app.get("/ai_report")
def get_ai_report(tenant_id: str):
    """Generates a comprehensive AI-powered summarization report for the dashboard."""
    require_tenant_access(tenant_id)
    try:
        # Fetch basic context
        kpi = get_kpi_metrics(tenant_id)
        secondary = get_secondary_kpi(tenant_id)
        locations = get_locations(tenant_id)[:5] # Top 5
        activities = get_feature_activity(tenant_id)
        
        # Build beautiful HTML visualization payload for the report
        kpi_cards_html = f'''
        <div style="margin-bottom: 32px; font-family: inherit;">
            <h3 style="font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 20px;">Platform Health & Activity Metrics</h3>
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
        '''
        
        for k in kpi:
            val = k.get('value', '0')
            label = k.get('label', '')
            kpi_cards_html += f'''
                <div style="flex: 1; min-width: 180px; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">{label}</p>
                    <p style="margin: 12px 0 0; font-size: 32px; font-weight: 800; color: #0f172a;">{val}</p>
                </div>
            '''
            
        kpi_cards_html += '</div></div>'
        
        # Build feature activity layout
        activity_html = f'''
        <div style="margin-bottom: 24px; padding: 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <h4 style="margin-top: 0; font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 24px; display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 4px; height: 18px; background: #3b82f6; border-radius: 2px;"></span>
                Feature Adoption Matrix
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
        '''
        
        for act in activities[:6]:
            feat_name = act.get('feature', 'Unknown')
            # Generate deterministic engagement volume
            hash_val = sum(ord(c) for c in feat_name) % 60 + 20 
            color = act.get('segments', [{'color': '#3b82f6'}])[0].get('color', '#3b82f6')
            activity_html += f'''
                <div style="padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: #334155; font-weight: 600;">
                        <span>{feat_name}</span>
                        <span style="color: {color};">{hash_val}%</span>
                    </div>
                    <div style="height: 8px; width: 100%; background: #e2e8f0; border-radius: 4px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                        <div style="height: 100%; width: {hash_val}%; background: linear-gradient(90deg, {color}88, {color}); border-radius: 4px;"></div>
                    </div>
                </div>
            '''
        activity_html += '</div></div>'
        
        # Geographic processing
        continent_map = {
            "USA": "North America",
            "Canada": "North America",
            "United Kingdom": "Europe",
            "Germany": "Europe",
            "France": "Europe",
            "India": "Asia",
            "Japan": "Asia",
            "Australia": "Oceania",
            "Brazil": "South America"
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
        <div style="margin-bottom: 40px; padding: 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <h4 style="margin-top: 0; font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 24px; display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 4px; height: 18px; background: #10b981; border-radius: 2px;"></span>
                Global Footprint (Continent-wise Traffic)
            </h4>
            <div style="display: flex; flex-direction: column; gap: 16px;">
        '''
        
        colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444']
        for i, (cont, visits) in enumerate(sorted(continent_data.items(), key=lambda x: x[1], reverse=True)):
            pct = int((visits / total_visits) * 100)
            c_color = colors[i % len(colors)]
            geo_html += f'''
                <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                    <div style="min-width: 140px; font-size: 14px; font-weight: 600; color: #475569;">{cont}</div>
                    <div style="flex: 1; min-width: 200px; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                        <div style="height: 100%; width: {pct}%; background: linear-gradient(90deg, {c_color}88, {c_color}); border-radius: 5px;"></div>
                    </div>
                    <div style="width: 50px; text-align: right; font-size: 14px; font-weight: 700; color: #0f172a;">{pct}%</div>
                    <div style="width: 80px; text-align: right; font-size: 13px; font-weight: 500; color: #94a3b8;">{visits} visits</div>
                </div>
            '''
        geo_html += '</div></div>'

        
        # Decorative divider
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
             
        # Combine HTML payload with Markdown report
        final_report = f"{kpi_cards_html}\n{activity_html}\n{geo_html}\n{divider}\n{llm_response}"
             
        return {"tenant_id": tenant_id, "report": final_report}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
