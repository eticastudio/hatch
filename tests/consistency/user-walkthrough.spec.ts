import { test, expect, Page } from '@playwright/test';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * User-walkthrough spec.
 *
 * Loops through Blog / Tech / Docs theme × Light / Dark mode × every
 * meaningful route. On each combo, it screenshots the page, runs a
 * checklist of "does a human have a working site here?" assertions,
 * and writes a verdict row into a Markdown report. That report is the
 * deliverable — a page-by-page-per-theme-per-mode audit any PM can read.
 *
 * Everything runs headless in ~5 minutes.
 */

const ROUTES = [
  { path: '/',                                             role: 'home'      },
  { path: '/about',                                        role: 'landing'   },
  { path: '/contact',                                      role: 'form-page' },
  { path: '/privacy-policy',                               role: 'legal'     },
  { path: '/blog/',                                        role: 'listing'   },
  { path: '/blog/core-gutenberg-block-sanity-check/',      role: 'post'      },
  { path: '/blog/category/uncategorized/',                 role: 'archive'   },
];

const THEMES = ['blog', 'tech', 'docs'] as const;
const MODES  = ['light', 'dark'] as const;

const SCREENSHOTS = 'test-results/walkthrough';
mkdirSync(SCREENSHOTS, { recursive: true });

interface Row {
  theme: string;
  mode: string;
  route: string;
  http: number;
  headerRendered: boolean;
  footerRendered: boolean;
  toggleClickable: boolean;
  h1Font: string;
  primaryColor: string;
  consoleErrors: number;
  net404s: number;
  imagesLoaded: number;
  imagesTotal: number;
  verdict: 'PASS' | 'WARN' | 'FAIL';
  notes: string[];
}

const rows: Row[] = [];

function switchTheme(slug: string) {
  execSync(
    `docker compose -f "/Users/adityasharma/Claude Projects/Hatch/docker-compose.yml" exec -T wp bash -c "/tmp/wp-cli.phar --allow-root option update hatch_selected_theme ${slug} && /tmp/wp-cli.phar --allow-root cache flush" > /dev/null 2>&1`,
    { stdio: 'ignore' },
  );
  // Astro dev-mode caches features JSON — restart to bust
  execSync(
    `docker compose -f "/Users/adityasharma/Claude Projects/Hatch/docker-compose.yml" restart astro > /dev/null 2>&1`,
    { stdio: 'ignore' },
  );
  // Wait for Astro to come back
  execSync('sleep 7');
}

async function walkthrough(page: Page, theme: string, mode: string, path: string, role: string): Promise<Row> {
  const consoleErrors: string[] = [];
  const net404s: string[] = [];
  page.removeAllListeners('console');
  page.removeAllListeners('response');
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('response', (r) => { if (r.status() === 404) net404s.push(r.url()); });

  // Force mode via localStorage BEFORE navigation (FOUC guard reads it on first paint)
  await page.addInitScript((m) => {
    try { localStorage.setItem('hatch-color-mode', m); } catch (e) {}
  }, mode);

  const resp = await page.goto(path, { waitUntil: 'networkidle' });
  const http = resp?.status() ?? 0;

  // Screenshot
  const stem = `${theme}_${mode}_${path.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home'}`;
  await page.screenshot({ path: `${SCREENSHOTS}/${stem}.png`, fullPage: false });

  // DOM assertions
  const snapshot = await page.evaluate(() => {
    const header = document.querySelector('header, [role="banner"], .site-header');
    const footer = document.querySelector('footer, [role="contentinfo"], .site-footer');
    const toggle = document.getElementById('hatch-color-mode-btn');
    const h1 = document.querySelector('h1');
    const rs = getComputedStyle(document.documentElement);
    // v0.5.5 — Skip <img> elements with empty src (lightbox placeholders,
    // lazy-load stubs) — they're by-design blank until user interaction.
    const imgs = [...document.querySelectorAll('img')].filter(
      (i) => (i.getAttribute('src') || '').trim().length > 0
    );
    return {
      headerRendered: !!(header && (header as HTMLElement).offsetHeight > 0),
      footerRendered: !!(footer && (footer as HTMLElement).offsetHeight > 0),
      toggleClickable: !!(toggle && (toggle as HTMLElement).offsetHeight > 0),
      h1Font: h1 ? getComputedStyle(h1).fontFamily.slice(0, 40) : 'no-h1',
      primaryColor: rs.getPropertyValue('--hatch-primary').trim(),
      activeMode: document.documentElement.getAttribute('data-hatch-mode'),
      activeTheme: document.documentElement.getAttribute('data-hatch-theme'),
      imagesTotal: imgs.length,
      imagesLoaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
    };
  });

  const notes: string[] = [];
  let verdict: Row['verdict'] = 'PASS';
  if (http !== 200) { verdict = 'FAIL'; notes.push(`HTTP ${http}`); }
  if (!snapshot.headerRendered) { verdict = 'FAIL'; notes.push('header missing'); }
  if (!snapshot.footerRendered) { verdict = 'FAIL'; notes.push('footer missing'); }
  if (!snapshot.toggleClickable) { verdict = verdict === 'FAIL' ? 'FAIL' : 'WARN'; notes.push('toggle missing'); }
  if (snapshot.activeTheme !== theme) { verdict = 'FAIL'; notes.push(`expected theme=${theme} got=${snapshot.activeTheme}`); }
  if (snapshot.activeMode !== mode)  { verdict = 'FAIL'; notes.push(`expected mode=${mode} got=${snapshot.activeMode}`); }
  if (consoleErrors.length > 0) { verdict = verdict === 'FAIL' ? 'FAIL' : 'WARN'; notes.push(`${consoleErrors.length} console errors`); }
  if (net404s.length > 0) { verdict = verdict === 'FAIL' ? 'FAIL' : 'WARN'; notes.push(`${net404s.length} 404 network requests`); }
  if (snapshot.imagesTotal > 0 && snapshot.imagesLoaded < snapshot.imagesTotal) {
    verdict = verdict === 'FAIL' ? 'FAIL' : 'WARN';
    notes.push(`${snapshot.imagesLoaded}/${snapshot.imagesTotal} images loaded`);
  }

  return {
    theme, mode, route: path, http,
    headerRendered: snapshot.headerRendered,
    footerRendered: snapshot.footerRendered,
    toggleClickable: snapshot.toggleClickable,
    h1Font: snapshot.h1Font,
    primaryColor: snapshot.primaryColor,
    consoleErrors: consoleErrors.length,
    net404s: net404s.length,
    imagesLoaded: snapshot.imagesLoaded,
    imagesTotal: snapshot.imagesTotal,
    verdict,
    notes,
  };
}

