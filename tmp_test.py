import urllib.request
import urllib.error
import json

req = urllib.request.Request(
    'http://localhost:8001/ai_report?tenants=nexabank&range=30d&force_refresh=true',
    headers={
        'X-User-Role': 'super_admin',
        'X-User-Email': 'admin@nexabank.com'
    }
)

try:
    response = urllib.request.urlopen(req, timeout=140)
    data = json.loads(response.read().decode())
    with open('result.json', 'w') as f:
        json.dump(data, f, indent=2)
    print("Success")
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(e.read().decode())
except Exception as e:
    print(f"Error: {e}")
