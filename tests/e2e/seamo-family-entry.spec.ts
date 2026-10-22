import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {authenticateOrCreateWechatParent,createParentSessionToken,PARENT_SESSION_COOKIE} from '../../src/lib/parent-auth';
import {SESSION_COOKIE,userFromSessionToken} from '../../src/lib/auth';

const root=process.cwd();
const dir=path.join(root,'private','users');
const parentFile=path.join(dir,'parents.json');
const sessionFile=path.join(dir,'exam-sessions.json');
const attemptFile=path.join(dir,'exam-attempts.jsonl');
const snapshots=new Map<string,Buffer|null>();
let token='';

test.beforeAll(()=>{
 if(process.env.E2E_ALLOW_SYNTHETIC_FIXTURE!=='1'||(!root.includes('KPS-SEAMO-2026')&&!process.env.CI))
  throw new Error('Family-login browser regression only permitted in isolated QA worktree');
 for(const file of [parentFile,sessionFile,attemptFile])snapshots.set(file,fs.existsSync(file)?fs.readFileSync(file):null);
 const rand=crypto.randomBytes(9).toString('hex');
 const family=authenticateOrCreateWechatParent({wechatId:'seamo-test-family-'+rand,openId:'seamo-test-open-'+rand,name:'SEAMO 体验家庭'});
 token=createParentSessionToken(family.id);
});
test.afterAll(()=>{
 for(const [file,prior] of snapshots){
  if(prior)fs.writeFileSync(file,prior);
  else if(fs.existsSync(file))fs.rmSync(file);
 }
});
test.beforeEach(async({context})=>{
 await context.addCookies([{name:PARENT_SESSION_COOKIE,value:token,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Strict'}]);
});

for(const grade of [1,2] as const){
 test(`already signed-in WeChat family starts SEAMO Grade ${grade} without student PIN`,async({page,context})=>{
  await page.goto('/competitions?c=seamo');
  await page.locator('button.competition-card').filter({hasText:'新加坡 SEAMO'}).waitFor();
  await page.getByRole('button',{name:'1-2年级'}).click();
  const label=`SEAMO ${grade}年级 · 原创基础训练（修订版）`;
  const paper=page.locator('article').filter({has:page.getByRole('heading',{name:label})});
  await expect(paper).toBeVisible();
  await paper.getByRole('button',{name:'开始训练'}).click();
  await expect(page).toHaveURL(new RegExp(`/exam/seamo-original-g${grade}-revised-1$`),{timeout:15000});
  await expect(page.getByText('登录或注册')).toHaveCount(0);
  const actual=(await context.cookies()).find(c=>c.name===SESSION_COOKIE)?.value;
  expect(actual).toBeTruthy();
  expect(userFromSessionToken(actual)?.id).toMatch(/^guest_family_/);
  await expect(page.getByRole('button',{name:'开始练习'})).toBeVisible({timeout:12000});
  await page.getByRole('button',{name:'开始练习'}).click();
  await expect(page.locator('.question-stem')).toBeVisible();
  await expect(page.locator('.exam-read-aloud')).toBeVisible();
  await expect(page.locator('.exam-audio-track,.exam-speech-track')).toHaveCount(2);
  if(grade===2){
   await page.locator('.number-grid button').nth(20).click();
   await expect(page.locator('.integer-answer-box input')).toBeVisible();
   await page.locator('.integer-answer-box input').fill('12');
  }else{
   await page.locator('.choice-list button').first().click();
  }
  await page.getByRole('button',{name:'交卷',exact:true}).click();
  await page.getByRole('button',{name:'确认提交'}).click();
  await expect(page).toHaveURL(/\/result(?:\?|$)/,{timeout:15000});
  await expect(page.getByRole('heading',{name:'本次成绩'})).toBeVisible();
 });
}
