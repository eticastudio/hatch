// Actually click each dashboard tab (React SPA — URL ?tab= is ignored).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const WP = 'http://localhost:8810';
const USER = 'admin';
const PASS = 'hatchadmin';
const OUT = '/private/tmp/claude-501/-Users-adityasharma-Claude-Projects-Hatch/f572a5b3-6081-4283-807d-7f42d864af3f/scratchpad/demo-shots';
fs.mkdirSync(OUT, { recursive: true });

const tabs = ['Connection', 'Design', 'Content', 'Bridge', 'Performance', 'Security', 'Status'];
const errors = [];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Users/adityasharma/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (/favicon|__vite__|chrome-extension|hot-update/.test(u)) return;
    errors.push('reqfail: ' + u + ' :: ' + r.failure()?.errorText);
  });

  await page.goto(`${WP}/wp-login.php`);
  await page.fill('#user_login', USER);
  await page.fill('#user_pass', PASS);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('#wp-submit'),
  ]);

  await page.goto(`${WP}/wp-admin/admin.php?page=hatch`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  // Strip admin chrome
  await page.evaluate(() => {
    document.getElementById('adminmenumain')?.remove();
    document.getElementById('wpadminbar')?.remove();
    const c = document.getElementById('wpcontent');
    if (c) c.style.marginLeft = '0';
    const w = document.getElementById('wpwrap');
    if (w) w.style.paddingTop = '0';
    document.querySelectorAll('.notice, #message, .update-nag').forEach(n => n.remove());
  });
  await page.waitForTimeout(200);

  for (const tabName of tabs) {
    try {
      // Click the tab by visible text
      const clicked = await page.evaluate((name) => {
        // React admin renders tabs as buttons or links
        const els = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
        const target = els.find(el => el.textContent && el.textContent.trim() === name);
        if (target) { target.click(); return true; }
        return false;
      }, tabName);
      if (!clicked) {
        errors.push('tab-not-found: ' + tabName);
        continue;
      }
      await page.waitForTimeout(700);
      const filename = `02b-dash-${tabName.toLowerCase()}.png`;
      await page.screenshot({ path: path.join(OUT, filename), fullPage: true });
      console.log('  saved', filename);

      // Extract text content to identify each tab
      const heading = await page.evaluate(() => {
        // Look for the first big heading beyond the sidebar
        const h = document.querySelector('main h2, main h1, [class*="hx-"] h1, [class*="hx-"] h2');
        return h ? h.textContent.trim() : null;
      });
      errors.push(`TAB_HEADING [${tabName}]: ${heading}`);
    } catch (e) {
      errors.push('tab-error ' + tabName + ': ' + e.message);
    }
  }

  fs.writeFileSync(path.join(OUT, '_dash_errors.json'), JSON.stringify(errors, null, 2));
  console.log('DONE');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
