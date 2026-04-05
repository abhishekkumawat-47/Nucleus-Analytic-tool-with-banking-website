import sys
import os
import json
import urllib.request
from typing import List, Dict, Any

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from storage.client import ch_client
from api.page_map import normalize_event, resolve_display_name, resolve_page

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://ollama:11434")

def query_ollama(
    prompt: str,
    json_format: bool = False,
    timeout_seconds: int = 180,
    max_tokens: int | None = None,
) -> str:
    """Send a prompt to Ollama and return the response."""
    url = f"{OLLAMA_URL}/api/generate"
    data = {
        "model": "llama3.2:1b",
        "prompt": prompt,
        "stream": False
    }
    if json_format:
        data["format"] = "json"
    if max_tokens is not None:
        data["options"] = {"num_predict": max_tokens}
        
    try:
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode('utf-8'), 
            headers={'Content-Type': 'application/json'}, 
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=timeout_seconds) as response:
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

    def build_feature_context(raw_feature: str) -> Dict[str, str]:
        canonical = normalize_event(raw_feature)
        display_name = resolve_display_name(canonical) or resolve_display_name(raw_feature) or raw_feature.replace('_', ' ').title()
        page = resolve_page(canonical) or resolve_page(raw_feature) or 'unknown page'
        return {"canonical": canonical, "display_name": display_name, "page": page}

    def build_action_hint(canonical: str, display_name: str) -> str:
        lowered = canonical.lower()
        if any(token in lowered for token in ["login", "register", "dashboard", "page.view"]):
            return f"Reduce friction around {display_name.lower()} by shortening the path, improving labels, and surfacing the next expected action earlier."
        if any(token in lowered for token in ["kyc", "loan"]):
            return f"Break {display_name.lower()} into smaller steps, preserve state, and show progress so users can resume without rework."
        if any(token in lowered for token in ["pay", "transfer", "payment", "transactions"]):
            return f"Add defaults, recent-recipient shortcuts, and inline validation around {display_name.lower()} to reduce completion errors."
        if "ai" in lowered or "pro-feature" in lowered:
            return f"Show concrete examples, previews, or starter suggestions around {display_name.lower()} so its value is clear on first use."
        return f"Review the surrounding UI for {display_name.lower()} and remove any unnecessary steps or ambiguity."

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
            context = build_feature_context(str(row['event_name']))
            raw_data_context.append(
                f"Low adoption: '{context['display_name']}' ({context['canonical']}) on {context['page']} recorded only {row['count']} interactions in the last 7 days. "
                f"{build_action_hint(context['canonical'], context['display_name'])}"
            )
    except Exception as e:
        print(f"Insight Sql Error (Low Adoption): {e}")

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
            context = build_feature_context(str(row['event_name']))
            raw_data_context.append(
                f"Trending: '{context['display_name']}' ({context['canonical']}) on {context['page']} grew from {row['yesterday_count']} to {row['today_count']} interactions today. "
                f"Use this momentum to place it earlier in the journey or pair it with the next likely action."
            )
    except Exception as e:
        print(f"Insight Sql Error (Trending): {e}")

    context_str = "\n".join(raw_data_context)
    
    prompt = f"""
You are an expert AI product analyst for a banking product.
Analyze the following daily metrics context and provide exactly 3 strategic insights that are specific, actionable, and tied to the product journey.
Context:
{context_str}

Output the result as a raw JSON array of objects. Example format:
[
  {{"type": "Trending Up", "severity": "info", "feature": "login", "message": "Login grew by 200%. Great momentum!"}}
]

Rules:
- severity must be "low", "medium", "high", or "info"
- only pure json, no markdown blocks, no intro text.
- Each insight must include the feature name, the user journey context, and a concrete recommendation.
- Prefer product actions over generic advice.
"""
    
    llm_response = query_ollama(prompt, json_format=True, timeout_seconds=90, max_tokens=360)
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
            insights.append({"type": "Stable Health", "severity": "info", "feature": "all", "message": line + " No immediate intervention is needed, but keep monitoring for sudden shifts."})
        elif "Low adoption" in line:
            parts = line.split("'")
            feat = parts[1] if len(parts) > 1 else "unknown"
            insights.append({"type": "Low Adoption", "severity": "medium", "feature": feat, "message": line})
        elif "Trending" in line:
            parts = line.split("'")
            feat = parts[1] if len(parts) > 1 else "unknown"
            insights.append({"type": "Trending Up", "severity": "info", "feature": feat, "message": line})
             
    return insights[:4]
