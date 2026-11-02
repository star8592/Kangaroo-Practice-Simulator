import {test,expect} from "@playwright/test";
const URL="/skill-labs/code-lab";
test("software code editor is genuinely large, responsive, and keeps input during expand",async({page})=>{
 const res=await page.goto(URL);
 expect(res?.status()).toBe(200);
 await page.getByRole("checkbox",{name:/我理解这是免费编程实训/}).check();
 await page.getByRole("button",{name:"开始编程实操"}).click();
 const editor=page.getByRole("textbox",{name:"你的JavaScript代码"});
 await expect(editor).toBeVisible();
 await expect(page.getByText("solution.js",{exact:true})).toBeVisible();
 const viewport=page.viewportSize()!.width;
 const before=await editor.boundingBox();
 expect(before).not.toBeNull();
 console.log("EDITOR_WORKSPACE_V2 "+JSON.stringify({viewport:page.viewportSize()!.width,width:Math.round(before!.width),height:Math.round(before!.height),top:Math.round(before!.y)}));
 expect(before!.height).toBeGreaterThanOrEqual(viewport<=650?419:519);
 if(viewport>=1300)expect(before!.width).toBeGreaterThanOrEqual(950);
 if(viewport<=430)expect(before!.width).toBeGreaterThanOrEqual(280);
 await editor.fill("function normalizePaidOrderIds(orders) { return []; }");
 await expect(page.getByText(/\d+ \/ 5000 字符/)).toBeVisible();
 const expand=page.getByRole("button",{name:"扩大编辑区"});
 await expect(expand).toHaveAttribute("aria-pressed","false");
 await expand.click();
 await expect(page.getByRole("button",{name:"退出扩大模式"})).toHaveAttribute("aria-pressed","true");
 await expect(editor).toHaveValue("function normalizePaidOrderIds(orders) { return []; }");
 const after=await editor.boundingBox();
 expect(after).not.toBeNull();
 expect(after!.height).toBeGreaterThan(before!.height);
 if(viewport>=1050)expect(after!.width).toBeGreaterThan(before!.width+100);
 await page.getByRole("button",{name:"退出扩大模式"}).click();
 await expect(editor).toHaveValue("function normalizePaidOrderIds(orders) { return []; }");
 await page.getByRole("button",{name:"运行代码并核验"}).click();
 await expect(page.getByText("需要修正代码")).toBeVisible({timeout:17000});
 await expect(page.getByText("执行结果",{exact:true})).toBeVisible();
 const scroll=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
 expect(scroll.page-scroll.viewport).toBeLessThanOrEqual(2);
});

test("widescreen and laptop workspaces use available width rather than a narrow form column",async({page})=>{
 for(const width of [1920,1024]){
  await page.setViewportSize({width,height:900});
  const response=await page.goto(URL);
  expect(response?.status()).toBe(200);
  await page.getByRole("checkbox",{name:/我理解这是免费编程实训/}).check();
  await page.getByRole("button",{name:"开始编程实操"}).click();
  const rect=await page.getByRole("textbox",{name:"你的JavaScript代码"}).boundingBox();
  expect(rect).not.toBeNull();
  const data=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(data.scrollWidth-data.viewport).toBeLessThanOrEqual(2);
  expect(rect!.width).toBeGreaterThanOrEqual(width>=1800?1130:795);
  expect(rect!.height).toBeGreaterThanOrEqual(519);
  console.log("WORKSPACE_DIMENSIONS "+JSON.stringify({viewport:width,editorWidth:Math.round(rect!.width),editorHeight:Math.round(rect!.height),editorTop:Math.round(rect!.y)}));
  expect(rect!.y).toBeLessThan(650);
  await page.getByRole("button",{name:"扩大编辑区"}).click();
  const expanded=await page.getByRole("textbox",{name:"你的JavaScript代码"}).boundingBox();
  expect(expanded!.width).toBeGreaterThanOrEqual(rect!.width);
 }
});
