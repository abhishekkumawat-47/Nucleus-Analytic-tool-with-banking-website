import urllib.request
print(urllib.request.urlopen("http://localhost:8000/metrics/top_pages?tenants=nexabank&range=7d").read().decode("utf-8"))
