/**
 * Save + reload test — does each block survive a save and editor refresh
 * without triggering the "block contains unexpected or invalid content"
 * recovery banner? This is the actual user-facing failure mode.
 *
 * Strategy:
 *  1. Create a post with all 26 blocks via wp.data + save.
 *  2. Reload the editor.
 *  3. For each block, check the block store still reports isValid !== false.
 */
const { test, chromium } = require('@playwright/test');
const fs = require('fs');

const BLOCKS = [
	'hatch/section', 'hatch/container', 'hatch/heading', 'hatch/paragraph',
	'hatch/button', 'hatch/image', 'hatch/hero', 'hatch/custom-code',
	'hatch/spacer', 'hatch/divider', 'hatch/group', 'hatch/columns',
	'hatch/list', 'hatch/quote',
	'hatch/youtube', 'hatch/video', 'hatch/gallery', 'hatch/cover', 'hatch/embed',
	'hatch/tabs', 'hatch/accordion', 'hatch/table', 'hatch/form', 'hatch/search',
	'hatch/posts', 'hatch/smart',
];

test.setTimeout(420_000);

test('save + reload preserves block validity', async () => {
	const browser = await chromium.launch();
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	const consoleErrors = [];
	page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200)); });

	// Login
	await page.goto('http://localhost:8810/wp-login.php');
	await page.getByLabel('Username or Email Address').fill('admin');
	await page.getByLabel('Password', { exact: true }).fill('hatch-test-2026');
	await page.getByRole('button', { name: 'Log In' }).click();
	await page.waitForURL(/wp-admin/);

	// Create a new post + insert all 26 blocks
	await page.goto('http://localhost:8810/wp-admin/post-new.php');
	await page.waitForLoadState('domcontentloaded');
	await page.evaluate(() => {
		if (window.wp?.data?.dispatch) {
			try { window.wp.data.dispatch('core/preferences').set('core/edit-post', 'welcomeGuide', false); } catch (e) {}
		}
	}).catch(() => {});

	const postId = await page.evaluate(async (slugs) => {
		const { dispatch, select } = window.wp.data;
		const { createBlock } = window.wp.blocks;
		await dispatch('core/editor').editPost({ title: 'Hatch blocks save+reload test' });
		const blocks = slugs.map((s) => createBlock(s));
		dispatch('core/block-editor').insertBlocks(blocks);
		await new Promise((r) => setTimeout(r, 1500));
		await dispatch('core/editor').savePost();
		await new Promise((r) => setTimeout(r, 2500));
		return select('core/editor').getCurrentPostId();
	}, BLOCKS);

	if (!postId) {
		console.log('=== SAVE FAILED — no post ID after save ===');
		await browser.close();
		throw new Error('Post did not save');
	}
	console.log('saved post id:', postId);

	// Reload the editor for that post
	await page.goto(`http://localhost:8810/wp-admin/post.php?post=${ postId }&action=edit`);
	await page.waitForLoadState('domcontentloaded');
	await page.waitForFunction(() => window.wp?.data?.select?.('core/block-editor')?.getBlocks?.().length > 0, { timeout: 30_000 });

	// Inspect each block's validity after reload
	const findings = await page.evaluate((slugs) => {
		const { select } = window.wp.data;
		const out = [];
		const seen = select('core/block-editor').getBlocks();
		const byName = Object.fromEntries(seen.map((b) => [b.name, b]));
		for (const s of slugs) {
			const b = byName[s];
			if (!b) { out.push({ slug: s, present: false }); continue; }
			out.push({ slug: s, present: true, isValid: b.isValid !== false, validationIssues: b.validationIssues || null });
		}
		return out;
	}, BLOCKS);

	const clean = findings.filter((f) => f.present && f.isValid).length;
	const missing = findings.filter((f) => !f.present);
	const invalid = findings.filter((f) => f.present && !f.isValid);
	const report = { total: BLOCKS.length, clean, missing: missing.length, invalid: invalid.length, findings, postId };
	fs.writeFileSync('/tmp/hatch-save-reload.json', JSON.stringify(report, null, 2));
	console.log(`Clean after save+reload: ${ clean } / ${ BLOCKS.length }`);
	if (missing.length) {
		console.log('Missing after reload:');
		for (const m of missing) console.log('  ✗', m.slug);
	}
	if (invalid.length) {
		console.log('INVALID after reload:');
		for (const m of invalid) console.log('  ✗', m.slug, m.validationIssues);
	}
	await browser.close();
});
