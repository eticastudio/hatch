import { test, expect } from '@playwright/test';

test.describe('Status tab content', () => {
  test('shows every diagnostic section', async ({ page }) => {
    await page.goto('/wp-admin/admin.php?page=hatch&tab=status');
    const sections = ['Frontend (live site)', 'Cloudflare deploy', 'Vercel deploy', 'Authentication', 'Blocks', 'Security', 'Cron', 'Plugin'];
    for (const s of sections) {
      // Use locator with text match — section headings are <th> elements
      await expect(page.locator(`th:has-text("${s}")`).first()).toBeVisible();
    }
  });

  test('Plugin section reports 0.50.x version', async ({ page }) => {
    await page.goto('/wp-admin/admin.php?page=hatch&tab=status');
    // The version is shown as <code>0.50.2</code> in the status table value cell
    const versionCell = page.locator('td.hx-status-val:has(code)').filter({ hasText: /^\s*0\.50\.\d+\s*$/ }).first();
    await expect(versionCell).toBeVisible();
  });

  test('Blocks section reports 8/8 registered', async ({ page }) => {
    await page.goto('/wp-admin/admin.php?page=hatch&tab=status');
    // Look for the row labelled "Currently registered with WP" → value should be 8
    const row = page.locator('tr').filter({ hasText: 'Currently registered with WP' });
    await expect(row).toContainText('8');
  });
});
