import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  reporter: 'line',
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
  },
});
