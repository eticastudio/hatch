/**
 * 11-user-flow-save — actual click-through simulating a real user.
 *
 * The 10-smoke spec checks endpoints + boot state. This one is the user
 * sitting in front of the screen: click a control, see the save bar appear,
 * click Save, see the confirmation, reload, see the value stick.
 *
 * If THIS spec fails, the user is right that "save isn't working" even if
 * the REST endpoint succeeds, because what matters is the visible round trip.
 */
import { test, expect, Page } from '@playwright/test';

async function gotoAdmin(page: Page, hash: string) {
	await page.goto(`/wp-admin/admin.php?page=hatch${hash}`);
	await page.waitForSelector('#hatch-react-root .hatch-react');
}

async function clickSaveAndConfirm(page: Page) {
	const bar = page.locator('.hatch-save-bar');
	await expect(bar, 'save bar should appear after change').toBeVisible({ timeout: 3_000 });
	const saveBtn = page.locator('.hatch-save-bar button.hatch-sb-save');
	await expect(saveBtn).toBeVisible();
	await saveBtn.click();
	await expect(bar, 'save bar should flip to Saved').toContainText(/Saved/i, { timeout: 5_000 });
}

test.describe('User flow: every visible control round-trips', () => {
	test('toggle a Security toggle → Save → reload → persists', async ({ page }) => {
		await gotoAdmin(page, '#security');
		// Use the unique "Block unauthenticated REST API" toggle
		const row = page.locator('#hatch-react-root', { hasText: 'Block unauthenticated REST API' });
		const toggle = row.locator('[role="switch"]').first();
		const before = await toggle.getAttribute('aria-checked');
		await toggle.click();
		await clickSaveAndConfirm(page);
		// Reload
		await page.reload();
		await page.waitForSelector('#hatch-react-root .hatch-react');
		const row2 = page.locator('#hatch-react-root', { hasText: 'Block unauthenticated REST API' });
		const toggle2 = row2.locator('[role="switch"]').first();
		const after = await toggle2.getAttribute('aria-checked');
		expect(after, `toggle should have flipped from ${before} to opposite, got ${after}`).not.toBe(before);
		// Flip back to leave a clean fixture
		await toggle2.click();
		await clickSaveAndConfirm(page);
	});

	test('Design tab brand color change → Save → reload → persists', async ({ page }) => {
		await gotoAdmin(page, '#design');
		// Target the MONOSPACE text input (HxInp with mono prop), not the
		// native <input type="color"> color picker. The color picker's UI
		// flow doesn't trigger React onChange in a way fill() simulates.
		const hexInput = page.locator('#hatch-react-root input[type="text"]').filter({ hasText: '' }).filter(async (el, idx) => idx === 0);
		// Simpler: use the first text input whose current value starts with #
		const textHex = page.locator('#hatch-react-root input[type="text"]').filter({ has: page.locator('xpath=.[starts-with(@value, "#")]') }).first();
		// Fallback: walk all text inputs and pick the first one whose value starts with #
		const allTextInputs = page.locator('#hatch-react-root input:not([type="color"]):not([type="password"]):not([type="number"])');
		const count = await allTextInputs.count();
		let target = null;
		for (let i = 0; i < count; i++) {
			const v = await allTextInputs.nth(i).inputValue().catch(() => '');
			if (v.startsWith('#')) { target = allTextInputs.nth(i); break; }
		}
		expect(target, 'should find a hex text input').not.toBeNull();
		const sentinel = '#7f00ff';
		// Use pressSequentially to mimic a real keystroke. Playwright's fill()
		// can skip the React onChange dispatch on controlled inputs paired
		// with a sibling <input type="color">.
		await target!.click();
		await target!.fill('');
		await target!.pressSequentially(sentinel, { delay: 30 });
		await target!.blur();
		await clickSaveAndConfirm(page);
		await page.reload();
		await page.waitForSelector('#hatch-react-root .hatch-react');
		// Verify via boot state (most reliable)
		const brand = await page.evaluate(() => (window as any).hatchBoot?.state?.design?.brand);
		expect(brand?.primary, `brand.primary should be ${sentinel}, got ${JSON.stringify(brand)}`).toBe(sentinel);
	});

	test('GTM container ID input → Save → reload → persists', async ({ page }) => {
		await gotoAdmin(page, '#content');
		const sentinel = 'GTM-TEST00';
		const gtmInput = page.locator('#hatch-react-root input[placeholder*="GTM"]').first();
		await expect(gtmInput).toBeVisible({ timeout: 5_000 });
		await gtmInput.fill(sentinel);
		await gtmInput.blur();
		await clickSaveAndConfirm(page);
		await page.reload();
		await page.waitForSelector('#hatch-react-root .hatch-react');
		const after = await page.locator('#hatch-react-root input[placeholder*="GTM"]').first().inputValue();
		expect(after).toBe(sentinel);
		// Clean up
		await page.locator('#hatch-react-root input[placeholder*="GTM"]').first().fill('');
		await page.locator('#hatch-react-root input[placeholder*="GTM"]').first().blur();
		await clickSaveAndConfirm(page);
	});

	test('Performance Partytown toggle → Save → reload → persists', async ({ page }) => {
		await gotoAdmin(page, '#performance');
		const card = page.locator('#hatch-react-root', { hasText: 'Run analytics off the main thread' });
		const toggle = card.locator('[role="switch"]').first();
		const before = await toggle.getAttribute('aria-checked');
		await toggle.click();
		await clickSaveAndConfirm(page);
		await page.reload();
		await page.waitForSelector('#hatch-react-root .hatch-react');
		const card2 = page.locator('#hatch-react-root', { hasText: 'Run analytics off the main thread' });
		const toggle2 = card2.locator('[role="switch"]').first();
		const after = await toggle2.getAttribute('aria-checked');
		expect(after).not.toBe(before);
		await toggle2.click();
		await clickSaveAndConfirm(page);
	});

	test('Content tab Sitemap toggle → Save → reload → persists', async ({ page }) => {
		await gotoAdmin(page, '#content');
		const row = page.locator('#hatch-react-root', { hasText: 'XML sitemap' });
		const toggle = row.locator('[role="switch"]').first();
		const before = await toggle.getAttribute('aria-checked');
		await toggle.click();
		await clickSaveAndConfirm(page);
		await page.reload();
		await page.waitForSelector('#hatch-react-root .hatch-react');
		const row2 = page.locator('#hatch-react-root', { hasText: 'XML sitemap' });
		const toggle2 = row2.locator('[role="switch"]').first();
		const after = await toggle2.getAttribute('aria-checked');
		expect(after).not.toBe(before);
		await toggle2.click();
		await clickSaveAndConfirm(page);
	});

	test('Theme picker click → Save → reload → persists', async ({ page }) => {
		await gotoAdmin(page, '#design');
		const currentTheme = await page.evaluate(() => (window as any).hatchBoot?.state?.design?.theme || 'astropaper');
		const target = currentTheme === 'tech' ? 'blog' : 'tech';
		// Theme cards are rendered as <div onClick> with TP[t.id] svg inside.
		// Click the visible theme name text directly — Playwright clicks the
		// containing element with the handler.
		const targetName = target === 'blog' ? 'Blog' : 'Tech';
		// Find the theme card by its bold title text and click it (the bubble fires onClick on the parent div)
		const card = page.locator('#hatch-react-root').getByText(targetName, { exact: true }).first();
		await card.click();
		await clickSaveAndConfirm(page);
		await page.reload();
		await page.waitForSelector('#hatch-react-root .hatch-react');
		const theme = await page.evaluate(() => (window as any).hatchBoot?.state?.design?.theme);
		expect(theme, `theme should have changed from ${currentTheme} to ${target}, got ${theme}`).toBe(target);
	});

	test('Tab switch loses unsaved? Sanity: navigate after dirty', async ({ page }) => {
		await gotoAdmin(page, '#security');
		// Flip first toggle
		const toggle = page.locator('#hatch-react-root [role="switch"]').first();
		await toggle.click();
		// Save bar appears
		await expect(page.locator('.hatch-save-bar')).toBeVisible();
		// Switch tab WITHOUT saving — does state hold in-memory?
		await page.locator('#hatch-react-root button:has-text("Design")').first().click();
		await expect(page).toHaveURL(/#design$/);
		// Save bar should still be visible (dirty state preserved across tab switches)
		await expect(page.locator('.hatch-save-bar')).toBeVisible();
		// Click Save from anywhere
		await page.locator('.hatch-save-bar button.hatch-sb-save').click();
		await expect(page.locator('.hatch-save-bar')).toContainText(/Saved/i);
		// Discard and revert to clean state
		await page.locator('#hatch-react-root button:has-text("Security")').first().click();
		await page.waitForSelector('#hatch-react-root .hatch-react');
		await page.locator('#hatch-react-root [role="switch"]').first().click();
		await clickSaveAndConfirm(page);
	});
});
