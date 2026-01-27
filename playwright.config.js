import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially for multi-user scenarios
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Single worker to avoid database conflicts
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'cd server && npm run dev',
      port: 4444,
      timeout: 120 * 1000,
      reuseExistingServer: true, // Always use existing server
    },
    {
      command: 'cd client && npm run dev',
      port: 5173,
      timeout: 120 * 1000,
      reuseExistingServer: true, // Always use existing server
    },
  ],
});
