import { test, expect } from '@playwright/test';

test.describe('Tab behavior on links (v0.49.4 fix)', () => {
  test('Posts list View link is SAME tab (no target=_blank)', async ({ page }) => {
    await page.goto('/wp-admin/edit.php');
    const firstViewLink = page.locator('table.posts a[href*="?p="]').first()
      .or(page.locator('table.wp-list-table .row-actions span.view a').first());

    // The View link should NOT have target attribute (we removed it in v0.49.4)
    if (await firstViewLink.count() > 0) {
      const target = await firstViewLink.first().getAttribute('target');
      expect(target, 'View link in row actions opens same tab').toBeNull();
    }
  });

  test('Admin bar "Visit Site" opens NEW tab', async ({ page }) => {
    await page.goto('/wp-admin/');
    const visitSite = page.locator('#wp-admin-bar-site-name a').first();
    await expect(visitSite).toBeVisible();
    const target = await visitSite.getAttribute('target');
    expect(target, 'Admin bar Visit Site should target=_blank').toBe('_blank');
  });
});
