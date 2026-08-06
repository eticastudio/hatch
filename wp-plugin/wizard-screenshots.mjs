// Capture the 3 setup wizard steps at 1440x900 (full page).
// Runs headlessly against http://localhost:8810 with the admin session
// signed in via cookie form-login.

import { chromium } from 'playwright';
// Force a browser installed on this machine (1228 for the tests dir).
// Playwright's project-local browser lookup asks for 1223; we have 1228.
process.env.PLAYWRIGHT_BROWSERS_PATH = '/Users/adityasharma/Library/Caches/ms-playwright';
import fs from 'node:fs';

const SITE = 'http://localhost:8810';
const USER = 'admin';
const PASS = 'hatchadmin';
const OUT_DIR = '/private/tmp/claude-501/-Users-adityasharma-Claude-Projects-Hatch/f572a5b3-6081-4283-807d-7f42d864af3f/scratchpad';

const STEPS = [
	{ url: `${SITE}/wp-admin/admin.php?page=hatch-setup&step=1`, out: `${OUT_DIR}/wizard-step1-welcome.png` },
	{ url: `${SITE}/wp-admin/admin.php?page=hatch-setup&step=2`, out: `${OUT_DIR}/wizard-step2-theme.png` },
	{ url: `${SITE}/wp-admin/admin.php?page=hatch-setup&step=3`, out: `${OUT_DIR}/wizard-step3-deploy.png` },
];

(async () => {
	const browser = await chromium.launch({ headless: true });
	const ctx = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});
	const page = await ctx.newPage();

	// Log in via wp-login.php
	await page.goto(`${SITE}/wp-login.php`);
	await page.fill('#user_login', USER);
	await page.fill('#user_pass', PASS);
	await Promise.all([
		page.waitForNavigation({ waitUntil: 'networkidle' }),
		page.click('#wp-submit'),
	]);

	for (const s of STEPS) {
		await page.goto(s.url, { waitUntil: 'networkidle' });
		// Small settle wait for React
		await page.waitForTimeout(400);
		// Strip WP admin chrome so the wizard is the whole frame.
		await page.evaluate(() => {
			document.getElementById('adminmenumain')?.remove();
			document.getElementById('wpadminbar')?.remove();
			const c = document.getElementById('wpcontent');
			if (c) c.style.marginLeft = '0';
			const w = document.getElementById('wpwrap');
			if (w) w.style.paddingTop = '0';
			document.body.style.background = 'var(--hx-bg, #fff)';
			document.querySelectorAll('.notice, #message, .notice-warning, .notice-error, .notice-info, .notice-success').forEach(n => n.remove());
		});
		await page.waitForTimeout(200);
		await page.screenshot({ path: s.out, fullPage: true });
		console.log('Saved', s.out);
	}

	await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
