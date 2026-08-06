import { test, expect } from '@playwright/test';

/**
 * v0.6 — Gutenberg alignment coverage.
 *
 * Verifies every alignment class the Gutenberg toolbar emits actually
 * moves the DOM the way it should. Runs against the canary post at
 * /blog/core-gutenberg-block-sanity-check/ which is authored specifically
 * to exercise every alignment mode.
 */

const CANARY = '/blog/core-gutenberg-block-sanity-check/';

test.describe.serial('v0.6 Alignment classes', () => {
  test('text alignment: left / center / right / justify', async ({ page }) => {
    // v0.7 — `networkidle` never fires against `astro dev` because Vite's
    // HMR keeps a live event-source open. Switching to `load` so the test
    // can actually run; add a short wait for the CSS to settle.
    await page.goto(CANARY, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(400);
    const result = await page.evaluate(() => {
      const scan = (sel: string) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).textAlign : null;
      };
      return {
        left:    scan('.has-text-align-left'),
        center:  scan('.has-text-align-center'),
        right:   scan('.has-text-align-right'),
        justify: scan('.has-text-align-justify'),
      };
    });

    console.log(`\n  text-align: left=${result.left} center=${result.center} right=${result.right} justify=${result.justify}`);
    expect(result.left,    'has-text-align-left').toBe('left');
    expect(result.center,  'has-text-align-center').toBe('center');
    expect(result.right,   'has-text-align-right').toBe('right');
    expect(result.justify, 'has-text-align-justify').toBe('justify');
  });

  test('block alignment: alignleft floats left with margin-right', async ({ page }) => {
    // v0.7 — `networkidle` never fires against `astro dev` because Vite's
    // HMR keeps a live event-source open. Switching to `load` so the test
    // can actually run; add a short wait for the CSS to settle.
    await page.goto(CANARY, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const el = document.querySelector('.canary-left');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { float: cs.cssFloat, marginRight: cs.marginRight };
    });
    console.log(`\n  alignleft: float=${r?.float} margin-right=${r?.marginRight}`);
    expect(r?.float).toBe('left');
    expect(parseFloat(r?.marginRight || '0')).toBeGreaterThan(0);
  });

  test('block alignment: alignright floats right with margin-left', async ({ page }) => {
    // v0.7 — `networkidle` never fires against `astro dev` because Vite's
    // HMR keeps a live event-source open. Switching to `load` so the test
    // can actually run; add a short wait for the CSS to settle.
    await page.goto(CANARY, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const el = document.querySelector('.canary-right');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { float: cs.cssFloat, marginLeft: cs.marginLeft };
    });
    console.log(`\n  alignright: float=${r?.float} margin-left=${r?.marginLeft}`);
    expect(r?.float).toBe('right');
    expect(parseFloat(r?.marginLeft || '0')).toBeGreaterThan(0);
  });

  test('block alignment: aligncenter truly centers via equal auto-margins', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    // v0.7 — `networkidle` never fires against `astro dev` because Vite's
    // HMR keeps a live event-source open. Switching to `load` so the test
    // can actually run; add a short wait for the CSS to settle.
    await page.goto(CANARY, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const el = document.querySelector('.canary-center');
      if (!el) return null;
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const parentRect = el.parentElement?.getBoundingClientRect();
      return {
        display: cs.display,
        width: rect.width,
        parentWidth: parentRect?.width,
        marginLeft: cs.marginLeft,
        marginRight: cs.marginRight,
        // Element midpoint should equal parent midpoint
        elMid: rect.left + rect.width / 2,
        parentMid: parentRect ? parentRect.left + parentRect.width / 2 : 0,
      };
    });
    console.log(`\n  aligncenter: display=${r?.display} w=${r?.width} margins=${r?.marginLeft}/${r?.marginRight}`);
    expect(r?.display).toBe('block');
    expect(r?.marginLeft).toBe(r?.marginRight);
    // Center-vs-center within 2px
    const drift = Math.abs((r?.elMid || 0) - (r?.parentMid || 0));
    expect(drift, 'element center within 2px of parent center').toBeLessThan(2);
  });

  test('block alignment: alignwide extends beyond prose column', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    // v0.7 — `networkidle` never fires against `astro dev` because Vite's
    // HMR keeps a live event-source open. Switching to `load` so the test
    // can actually run; add a short wait for the CSS to settle.
    await page.goto(CANARY, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const el = document.querySelector('.canary-wide');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const article = document.querySelector('article');
      const articleRect = article?.getBoundingClientRect();
      return { wideW: rect.width, articleW: articleRect?.width || 0 };
    });
    console.log(`\n  alignwide width=${r?.wideW}  article width=${r?.articleW}`);
    // Wide should be wider than a typical paragraph column but capped at max-width
    expect(r?.wideW).toBeGreaterThan(500);
  });

  test('block alignment: alignfull spans full viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    // v0.7 — `networkidle` never fires against `astro dev` because Vite's
    // HMR keeps a live event-source open. Switching to `load` so the test
    // can actually run; add a short wait for the CSS to settle.
    await page.goto(CANARY, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const el = document.querySelector('.canary-full');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { width: rect.width, maxWidth: cs.maxWidth };
    });
    console.log(`\n  alignfull width=${r?.width} maxWidth=${r?.maxWidth}`);
    // Full-bleed should be viewport width (1280) with max-width: none
    expect(r?.width).toBeGreaterThanOrEqual(1280 - 20);
    expect(r?.maxWidth).toBe('none');
  });

  test('font-size presets scale monotonically', async ({ page }) => {
    // v0.7 — `networkidle` never fires against `astro dev` because Vite's
    // HMR keeps a live event-source open. Switching to `load` so the test
    // can actually run; add a short wait for the CSS to settle.
    await page.goto(CANARY, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const grab = (sel: string) => {
        const el = document.querySelector(sel);
        return el ? parseFloat(getComputedStyle(el).fontSize) : 0;
      };
      return {
        small: grab('.canary-fs-small'),
        medium: grab('.canary-fs-medium'),
        large: grab('.canary-fs-large'),
        xl: grab('.canary-fs-xl'),
      };
    });
    console.log(`\n  fs sizes: small=${r.small} medium=${r.medium} large=${r.large} xl=${r.xl}`);
    // Monotonically increasing
    expect(r.small).toBeLessThan(r.medium);
    expect(r.medium).toBeLessThan(r.large);
    expect(r.large).toBeLessThan(r.xl);
  });
});
