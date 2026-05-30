/**
 * Hatch — theme screenshot harness.
 *
 * Loops the 6 Hatch themes, switches the active theme via direct DB write
 * (wp-cli isn't installed in the container), and takes a full-page
 * screenshot of the home page for each theme. Saves to /tmp/hatch-themes/.
 *
 * Usage:  node test/theme-screenshot.mjs
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const THEMES = ['blog', 'docs', 'tech', 'astronano', 'astropaper', 'astrowind'];
const WP_CONTAINER = 'qwp_wordpress';
const DB_CONTAINER = 'qwp_db';
const ASTRO = 'http://localhost:4321';

mkdirSync('/tmp/hatch-themes', { recursive: true });

function setTheme(name) {
	// Hatch reads `hatch_theme` from wp_options. Direct UPDATE is the fastest
	// path; wp-cli isn't bundled in the wordpress:latest image.
	const sql = `INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('hatch_theme', '${name}', 'yes') ON DUPLICATE KEY UPDATE option_value = '${name}';`;
	execSync(`docker exec ${DB_CONTAINER} mysql -uroot -proot wordpress -e "${sql}"`, { stdio: 'pipe' });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const results = [];
for (const theme of THEMES) {
	console.log(`→ ${theme}`);
	try {
		setTheme(theme);
		await page.goto(`${ASTRO}/?theme=${theme}&bust=${Date.now()}`, { waitUntil: 'networkidle', timeout: 30_000 });
		await page.waitForTimeout(1500);
		const out = `/tmp/hatch-themes/${theme}.png`;
		await page.screenshot({ path: out, fullPage: true });
		const themeApplied = await page.evaluate(() => document.documentElement.getAttribute('data-hatch-theme'));
		results.push({ theme, themeApplied, out });
	} catch (e) {
		results.push({ theme, error: String(e).slice(0, 200) });
	}
}

console.log('\n=== THEME SCREENSHOT REPORT ===');
console.table(results);
await browser.close();
