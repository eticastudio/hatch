import { test, expect } from '@playwright/test';

test.describe('Integrations tab', () => {
  test('Turnstile probe button visible', async ({ page }) => {
    await page.goto('/wp-admin/admin.php?page=hatch&tab=integrations');
    await expect(page.locator('button[type=submit]:has-text("Probe Turnstile")')).toBeVisible();
  });

  test('Forms section auto-detect — no vestigial mode=auto hidden input', async ({ page }) => {
    await page.goto('/wp-admin/admin.php?page=hatch&tab=integrations');
    const stale = await page.locator('input[type=hidden][name="hatch_integrations[forms][mode]"]').count();
    expect(stale, 'Vestigial hidden mode=auto should be removed').toBe(0);
  });

  test('Menus card present (renders even when no menus exist yet)', async ({ page }) => {
    await page.goto('/wp-admin/admin.php?page=hatch&tab=integrations');
    // Either "Menus" (with picker) or "No menus yet" (with create-menu CTA)
    const menusOrEmpty = page.locator('text=/^Menus$|No menus yet/').first();
    await expect(menusOrEmpty).toBeVisible();
  });
});
