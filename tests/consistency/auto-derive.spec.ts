import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';

/**
 * v0.6.1 — Auto-derived dark palette verification.
 *
 * Proves: user picks ONE brand.bg color in Design tab, dark mode
 * derives its whole palette from that source via color-mix(in oklab)
 * — NOT hardcoded. Change the source, dark palette follows.
 */

const BG_SAMPLES = [
  { label: 'warm cream (Hatch default)', bg: '#fdfaf3' },
  { label: 'cool white',                  bg: '#f7fafc' },
  { label: 'brand-tinted white',          bg: '#f0f4ff' },
];

function setBrandBg(hex: string) {
  execSync(
    `docker compose -f "/Users/adityasharma/Claude Projects/Hatch/docker-compose.yml" exec -T wp bash -c "` +
    `/tmp/wp-cli.phar --allow-root eval '` +
    `\\$b = get_option(\\"hatch_design_brand\\", []);` +
    `\\$b[\\"bg\\"] = \\"${hex}\\";` +
    `update_option(\\"hatch_design_brand\\", \\$b);' && ` +
    `/tmp/wp-cli.phar --allow-root cache flush" > /dev/null 2>&1`,
    { stdio: 'ignore' },
  );
  execSync('docker compose -f "/Users/adityasharma/Claude Projects/Hatch/docker-compose.yml" restart astro > /dev/null 2>&1');
  execSync('sleep 7');
}

/** Return the perceptual lightness (0..1). Handles rgb() and oklab().
 *  Chromium returns oklab() when the source used color-mix(in oklab, ...). */
function lightness(css: string): number {
  const oklab = css.match(/oklab\(\s*([\d.]+)/);
  if (oklab) return Number(oklab[1]);   // already 0..1
  const rgb = css.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgb) {
    // Approximate luma → 0..1
    const [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  return 0.5;
}

test.describe.serial('v0.6.1 Auto-derive dark palette', () => {
  for (const sample of BG_SAMPLES) {
    test(`brand.bg = ${sample.label} (${sample.bg}) → light + dark both derive`, async ({ page }) => {
      test.setTimeout(120_000);
      setBrandBg(sample.bg);

      // LIGHT MODE: --hatch-bg must equal the user's pick
      await page.addInitScript(() => { try { localStorage.setItem('hatch-color-mode', 'light'); } catch (e) {} });
      await page.goto('/', { waitUntil: 'networkidle' });
      const light = await page.evaluate(() => {
        const rs = getComputedStyle(document.documentElement);
        return {
          mode: document.documentElement.getAttribute('data-hatch-mode'),
          bg: rs.getPropertyValue('--hatch-bg').trim(),
          bg_design: rs.getPropertyValue('--hatch-bg-design').trim(),
          bodyBg: getComputedStyle(document.body).backgroundColor,
        };
      });

      // DARK MODE: --hatch-bg must be DARK (all rgb components < 60) — derived from source
      await page.addInitScript(() => { try { localStorage.setItem('hatch-color-mode', 'dark'); } catch (e) {} });
      await page.goto('/', { waitUntil: 'networkidle' });
      const dark = await page.evaluate(() => {
        const rs = getComputedStyle(document.documentElement);
        return {
          mode: document.documentElement.getAttribute('data-hatch-mode'),
          bg: rs.getPropertyValue('--hatch-bg').trim(),
          fg: rs.getPropertyValue('--hatch-fg').trim(),
          bg_design: rs.getPropertyValue('--hatch-bg-design').trim(),
          bodyBg: getComputedStyle(document.body).backgroundColor,
          bodyColor: getComputedStyle(document.body).color,
        };
      });

      console.log(`\n  brand.bg=${sample.bg}`);
      console.log(`    light: --hatch-bg=${light.bg}   body bg=${light.bodyBg}`);
      console.log(`    dark:  --hatch-bg-computed=${dark.bg.slice(0, 60)}...   body bg=${dark.bodyBg}   body color=${dark.bodyColor}`);

      // Light mode: bg-design should equal user pick (case-insensitive hex compare)
      expect(light.bg_design.toLowerCase()).toBe(sample.bg.toLowerCase());

      // Dark mode: body bg must be actually dark (perceptual L < 0.15)
      const bgL = lightness(dark.bodyBg);
      const fgL = lightness(dark.bodyColor);
      console.log(`    bg lightness = ${bgL.toFixed(3)}   fg lightness = ${fgL.toFixed(3)}`);
      expect(bgL, `dark bg lightness must be < 0.15 (very dark)`).toBeLessThan(0.15);
      expect(fgL, `dark fg lightness must be > 0.85 (very bright)`).toBeGreaterThan(0.85);
    });
  }

  test.afterAll(() => {
    // Restore Hatch default cream
    setBrandBg('#fdfaf3');
  });
});
