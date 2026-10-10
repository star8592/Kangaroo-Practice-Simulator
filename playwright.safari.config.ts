import {defineConfig, devices} from "@playwright/test";

const baseURL=process.env.E2E_BASE_URL||"http://127.0.0.1:4333";
const ipad=devices["iPad Pro 11"];
const iphone=devices["iPhone 13"];

export default defineConfig({
  testDir:"./tests/e2e",
  testMatch:"**/safari_ipad.spec.ts",
  timeout:45_000,
  expect:{timeout:12_000},
  globalTimeout:300_000,
  workers:1,
  retries:0,
  forbidOnly:!!process.env.CI,
  reporter:process.env.CI?"github":"list",
  use:{
    baseURL,
    trace:"retain-on-failure",
    screenshot:"only-on-failure",
    browserName:"webkit",
  },
  projects:[
    {name:"ipad-safari-portrait",use:{...ipad,viewport:{width:834,height:1112}}},
    {name:"ipad-safari-landscape",use:{...ipad,viewport:{width:1194,height:834}}},
    {name:"ipad-safari-split-view",use:{...ipad,viewport:{width:600,height:900}}},
    {name:"iphone-safari",use:{...iphone,viewport:{width:390,height:844}}},
  ],
  webServer:process.env.E2E_EXTERNAL_SERVER?undefined:{
    command:"npm run start -- -p 4333",
    url:baseURL+"/api/release",
    timeout:60_000,
    reuseExistingServer:!process.env.CI,
  },
});
