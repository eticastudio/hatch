import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 900 },
  },
  workers: 1,
  retries: 0,
});
