/**
 * Take a real screenshot of the Astro home page (after JS hydration) so we
 * can see whether the Hatch blocks render as a polished design or as
 * unstyled markup. Also collects: how many posts the Posts block
 * actually rendered, how many accordion items are present, console errors.
 */
const { test, chromium } = require('@playwright/test');
const fs = require('fs');

test('home page renders + hydrates Hatch blocks', async () => {
	const browser = await chromium.launch();
	const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, bypassCSP: false });
	const page = await ctx.newPage();
	const consoleErrors = [];
	const networkFailures = [];
	page.on('console', (m) => {
		if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 240));
		if (m.text().includes('[hatch]')) console.log('  →', m.text().slice(0, 200));
	});
	page.on('response', (r) => { if (r.url().includes('/wp-json/')) console.log('  fetch', r.status(), r.url()); });

	await page.goto(`http://localhost:4321/?bust=${Date.now()}`, { waitUntil: 'networkidle', timeout: 30_000 });
	const ctxInfo = await page.evaluate(() => ({
		HATCH_WP_BASE: window.HATCH_WP_BASE,
		featuresSite: window.HATCH_FEATURES_DEBUG || null,
	}));
	console.log('Context:', JSON.stringify(ctxInfo));
	const direct = await page.evaluate(async () => {
		try {
			const wpBase = window.HATCH_WP_BASE || '';
			const r = await fetch(`${wpBase}/wp-json/hatch/v1/content/list?per_page=3`);
			const j = await r.json();
			return { status: r.status, items: (j.items || []).length };
		} catch (e) { return { error: String(e) }; }
	});
	console.log('Direct fetch via HATCH_WP_BASE:', JSON.stringify(direct));
	await page.waitForTimeout(3000); // wait for runtime to fetch posts

	const info = await page.evaluate(() => {
		const q = (s) => document.querySelectorAll(s);
		return {
			postsBlock: q('[data-hatch-posts]').length,
			postsRendered: q('[data-hatch-posts] .hatch-post-card').length,
			accordion: q('.hatch-accordion-item').length,
			cover: q('.hatch-cover').length,
			columns: q('.hatch-columns').length,
			groups: q('.hatch-group').length,
			headings: q('.hatch-heading').length,
			paragraphs: q('.hatch-paragraph').length,
			pageHeight: document.documentElement.scrollHeight,
		};
	});

	fs.mkdirSync('/tmp/hatch-screenshots', { recursive: true });
	await page.screenshot({ path: '/tmp/hatch-screenshots/home-full.png', fullPage: true });
	await page.screenshot({ path: '/tmp/hatch-screenshots/home-top.png' });

	console.log('=== HOME RENDER REPORT ===');
	console.log(JSON.stringify(info, null, 2));
	if (consoleErrors.length) {
		console.log('Console errors:');
		consoleErrors.slice(0, 5).forEach((e) => console.log(' ', e));
	} else {
		console.log('No console errors.');
	}
	console.log('Screenshots: /tmp/hatch-screenshots/home-full.png + home-top.png');

	await browser.close();
});
