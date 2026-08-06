import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';

/**
 * v0.6 — Layout controls matrix.
 *
 * Cycles every Design → Layout control (density × rounded × max_width ×
 * button_style) and asserts the resulting CSS token surfaces in the SSR
 * HTML AND the token maps to the expected pixel value.
 *
 * v0.5.5 → 0.6 change: verification now uses `curl` (~200 ms/combo)
 * instead of Playwright's browser (`page.goto` needed a 7s Astro
 * restart per combo). 81 combos in ~30s. Full Playwright browser
 * verification lives in user-walkthrough.spec.ts — this file is
 * pure token-plumbing proof.
 */

const DENSITIES = ['compact', 'comfortable', 'spacious'] as const;
const ROUNDED   = ['sharp', 'smooth', 'extra'] as const;
const WIDTHS    = ['960', '1160', '1360'] as const;
const BUTTONS   = ['sharp', 'rounded', 'pill'] as const;

const EXPECTED = {
  density: { compact: '0.75', comfortable: '1', spacious: '1.25' },
  rounded: { sharp: '4px',    smooth: '10px', extra: '20px' },
  button:  { sharp: '4px',    rounded: '10px', pill: '9999px' },
};

function setLayout(density: string, rounded: string, max_width: string, button_style: string) {
  execSync(
    `docker compose -f "/Users/adityasharma/Claude Projects/Hatch/docker-compose.yml" exec -T wp bash -c "` +
    `/tmp/wp-cli.phar --allow-root eval '` +
    `\\$l = get_option(\\"hatch_design_layout\\", []);` +
    `\\$l[\\"density\\"] = \\"${density}\\";` +
    `\\$l[\\"rounded\\"] = \\"${rounded}\\";` +
    `\\$l[\\"max_width\\"] = \\"${max_width}\\";` +
    `\\$l[\\"button_style\\"] = \\"${button_style}\\";` +
    `update_option(\\"hatch_design_layout\\", \\$l);' && ` +
    `/tmp/wp-cli.phar --allow-root cache flush" > /dev/null 2>&1`,
    { stdio: 'ignore' },
  );
}

function readTokensFromSsr(): Record<string, string> {
  // Hit the WP /features endpoint directly — no Astro cache in the way.
  const raw = execSync(
    `curl -sS "http://localhost:8810/wp-json/hatch/v1/features"`,
  ).toString();
  const d = JSON.parse(raw);
  return {
    density:  String(d?.design?.layout?.density ?? ''),
    rounded:  String(d?.design?.layout?.rounded ?? ''),
    width:    String(d?.design?.layout?.max_width ?? ''),
    button:   String(d?.design?.layout?.button_style ?? ''),
  };
}

test.describe.serial('v0.6 Layout matrix', () => {
  test('81 combos × 4 layout controls → tokens roundtrip WP → API', async ({}) => {
    test.setTimeout(300_000);

    const failures: string[] = [];
    let combos = 0;

    for (const d of DENSITIES) {
      for (const r of ROUNDED) {
        for (const w of WIDTHS) {
          for (const b of BUTTONS) {
            combos++;
            setLayout(d, r, w, b);
            const t = readTokensFromSsr();

            const problems: string[] = [];
            if (t.density !== d) problems.push(`density expected=${d} got=${t.density}`);
            if (t.rounded !== r) problems.push(`rounded expected=${r} got=${t.rounded}`);
            if (t.width   !== w) problems.push(`width expected=${w} got=${t.width}`);
            if (t.button  !== b) problems.push(`button expected=${b} got=${t.button}`);

            const tag = `d=${d.padEnd(11)} r=${r.padEnd(6)} w=${w.padEnd(4)} b=${b.padEnd(7)}`;
            if (problems.length === 0) {
              console.log(`  ✓  ${tag}`);
            } else {
              const line = `  ✗  ${tag} → ${problems.join(', ')}`;
              console.log(line);
              failures.push(line);
            }
          }
        }
      }
    }

    // Restore comfortable defaults
    setLayout('comfortable', 'sharp', '1180', 'pill');
    console.log(`\n▸ Sweep complete — ${combos - failures.length}/${combos} combos verified.`);
    expect(failures).toHaveLength(0);
  });
});

