// Comprehensive interactive walk for demo verification.
// Captures admin wizard, admin dashboard tabs, and every public URL
// in both light + dark modes. Also captures console errors per page.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const WP = 'http://localhost:8810';
const FE = 'http://localhost:4321';
const USER = 'admin';
const PASS = 'hatchadmin';
const OUT = '/private/tmp/claude-501/-Users-adityasharma-Claude-Projects-Hatch/f572a5b3-6081-4283-807d-7f42d864af3f/scratchpad/demo-shots';
fs.mkdirSync(OUT, { recursive: true });

const errors = {};
const results = [];

async function shot(page, filename, opts = {}) {
  const p = path.join(OUT, filename);
  await page.screenshot({ path: p, fullPage: opts.fullPage !== false });
  const rec = { url: page.url(), file: p };
  results.push(rec);
  console.log('  saved', filename);
  return p;
}

function bindConsole(page, tag) {
  errors[tag] = [];
  page.on('pageerror', (e) => errors[tag].push('pageerror: ' + e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors[tag].push('console.error: ' + msg.text());
  });
  page.on('requestfailed', (req) => {
    // Ignore favicon 404s and DevTools noise
    const u = req.url();
    if (/favicon|__vite__|chrome-extension|hot-update/.test(u)) return;
    errors[tag].push('reqfail: ' + u + ' :: ' + req.failure()?.errorText);
  });
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Users/adityasharma/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
  });
  const page = await ctx.newPage();
  bindConsole(page, 'admin');

  // --- LOGIN ---
  console.log('== login ==');
  await page.goto(`${WP}/wp-login.php`);
  await page.fill('#user_login', USER);
  await page.fill('#user_pass', PASS);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('#wp-submit'),
  ]);

  // Helper to strip admin chrome for hero shots
  const stripAdminChrome = async () => {
    await page.evaluate(() => {
      document.getElementById('adminmenumain')?.remove();
      document.getElementById('wpadminbar')?.remove();
      const c = document.getElementById('wpcontent');
      if (c) c.style.marginLeft = '0';
      const w = document.getElementById('wpwrap');
      if (w) w.style.paddingTop = '0';
      document.querySelectorAll('.notice, #message, .notice-warning, .notice-error, .notice-info, .notice-success, .update-nag').forEach(n => n.remove());
    });
    await page.waitForTimeout(200);
  };

  // --- WIZARD STEPS 1, 2, 3 ---
  console.log('== wizard ==');
  for (const step of [1, 2, 3]) {
    await page.goto(`${WP}/wp-admin/admin.php?page=hatch-setup&step=${step}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await stripAdminChrome();
    await shot(page, `01-wizard-step${step}.png`);
  }

  // --- DASHBOARD TABS: 7 tabs, screenshot each ---
  console.log('== dashboard tabs ==');
  const tabs = ['connection', 'design', 'content', 'bridge', 'performance', 'security', 'status'];
  for (const tab of tabs) {
    try {
      await page.goto(`${WP}/wp-admin/admin.php?page=hatch&tab=${tab}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1500);
      await stripAdminChrome();
      await shot(page, `02-dash-${tab}.png`);
    } catch (e) {
      errors['admin'].push('tab-fail ' + tab + ': ' + e.message);
    }
  }

  // --- Frontend walk LIGHT ---
  console.log('== frontend light ==');
  const fePage = await ctx.newPage();
  bindConsole(fePage, 'fe-light');
  await fePage.emulateMedia({ colorScheme: 'light' });
  const routes = [
    ['home', '/'],
    ['blog-list', '/blog/'],
    ['blog-canary', '/blog/canary-all-core-blocks/'],
    ['about', '/about/'],
    ['contact', '/contact/'],
    ['privacy', '/privacy-policy/'],
    ['terms', '/terms-of-service/'],
  ];
  for (const [name, url] of routes) {
    try {
      await fePage.goto(FE + url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await fePage.waitForTimeout(800);
      await shot(fePage, `03-light-${name}.png`);
    } catch (e) {
      errors['fe-light'].push('nav-fail ' + url + ': ' + e.message);
    }
  }

  // Try category page (find first category link on /blog/)
  try {
    await fePage.goto(FE + '/blog/', { waitUntil: 'domcontentloaded' });
    await fePage.waitForTimeout(500);
    const catHref = await fePage.evaluate(() => {
      const a = document.querySelector('a[href^="/blog/category/"]');
      return a ? a.getAttribute('href') : null;
    });
    if (catHref) {
      await fePage.goto(FE + catHref, { waitUntil: 'domcontentloaded' });
      await fePage.waitForTimeout(300);
      await shot(fePage, '03-light-category.png');
      // grab the H1 font-family for validation
      const h1Font = await fePage.evaluate(() => {
        const h1 = document.querySelector('h1');
        return h1 ? getComputedStyle(h1).fontFamily : null;
      });
      errors['fe-light'].push('CATEGORY_H1_FONT: ' + h1Font + ' :: url=' + catHref);
    } else {
      errors['fe-light'].push('no category link found on /blog/');
    }
  } catch (e) {
    errors['fe-light'].push('category-check-fail: ' + e.message);
  }

  // --- Frontend walk DARK ---
  console.log('== frontend dark ==');
  await fePage.emulateMedia({ colorScheme: 'dark' });
  // also toggle localStorage flag if the site respects it
  await fePage.addInitScript(() => {
    try { localStorage.setItem('hatch-theme', 'dark'); } catch (e) {}
  });
  for (const [name, url] of [['home', '/'], ['blog-list', '/blog/'], ['blog-canary', '/blog/canary-all-core-blocks/']]) {
    try {
      await fePage.goto(FE + url, { waitUntil: 'domcontentloaded' });
      await fePage.waitForTimeout(400);
      await shot(fePage, `04-dark-${name}.png`);
    } catch (e) {
      errors['fe-light'].push('dark nav-fail ' + url + ': ' + e.message);
    }
  }

  // --- Content sanity checks ---
  await fePage.emulateMedia({ colorScheme: 'light' });
  await fePage.goto(FE + '/blog/', { waitUntil: 'domcontentloaded' });
  await fePage.waitForTimeout(500);
  const blogChecks = await fePage.evaluate(() => {
    const cards = document.querySelectorAll('article, .wp-block-post');
    const titles = Array.from(cards).map(c => (c.querySelector('h1,h2,h3') || {}).innerText || '');
    const dupes = titles.length !== new Set(titles).size;
    const emptyOrDash = titles.filter(t => !t.trim() || /^[_\-–—\s]+$/.test(t.trim()));
    return { cardCount: cards.length, titleCount: titles.length, dupes, emptyOrDashCount: emptyOrDash.length, sample: titles.slice(0, 6) };
  });
  errors['fe-light'].push('BLOG_LIST_CHECK: ' + JSON.stringify(blogChecks));

  // Post-content sanity: fetch canary post
  await fePage.goto(FE + '/blog/canary-all-core-blocks/', { waitUntil: 'domcontentloaded' });
  await fePage.waitForTimeout(500);
  const canaryChecks = await fePage.evaluate(() => {
    const article = document.querySelector('article, main');
    const text = article ? article.innerText : '';
    return { chars: text.length, hasLoneDash: /^[\-–—]$/m.test(text), url: location.pathname };
  });
  errors['fe-light'].push('CANARY_CHECK: ' + JSON.stringify(canaryChecks));

  fs.writeFileSync(path.join(OUT, '_errors.json'), JSON.stringify(errors, null, 2));
  fs.writeFileSync(path.join(OUT, '_results.json'), JSON.stringify(results, null, 2));
  console.log('DONE. Errors and results written.');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
