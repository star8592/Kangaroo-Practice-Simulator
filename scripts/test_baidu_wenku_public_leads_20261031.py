from pathlib import Path
import json
p=Path(__file__).resolve().parents[1]/'data/discovery/baidu-wenku-public-leads-20261031.json'
x=json.loads(p.read_text(encoding='utf-8'))
rows=x['entries']
assert len(rows)==x['counts']['publicUrlsFound']==19
assert len({i['url'] for i in rows})==len(rows)
assert {e['domain'] for e in rows}=={'school','math-competition','language','university','career','professional','interest'}
assert all(e['url'].startswith('https://wenku.baidu.com/') for e in rows)
assert all(e['discoveryState']=='indexed_public_web_search_result' for e in rows)
assert all(not e['commercialSaleAllowed'] and not e['actualOriginalFileDownloaded'] and not e['fullPaperVerified'] for e in rows)
assert x['counts']['actualOriginalFilesDownloaded']==0
assert x['accessCheck']['authenticatedWenkuSessionUsed'] is False
assert x['accessCheck']['actualBaiduWenkuChromeTabLocated'] is True
assert x['accessCheck']['actualSearchTextboxSetValueSucceeded'] is True
assert x['accessCheck']['actualSearchSubmittedSuccessfully'] is False
assert any(e['examYearHint']==2027 and e['originalExamClaimAssessment']=='not_2027_official_gaokao' for e in rows)
assert any('60分钟100分' in e['title'] and e['originalExamClaimAssessment']=='reject_official_paper_claim' for e in rows)
assert '/mnt/disk' not in json.dumps(x)
print('BAIDU_WENKU_PUBLIC_19_LEADS_SEVEN_LANES_TEST_PASS')
