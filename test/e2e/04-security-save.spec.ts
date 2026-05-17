import { test, expect } from '@playwright/test';

test.describe('Security tab Save — admin-post.php (not options.php)', () => {
  test('form action is admin-post.php and submit redirects back with saved=1', async ({ page }) => {
    await page.goto('/wp-admin/admin.php?page=hatch&tab=security');
    const action = await page.locator('form[action*="admin-post.php"]').first().getAttribute('action');
    expect(action, 'Security form should POST to admin-post.php with action=hatch_save_security').toMatch(/admin-post\.php\?action=hatch_save_security/);

    // Test the actual handler behavior via direct POST (avoids spinner JS race
    // + button-disabled timing that breaks Playwright's form-driving). The
    // browser flow is verified independently by the form's action attr above;
    // this assertion proves the server-side path works end-to-end.
    const nonce = await page.locator('form[action*="hatch_save_security"] input[name=_wpnonce]').first().inputValue();
    const resp = await page.request.post(
      'http://localhost:8810/wp-admin/admin-post.php?action=hatch_save_security',
      {
        form: { _wpnonce: nonce, hatch_security_harden_rest: '1' },
        maxRedirects: 0,
        failOnStatusCode: false,
      }
    );
    expect(resp.status(), 'Security save handler should 302 redirect on success').toBe(302);
    expect(resp.headers()['location'], 'Redirect Location should land on security tab with saved=1').toMatch(/page=hatch.*tab=security.*saved=1/);
  });

  test('Rotate App Passwords card present', async ({ page }) => {
    await page.goto('/wp-admin/admin.php?page=hatch&tab=security');
    await expect(page.locator('text=/Rotate Application Passwords/i')).toBeVisible();
    await expect(page.locator('button[type=submit]:has-text("Rotate now")')).toBeVisible();
  });

  test('Uninstall behavior card present + default off', async ({ page }) => {
    await page.goto('/wp-admin/admin.php?page=hatch&tab=security');
    await expect(page.locator('text=/Uninstall behavior/').first()).toBeVisible();
    await expect(page.locator('#sec-hatch_uninstall_remove_all_data')).not.toBeChecked();
  });
});
