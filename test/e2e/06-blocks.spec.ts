import { test, expect } from '@playwright/test';

test.describe('Gutenberg blocks — the long-standing complaint', () => {
  test('all 8 Hatch blocks register with WP', async ({ page }) => {
    await page.goto('/wp-admin/admin.php?page=hatch&tab=status');
    // Status tab "Blocks" section reports both source count and registered count.
    const blocksTable = page.locator('text=/Currently registered with WP/').locator('xpath=following-sibling::td[1]');
    const text = await blocksTable.textContent();
    expect(text?.trim(), 'Status reports 8/8 blocks registered').toBe('8');
  });

  test('Hatch blocks appear in Gutenberg inserter on a new post', async ({ page }) => {
    // Create a new post via the post-new page
    await page.goto('/wp-admin/post-new.php');
    // Close the welcome modal if it appears
    const modalClose = page.getByRole('button', { name: /Close/i }).first();
    if (await modalClose.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await modalClose.click();
    }

    // Open block inserter (top-left "+" or sidebar)
    const inserterBtn = page.getByRole('button', { name: /Block Inserter|Toggle block inserter/i }).first();
    await inserterBtn.click();

    // Search for "hatch" in inserter — should match at least one Hatch block
    const search = page.getByPlaceholder(/Search/i).first();
    await search.fill('Section');
    await expect(page.getByRole('option', { name: /Section/i }).first()).toBeVisible({ timeout: 10_000 });
  });
});
