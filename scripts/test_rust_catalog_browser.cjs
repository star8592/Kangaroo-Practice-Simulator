"use strict";
/**
 * Run against a local Next process wired to a REAL local Rust catalogue.
 * Browser exercises the current resources UI, not fake HTTP-only snapshots.
 */
const assert=require("node:assert/strict");
const {chromium}=require("@playwright/test");

const base=process.env.SOCTHINK_RUST_CATALOG_WEB_TEST_URL;
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base||""))throw Error("local Next URL required");

(async()=>{
 const browser=await chromium.launch({executablePath:"/opt/google/chrome/chrome",headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{
  if(process.env.SOCTHINK_RUST_CATALOG_EXPECT_DOWN==="1"){
    const down=await browser.newPage({viewport:{width:390,height:844}});
    const response=await down.goto(base+"/resources",{waitUntil:"domcontentloaded",timeout:30000});
    assert.equal(response?.status(),500,"Rust failure must have non-success HTTP status");
    await down.getByRole("heading",{name:"试卷目录暂时不可用"}).waitFor({timeout:12000});
    assert(!(await down.locator("body").innerText()).includes("查找试卷，直接练习"));
    console.log("RUST_CATALOG_REAL_BROWSER_DOWN=PASS http=500 user_message=yes no_legacy_data=true");
    await down.close();
    return;
  }
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const response=await page.goto(base+"/resources",{waitUntil:"domcontentloaded",timeout:30000});
  assert.equal(response?.status(),200);
  assert.match(await page.locator("h1").innerText(),/查找试卷，直接练习/);
  assert(await page.getByText("419",{exact:true}).first().isVisible(),"must display 419 approved papers");
  assert.equal(await page.locator("article").count(),18,"first page shows 18 entries");
  const search=page.getByRole("searchbox").first();
  await search.fill("2026");
  await page.waitForTimeout(100);
  assert(await page.locator("article").count()>0,"year search retained");
  console.log("RUST_WEB_DESKTOP=PASS full=419 cards=18 search=2026");
  await page.close();

  const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
  await phone.goto(base+"/resources",{waitUntil:"domcontentloaded",timeout:30000});
  assert.match(await phone.locator("h1").innerText(),/查找试卷/);
  assert(await phone.getByText("419",{exact:true}).first().isVisible());
  const overflow=await phone.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(overflow<=1,"mobile horizontal overflow "+overflow);
  console.log("RUST_WEB_MOBILE=PASS width=390 overflow="+overflow);
  await phone.close();
 }finally{await browser.close()}
 console.log("RUST_CATALOG_REAL_BROWSER=PASS");
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
