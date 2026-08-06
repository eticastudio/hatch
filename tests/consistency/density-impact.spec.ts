import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';

/**
 * v0.6.1 — Density impact audit.
 *
 * Measures visible page dimensions at compact vs comfortable vs spacious
 * densities. Any element whose dimensions barely change between compact
 * and spacious is bypassing the density token — a bug from the user's
 * perspective ("I moved the picker and nothing changed").
 *
 * Reports a per-element delta so we know exactly which selectors need
 * the px-to-token refactor.
 */

function setDensity(d: string) {
  execSync(
    `docker compose -f "/Users/adityasharma/Claude Projects/Hatch/docker-compose.yml" exec -T wp bash -c "` +
    `/tmp/wp-cli.phar --allow-root eval '` +
    `\\$l = get_option(\\"hatch_design_layout\\", []);` +
    `\\$l[\\"density\\"] = \\"${d}\\";` +
    `update_option(\\"hatch_design_layout\\", \\$l);' && ` +
    `/tmp/wp-cli.phar --allow-root cache flush" > /dev/null 2>&1`,
    { stdio: 'ignore' },
  );
  execSync('docker compose -f "/Users/adityasharma/Claude Projects/Hatch/docker-compose.yml" restart astro > /dev/null 2>&1');
  execSync('sleep 7');
}

const SAMPLES = [
  { key: 'header',    sel: 'header, .site-header' },
  { key: 'hero-h1',   sel: 'h1' },
  { key: 'card-grid', sel: '.wp-block-post-template' },
  { key: 'footer',    sel: 'footer' },
  { key: 'button',    sel: '.wp-block-button__link:not(.is-style-outline)' },
];

async function measure(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1280, height: 3200 });
  await page.goto('/blog/', { waitUntil: 'networkidle' });
  return await page.evaluate((samples) => {
    const out: Record<string, { height: number; padding: string; margin: string }> = {};
    const bodyH = document.body.scrollHeight;
    out['page-height'] = { height: bodyH, padding: '-', margin: '-' };
    for (const s of samples) {
      const el = document.querySelector(s.sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        out[s.key] = { height: Math.round(rect.height), padding: cs.padding, margin: cs.margin };
      }
    }
    return out;
  }, SAMPLES);
}

test.describe.serial('v0.6.1 Density impact audit', () => {
  test('measure compact / comfortable / spacious deltas across visible surfaces', async ({ page }) => {
    test.setTimeout(240_000);

    const results: Record<string, Record<string, { height: number; padding: string; margin: string }>> = {};

    for (const d of ['compact', 'comfortable', 'spacious']) {
      setDensity(d);
      results[d] = await measure(page);
    }

    // Restore
    setDensity('comfortable');

    console.log('\n═══ DENSITY IMPACT — /blog/ ═══');
    const keys = Object.keys(results.compact);
    console.log('  element             compact   comfortable   spacious   delta(sp-cp)   %delta');
    for (const k of keys) {
      const cp = results.compact[k].height;
      const cf = results.comfortable[k].height;
      const sp = results.spacious[k].height;
      const delta = sp - cp;
      const pct = cp > 0 ? Math.round((delta / cp) * 100) : 0;
      const flag = Math.abs(pct) < 8 && cp > 20 ? ' ⚠ hardcoded?' : '';
      console.log(`  ${k.padEnd(18)} ${String(cp).padEnd(9)} ${String(cf).padEnd(13)} ${String(sp).padEnd(10)} ${String(delta).padEnd(14)} ${pct}%${flag}`);
    }

    // Assertion: page-height MUST change by at least 10% between compact and spacious.
    // If not, density is effectively broken for the user.
    const pageDelta = ((results.spacious['page-height'].height - results.compact['page-height'].height) / results.compact['page-height'].height) * 100;
    console.log(`\n  Overall page-height delta compact→spacious: ${Math.round(pageDelta)}%`);
    expect(Math.abs(pageDelta), 'page-height must change ≥ 10% between compact and spacious').toBeGreaterThan(10);
  });
});
