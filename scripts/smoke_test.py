#!/usr/bin/env python3
import argparse,hashlib,http.cookiejar,json,secrets,time,urllib.error,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];USERS=ROOT/'private/users/users.json';ATT=ROOT/'private/users/exam-attempts.jsonl';SESS=ROOT/'private/users/exam-sessions.json';PREA='au-amc-pre-a-sample-1';AMC='au-amc-2025-middle-primary';MAA8='maa-amc8-2023-sample';MAA8_ARCHIVE='maa-amc8-2000-user-owned';MAA8_2024='maa-amc8-2024-user-owned';MAA8_SMART='smart-maa-amc8--smokeverify';MAA10='maa-amc10-2022-a-sample';MAA_PRACTICE='maa-amc10-practice-algebra'
def req(opener,url,method='GET',payload=None):
 data=None if payload is None else json.dumps(payload).encode();r=urllib.request.Request(url,data=data,headers={'Content-Type':'application/json'},method=method)
 try:
  with opener.open(r) as x:return x.status,json.load(x)
 except urllib.error.HTTPError as e:
  try:b=json.load(e)
  except Exception:b={'error':str(e)}
  return e.code,b
def add_user():
 users=json.loads(USERS.read_text()) if USERS.exists() else [];uid='smoke_'+secrets.token_hex(6);username=uid;candidate='SMK'+secrets.token_hex(4).upper();pin=secrets.token_hex(4);salt=secrets.token_hex(16);key=hashlib.scrypt(pin.encode(),salt=salt.encode(),n=16384,r=8,p=1,dklen=32).hex();users.append({'id':uid,'username':username,'candidateNo':candidate,'name':'Smoke Test','grade':1,'pinHash':f'scrypt${salt}${key}','createdAt':int(time.time()*1000),'active':True,'role':'student'});USERS.parent.mkdir(parents=True,exist_ok=True);USERS.write_text(json.dumps(users,ensure_ascii=False,indent=2));return uid,username,pin
