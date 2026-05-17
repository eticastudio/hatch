import { test, expect } from '@playwright/test';

test('hatch-admin.js (Save spinner) is enqueued on Hatch admin pages', async ({ page }) => {
  await page.goto('/wp-admin/admin.php?page=hatch');
  const scripts = await page.locator('script[src*="hatch-admin.js"]').count();
  expect(scripts, 'hatch-admin.js should be enqueued').toBeGreaterThan(0);
});

test('Save button on Security tab gets decorated by spinner JS after DOMContentLoaded', async ({ page }) => {
  await page.goto('/wp-admin/admin.php?page=hatch&tab=security');
  // Wait for the JS to find the form and decorate the Save button
  const decoratedBtn = page.locator('button.hx-save-btn[data-hx-decorated="1"]').first();
  await expect(decoratedBtn).toBeAttached({ timeout: 5_000 });
  await expect(decoratedBtn.locator('.hx-save-default')).toBeAttached();
  await expect(decoratedBtn.locator('.hx-save-busy')).toBeAttached();
});
