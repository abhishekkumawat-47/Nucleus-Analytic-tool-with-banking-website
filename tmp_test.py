import sys, os
sys.path.append('c:\\Coding_Related_Items\\Web_Dev\\Nucleus-Analytic-tool-with-banking-website')
from api.main import ch_client
from api.page_map import normalize_event, resolve_page, resolve_display_name

KNOWN_PAGES = {
    '/register', '/login', '/dashboard', '/accounts', '/payees',
    '/transactions', '/loans', '/pro-feature?id=crypto-trading',
    '/pro-feature?id=ai-insights', '/pro-feature?id=wealth-management-pro',
    '/pro-feature?id=bulk-payroll-processing', '/profile'
}

sql = '''
SELECT 
    JSONExtractString(metadata, 'path') as page,
    event_name as raw_feature,
    count() as cnt
FROM feature_intelligence.events_raw
WHERE tenant_id = 'nexabank' AND timestamp >= today() - 7
GROUP BY page, raw_feature
'''
results = ch_client.query(sql, {})

page_data = {}
for r in results:
    raw_page = r['page']
    raw_feature = r['raw_feature']
    cnt = int(r['cnt'])

    if not raw_page or raw_page == 'null' or raw_page == '':
        page = resolve_page(raw_feature)
        if not page:
            page = '/dashboard'
    else:
        page = str(raw_page)
        
    if page not in KNOWN_PAGES:
        page = '/dashboard'

    feature = normalize_event(raw_feature)

    if page not in page_data:
        page_data[page] = {'totalEvents': 0, 'features': {}}

    page_data[page]['totalEvents'] += cnt
    page_data[page]['features'][feature] = page_data[page]['features'].get(feature, 0) + cnt

for row in page_data.items():
    print(row)
