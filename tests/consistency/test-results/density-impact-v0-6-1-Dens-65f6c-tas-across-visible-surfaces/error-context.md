# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: density-impact.spec.ts >> v0.6.1 Density impact audit >> measure compact / comfortable / spacious deltas across visible surfaces
- Location: density-impact.spec.ts:58:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_RESET at http://localhost:4321/blog/
Call log:
  - navigating to "http://localhost:4321/blog/", waiting until "networkidle"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { execSync } from 'node:child_process';
  3  | 
  4  | /**
  5  |  * v0.6.1 — Density impact audit.
  6  |  *
  7  |  * Measures visible page dimensions at compact vs comfortable vs spacious
  8  |  * densities. Any element whose dimensions barely change between compact
  9  |  * and spacious is bypassing the density token — a bug from the user's
  10 |  * perspective ("I moved the picker and nothing changed").
  11 |  *
  12 |  * Reports a per-element delta so we know exactly which selectors need
  13 |  * the px-to-token refactor.
  14 |  */
  15 | 
  16 | function setDensity(d: string) {
  17 |   execSync(
  18 |     `docker compose -f "/Users/adityasharma/Claude Projects/Hatch/docker-compose.yml" exec -T wp bash -c "` +
  19 |     `/tmp/wp-cli.phar --allow-root eval '` +
  20 |     `\\$l = get_option(\\"hatch_design_layout\\", []);` +
  21 |     `\\$l[\\"density\\"] = \\"${d}\\";` +
  22 |     `update_option(\\"hatch_design_layout\\", \\$l);' && ` +
  23 |     `/tmp/wp-cli.phar --allow-root cache flush" > /dev/null 2>&1`,
  24 |     { stdio: 'ignore' },
  25 |   );
  26 |   execSync('docker compose -f "/Users/adityasharma/Claude Projects/Hatch/docker-compose.yml" restart astro > /dev/null 2>&1');
  27 |   execSync('sleep 7');
  28 | }
  29 | 
  30 | const SAMPLES = [
  31 |   { key: 'header',    sel: 'header, .site-header' },
  32 |   { key: 'hero-h1',   sel: 'h1' },
  33 |   { key: 'card-grid', sel: '.wp-block-post-template' },
  34 |   { key: 'footer',    sel: 'footer' },
  35 |   { key: 'button',    sel: '.wp-block-button__link:not(.is-style-outline)' },
  36 | ];
  37 | 
  38 | async function measure(page: import('@playwright/test').Page) {
  39 |   await page.setViewportSize({ width: 1280, height: 3200 });
> 40 |   await page.goto('/blog/', { waitUntil: 'networkidle' });
     |              ^ Error: page.goto: net::ERR_CONNECTION_RESET at http://localhost:4321/blog/
  41 |   return await page.evaluate((samples) => {
  42 |     const out: Record<string, { height: number; padding: string; margin: string }> = {};
  43 |     const bodyH = document.body.scrollHeight;
  44 |     out['page-height'] = { height: bodyH, padding: '-', margin: '-' };
  45 |     for (const s of samples) {
  46 |       const el = document.querySelector(s.sel);
  47 |       if (el) {
  48 |         const rect = el.getBoundingClientRect();
  49 |         const cs = getComputedStyle(el);
  50 |         out[s.key] = { height: Math.round(rect.height), padding: cs.padding, margin: cs.margin };
  51 |       }
  52 |     }
  53 |     return out;
  54 |   }, SAMPLES);
  55 | }
  56 | 
  57 | test.describe.serial('v0.6.1 Density impact audit', () => {
  58 |   test('measure compact / comfortable / spacious deltas across visible surfaces', async ({ page }) => {
  59 |     test.setTimeout(240_000);
  60 | 
  61 |     const results: Record<string, Record<string, { height: number; padding: string; margin: string }>> = {};
  62 | 
  63 |     for (const d of ['compact', 'comfortable', 'spacious']) {
  64 |       setDensity(d);
  65 |       results[d] = await measure(page);
  66 |     }
  67 | 
  68 |     // Restore
  69 |     setDensity('comfortable');
  70 | 
  71 |     console.log('\n═══ DENSITY IMPACT — /blog/ ═══');
  72 |     const keys = Object.keys(results.compact);
  73 |     console.log('  element             compact   comfortable   spacious   delta(sp-cp)   %delta');
  74 |     for (const k of keys) {
  75 |       const cp = results.compact[k].height;
  76 |       const cf = results.comfortable[k].height;
  77 |       const sp = results.spacious[k].height;
  78 |       const delta = sp - cp;
  79 |       const pct = cp > 0 ? Math.round((delta / cp) * 100) : 0;
  80 |       const flag = Math.abs(pct) < 8 && cp > 20 ? ' ⚠ hardcoded?' : '';
  81 |       console.log(`  ${k.padEnd(18)} ${String(cp).padEnd(9)} ${String(cf).padEnd(13)} ${String(sp).padEnd(10)} ${String(delta).padEnd(14)} ${pct}%${flag}`);
  82 |     }
  83 | 
  84 |     // Assertion: page-height MUST change by at least 10% between compact and spacious.
  85 |     // If not, density is effectively broken for the user.
  86 |     const pageDelta = ((results.spacious['page-height'].height - results.compact['page-height'].height) / results.compact['page-height'].height) * 100;
  87 |     console.log(`\n  Overall page-height delta compact→spacious: ${Math.round(pageDelta)}%`);
  88 |     expect(Math.abs(pageDelta), 'page-height must change ≥ 10% between compact and spacious').toBeGreaterThan(10);
  89 |   });
  90 | });
  91 | 
```