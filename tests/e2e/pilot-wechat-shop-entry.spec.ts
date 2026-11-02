import {test,expect} from "@playwright/test";

const sku="socthink_g1_original_2026_batch01";
const product="/shop/"+sku;
const signIn="/login?next="+encodeURIComponent(product);

test("anonymous visitor can reach WeChat sign-in from private Native pilot product without any checkout",async({page})=>{
 const res=await page.goto(product);
 // The local browser CI has no production billing DB or private PDF files.
 // Skip only that 404; external production runs MUST pass the real page.
 if(res?.status()===404 && !process.env.E2E_EXTERNAL_SERVER)
  test.skip(true,"Local CI has no verified real shop SKU; run this test against the deployed site");
 expect(res?.status()).toBe(200);
 const card=page.getByRole("complementary",{name:"购买与交付"});
 const link=card.getByRole("link",{name:"微信登录后查看购买资格"});
 await expect(link).toBeVisible();
 await expect(link).toHaveAttribute("href",signIn);
 await expect(card.getByRole("button",{name:"微信扫码购买"})).toHaveCount(0);
 await expect(card.getByText("公开支付尚未开放；受邀试付账号可以登录后继续")).toBeVisible();
 // On mobile, the CTA must not be buried below the long product description.
 if((page.viewportSize()?.width??1200)<=920){
  const c=await link.boundingBox();
  const body=await page.getByRole("heading",{name:"包含内容"}).boundingBox();
  expect(c&&body).toBeTruthy();
  expect(c!.y).toBeLessThan(body!.y);
 }
 await link.click();
 await expect(page).toHaveURL(/\/login\?/);
 const callback=new URL(page.url());
 expect(callback.searchParams.get("next")).toBe(product);
 await expect(page.getByRole("heading",{name:"一个微信账号，直接使用"})).toBeVisible();
});
