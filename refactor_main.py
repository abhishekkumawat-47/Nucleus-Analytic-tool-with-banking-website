import re

def process_file():
    with open('api/main.py', 'r', encoding='utf-8') as f:
        content = f.read()

    # Define helper parsing function
    helper = """
def build_tenant_filter(tenant_id: str) -> tuple[str, dict]:
    tenants = [t.strip() for t in tenant_id.split(",") if t.strip()]
    if not tenants:
        return "1=1", {}
    if len(tenants) == 1:
        return "tenant_id = %(tenant_id)s", {"tenant_id": tenants[0]}
    return "tenant_id IN %(tenant_ids)s", {"tenant_ids": tuple(tenants)}
"""
    if "def build_tenant_filter" not in content:
        content = content.replace("from core.middleware import require_cloud_mode, require_tenant_access", "from core.middleware import require_cloud_mode, require_tenant_access\n" + helper)

    # For get_locations
    if 'def get_locations(tenant_id: str):' in content:
        content = content.replace(
            "require_tenant_access(tenant_id)\n    sql = \"\"\"",
            "require_tenant_access(tenant_id)\n    tenant_clause, params = build_tenant_filter(tenant_id)\n    sql = \"\"\""
        )
        content = re.sub(
            r"WHERE tenant_id = %\(tenant_id\)s\s+GROUP BY location, continent",
            r"WHERE {tenant_clause}\n        GROUP BY location, continent",
            content
        )
        # Fix the execution of sql to avoid f-string inside the large str if not necessary, or just use string format
        # Actually it's easier to just use `WHERE {tenant_clause}` and `sql = f\"\"\"...\"\"\"`
    
    with open('api/main.py.new', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    process_file()
