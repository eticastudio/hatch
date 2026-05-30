/**
 * Block smoke test — opens the WP editor, inserts each Hatch block, captures
 * any "block invalid" / React errors / console errors. Saves a JSON report.
 *
 * Run: cd test && npx playwright test e2e/_blocks-smoke.spec.js --reporter=line
 */
const { test, chromium } = require('@playwright/test');
const fs = require('fs');
const { execSync } = require('child_process');

const BLOCKS = [
	'hatch/section', 'hatch/container', 'hatch/heading', 'hatch/paragraph',
	'hatch/button', 'hatch/image', 'hatch/hero', 'hatch/custom-code',
	'hatch/spacer', 'hatch/divider', 'hatch/group', 'hatch/columns',
	'hatch/list', 'hatch/quote',
	'hatch/youtube', 'hatch/video', 'hatch/gallery', 'hatch/cover', 'hatch/embed',
	'hatch/tabs', 'hatch/accordion', 'hatch/table', 'hatch/form', 'hatch/search',
	'hatch/posts', 'hatch/smart',
];

test.setTimeout(360_000);

test('every Hatch block inserts cleanly in the editor', async () => {
	const browser = await chromium.launch();
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	const findings = [];
	const consoleErrors = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
	});

	// Login
	await page.goto('http://localhost:8810/wp-login.php');
	await page.getByLabel('Username or Email Address').fill('admin');
	await page.getByLabel('Password', { exact: true }).fill('hatch-test-2026');
	await page.getByRole('button', { name: 'Log In' }).click();
	await page.waitForURL(/wp-admin/);

	for (const slug of BLOCKS) {
		const errorsBefore = consoleErrors.length;
		// Create a fresh post
		await page.goto('http://localhost:8810/wp-admin/post-new.php');
		await page.waitForLoadState('domcontentloaded');
		// Dismiss welcome guide / sidebar nags
		await page.evaluate(() => {
			if (window.wp?.data?.dispatch) {
				try { window.wp.data.dispatch('core/edit-post').toggleFeature('welcomeGuide'); } catch (e) {}
				try { window.wp.data.dispatch('core/preferences').set('core/edit-post', 'welcomeGuide', false); } catch (e) {}
			}
		}).catch(() => {});
		// Insert the block via the wp.data API directly — bypasses inserter UI quirks
		const inserted = await page.evaluate(async (s) => {
			try {
				const { dispatch, select } = window.wp.data;
				const { createBlock } = window.wp.blocks;
				const b = createBlock(s);
				dispatch('core/block-editor').insertBlocks([b]);
				await new Promise((r) => setTimeout(r, 200));
				const blocks = select('core/block-editor').getBlocks();
				const found = blocks.find((bb) => bb.name === s);
				if (!found) return { ok: false, reason: 'not in store' };
				const isValid = found.isValid !== false;
				return { ok: isValid, clientId: found.clientId, attrs: Object.keys(found.attributes || {}).length };
			} catch (e) { return { ok: false, reason: String(e && e.message || e).slice(0, 200) }; }
		}, slug);
		const newErrors = consoleErrors.slice(errorsBefore);
		findings.push({
			block: slug,
			inserted: inserted.ok === true,
			reason: inserted.reason || '',
			attrs: inserted.attrs || 0,
			consoleErrors: newErrors.filter((e) => !e.includes('Failed to load resource')).slice(0, 3),
		});
	}

	const clean = findings.filter((f) => f.inserted && f.consoleErrors.length === 0).length;
	const broken = findings.filter((f) => !f.inserted || f.consoleErrors.length > 0);
	const report = { total: BLOCKS.length, clean, broken: broken.length, findings };
	fs.writeFileSync('/tmp/hatch-blocks-smoke.json', JSON.stringify(report, null, 2));
	console.log('=== SMOKE REPORT ===');
	console.log(`Clean: ${ clean } / ${ BLOCKS.length }`);
	if (broken.length) {
		console.log('Broken:');
		for (const f of broken) {
			console.log(`  ✗ ${ f.block } — ${ f.reason || 'console errors' }`);
			f.consoleErrors.forEach((e) => console.log(`     ${ e }`));
		}
	}
	await browser.close();
});
