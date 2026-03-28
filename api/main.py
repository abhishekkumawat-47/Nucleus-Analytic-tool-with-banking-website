import sys
import os
from typing import List, Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storage.client import ch_client
from api.insights import generate_insights

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

@app.get("/features/usage")
def get_feature_usage(tenant_id: str, days: int = Query(7, ge=1, le=365)):
    """
    Returns aggregated feature usage stats for a specific tenant over the last N days.
    """
    sql = """
        SELECT 
            event_name, 
            sum(total_events) as total_interactions,
            uniqMerge(unique_users) as unique_users
        FROM feature_intelligence.daily_feature_usage
        WHERE tenant_id = %(tenant_id)s AND date >= today() - %(days)s
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
    insights_data = generate_insights(tenant_id)
    return {"tenant_id": tenant_id, "insights": insights_data}

@app.get("/metrics/kpi")
def get_kpi_metrics(tenant_id: str):
    """
    Returns high-level KPI metrics for the dashboard header.
    """
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
        res_time = ch_client.query(sql_time, {"tenant_id": tenant_id})
        avg_time_sec = int(res_time[0]["avg_time"]) if res_time and res_time[0]["avg_time"] else 0
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
    sql = """
        SELECT 
            date,
            sum(total_events) as pageViews,
            uniqMerge(unique_users) as visitors
        FROM feature_intelligence.daily_feature_usage
        WHERE tenant_id = %(tenant_id)s AND date >= today() - %(days)s
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
    sql = """
        SELECT 
            date,
            sum(total_events) as usage
        FROM feature_intelligence.daily_feature_usage
        WHERE tenant_id = %(tenant_id)s AND date >= today() - %(days)s
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
    sql = """
        SELECT 
            tenant_id as id,
            tenant_id as name,
            toUInt64(sum(total_events)) as featureUsage
        FROM feature_intelligence.daily_feature_usage
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
        import random
        for i, r in enumerate(results):
            c = r['total']
            pieces = [random.uniform(0.1, 0.4) for _ in range(3)]
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
    return [
        { "id": 'fc-1', "pattern": '/feed', "featureName": 'View Feed', "category": 'interaction', "isActive": True },
        { "id": 'fc-2', "pattern": '/api/tweet', "featureName": 'Post Tweet', "category": 'transaction', "isActive": True },
        { "id": 'fc-3', "pattern": '/api/like', "featureName": 'Like Tweet', "category": 'interaction', "isActive": True },
        { "id": 'fc-4', "pattern": '/auth/login', "featureName": 'Login', "category": 'security', "isActive": True },
    ]

@app.get("/metrics/retention")
def get_retention(tenant_id: str):
    return [
        { "cohort": 'This Week', "users": 42, "month1": 100, "month2": 50, "month3": 0 },
        { "cohort": 'Last Week', "users": 15, "month1": 80, "month2": 20, "month3": 10 },
    ]
