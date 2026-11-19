import {expect,test} from "@playwright/test";

const catalogue={
 items:[{
  id:"octopus-flexibility",title:"The Curious Octopus",level:"B1",topic:"Science",
  sentence:"An octopus has no bones, so it can squeeze through surprisingly narrow spaces.",
  translation:"章鱼没有骨头，因此它能够挤过非常狭窄的空间。",
  audio_available:true,audio_url:"/app/audio/follow-along/octopus-flexibility.mp3",
  voice_profile:"English voice",disclosure:"testing",content_origin:"original",
 }],
 scoring_status:"connected",scoring_message:"isolated fixture",
};

test("R7D: direct word text matches sentence typography, alignment, and content",async({page})=>{
 await page.route("**/english/pronunciation/api/follow-along/items",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify(catalogue),
 }));
 await page.goto("/english/pronunciation/next-lab");
 await expect(page.getByText("1 句练习")).toBeVisible();
 const base=page.locator('[aria-label="点击任意单词听发音"]');
 await expect(base).toBeVisible();
 const baseMetrics=await base.evaluate(el=>{
  const cs=getComputedStyle(el),b=el.getBoundingClientRect();
  const btn=el.querySelector("button")!;
  return {
   fontSize:cs.fontSize,lineHeight:cs.lineHeight,fontWeight:cs.fontWeight,
   letterSpacing:cs.letterSpacing,color:cs.color,
   x:b.x,width:b.width,marginTop:cs.marginTop,minHeight:cs.minHeight,
   wordFontSize:getComputedStyle(btn).fontSize,
  };
 });
 const original=await base.innerText();
 await page.getByRole("button",{name:"单词专项",exact:true}).click();
 const direct=page.getByRole("group",{name:"选择重点单词"});
 await expect(direct).toBeVisible();
 const wordMetrics=await direct.evaluate(el=>{
  const cs=getComputedStyle(el),b=el.getBoundingClientRect();
  const btn=el.querySelector("button")!;
  return {
   fontSize:cs.fontSize,lineHeight:cs.lineHeight,fontWeight:cs.fontWeight,
   letterSpacing:cs.letterSpacing,color:cs.color,
   x:b.x,width:b.width,marginTop:cs.marginTop,minHeight:cs.minHeight,
   wordFontSize:getComputedStyle(btn).fontSize,
  };
 });
 for(const key of ["fontSize","lineHeight","fontWeight","letterSpacing","color","marginTop","minHeight","wordFontSize"] as const){
  expect(wordMetrics[key],`typographic parity for ${key}`).toBe(baseMetrics[key]);
 }
 expect(Math.abs(wordMetrics.x-baseMetrics.x),"same left alignment").toBeLessThanOrEqual(2);
 expect(Math.abs(wordMetrics.width-baseMetrics.width),"same line width").toBeLessThanOrEqual(2);
 expect(await direct.innerText()).toBe(original);
 const translation=page.getByText(catalogue.items[0].translation);
 const wordBounds=await direct.boundingBox(),translationBounds=await translation.boundingBox();
 expect(wordBounds&&translationBounds&&translationBounds.y>=wordBounds.y+wordBounds.height-1).toBeTruthy();
 await expect(page.locator("#native-word-mode-speed")).toBeVisible();
 await expect(page.getByRole("button",{name:"录这个词并评分"})).toBeVisible();
 const xOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(xOverflow,"no horizontal overflow").toBeLessThanOrEqual(2);
});

test("R7D: every visible English word can be selected at full sentence size",async({page})=>{
 await page.route("**/english/pronunciation/api/follow-along/items",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify(catalogue),
 }));
 await page.goto("/english/pronunciation/next-lab");
 await expect(page.getByText("1 句练习")).toBeVisible();
 await page.getByRole("button",{name:"单词专项",exact:true}).click();
 const words=page.getByRole("group",{name:"选择重点单词"});
 await expect(words.getByRole("button")).toHaveCount(14);
 await words.getByRole("button",{name:"narrow",exact:true}).click();
 await expect(words.getByRole("button",{name:"narrow",exact:true})).toHaveAttribute("aria-pressed","true");
 await expect(words.getByRole("button",{name:"An",exact:true})).toHaveAttribute("aria-pressed","false");
 await page.getByRole("button",{name:"基础跟读",exact:true}).click();
 await expect(page.locator('[aria-label="点击任意单词听发音"]')).toBeVisible();
});
