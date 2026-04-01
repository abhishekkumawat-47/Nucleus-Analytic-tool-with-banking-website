import sys
import os
from datetime import datetime

# Add the project root to sys.path to resolve storage module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storage.client import ch_client

# Features to license for NexaBank (some used, some unused)
features = [
    # Used features (assumed to be used based on typical banking app)
    {"feature_name": "login", "is_licensed": True, "plan_tier": "basic"},
    {"feature_name": "transfer_funds", "is_licensed": True, "plan_tier": "basic"},
    {"feature_name": "view_dashboard", "is_licensed": True, "plan_tier": "basic"},
    {"feature_name": "apply_loan", "is_licensed": True, "plan_tier": "premium"},
    {"feature_name": "add_payee", "is_licensed": True, "plan_tier": "basic"},
    
    # Unused / New premium features
    {"feature_name": "ai_insights", "is_licensed": True, "plan_tier": "enterprise"},
    {"feature_name": "wealth_management_pro", "is_licensed": True, "plan_tier": "enterprise"},
    {"feature_name": "crypto_trading", "is_licensed": True, "plan_tier": "premium"},
    {"feature_name": "bulk_payroll_processing", "is_licensed": True, "plan_tier": "enterprise"},
]

client = ch_client._get_client()

rows = []
for f in features:
    rows.append(["bank_a", f["feature_name"], 1 if f["is_licensed"] else 0, f["plan_tier"], datetime.utcnow()])

try:
    client.insert(
        'feature_intelligence.tenant_licenses',
        rows,
        column_names=['tenant_id', 'feature_name', 'is_licensed', 'plan_tier', 'updated_at']
    )
    print(f"Success: Synced {len(rows)} licenses for bank_a.")
except Exception as e:
    print("Error:", e)
