import { expect, test } from "@playwright/test";
import { TECH_BOOKS } from "../../src/lib/tech-books";

test("technical library entry, curated catalog, and server-rendered pages", async ({ page, request }) => {
  const landing = await page.goto("/skill-labs");
  expect(landing?.status()).toBe(200);
  await page.getByRole("link", { name: /进入技术书库/ }).click();
  await expect(page).toHaveURL(/\/skill-labs\/books$/);
  await expect(page.getByRole("heading", { name: "技术书库", exact: true })).toBeVisible();
  await expect(page.locator("main article")).toHaveCount(TECH_BOOKS.length);
  const pageHtml = await request.get("/skill-labs/books");
  expect(pageHtml.status()).toBe(200);
  const text = await pageHtml.text();
  expect(text).toContain("Game Programming Patterns");
  expect(text).toContain("Dive into Deep Learning");
  expect(text).toContain('href="/skill-labs/books/game-programming-patterns"');
  expect(text).toContain('rel="canonical"');
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("skill-labs/books/game-programming-patterns");
});

test("searches title, localized topic, author, and preserves category", async ({ page }) => {
  await page.goto("/skill-labs/books");
  const search = page.getByRole("searchbox", { name: "搜索书名、作者或技术主题" });
  await search.fill("Rust");
  await page.getByRole("button", { name: "查找书籍" }).click();
  await expect(page).toHaveURL(/\/skill-labs\/books\?.*q=Rust/);
  await expect(page.locator("main article")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "The Rust Programming Language" })).toBeVisible();
  await page.getByRole("searchbox", { name: "搜索书名、作者或技术主题" }).fill("没有这本书");
  await page.getByRole("button", { name: "查找书籍" }).click();
  await expect(page.getByText("没有匹配的书籍，可以换个关键词或重选领域。")).toBeVisible();
  await page.getByRole("link", { name: "查看全部书籍" }).click();
  await page.getByRole("combobox", { name: "技术分类" }).selectOption("games");
  await page.getByRole("button", { name: "查找书籍" }).click();
  await expect(page).toHaveURL(/topic=games/);
  await expect(page.locator("main article")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Game Programming Patterns" })).toBeVisible();
  await page.getByRole("searchbox", { name: "搜索书名、作者或技术主题" }).fill("3D 与游戏开发");
  await page.getByRole("button", { name: "查找书籍" }).click();
  await expect(page.locator("main article")).toHaveCount(2);
});

test("book detail has official source, reachable practice, and unknown slugs return 404", async ({ page, request }) => {
  const response = await page.goto("/skill-labs/books/game-programming-patterns");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Game Programming Patterns" })).toBeVisible();
  const official = page.getByRole("link", { name: /访问作者或项目官网/ });
  await expect(official).toHaveAttribute("href", "https://gameprogrammingpatterns.com/");
  await expect(official).toHaveAttribute("rel", /noopener/);
  const lab = page.getByRole("link", { name: /进入已开放入口/ });
  await expect(lab).toHaveAttribute("href", "/skill-labs/webgpu-basics");
  await lab.click();
  await expect(page).toHaveURL(/\/skill-labs\/webgpu-basics$/);
  const missing = await request.get("/skill-labs/books/no-such-book-2026");
  expect(missing.status()).toBe(404);
});

test("technical library does not overflow narrow or wide screens", async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 840 });
    for (const path of ["/skill-labs/books", "/skill-labs/books/designing-data-intensive-applications"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        inputFontSize: document.querySelector<HTMLInputElement>("#book-query")
          ? parseFloat(getComputedStyle(document.querySelector<HTMLInputElement>("#book-query")!).fontSize)
          : 0
      }));
      expect(metrics.overflow, path + " at " + width).toBeLessThanOrEqual(2);
      if (path === "/skill-labs/books" && width <= 600)
        expect(metrics.inputFontSize).toBeGreaterThanOrEqual(16);
    }
  }
});

test("official book download is shown only when verified, with no third-party mirror",async({page})=>{
  await page.goto("/skill-labs/books/dive-into-deep-learning");
  await expect(page.getByRole("link",{name:/前往官方下载 PDF/})).toHaveAttribute("href","https://d2l.ai/d2l-en.pdf");
  await page.goto("/skill-labs/books/designing-data-intensive-applications");
  await expect(page.getByRole("link",{name:/前往官方下载/})).toHaveCount(0);
  await expect(page.getByText(/未核验可合法下载的整本文件/)).toBeVisible();
});
