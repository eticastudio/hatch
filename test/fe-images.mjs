// Re-capture home + blog + canary WITH proper image wait to confirm featured images render.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const FE = 'http://localhost:4321';
const OUT = '/private/tmp/claude-501/-Users-adityasharma-Claude-Projects-Hatch/f572a5b3-6081-4283-807d-7f42d864af3f/scratchpad/demo-shots';

const errors = [];

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
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (/favicon|__vite__|chrome-extension|hot-update/.test(u)) return;
    errors.push('reqfail: ' + u);
  });

  async function loadPage(url, filename) {
    console.log('->', url);
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    // wait for all images to complete
    await page.waitForFunction(() => {
      const imgs = Array.from(document.images);
      return imgs.length === 0 || imgs.every(i => i.complete);
    }, { timeout: 15000 }).catch(() => errors.push('image-wait-timeout: ' + url));
    await page.waitForTimeout(500);
    // Count broken images
    const imgReport = await page.evaluate(() => {
      const imgs = Array.from(document.images);
      const broken = imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src);
      const total = imgs.length;
      return { total, brokenCount: broken.length, broken: broken.slice(0, 10) };
    });
    errors.push(`IMG_REPORT [${filename}]: total=${imgReport.total} broken=${imgReport.brokenCount} broken_sample=${JSON.stringify(imgReport.broken)}`);
    await page.screenshot({ path: path.join(OUT, filename), fullPage: true });
    console.log('  saved', filename, `imgs total=${imgReport.total} broken=${imgReport.brokenCount}`);
  }

  await loadPage(FE + '/', '05-home-full.png');
  await loadPage(FE + '/blog/', '05-blog-full.png');
  await loadPage(FE + '/blog/canary-all-core-blocks/', '05-canary-full.png');
  await loadPage(FE + '/blog/hatch-v0-7-is-here-three-themes-one-subfolder-zero-code/', '05-post-hero.png').catch(() => {});
  await loadPage(FE + '/about/', '05-about-full.png');
  await loadPage(FE + '/contact/', '05-contact-full.png');
  await loadPage(FE + '/privacy-policy/', '05-privacy-full.png');
  await loadPage(FE + '/terms-of-service/', '05-terms-full.png');

  // Category
  const catHref = await page.evaluate(async () => {
    const r = await fetch('/blog/');
    const html = await r.text();
    const m = html.match(/href="([^"]*\/blog\/category\/[^"]+)"/);
    return m ? m[1] : null;
  });
  if (catHref) {
    const relative = catHref.startsWith('http') ? catHref : (FE + catHref);
    await loadPage(relative, '05-category-full.png');
    const h1Font = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? { font: getComputedStyle(h1).fontFamily, text: h1.textContent } : null;
    });
    errors.push('CATEGORY_H1: ' + JSON.stringify(h1Font));
  }

  // Dark mode via localStorage
  await page.addInitScript(() => {
    try { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('hatch-theme', 'dark'); localStorage.setItem('theme', 'dark'); } catch (e) {}
  });
  await page.emulateMedia({ colorScheme: 'dark' });
  await loadPage(FE + '/', '06-dark-home.png');
  await loadPage(FE + '/blog/', '06-dark-blog.png');
  await loadPage(FE + '/blog/canary-all-core-blocks/', '06-dark-canary.png');

  fs.writeFileSync(path.join(OUT, '_fe_errors.json'), JSON.stringify(errors, null, 2));
  console.log('DONE');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
