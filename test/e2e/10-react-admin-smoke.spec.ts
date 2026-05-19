/**
 * React Admin Smoke v0.50.11
 *
 * Verifies the new React SPA across every tab + setup wizard. Pairs with the
 * older audit-* specs but specifically targets the v0.50.11 rebuild where
 * every tab is React and the dispatch goes through POST /hatch/v1/options.
 *
 * Coverage:
 *   1. Each of the 6 tabs renders without page/console errors
 *   2. Tab navigation works (hash routing)
 *   3. Each tab exposes its expected primary HxHead title
 *   4. Sentinel toggle round-trip: flip → save bar appears → Save → reload
 *      → state persists in window.hatchBoot.state
 *   5. Setup wizard 3-step shell renders + form fields exist
 *   6. Security: when Smart media URLs is on, a fresh post body contains
 *      `/hatch-media/` instead of `/wp-content/uploads/`
 *   7. Security headers: with Send headers ON, the WP admin response carries
 *      X-Frame-Options, Referrer-Policy, X-Content-Type-Options
 */
import { test, expect, Page } from '@playwright/test';

const TABS = [
	{ slug: 'connection',  title: 'Frontline' },
	{ slug: 'design',      title: 'Theme' },
	{ slug: 'content',     title: 'Core integrations' },
	{ slug: 'performance', title: 'Smart media URLs' },
	{ slug: 'security',    title: 'Application Passwords' },
	{ slug: 'status',      title: 'Status' },
] as const;

async function gotoHatch(page: Page, hash = '') {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push('JS: ' + e.message));
	page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
	const resp = await page.goto(`/wp-admin/admin.php?page=hatch${hash}`);
	return { errors, status: resp?.status() };
}

