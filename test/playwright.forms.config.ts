/**
 * Standalone Playwright config for the Forms Bridge validator spec.
 * Skips WP-login globalSetup and storageState: this spec drives the
 * HatchForm runtime via page.setContent + page.route, so WP is not needed.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /13-forms-bridge-validator\.spec\.ts/,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
