import sys
import os
import json
import urllib.request
from typing import List, Dict, Any

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from storage.client import ch_client

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://ollama:11434")

def query_ollama(prompt: str, json_format: bool = False) -> str:
    """Send a prompt to Ollama and return the response."""
    url = f"{OLLAMA_URL}/api/generate"
    data = {
        "model": "llama3.2:1b",
        "prompt": prompt,
        "stream": False
    }
    if json_format:
        data["format"] = "json"
        
    try:
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode('utf-8'), 
            headers={'Content-Type': 'application/json'}, 
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=1200) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get('response', '')
    except Exception as e:
        print(f"Ollama API Error: {e}")
        return ""

def generate_insights(tenant_id: str) -> List[Dict[str, str]]:
    """
    Generates actionable insights for a given tenant using Ollama LLM if available,
    falling back to rule-based heuristics.
    """
    insights = []
    raw_data_context = []
    
    # 1. Low Adoption Data
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
            raw_data_context.append(f"Low adoption: '{row['event_name']}' with only {row['count']} interactions last 7 days.")
    except Exception as e:
        print(f"Insight Sql Error (Low Adoption): {e}")

    # 2. Trending Data
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
            raw_data_context.append(f"Trending: '{row['event_name']}' grew from {row['yesterday_count']} to {row['today_count']} interactions today.")
    except Exception as e:
        print(f"Insight Sql Error (Trending): {e}")

    # Fallback context if no anomalies
    if not raw_data_context:
        raw_data_context.append("Usage is stable across all features. No actionable anomalies detected today.")

    context_str = "\n".join(raw_data_context)
    
    prompt = f"""
You are an expert AI product analyst. Analyze the following daily metrics context for app features and provide exactly 3 succinct, strategic insights.
Context:
{context_str}

Output the result as a raw JSON array of objects. Example format:
[
  {{"type": "Trending Up", "severity": "info", "feature": "login", "message": "Login grew by 200%. Great momentum!"}}
]

Rules:
- severity must be "low", "medium", "high", or "info"
- only pure json, no markdown blocks, no intro text.
"""
    
    llm_response = query_ollama(prompt, json_format=True)
    if llm_response:
        try:
            cleaned = llm_response.strip()
            if cleaned.startswith("```json"): cleaned = cleaned[7:]
            if cleaned.endswith("```"): cleaned = cleaned[:-3]
            parsed = json.loads(cleaned)
            if isinstance(parsed, list) and len(parsed) > 0:
                print(f"Ollama successfully generated {len(parsed)} insights")
                return parsed
        except Exception as e:
            print(f"Failed to parse Ollama JSON: {e}. Raw response: {llm_response}")
    
    # Fallback to pure rule-based
    print("Falling back to rule-based insights.")
    for line in raw_data_context:
        if "stable" in line:
            insights.append({"type": "Stable", "severity": "info", "feature": "all", "message": line})
        elif "Low adoption" in line:
            parts = line.split("'")
            feat = parts[1] if len(parts) > 1 else "unknown"
            insights.append({"type": "Low Adoption", "severity": "medium", "feature": feat, "message": line + " Consider a tooltip or UI surfacing."})
        elif "Trending" in line:
            parts = line.split("'")
            feat = parts[1] if len(parts) > 1 else "unknown"
            insights.append({"type": "Trending Up", "severity": "info", "feature": feat, "message": line})
             
    return insights[:4]