def cleanup(uid):
 if USERS.exists():USERS.write_text(json.dumps([u for u in json.loads(USERS.read_text()) if u.get('id')!=uid],ensure_ascii=False,indent=2))
 if ATT.exists():
  keep=[line for line in ATT.read_text().splitlines() if line.strip() and (lambda x:x.get('userId')!=uid)(json.loads(line))];ATT.write_text(('\n'.join(keep)+'\n') if keep else '')
 if SESS.exists():SESS.write_text(json.dumps([x for x in json.loads(SESS.read_text()) if x.get('userId')!=uid],ensure_ascii=False,indent=2))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--base',default='http://127.0.0.1:3027');a=ap.parse_args();base=a.base.rstrip('/');anon=urllib.request.build_opener();code,_=req(anon,base+f'/api/exams/{PREA}');assert code==401,code
 fake='missing_'+secrets.token_hex(4);bad=[req(anon,base+'/api/auth/login','POST',{'username':fake,'pin':'invalid'})[0] for _ in range(5)];assert bad[:4]==[401]*4 and bad[4]==429,bad
 uid,username,pin=add_user();jar=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
 try:
  code,login=req(client,base+'/api/auth/login','POST',{'username':username,'pin':pin});assert code==200 and login['user']['id']==uid
  code,exam=req(client,base+f'/api/exams/{PREA}');assert code==200;qs=exam['questions'];profile=exam['profile'];assert len(qs)==25 and all('answer' not in q for q in qs);pts=[q['points'] for q in qs];assert [pts.count(x) for x in (3,4,5,6,8)]==[10,10,2,2,1];assert profile['competitionId']=='australian-amc' and profile['formatId']=='australian-amc-pre-a' and profile['paperType']=='sample' and profile['timingMode']=='untimed' and profile['maxScore']==100
  code,official=req(client,base+f'/api/exams/{AMC}');assert code==200;op=official['profile'];assert op['competitionId']=='australian-amc' and op['formatId']=='australian-amc-standard-3-4' and op['durationSeconds']==3600 and op['questionCount']==30 and op['maxScore']==135 and op['timingMode']=='official'
  code,m8=req(client,base+f'/api/exams/{MAA8}');assert code==200 and len(m8['questions'])==25 and m8['profile']['competitionId']=='maa-amc' and m8['profile']['formatId']=='maa-amc8' and m8['profile']['durationSeconds']==2400 and m8['profile']['maxScore']==25 and all('answer' not in q for q in m8['questions'])
  code,m8a=req(client,base+f'/api/exams/{MAA8_ARCHIVE}');assert code==200 and len(m8a['questions'])==25 and m8a['profile']['competitionId']=='maa-amc' and m8a['profile']['formatId']=='maa-amc8' and m8a['profile']['paperType']=='past' and m8a['profile']['year']==2000 and m8a['profile']['language']=='zh/en' and all('answer' not in q for q in m8a['questions']) and 'archive-amc8/2000/q01.png' in (m8a['questions'][0].get('assetUrl') or '')
  code,m824=req(client,base+f'/api/exams/{MAA8_2024}');assert code==200 and len(m824['questions'])==25 and m824['profile']['competitionId']=='maa-amc' and m824['profile']['formatId']=='maa-amc8' and m824['profile']['paperType']=='past' and m824['profile']['language']=='zh/en' and all('answer' not in q for q in m824['questions']) and '2024/AMC_8_bilingual/q01.png' in (m824['questions'][0].get('assetUrl') or '')
  code,m8s=req(client,base+f'/api/exams/{MAA8_SMART}');assert code==200 and len(m8s['questions'])==25 and m8s['profile']['competitionId']=='maa-amc' and m8s['profile']['formatId']=='maa-amc8' and m8s['profile']['paperType']=='smart' and m8s['profile']['durationSeconds']==2400 and m8s['profile']['maxScore']==25 and all('answer' not in q for q in m8s['questions'])
  code,m10=req(client,base+f'/api/exams/{MAA10}');assert code==200 and len(m10['questions'])==25 and m10['profile']['competitionId']=='maa-amc' and m10['profile']['formatId']=='maa-amc10' and m10['profile']['durationSeconds']==4500 and m10['profile']['maxScore']==150 and m10['profile']['blankScoreValue']==1.5
  code,_=req(client,base+'/api/admin/questions');assert code==403;code,_=req(client,base+'/api/admin/students');assert code==403
  bank=json.loads((ROOT/f'private/exams/{PREA}.json').read_text());correct={q['id']:q['answer'] for q in bank['questions']}
  code,start=req(client,base+'/api/exam-sessions','POST',{'examId':PREA});assert code==200;sid=start['session']['id'];assert start['durationSeconds']==0 and start['session']['expiresAt']-start['session']['startedAt']>=23*3600*1000;now=int(time.time()*1000)
  code,full=req(client,base+'/api/grade','POST',{'examId':PREA,'sessionId':sid,'answers':correct,'lang':'zh','events':[{'type':'question_enter','questionId':qs[0]['id'],'at':now}]});assert code==200 and full['score']==100
  code,start=req(client,base+'/api/exam-sessions','POST',{'examId':PREA});assert code==200;code,blank=req(client,base+'/api/grade','POST',{'examId':PREA,'sessionId':start['session']['id'],'answers':{},'lang':'zh','events':[]});assert code==200 and blank['score']==0
  code,start=req(client,base+'/api/exam-sessions','POST',{'examId':MAA10});assert code==200;code,maa_blank=req(client,base+'/api/grade','POST',{'examId':MAA10,'sessionId':start['session']['id'],'answers':{},'lang':'en','events':[]});assert code==200 and maa_blank['score']==37.5 and [maa_blank['byPosition'][k]['total'] for k in ('Q1–10','Q11–20','Q21–25')]==[10,10,5]
  code,mp=req(client,base+f'/api/exams/{MAA_PRACTICE}');assert code==200 and mp['profile']['paperType']=='practice' and mp['profile']['timingMode']=='untimed' and mp['profile']['durationSeconds']==0 and len(mp['questions'])==5 and all('answer' not in q for q in mp['questions'])
  code,start=req(client,base+'/api/exam-sessions','POST',{'examId':MAA_PRACTICE});assert code==200;code,practice_blank=req(client,base+'/api/grade','POST',{'examId':MAA_PRACTICE,'sessionId':start['session']['id'],'answers':{},'lang':'en','events':[]});assert code==200 and practice_blank['score']==0
  code,ana=req(client,base+'/api/student/analytics');assert code==200 and ana['overview']['examAttempts']==3 and ana['overview']['totalQuestions']==75 and ana['practice']['attempts']==1 and ana['practice']['questions']==5 and ana['readiness'] is not None and ana['dataConfidence']>0
  code,arith=req(client,base+'/api/arithmetic/sessions');assert code==200 and 'sessions' in arith
  code,next_round=req(client,base+'/api/arithmetic/next-session','POST',{'grade':1});assert code==200 and next_round.get('ok') is True and next_round.get('mode')=='adaptive' and next_round.get('grade')==1
  with client.open(base+'/student') as page:html=page.read().decode('utf-8');assert 'Smoke Test' in html and '数据置信度' in html
  users=json.loads(USERS.read_text());target=next(x for x in users if x.get('id')==uid);target['sessionVersion']=int(target.get('sessionVersion') or 1)+1;USERS.write_text(json.dumps(users,ensure_ascii=False,indent=2));code,_=req(client,base+'/api/auth/me');assert code==401,code
  print(json.dumps({'auth':'PASS','pre_a_questions':25,'pre_a_distribution':{'3':10,'4':10,'5':2,'6':2,'8':1},'pre_a_untimed':True,'pre_a_full_score':100,'pre_a_blank_score':0,'amc_middle_primary_minutes':60,'amc_middle_primary_max':135,'answer_leak':False,'student_admin_access':403,'maa_amc8_archive_2000':25,'maa_amc8_2024':25,'maa_amc8_smart':25,'maa_amc10_blank_score':37.5,'maa_practice_separate':True,'analytics_attempts':3,'analytics_questions':75,'login_rate_limit':True,'session_revocation':True,'arithmetic_next_session':True},ensure_ascii=False))
 finally:cleanup(uid)
if __name__=='__main__':main()
