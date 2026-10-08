import {defineConfig,devices} from "@playwright/test";

const BASE_URL=process.env.E2E_BASE_URL||"http://127.0.0.1:4318";
export default defineConfig({
  testDir:"./tests/e2e",
  timeout:30000,
  expect:{timeout:10000},
  globalTimeout:180000,
  workers:1,
  retries:process.env.CI?1:0,
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
  webServer:process.env.E2E_EXTERNAL_SERVER?undefined:{
    command:"npm run start -- -p 4318",
    url:BASE_URL+"/api/release",
    timeout:60000,
    reuseExistingServer:!process.env.CI,
    stdout:"ignore",
    stderr:"pipe",
  },
});