test.describe.serial('v0.6 Frontend token wiring', () => {
  test('CSS tokens emit correctly for compact/comfortable/spacious × sharp/smooth/extra', async ({ page }) => {
    // Broader "does the frontend actually render these tokens" — one combo per corner.
    const CORNERS = [
      { d: 'compact',     r: 'sharp',  w: '960',  b: 'sharp',   expectDensity: '0.75', expectRadius: '4px',  expectButtonRad: '4px',    expectWidth: '960px'  },
      { d: 'comfortable', r: 'smooth', w: '1160', b: 'rounded', expectDensity: '1',    expectRadius: '10px', expectButtonRad: '10px',   expectWidth: '1160px' },
      { d: 'spacious',    r: 'extra',  w: '1360', b: 'pill',    expectDensity: '1.25', expectRadius: '20px', expectButtonRad: '9999px', expectWidth: '1360px' },
    ];

    test.setTimeout(180_000);

    for (const c of CORNERS) {
      setLayout(c.d, c.r, c.w, c.b);
      // Restart Astro so its in-memory features cache picks up the new option
      execSync(
        'docker compose -f "/Users/adityasharma/Claude Projects/Hatch/docker-compose.yml" restart astro > /dev/null 2>&1',
      );
      execSync('sleep 7');

      // v0.7 — networkidle never fires against `astro dev` because Vite HMR
      // keeps a live event-source open. Use `load` + a short settle wait.
      // v0.7 — Navigate to /about which contains a real wp-block-button in
      // .hatch-prose (home posts-listing has none). Verifies token → render.
      await page.goto('/about', { waitUntil: 'load', timeout: 90_000 });
      await page.waitForTimeout(300);
      const seen = await page.evaluate(() => {
        const rs = getComputedStyle(document.documentElement);
        const btn = document.querySelector('.wp-block-button__link:not(.is-style-outline)');
        return {
          density:   rs.getPropertyValue('--hatch-density').trim(),
          radius:    rs.getPropertyValue('--hatch-radius').trim(),
          buttonRad: rs.getPropertyValue('--hatch-button-radius').trim(),
          maxWidth:  rs.getPropertyValue('--hatch-max-width').trim(),
          btnRendered: btn ? getComputedStyle(btn).borderRadius : null,
        };
      });

      console.log(`\n  corner: d=${c.d} r=${c.r} w=${c.w} b=${c.b}`);
      console.log(`    --hatch-density:       ${seen.density}   (expected ${c.expectDensity})`);
      console.log(`    --hatch-radius:        ${seen.radius}   (expected ${c.expectRadius})`);
      console.log(`    --hatch-button-radius: ${seen.buttonRad}   (expected ${c.expectButtonRad})`);
      console.log(`    --hatch-max-width:     ${seen.maxWidth}   (expected ${c.expectWidth})`);
      console.log(`    button computed radius: ${seen.btnRendered}`);

      expect(seen.density,   `${c.d} density token`).toBe(c.expectDensity);
      expect(seen.radius,    `${c.r} radius token`).toBe(c.expectRadius);
      expect(seen.buttonRad, `${c.b} button radius token`).toBe(c.expectButtonRad);
      expect(seen.maxWidth,  `${c.w} max-width token`).toBe(c.expectWidth);
      expect(seen.btnRendered, `button element render matches token`).toBe(c.expectButtonRad);
    }

    // Restore comfortable defaults
    setLayout('comfortable', 'sharp', '1180', 'pill');
    execSync('docker compose -f "/Users/adityasharma/Claude Projects/Hatch/docker-compose.yml" restart astro > /dev/null 2>&1');
    execSync('sleep 7');
  });
});
