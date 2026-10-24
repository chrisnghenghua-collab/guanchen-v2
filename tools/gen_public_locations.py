# Generates engine/public/data/locations.json (the website's birthplace picker) from the engine's
# single authority engine/packages/step01-production-core/data/locations.v2.json. Re-run after any location change.
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(ROOT, 'engine', 'packages', 'step01-production-core', 'data', 'locations.v2.json')
out = os.path.join(ROOT, 'engine', 'public', 'data', 'locations.json')
COUNTRY = [('MY', '马来西亚'), ('SG', '新加坡'), ('CN', '中国'), ('TW', '台湾'), ('HK', '香港'), ('MO', '澳门')]
REGION = {'MalaysiaWest': '西马', 'MalaysiaEast': '东马', 'Singapore': '新加坡', 'ChinaNorth': '华北', 'ChinaEast': '华东', 'ChinaSouth': '华南',
          'ChinaCentral': '华中', 'ChinaSouthwest': '西南', 'ChinaNorthwest': '西北', 'ChinaNortheast': '东北', 'TaiwanNorth': '北部',
          'TaiwanCentral': '中部', 'TaiwanSouth': '南部', 'TaiwanEast': '东部', 'HongKong': '香港', 'Macau': '澳门'}
recs = json.load(open(src, encoding='utf-8'))['records']
data = {'source': 'locations.v2.json', 'count': len(recs), 'countries': []}
for code, name in COUNTRY:
    groups = []
    for r in recs:
        if r['countryCode'] != code: continue
        label = REGION[r['region']]
        g = next((x for x in groups if x['label'] == label), None)
        if not g: g = {'label': label, 'cities': []}; groups.append(g)
        g['cities'].append({'id': r['id'], 'name': r['city']})
    data['countries'].append({'code': code, 'name': name, 'groups': groups})
assert sum(len(g['cities']) for c in data['countries'] for g in c['groups']) == len(recs), 'every location must appear exactly once'
os.makedirs(os.path.dirname(out), exist_ok=True)
json.dump(data, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('wrote', out, len(recs), 'locations')
