"use strict";
const { defineConfig } = require("@playwright/test");

/* Solo desarrollo: abre el HTML con file:// y no levanta ningún servidor.
   Edge instalado evita descargar otro navegador. Se puede elegir otro binario
   compatible con PLAYWRIGHT_EXECUTABLE_PATH o PLAYWRIGHT_CHANNEL. */
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const channel = process.env.PLAYWRIGHT_CHANNEL || "msedge";

module.exports = defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.js",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 30000,
  expect: { timeout: 5000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }]
  ],
  use: {
    browserName: "chromium",
    ...(executablePath ? {} : { channel }),
    headless: true,
    viewport: { width: 1280, height: 900 },
    launchOptions: executablePath ? { executablePath } : {},
    actionTimeout: 5000,
    navigationTimeout: 10000,
    acceptDownloads: true,
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  },
  projects: [{ name: "edge" }]
});
