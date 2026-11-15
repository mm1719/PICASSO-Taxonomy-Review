import { defineConfig } from "@playwright/test";

const baseURL = process.env.PICASSO_BASE_URL ?? "https://picasso-taxonomy-review.vercel.app";
const url = new URL(baseURL);
if (url.origin !== "https://picasso-taxonomy-review.vercel.app"
  && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))) {
  throw new Error("Browser acceptance is restricted to PICASSO or a loopback preview.");
}

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: process.env.PICASSO_TEST_OUTPUT ?? "test-results",
  use: {
    baseURL,
    actionTimeout: 15_000,
    browserName: "chromium",
    locale: "en-US",
    timezoneId: "Asia/Taipei",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ]
});
