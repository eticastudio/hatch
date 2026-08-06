// FRONTEND-PREMIUM verifier v2 — proper contrast calc + broken-image URLs.
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

async function auditRoute(page, path, name, mode, theme) {
  await page.addInitScript((m) => {
    try { localStorage.setItem('hatch-color-mode', m); } catch {}
  }, mode);
  const resp = await page.goto('http://localhost:4321' + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const status = resp?.status() ?? 0;
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/${theme}-${name}-${mode}.png`, fullPage: true });

  const audit = await page.evaluate(() => {
    // Force any color string (oklab, oklch, color(), rgb) into rgb by
    // parking it on a scratch div and reading getComputedStyle.color.
    const scratch = document.createElement('div');
    scratch.style.position = 'fixed';
    scratch.style.top = '-9999px';
    document.body.appendChild(scratch);
    // Convert any CSS color (rgb, oklab, oklch, color(), etc.) to sRGB
    // by painting it on a 1x1 canvas and reading back the pixel — the
    // only browser API that reliably normalises every color function.
    const cv = document.createElement('canvas');
    cv.width = 1; cv.height = 1;
    const cx = cv.getContext('2d');
    const toRgb = (cssColor) => {
      try {
        cx.clearRect(0, 0, 1, 1);
        cx.fillStyle = cssColor;
        cx.fillRect(0, 0, 1, 1);
        const d = cx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2]];
      } catch { return null; }
    };
    const relLum = ([r,g,b]) => { const t = [r,g,b].map(v => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }); return 0.2126*t[0]+0.7152*t[1]+0.0722*t[2]; };
    const contrast = (a,b) => { const L1 = relLum(a), L2 = relLum(b); const [hi,lo] = L1>L2?[L1,L2]:[L2,L1]; return (hi+0.05)/(lo+0.05); };
    const bgFor = (el) => {
      let cur = el;
      while (cur && cur !== document.documentElement) {
        const bg = getComputedStyle(cur).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
        cur = cur.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };

    const html = document.documentElement;
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const h1 = document.querySelector('h1');
    const h1Style = h1 ? getComputedStyle(h1) : null;
    const cardTitle = document.querySelector('.wp-block-post-title');
    const cardStyle = cardTitle ? getComputedStyle(cardTitle) : null;

    const h1BgStr = h1 ? bgFor(h1) : bodyBg;
    const cardBgStr = cardTitle ? bgFor(cardTitle) : bodyBg;

    const h1ColorRgb = h1Style ? toRgb(h1Style.color) : null;
    const h1BgRgb = toRgb(h1BgStr);
    const cardColorRgb = cardStyle ? toRgb(cardStyle.color) : null;
    const cardBgRgb = toRgb(cardBgStr);

    const brokenImgs = Array.from(document.images)
      // Exclude the lightbox modal image — it intentionally ships with no
      // src (populated on click) so naturalWidth=0 is expected, not a bug.
      .filter((im) => im.id !== 'hatch-lightbox-img')
      .filter((im) => im.complete && im.naturalWidth === 0)
      .map((im) => im.src);

    scratch.remove();

    return {
      theme: html.getAttribute('data-hatch-theme'),
      mode: html.getAttribute('data-hatch-mode'),
      h1Text: h1?.innerText || '',
      h1Color: h1Style?.color || '',
      h1BgColor: h1BgStr,
      h1Font: h1Style?.fontFamily || '',
      h1Contrast: (h1ColorRgb && h1BgRgb) ? contrast(h1ColorRgb, h1BgRgb).toFixed(2) : 'n/a',
      cardTitleColor: cardStyle?.color || '',
      cardBgColor: cardBgStr,
      cardTitleContrast: (cardColorRgb && cardBgRgb) ? contrast(cardColorRgb, cardBgRgb).toFixed(2) : 'n/a',
      imagesTotal: document.images.length,
      brokenImgs: brokenImgs.slice(0, 5),
      brokenImgsCount: brokenImgs.length,
      hasHatchStatus: !!Array.from(document.querySelectorAll('.hatch-tech-hero-prompt')).find((el) => el.textContent?.includes('hatch --status')),
      lonelyExcerpts: Array.from(document.querySelectorAll('.wp-block-post-excerpt__excerpt, .hatch-tech-card-excerpt, .hatch-blog-feature-lede'))
                          .map((el) => el.textContent.trim())
                          .filter((t) => /^[\s\-_–—.]{0,3}$/.test(t)),
    };
  });

  results.push({ name, path, mode, status, ...audit });
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const mode of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      for (const r of ROUTES) {
        try {
          await auditRoute(page, r.path, r.name, mode, 'tech');
        } catch (e) {
          results.push({ name: r.name, path: r.path, mode, error: String(e).slice(0, 200) });
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  writeFileSync(`${OUT}/polish-verify2.json`, JSON.stringify(results, null, 2));
  // Compact print
  for (const r of results) {
    const stat = r.error ? `ERROR ${r.error}` :
      `h1="${r.h1Text.slice(0,30)}" contrast=${r.h1Contrast} card=${r.cardTitleContrast} broken=${r.brokenImgsCount} status=${r.hasHatchStatus} lonely=${r.lonelyExcerpts.length}`;
    console.log(`[${r.mode.padEnd(5)}] ${r.path.padEnd(70)} ${stat}`);
    if (r.brokenImgs?.length) console.log(`   BROKEN: ${r.brokenImgs.join(', ')}`);
  }
})();
