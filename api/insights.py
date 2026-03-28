import sys
import os
from typing import List, Dict, Any

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from storage.client import ch_client

def generate_insights(tenant_id: str) -> List[Dict[str, str]]:
    """
    Rule-based engine to find actionable insights for a given tenant based on recent data.
    """
    insights = []
    
    # 1. Low Adoption Rule: Features with very few events in the last 7 days
    sql_low_adoption = """
        SELECT event_name, sum(total_events) as count
        FROM feature_intelligence.daily_feature_usage
        WHERE tenant_id = %(tenant_id)s AND date >= today() - 7
        GROUP BY event_name
        HAVING count > 0 AND count < 15
    """
    try:
        low_adoption = ch_client.query(sql_low_adoption, {"tenant_id": tenant_id})
        for row in low_adoption:
            insights.append({
                "type": "Low Adoption",
                "severity": "medium",
                "feature": row['event_name'],
                "message": f"Feature '{row['event_name']}' has very low adoption ({row['count']} interactions last 7 days). Consider a tooltip or UI surfacing."
            })
    except Exception as e:
        print(f"Insight Generation Error (Low Adoption): {e}")

    # 2. Trending Features Rule: Usage grew > 50% compared to yesterday
    sql_trending = """
        SELECT event_name, 
               sumIf(total_events, date = today()) as today_count,
               sumIf(total_events, date = today() - 1) as yesterday_count
        FROM feature_intelligence.daily_feature_usage
        WHERE tenant_id = %(tenant_id)s AND date >= today() - 1
        GROUP BY event_name
        HAVING yesterday_count > 0 AND today_count > yesterday_count * 1.5
    """
    try:
        trending = ch_client.query(sql_trending, {"tenant_id": tenant_id})
        for row in trending:
            insights.append({
                "type": "Trending Up",
                "severity": "info",
                "feature": row['event_name'],
                "message": f"Feature '{row['event_name']}' is trending! Usage jumped from {row['yesterday_count']} to {row['today_count']}."
            })
    except Exception as e:
        print(f"Insight Generation Error (Trending): {e}")

    # Fallback if no anomalies
    if not insights:
         insights.append({
             "type": "Stable",
             "severity": "info",
             "feature": "all",
             "message": "Usage is stable across all features. No actionable anomalies detected today."
         })
         
    return insights