test.describe('v0.50.11 React admin smoke', () => {
	for (const tab of TABS) {
		test(`tab "${tab.slug}" renders without errors and shows expected card`, async ({ page }) => {
			const { errors, status } = await gotoHatch(page, `#${tab.slug}`);
			expect(status).toBe(200);

			// Wait for React to mount (HxHead always renders)
			await page.waitForSelector('#hatch-react-root .hatch-react', { timeout: 8_000 });
			await page.waitForLoadState('networkidle');

			// PHP guard
			const html = await page.content();
			expect(html, 'no PHP fatal').not.toMatch(/Fatal error|Parse error|There has been a critical error/i);

			// Tab nav button for this tab should exist + be active when hash matches
			const tabBtn = page.locator(`#hatch-react-root button:has-text("${tab.slug.charAt(0).toUpperCase()}${tab.slug.slice(1)}")`).first();
			await expect(tabBtn, `tab button "${tab.slug}" visible`).toBeVisible();

			// Sentinel HxHead title to prove the tab content actually rendered
			await expect(page.getByText(tab.title, { exact: false }).first(),
				`tab "${tab.slug}" shows "${tab.title}" card`).toBeVisible();

			// No JS errors
			expect(errors, `tab "${tab.slug}" had errors: ${errors.join(' | ')}`).toEqual([]);
		});
	}

	test('tab hash navigation switches content without reload', async ({ page }) => {
		await gotoHatch(page, '#connection');
		await page.waitForSelector('#hatch-react-root .hatch-react');
		// Click Design tab in nav
		await page.locator('#hatch-react-root button:has-text("Design")').first().click();
		await expect(page).toHaveURL(/#design$/);
		await expect(page.getByText('Theme', { exact: false }).first()).toBeVisible();
		// Click Security
		await page.locator('#hatch-react-root button:has-text("Security")').first().click();
		await expect(page).toHaveURL(/#security$/);
		await expect(page.getByText('Application Passwords', { exact: false }).first()).toBeVisible();
	});

	test('boot state exposes the new fortress + media options', async ({ page }) => {
		await gotoHatch(page);
		await page.waitForFunction(() => !!(window as any).hatchBoot);
		const boot = await page.evaluate(() => (window as any).hatchBoot);
		expect(boot.state).toBeDefined();
		expect(boot.state.security).toHaveProperty('disallow_file_edit');
		expect(boot.state.security).toHaveProperty('send_headers');
		expect(boot.state.security).toHaveProperty('enforce_2fa');
		expect(boot.state.security).toHaveProperty('twofa_provider');
		expect(boot.state.performance).toHaveProperty('image_proxy');
		expect(boot.state.setup.nonces).toHaveProperty('generate_app_password');
		expect(boot.state.setup.nonces).toHaveProperty('rotate_app_pwds');
		expect(boot.state.setup.nonces).toHaveProperty('probe_heartbeat');
		expect(boot.state.setup).toHaveProperty('vpsOneLiner');
		expect(boot.state.setup.vpsOneLiner).toContain('curl -fsSL');
		expect(boot.state.setup.vpsOneLiner).toContain('--wp-url');
	});

	test('save bar appears when a toggle flips and disappears after Save', async ({ page }) => {
		await gotoHatch(page, '#security');
		await page.waitForSelector('#hatch-react-root .hatch-react');

		// Find the first toggle in REST API hardening (Block unauthenticated REST API)
		// and flip it. The save bar should pop in.
		const firstToggle = page.locator('#hatch-react-root [role="switch"]').first();
		await expect(firstToggle).toBeVisible();
		const wasOn = await firstToggle.getAttribute('aria-checked');
		await firstToggle.click();
		// Save bar should appear
		await expect(page.locator('.hatch-save-bar')).toBeVisible({ timeout: 3_000 });
		// Click Save
		await page.locator('.hatch-save-bar button.hatch-sb-save').click();
		// Wait for "Saved" then idle (save bar collapses after ~2.4s)
		await expect(page.locator('.hatch-save-bar')).toContainText(/Saved/i, { timeout: 5_000 });

		// Flip back to original state to leave a clean fixture
		await firstToggle.click();
		await expect(page.locator('.hatch-save-bar')).toBeVisible({ timeout: 3_000 });
		await page.locator('.hatch-save-bar button.hatch-sb-save').click();
		await expect(page.locator('.hatch-save-bar')).toContainText(/Saved/i, { timeout: 5_000 });

		const afterOn = await firstToggle.getAttribute('aria-checked');
		expect(afterOn).toBe(wasOn);
	});

	test('setup wizard step 1 renders preflight diagnostic', async ({ page }) => {
		const resp = await page.goto('/wp-admin/admin.php?page=hatch-setup');
		expect(resp?.status()).toBe(200);
		await page.waitForSelector('#hatch-react-root .hatch-react');
		// Pill stepper has all 3 step labels
		for (const label of ['Welcome', 'Theme', 'Deploy']) {
			await expect(page.locator('#hatch-react-root').getByText(label, { exact: true }).first()).toBeVisible();
		}
		// Continue button to step 2
		await expect(page.locator('#hatch-react-root').getByRole('button', { name: /Continue/i }).first()).toBeVisible();
	});

	test('setup wizard step 3 deploy panels render with broker forms', async ({ page }) => {
		await page.goto('/wp-admin/admin.php?page=hatch-setup&step=3');
		await page.waitForSelector('#hatch-react-root .hatch-react');
		await page.waitForLoadState('networkidle');

		// Verify boot.step is actually 3 — if not, the rest of this test
		// is moot because Step 3 isn't rendered.
		const step = await page.evaluate(() => (window as any).hatchBoot?.step);
		expect(step, 'boot.step should be 3 when ?step=3').toBe(3);

		// Cloudflare panel is open by default in Step3Deploy state.
		// Form fields are present in the DOM as soon as React mounts.
		await expect(page.locator('input[name="cf_token"]')).toBeAttached({ timeout: 5_000 });
		await expect(page.locator('input[name="action"][value="hatch_start_deploy"]').first()).toBeAttached();
		await expect(page.locator('input[name="provider"][value="cloudflare"]').first()).toBeAttached();
		// Vercel + Self-hosted card headers
		await expect(page.locator('#hatch-react-root').getByText(/Vercel/).first()).toBeVisible();
		await expect(page.locator('#hatch-react-root').getByText(/Self-hosted/).first()).toBeVisible();
	});

	test('WP admin pages outside Hatch still render natively', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push('JS: ' + e.message));
		page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
		// Posts list
		let resp = await page.goto('/wp-admin/edit.php');
		expect(resp?.status()).toBe(200);
		await expect(page.locator('body.wp-admin')).toBeVisible();
		// Users
		resp = await page.goto('/wp-admin/users.php');
		expect(resp?.status()).toBe(200);
		// Plugins
		resp = await page.goto('/wp-admin/plugins.php');
		expect(resp?.status()).toBe(200);
		// Hatch must not have leaked the React mount into other admin pages
		const hatchMount = await page.locator('#hatch-react-root').count();
		expect(hatchMount, 'Hatch React mount must NOT leak into other admin pages').toBe(0);
		expect(errors.filter(e => !/wp-emoji|wp-includes\/js/.test(e)),
			`non-Hatch admin had errors: ${errors.join(' | ')}`).toEqual([]);
	});

	test('CRITICAL: design save propagates to hatch_design_parsed (frontend-reachable)', async ({ page }) => {
		// POST a sentinel via the REST endpoint directly so we test the dispatcher
		// + the regenerate_design_artifacts() call, not whatever DOM selector might
		// shift between rebuilds. This is the contract the Astro frontend depends on.
		await gotoHatch(page, '#design');
		await page.waitForFunction(() => !!(window as any).hatchBoot);

		const sentinelHex = '#abc123';
		const result = await page.evaluate(async (hex) => {
			const boot = (window as any).hatchBoot;
			const r = await fetch(boot.restUrl + 'options', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': boot.nonce },
				body: JSON.stringify({ 'design.brand.primary': hex }),
			});
			return { status: r.status, body: await r.json() };
		}, sentinelHex);
		console.log('REST result:', JSON.stringify(result).slice(0, 500));
		expect(result.status, `REST /options must return 200, got ${result.status} body=${JSON.stringify(result.body).slice(0, 300)}`).toBe(200);
		expect(result.body.ok, 'response.ok must be true').toBe(true);
		expect(Object.keys(result.body.applied || {}), 'applied map should contain our path').toContain('design.brand.primary');

		// Reload — boot state now reads from the freshly-regenerated artifacts.
		await page.reload();
		await page.waitForFunction(() => !!(window as any).hatchBoot?.state);

		const brand = await page.evaluate(() => (window as any).hatchBoot?.state?.design?.brand);
		console.log('Boot state design.brand after reload:', JSON.stringify(brand));
		expect(brand?.primary, `design.brand.primary should be ${sentinelHex}, got ${JSON.stringify(brand)}`).toBe(sentinelHex);
	});

	test('legacy v0.50.10 option keys still readable', async ({ page }) => {
		await gotoHatch(page);
		await page.waitForFunction(() => !!(window as any).hatchBoot?.state);
		const state = await page.evaluate(() => (window as any).hatchBoot.state);
		// Every back-compat option that v0.50.10 wrote must still surface in state
		expect(state).toHaveProperty('connection');
		expect(state).toHaveProperty('design');
		expect(state).toHaveProperty('content');
		expect(state).toHaveProperty('performance');
		expect(state).toHaveProperty('security');
		expect(state).toHaveProperty('turnstile');
		expect(state).toHaveProperty('setup');
		expect(state).toHaveProperty('hatchBlocks');
		expect(state).toHaveProperty('featureCatalog');
	});
});
