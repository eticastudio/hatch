import { test, expect } from '@playwright/test';

test.describe('Hatch admin smoke', () => {
  test('admin page loads with no PHP errors and no JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push('JS: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

    const resp = await page.goto('/wp-admin/admin.php?page=hatch');
    expect(resp?.status()).toBe(200);

    const html = await page.content();
    expect(html).not.toMatch(/Fatal error|Parse error|There has been a critical error/i);
    expect(html).toMatch(/Hatch.*Headless|HATCH/i);
    expect(errors).toEqual([]);
  });

  test('Hatch sidebar menu item exists with chick-emoji icon', async ({ page }) => {
    await page.goto('/wp-admin/');
    // The menu link itself
    const menuLink = page.locator('#toplevel_page_hatch a.toplevel_page_hatch, #toplevel_page_hatch > a').first();
    await expect(menuLink).toBeVisible();
    await expect(menuLink).toContainText(/Hatch/);
    // Icon is rendered as an <img> child by WP when icon_url is a data: URL
    const img = page.locator('#toplevel_page_hatch .wp-menu-image img');
    if (await img.count() > 0) {
      const src = await img.first().getAttribute('src');
      expect(src, 'icon should be base64 SVG').toMatch(/^data:image\/svg\+xml;base64,/);
      const decoded = Buffer.from(src!.replace(/^data:image\/svg\+xml;base64,/, ''), 'base64').toString('utf-8');
      expect(decoded).toContain('🐣');
    } else {
      // Fallback: check the menu has the data URL via background-image CSS
      const bgImage = await page.locator('#toplevel_page_hatch .wp-menu-image').evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(bgImage, 'menu has SVG icon set as background-image').toContain('data:image/svg');
    }
  });
});
