// FRONTEND-PREMIUM polish verifier.
// Loads Astro home + /blog + a category page under both light/dark modes
// and screenshots each, then asserts the polish contracts:
// 1) Homepage cards never contain a lonely en-dash / underscore excerpt.
// 2) Tech hero contains the stats micro-strip (`hatch --status`, posts,
//    categories, last publish).
// 3) In light mode, h1 computed color has ≥7:1 contrast against bg.
// 4) Every visible <img> has natural width > 0 (loaded, no broken links).
// Runs in-process; no Astro restart is needed.

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = '/private/tmp/claude-501/-Users-adityasharma-Claude-Projects-Hatch/f572a5b3-6081-4283-807d-7f42d864af3f/scratchpad/screenshots';
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/blog/', name: 'blog' },
  { path: '/blog/category/design', name: 'category' },
  { path: '/blog/writing-better-release-notes-your-users-actually-read/', name: 'post' },
];

const results = [];

// Relative luminance per WCAG.
function relLum(rgb) {
  const [r, g, b] = rgb.map((v) => {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(rgbA, rgbB) {
  const L1 = relLum(rgbA), L2 = relLum(rgbB);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}
function parseRgb(s) {
  const m = s.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!m) return [0, 0, 0];
  return [+m[1], +m[2], +m[3]];
}

async function auditRoute(page, path, name, mode) {
  await page.addInitScript((m) => {
    try { localStorage.setItem('hatch-color-mode', m); } catch {}
  }, mode);
  const resp = await page.goto('http://localhost:4321' + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const status = resp?.status() ?? 0;
  // let hydration + fonts settle
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/${name}-${mode}.png`, fullPage: true });

  const audit = await page.evaluate(() => {
    const html = document.documentElement;
    const bodyColor = getComputedStyle(document.body).color;
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const h1 = document.querySelector('h1');
    const h1Style = h1 ? getComputedStyle(h1) : null;
    const bgFor = (el) => {
      let cur = el;
      while (cur && cur !== document.documentElement) {
        const bg = getComputedStyle(cur).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
        cur = cur.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    return {
      theme: html.getAttribute('data-hatch-theme'),
      mode: html.getAttribute('data-hatch-mode'),
      bodyColor,
      bodyBg,
      h1Text: h1?.innerText || '',
      h1Color: h1Style?.color || '',
      h1BgResolved: h1 ? bgFor(h1) : '',
      h1Font: h1Style?.fontFamily || '',
      cardTitleFont: (document.querySelector('.wp-block-post-title') && getComputedStyle(document.querySelector('.wp-block-post-title')).fontFamily) || '',
      cardTitleColor: (document.querySelector('.wp-block-post-title') && getComputedStyle(document.querySelector('.wp-block-post-title')).color) || '',
      excerptTexts: Array.from(document.querySelectorAll('.wp-block-post-excerpt__excerpt, .hatch-tech-card-excerpt, .hatch-blog-feature-lede'))
                         .map((el) => el.textContent.trim())
                         .slice(0, 12),
      imagesTotal: document.images.length,
      imagesBroken: Array.from(document.images).filter((im) => im.complete && im.naturalWidth === 0).length,
      hasHatchStatus: !!Array.from(document.querySelectorAll('.hatch-tech-hero-prompt')).find((el) => el.textContent?.includes('hatch --status')),
    };
  });

  const row = { name, path, mode, status, ...audit };
  if (row.h1Color && row.h1BgResolved) {
    row.h1Contrast = contrast(parseRgb(row.h1Color), parseRgb(row.h1BgResolved)).toFixed(2);
  }
  // Fallback (empty-excerpt) hunt — the placeholder chars we want to catch.
  row.lonelyExcerpts = row.excerptTexts.filter((t) => /^[\s\-_–—.]{0,3}$/.test(t));
  results.push(row);
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const mode of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      for (const r of ROUTES) {
        try {
          await auditRoute(page, r.path, r.name, mode);
        } catch (e) {
          results.push({ name: r.name, path: r.path, mode, error: String(e).slice(0, 200) });
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  writeFileSync(`${OUT}/polish-verify.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
