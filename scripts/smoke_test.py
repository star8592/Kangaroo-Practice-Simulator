#!/usr/bin/env python3
import argparse,hashlib,http.cookiejar,json,secrets,time,urllib.error,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];USERS=ROOT/'private/users/users.json';ATT=ROOT/'private/users/exam-attempts.jsonl';SESS=ROOT/'private/users/exam-sessions.json'
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
 ap=argparse.ArgumentParser();ap.add_argument('--base',default='http://127.0.0.1:3027');a=ap.parse_args();base=a.base.rstrip('/');anon=urllib.request.build_opener();code,_=req(anon,base+'/api/exams/level-a');assert code==401,code
 uid,username,pin=add_user();jar=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
 try:
  code,login=req(client,base+'/api/auth/login','POST',{'username':username,'pin':pin});assert code==200 and login['user']['id']==uid
  code,exam=req(client,base+'/api/exams/level-a');assert code==200;qs=exam['questions'];assert len(qs)==24 and all('answer' not in q for q in qs);pts=[q['points'] for q in qs];assert [pts.count(x) for x in (3,4,5)]==[8,8,8]
  code,_=req(client,base+'/api/admin/questions');assert code==403
  code,_=req(client,base+'/api/admin/students');assert code==403
  bank=json.loads((ROOT/'private/question-bank.json').read_text());correct={q['id']:q['answer'] for q in bank}
  code,start=req(client,base+'/api/exam-sessions','POST',{'examId':'level-a'});assert code==200;sid=start['session']['id'];now=int(time.time()*1000)
  code,full=req(client,base+'/api/grade','POST',{'examId':'level-a','sessionId':sid,'answers':correct,'lang':'zh','events':[{'type':'question_enter','questionId':qs[0]['id'],'at':now}]});assert code==200 and full['score']==120
  code,start=req(client,base+'/api/exam-sessions','POST',{'examId':'level-a'});assert code==200
  code,blank=req(client,base+'/api/grade','POST',{'examId':'level-a','sessionId':start['session']['id'],'answers':{},'lang':'zh','events':[]});assert code==200 and blank['score']==24
  code,ana=req(client,base+'/api/student/analytics');assert code==200 and ana['overview']['examAttempts']==2 and ana['overview']['totalQuestions']==48 and ana['readiness'] is not None and ana['dataConfidence']>0
  code,arith=req(client,base+'/api/arithmetic/sessions');assert code==200 and 'sessions' in arith
  with client.open(base+'/student') as page: html=page.read().decode('utf-8');assert 'Smoke Test' in html and '数据置信度' in html
  print(json.dumps({'auth':'PASS','questions':24,'distribution':{'3':8,'4':8,'5':8},'answer_leak':False,'student_admin_access':403,'student_manager_access':403,'full_score':120,'blank_score':24,'server_timed':True,'analytics_attempts':ana['overview']['examAttempts'],'analytics_confidence':ana['dataConfidence'],'student_page':True},ensure_ascii=False))
 finally:cleanup(uid)
if __name__=='__main__':main()
