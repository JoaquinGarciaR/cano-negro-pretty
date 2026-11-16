import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Mobile Viewport (iPhone 14 390x844)',
      use: {
        channel: 'chrome',
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.99 Mobile/15E148 Safari/604.1',
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'Desktop Chrome Viewport',
      use: {
        channel: 'chrome',
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
