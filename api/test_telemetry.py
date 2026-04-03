from clickhouse_connect import get_client
from datetime import datetime
import json

client = get_client(host='localhost', username='default', password='clickhouse')

# Insert dummy telemetry data into events_raw for the missing features
now = datetime.now()

events = [
    ('nexabank', 'pro-feature?id=crypto-trading', 'user1', 'WEB', now, '{}'),
    ('nexabank', 'pro-feature?id=crypto-trading', 'user2', 'MOBILE', now, '{}'),
    ('nexabank', 'pro-feature?id=crypto-trading', 'user3', 'WEB', now, '{}'),
    ('nexabank', 'pro-feature?id=crypto-trading', 'user3', 'WEB', now, '{}'),
    ('nexabank', 'wealth_rebalance', 'user1', 'WEB', now, '{}'),
    ('nexabank', 'wealth_rebalance', 'user4', 'WEB', now, '{}'),
    ('nexabank', 'pro-feature?id=bulk-payroll-processing', 'user5', 'WEB', now, '{}'),
    ('nexabank', 'ai_insight_download', 'user1', 'WEB', now, '{}'),
    ('nexabank', 'pro_unlocked', 'user1', 'WEB', now, '{}'),
]

client.insert('feature_intelligence.events_raw', events, column_names=['tenant_id', 'event_name', 'user_id', 'channel', 'timestamp', 'metadata'])
print("Events inserted.")
