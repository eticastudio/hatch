import { test, expect } from '@playwright/test';

const TABS = ['connector', 'features', 'design', 'integrations', 'security', 'status'];

test.describe('Every Hatch tab renders cleanly', () => {
  for (const tab of TABS) {
    test(`${tab} tab — 200 + no PHP fatal/notice`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('pageerror', (e) => consoleErrors.push('PAGE: ' + e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push('CONSOLE: ' + m.text());
      });

      const resp = await page.goto(`/wp-admin/admin.php?page=hatch&tab=${tab}`);
      expect(resp?.status()).toBe(200);

      const body = await page.content();
      expect(body, `${tab} body has no PHP fatal`).not.toMatch(/There has been a critical error|Fatal error|Parse error/i);
      // PHP notices/warnings escape into the page body when display_errors is on.
      expect(body, `${tab} body has no PHP Warning`).not.toMatch(/<b>Warning<\/b>:/);
      expect(body, `${tab} body has no PHP Notice`).not.toMatch(/<b>Notice<\/b>:/);
      // Active tab marker exists somewhere on the page
      expect(body, `${tab} active tab class present`).toContain('is-active');
      expect(consoleErrors, `${tab} no console errors`).toEqual([]);
    });
  }
});
