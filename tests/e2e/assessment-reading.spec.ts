import {test,expect} from "@playwright/test";
test("reading center offers a real task and public technical evidence",async({page})=>{
 await page.goto("/assessment-center");
 await expect(page.getByText("免费任务练习",{exact:true})).toHaveCount(2);
 await expect(page.getByText("建设中",{exact:true})).toHaveCount(1);
 await expect(page.locator('a[href="/assessment-center/reading-practice-16"]')).toBeVisible();
 await page.getByText("测评依据与适用范围",{exact:true}).click();
 await page.getByRole("link",{name:/查看全部测评技术档案/}).click();
 await expect(page.getByRole("heading",{name:"每项结果，都应当能追溯依据。"})).toBeVisible();
 await expect(page.locator("article")).toHaveCount(4);
 await expect(page.getByText("0项取得中国人群标准化常模验证")).toBeVisible();
});
test("reading tasks: guardian consent, 16 choices, evidence, corrective feedback and reset",async({page})=>{
 const response=await page.goto("/assessment-center/reading-practice-16");
 expect(response?.status()).toBe(200);
 await expect(page.getByRole("heading",{name:"阅读理解与证据判断 · 16题"})).toBeVisible();
 const start=page.getByRole("button",{name:"开始阅读与作答"});
 await expect(start).toBeDisabled();
 await expect(page.getByText(/未满14岁的孩子应由监护人同意使用/)).toBeVisible();
 await page.getByRole("checkbox",{name:/我是成年练习者/}).check();
 await start.click();
 await expect(page.getByRole("button",{name:"下一题"})).toBeDisabled();
 for(let i=1;i<=16;i++){
  await expect(page.getByText("第 "+i+" / 16 题")).toBeVisible();
  await page.locator('input[type="radio"][value="0"]').check();
  await page.getByRole("button",{name:i===16?"交卷并查看证据解析":"下一题"}).click();
 }
 await expect(page.getByRole("heading",{name:"阅读任务复盘报告"})).toBeVisible();
 await expect(page.getByText(/分数只表示这套练习/)).toBeVisible();
 await expect(page.getByRole("heading",{name:"逐题证据与解析"})).toBeVisible();
 await expect(page.locator("blockquote")).toHaveCount(16);
 await page.getByRole("button",{name:"重新练习"}).click();
 await expect(start).toBeDisabled();
});