test.describe.serial('User walkthrough — every theme × every mode × every route', () => {
  for (const theme of THEMES) {
    test(`theme=${theme} — sweep every route in both modes`, async ({ page }) => {
      test.setTimeout(180_000);
      switchTheme(theme);
      // Give Playwright a fresh nav to pick up the new theme
      await page.goto('/', { waitUntil: 'networkidle' });

      for (const mode of MODES) {
        for (const { path, role } of ROUTES) {
          const row = await walkthrough(page, theme, mode, path, role);
          rows.push(row);
          console.log(
            `  ${row.verdict}  ${theme}/${mode.padEnd(5)} ${row.route.padEnd(46)} imgs=${row.imagesLoaded}/${row.imagesTotal} err=${row.consoleErrors} 404=${row.net404s}${row.notes.length ? ' → ' + row.notes.join(', ') : ''}`,
          );
        }
      }
    });
  }

  test.afterAll(async () => {
    // Restore Blog theme so the site ships in its default state
    switchTheme('blog');

    // Write markdown report
    const pass = rows.filter((r) => r.verdict === 'PASS').length;
    const warn = rows.filter((r) => r.verdict === 'WARN').length;
    const fail = rows.filter((r) => r.verdict === 'FAIL').length;
    const total = rows.length;

    const lines: string[] = [];
    lines.push(`# Hatch user-walkthrough report`);
    lines.push('');
    lines.push(`**${pass}/${total} PASS · ${warn} WARN · ${fail} FAIL**`);
    lines.push('');
    lines.push(`Loop: 3 themes × 2 modes × ${ROUTES.length} routes = ${total} page-visits.`);
    lines.push('');
    lines.push(`Screenshots: \`tests/consistency/${SCREENSHOTS}/\` — one per row.`);
    lines.push('');
    lines.push(`## Verdict per row`);
    lines.push('');
    lines.push('| Theme | Mode | Route | HTTP | Header | Footer | Toggle | Images | Console errs | 404s | Verdict | Notes |');
    lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of rows) {
      lines.push(`| ${r.theme} | ${r.mode} | \`${r.route}\` | ${r.http} | ${r.headerRendered ? '✓' : '✗'} | ${r.footerRendered ? '✓' : '✗'} | ${r.toggleClickable ? '✓' : '✗'} | ${r.imagesLoaded}/${r.imagesTotal} | ${r.consoleErrors} | ${r.net404s} | **${r.verdict}** | ${r.notes.join('; ') || '—'} |`);
    }
    lines.push('');
    lines.push(`## Per-theme signature check`);
    lines.push('');
    lines.push(`| Theme | h1 font | Primary color |`);
    lines.push(`|---|---|---|`);
    for (const t of THEMES) {
      const sample = rows.find((r) => r.theme === t);
      if (sample) lines.push(`| ${t} | \`${sample.h1Font}\` | \`${sample.primaryColor}\` |`);
    }
    lines.push('');
    lines.push(`## Bottom line`);
    lines.push('');
    if (fail === 0 && warn === 0) {
      lines.push(`- **Every page renders cleanly in every theme and every mode.** No console errors, no 404 network requests, every image loaded.`);
      lines.push(`- Header/footer/toggle present on all ${total} page-visits.`);
      lines.push(`- Ship-safe.`);
    } else {
      lines.push(`- ${fail} FAIL rows need code fixes before ship.`);
      lines.push(`- ${warn} WARN rows are polish items (missing image, orphan console warning, etc.).`);
      lines.push(`- See the notes column for the specific signal per row.`);
    }
    writeFileSync(`${SCREENSHOTS}/REPORT.md`, lines.join('\n'));
    console.log(`\n▸ Report written → tests/consistency/${SCREENSHOTS}/REPORT.md`);
    console.log(`  ${pass}/${total} PASS · ${warn} WARN · ${fail} FAIL`);
  });
});
