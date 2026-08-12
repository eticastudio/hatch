/**
 * Hatch · Theme polish verification driver (2026-08-12)
 *
 * Screenshots + assertions across 3 themes x 2 modes x 4 routes = 24 shots.
 * Assumes an Astro dev server is already running (default port from `npm run dev`).
 *
 * Playwright is installed in the local scratch dir since the project's
 * astro-starter does not carry Playwright as a dep. Adjust PW_ROOT if needed.
 *
 * Themes switch via the `data-hatch-theme` attribute on <html>, which
 * PageLayout.astro sets from features.theme. For local browser-side flip
 * without a fresh SSR request, we mutate the attribute directly plus set
 * `data-hatch-mode` for the color mode. This exercises the CSS surface
 * exactly as a real theme swap would.
 */

import { chromium } from '/private/tmp/claude-501/-Users-adityasharma-Claude-Projects-Hatch/f572a5b3-6081-4283-807d-7f42d864af3f/scratchpad/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.HATCH_BASE || 'http://localhost:4322';
const OUT_DIR = '/Users/adityasharma/Claude Projects/Hatch/docs/screenshots/theme-polish';
const THEMES = ['blog', 'tech', 'docs'];
const MODES = ['light', 'dark'];
const ROUTES = [
	{ url: '/',                            slug: 'home' },
	{ url: '/blog',                        slug: 'blog' },
	{ url: '/shop',                        slug: 'shop' },
	{ url: '/product/timber-cutting-board', slug: 'product' },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

function slugRoute(s) { return s.replace(/[^a-z0-9-]/gi, '-'); }

async function run() {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1280, height: 900 },
	});
	const summary = [];

	for (const theme of THEMES) {
		for (const mode of MODES) {
			for (const route of ROUTES) {
				const page = await context.newPage();
				const consoleErrors = [];
				page.on('pageerror', e => consoleErrors.push(String(e.message)));
				page.on('console', msg => {
					if (msg.type() === 'error') consoleErrors.push(msg.text());
				});

				let hScrollOk = null;
				let darkLuma = null;
				let focusRingOk = null;
				let loadError = null;

				try {
					await page.goto(BASE + route.url, { waitUntil: 'networkidle', timeout: 20000 });

					// Force theme + mode on the client. PageLayout writes both attrs;
					// the CSS listens to attribute selectors so the flip is instant.
					await page.evaluate(({ t, m }) => {
						document.documentElement.setAttribute('data-hatch-theme', t);
						document.documentElement.setAttribute('data-hatch-mode', m);
					}, { t: theme, m: mode });
					// Small settle for any transitions.
					await page.waitForTimeout(250);

					const shotName = `${theme}-${mode}-${slugRoute(route.slug)}.png`;
					await page.screenshot({
						path: path.join(OUT_DIR, shotName),
						fullPage: true,
					});

					// Horizontal-scroll assertion.
					const dims = await page.evaluate(() => ({
						sw: document.documentElement.scrollWidth,
						iw: window.innerWidth,
					}));
					hScrollOk = dims.sw <= dims.iw + 2;

					// Dark-mode luminance assertion.
					if (mode === 'dark') {
						darkLuma = await page.evaluate(() => {
							const cs = getComputedStyle(document.body);
							const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
							if (!m) return null;
							const [r, g, b] = m[1].split(',').map(v => parseFloat(v) / 255);
							const toLin = v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
							return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
						});
					}

					// Focus-ring assertion on first header anchor.
					focusRingOk = await page.evaluate(() => {
						const a = document.querySelector('header a, .hatch-header a');
						if (!a) return null;
						a.focus();
						const cs = getComputedStyle(a);
						// Focus-visible pseudo state isn't always reported via getComputedStyle
						// for outline, so accept either outline width > 0 or a box-shadow ring.
						const ow = parseFloat(cs.outlineWidth || '0');
						const hasShadowRing = cs.boxShadow && cs.boxShadow !== 'none';
						return ow >= 1 || hasShadowRing;
					});
				} catch (err) {
					loadError = String(err.message).slice(0, 200);
				}

				const row = { theme, mode, route: route.url, consoleErrors: consoleErrors.length, hScrollOk, darkLuma, focusRingOk, loadError };
				summary.push(row);
				console.log(JSON.stringify(row));

				await page.close();
			}
		}
	}

	await browser.close();

	// Emit an aggregated tail for the commit message.
	console.log('---SUMMARY---');
	console.log(JSON.stringify(summary, null, 2));
}

run().catch(e => { console.error('DRIVER_FAIL', e); process.exit(1); });
