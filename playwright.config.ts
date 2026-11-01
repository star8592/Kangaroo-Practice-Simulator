import {defineConfig,devices} from "@playwright/test";

const BASE_URL=process.env.E2E_BASE_URL||"http://127.0.0.1:4318";
const TEST_ORIGIN=new URL(BASE_URL);
const EXTERNAL_SERVER=Boolean(process.env.E2E_EXTERNAL_SERVER);
if(!["http:","https:"].includes(TEST_ORIGIN.protocol)||
   TEST_ORIGIN.username||TEST_ORIGIN.password)
  throw new Error("INVALID_E2E_ORIGIN");
if(!EXTERNAL_SERVER &&
   (TEST_ORIGIN.protocol!=="http:" ||
    !["127.0.0.1","localhost"].includes(TEST_ORIGIN.hostname)))
  throw new Error("LOCAL_E2E_REQUIRES_LOOPBACK_ORIGIN");
// Only a Playwright-launched local server requires a high explicit port.
// External HTTPS commonly runs on 443; it must never inherit this local check.
const TEST_PORT=Number(TEST_ORIGIN.port||80);
if(!EXTERNAL_SERVER &&
   (!Number.isSafeInteger(TEST_PORT)||TEST_PORT<1024||TEST_PORT>65535))
  throw new Error("INVALID_E2E_PORT");
export default defineConfig({
  testDir:"./tests/e2e",
  timeout:30000,
  expect:{timeout:10000},
  globalTimeout:180000,
  workers:1,
  // CI must not hide flaky tests behind a successful retry.\n  retries:0,
  forbidOnly:!!process.env.CI,
  reporter:process.env.CI?[["github"],["html",{open:"never"}]]:"list",
  use:{
    baseURL:BASE_URL,
    trace:"retain-on-failure",
    screenshot:"only-on-failure",
    launchOptions:{
      executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,
    },
  },
  projects:[
    {name:"desktop-chromium",use:{...devices["Desktop Chrome"]}},
    {name:"mobile-chromium",use:{...devices["Pixel 7"]}},
  ],
  webServer:EXTERNAL_SERVER?undefined:{
    command:`npm run start -- -p ${TEST_PORT} -H 127.0.0.1`,
    url:BASE_URL+"/api/release",
    timeout:60000,
    // Never reuse an unverified listener. Another workspace may return
    // HTTP 200 for /api/release via SPA fallback, causing false-green CI.
    reuseExistingServer:false,
    stdout:"ignore",
    stderr:"pipe",
  },
});
