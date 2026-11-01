import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
 authenticateOrCreateWechatParent,createParentSessionToken,PARENT_SESSION_COOKIE,
} from '../../src/lib/parent-auth';
import {wechatBuyerStudyUser} from '../../src/lib/auth';

const root = process.cwd();
const usersDir = path.join(root, 'private', 'users');
const userFile = path.join(usersDir, 'users.json');
const sessionsFile = path.join(usersDir, 'exam-sessions.json');
const attemptsFile = path.join(usersDir, 'exam-attempts.jsonl');
let account: {id:string; token:string; studyId:string} | null = null;
const parentsFile=path.join(usersDir,'parents.json');
let parentsBackup:Buffer|null=null;

function readArray(file:string): Array<Record<string,unknown>> {
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file,'utf8'));
  if (!Array.isArray(data)) throw new Error('Refusing to modify malformed test user store');
  return data;
}

test.beforeAll(() => {
  if (process.env.E2E_ALLOW_SYNTHETIC_FIXTURE !== '1' || (!root.includes('KPS-SEAMO-2026') && !process.env.CI)) {
    throw new Error('SEAMO browser smoke may run only in the explicitly authorized isolated worktree');
  }
  parentsBackup=fs.existsSync(parentsFile)?fs.readFileSync(parentsFile):null;
  const buyer=authenticateOrCreateWechatParent({
    wechatId:'e2e-seamo-wechat-'+process.pid,
    name:'SEAMO 测试买家',
  });
  account={id:buyer.id,token:createParentSessionToken(buyer.id),
    studyId:wechatBuyerStudyUser(buyer.id).id};
});

test.afterAll(() => {
  if (!account) return;
  const id = account.studyId;
  if(parentsBackup){fs.writeFileSync(parentsFile,parentsBackup);}
  else if(fs.existsSync(parentsFile))fs.rmSync(parentsFile);
  for (const file of [userFile,sessionsFile]) {
    if (fs.existsSync(file)) fs.writeFileSync(file,JSON.stringify(readArray(file).filter(row => row.id !== id && row.userId !== id)));
  }
  if (fs.existsSync(attemptsFile)) {
    const remaining = fs.readFileSync(attemptsFile,'utf8').split('\n').filter(line => line.trim() && JSON.parse(line).userId !== id);
    fs.writeFileSync(attemptsFile,remaining.length ? remaining.join('\n')+'\n' : '');
  }
});

async function login(page:import('@playwright/test').Page) {
  if(!account)throw new Error('Synthetic WeChat buyer missing');
  await page.context().addCookies([{name:PARENT_SESSION_COOKIE,value:account.token,
    domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Strict'}]);
}

async function startGrade(page:import('@playwright/test').Page,grade:1|2) {
  await page.goto('/competitions?c=seamo');
  await expect(page.locator('button.competition-card').filter({hasText:'新加坡 SEAMO'})).toBeVisible();
  await page.getByRole('button',{name:'1-2年级'}).click();
  const name = `SEAMO ${grade}年级 · 原创基础训练（修订版）`;
  const card = page.locator('article').filter({has:page.getByRole('heading',{name})});
  await expect(card).toBeVisible();
  await card.getByRole('button',{name:'开始训练'}).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await login(page);
  await page.goto(`/exam/seamo-original-g${grade}-revised-1`);
  await expect(page).toHaveURL(new RegExp(`/exam/seamo-original-g${grade}-revised-1$`),{timeout:15000});
  await expect(page.getByText(/本站独立编写的 SEAMO 基础专项练习/)).toBeVisible();
  await page.getByRole('button',{name:'确认信息并开始考试'}).click();
  await expect(page.locator('.question-stem')).toBeVisible();
  await expect(page.locator('.exam-read-aloud')).toBeVisible();
  await expect(page.locator('.exam-speech-track')).toHaveCount(2);
}

test('SEAMO Grade 1: competition card, login, bilingual voice controls, answers and submit',async({page})=>{
  await startGrade(page,1);
  await expect(page.locator('.choice-list button')).toHaveCount(5);
  await expect(page.locator('.exam-speech-track').first()).toContainText('中文读题');
  await expect(page.locator('.exam-speech-track').nth(1)).toContainText('English');
  await page.locator('.choice-list button').first().click();
  await page.getByRole('button',{name:'下一题 →'}).click();
  await expect(page.locator('.q-number')).toContainText('Question 2');
  await page.getByRole('button',{name:'交卷',exact:true}).click();
  await page.getByRole('button',{name:'确认提交'}).click();
  await expect(page).toHaveURL(/\/result(?:\?|$)/,{timeout:15000});
  await expect(page.getByRole('heading',{name:'本次成绩'})).toBeVisible();
});

test('SEAMO Grade 2: question 21 integer input retains both narration languages',async({page})=>{
  await startGrade(page,2);
  await expect(page.locator('.choice-list button')).toHaveCount(5);
  const navigation=page.getByRole('button',{name:/题号导航|Question navigation/});
  if(await navigation.isVisible())await navigation.click();
  await page.locator('.number-grid button').nth(20).click();
  await expect(page.locator('.integer-answer-box input')).toBeVisible();
  await page.locator('.integer-answer-box input').fill('12');
  await expect(page.locator('.integer-answer-box input')).toHaveValue('12');
  await expect(page.locator('.exam-speech-track')).toHaveCount(2);
  await expect(page.locator('.exam-speech-track').nth(1).getByRole('button',{name:/播放/})).toBeEnabled();
  await page.getByRole('button',{name:'交卷',exact:true}).click();
  await page.getByRole('button',{name:'确认提交'}).click();
  await expect(page).toHaveURL(/\/result(?:\?|$)/,{timeout:15000});
});
