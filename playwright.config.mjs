import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 60_000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3988',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx serve . -p 3988',
    port: 3988,
    reuseExistingServer: true,
    timeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
