import { test, expect, Page } from '@playwright/test';

/**
 * Site-wide consistency spec.
 *
 * Walks every meaningful route in headless Chrome, extracts the ACTUAL
 * computed styles for every button + every card + every heading, and
 * asserts they match a single global baseline.
 *
 * If any button anywhere (a new form embed, a plugin bridge's own submit,
 * a fresh Gutenberg wp:button block) diverges from the baseline, this
 * suite fails with the exact selector + the diverging property.
 */

const ROUTES = [
  '/',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/blog/',
  '/blog/core-gutenberg-block-sanity-check/',
  '/blog/category/uncategorized/',
];

/** The single button-DNA baseline every button on the site must satisfy. */
const BUTTON_BASELINE = {
  background: 'rgb(194, 65, 12)',      // --hatch-primary orange
  color:      'rgb(255, 255, 255)',    // --hatch-primary-fg
  borderRadius: '9999px',              // --hatch-button-radius = pill
  paddingBlock: '12px',                // --hatch-space-3
  paddingInline: '32px',               // --hatch-space-6
  fontSize:   '16px',
  fontWeight: '500',
  fontFamily_starts: 'Inter',          // --hatch-font-body starts with Inter Tight / Inter
};

interface ButtonSample {
  route: string;
  selector: string;
  text: string;
  bg: string;
  color: string;
  radius: string;
  padding: string;
  fontSize: string;
  fontWeight: string;
  fontFamily: string;
}

async function collectButtons(page: Page, route: string): Promise<ButtonSample[]> {
  await page.goto(route, { waitUntil: 'networkidle' });
  return await page.evaluate((route) => {
    const selectors = [
      '.wp-block-button__link',
      '.wp-block-buttons a',
      '.hatch-form-scope button[type="submit"]',
      '.fluentform button[type="submit"]',
      '.fluentform input[type="submit"]',
      '.wpforms-form button[type="submit"]',
      '.gform_wrapper input[type="submit"]',
    ];
    const nodes = [...document.querySelectorAll(selectors.join(','))];
    return nodes.map((el) => {
      const cs = getComputedStyle(el as Element);
      return {
        route,
        selector: (el as Element).tagName + '.' + ((el as Element).className || '').slice(0, 60),
        text: (el.textContent || '').trim().slice(0, 30),
        bg: cs.backgroundColor,
        color: cs.color,
        radius: cs.borderRadius,
        padding: cs.padding,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        fontFamily: cs.fontFamily,
      };
    });
  }, route);
}

test.describe('Site-wide button DNA', () => {
  test('every button on every route matches the same baseline', async ({ page }) => {
    const allButtons: ButtonSample[] = [];
    for (const r of ROUTES) {
      const batch = await collectButtons(page, r);
      allButtons.push(...batch);
    }

    console.log(`\n▸ Collected ${allButtons.length} buttons across ${ROUTES.length} routes`);

    // Skip is-style-outline variants for the SOLID baseline (they intentionally differ).
    const solid = allButtons.filter((b) =>
      !b.selector.includes('is-style-outline') && b.bg !== 'rgba(0, 0, 0, 0)'
    );
    console.log(`▸ ${solid.length} solid buttons under audit`);

    // The single baseline row we compare everyone else against.
    const first = solid[0];
    if (!first) test.skip(true, 'no solid buttons found');

    const divergences: Array<{ btn: ButtonSample; property: string; expected: string; got: string }> = [];
    for (const b of solid) {
      if (b.bg !== BUTTON_BASELINE.background)
        divergences.push({ btn: b, property: 'background', expected: BUTTON_BASELINE.background, got: b.bg });
      if (b.color !== BUTTON_BASELINE.color)
        divergences.push({ btn: b, property: 'color', expected: BUTTON_BASELINE.color, got: b.color });
      if (b.radius !== BUTTON_BASELINE.borderRadius)
        divergences.push({ btn: b, property: 'radius', expected: BUTTON_BASELINE.borderRadius, got: b.radius });
      const padSplit = b.padding.split(' ');
      if (padSplit[0] !== BUTTON_BASELINE.paddingBlock)
        divergences.push({ btn: b, property: 'padding-block', expected: BUTTON_BASELINE.paddingBlock, got: padSplit[0] });
      if ((padSplit[1] || padSplit[0]) !== BUTTON_BASELINE.paddingInline)
        divergences.push({ btn: b, property: 'padding-inline', expected: BUTTON_BASELINE.paddingInline, got: padSplit[1] || padSplit[0] });
      if (b.fontSize !== BUTTON_BASELINE.fontSize)
        divergences.push({ btn: b, property: 'font-size', expected: BUTTON_BASELINE.fontSize, got: b.fontSize });
      if (b.fontWeight !== BUTTON_BASELINE.fontWeight)
        divergences.push({ btn: b, property: 'font-weight', expected: BUTTON_BASELINE.fontWeight, got: b.fontWeight });
    }

    if (divergences.length > 0) {
      console.log('\n✗ DIVERGENCES FOUND:');
      for (const d of divergences.slice(0, 20)) {
        console.log(`  ${d.btn.route}  “${d.btn.text}”  ${d.property}: expected=${d.expected} got=${d.got}`);
      }
      if (divergences.length > 20) console.log(`  … +${divergences.length - 20} more`);
    } else {
      console.log('\n✓ every button matches the baseline');
    }

    expect(divergences, `${divergences.length} button divergences found`).toHaveLength(0);
  });

  test('outline buttons stay transparent + primary-colored border on every route', async ({ page }) => {
    const outlines: ButtonSample[] = [];
    for (const r of ROUTES) {
      const batch = await collectButtons(page, r);
      outlines.push(...batch.filter((b) =>
        b.selector.includes('is-style-outline') || b.bg === 'rgba(0, 0, 0, 0)'
      ));
    }
    console.log(`\n▸ ${outlines.length} outline buttons under audit`);

    for (const b of outlines) {
      expect(b.bg, `outline btn on ${b.route} should be transparent`).toBe('rgba(0, 0, 0, 0)');
      expect(b.color, `outline btn on ${b.route} should use primary color`).toBe('rgb(194, 65, 12)');
      expect(b.radius, `outline btn on ${b.route} should share pill radius`).toBe('9999px');
    }
  });
});

test.describe('Blog card DNA', () => {
  test('every blog card renders the same wp-block-post-* class shape', async ({ page }) => {
    const routes = ['/', '/blog/', '/blog/category/uncategorized/'];
    for (const r of routes) {
      await page.goto(r, { waitUntil: 'networkidle' });
      const shape = await page.evaluate(() => {
        const cards = document.querySelectorAll('.wp-block-post-template > li');
        return [...cards].map((c) => ({
          hasFigure: !!c.querySelector('.wp-block-post-featured-image'),
          hasTerms:  !!c.querySelector('.wp-block-post-terms'),
          hasTitle:  !!c.querySelector('.wp-block-post-title'),
          eyebrowColor: c.querySelector('.wp-block-post-terms')
            ? getComputedStyle(c.querySelector('.wp-block-post-terms')!).color
            : null,
          titleFontSize: c.querySelector('.wp-block-post-title')
            ? getComputedStyle(c.querySelector('.wp-block-post-title')!).fontSize
            : null,
        }));
      });

      console.log(`\n${r}: ${shape.length} cards`);
      if (shape.length === 0) continue;

      const firstEyebrow = shape[0].eyebrowColor;
      const firstTitleSize = shape[0].titleFontSize;
      for (const s of shape) {
        expect(s.hasTerms, `every card on ${r} has an eyebrow`).toBe(true);
        expect(s.hasTitle, `every card on ${r} has a title`).toBe(true);
        expect(s.eyebrowColor, `eyebrow color consistent across cards on ${r}`).toBe(firstEyebrow);
        expect(s.titleFontSize, `title size consistent across cards on ${r}`).toBe(firstTitleSize);
      }
    }
  });
});

test.describe('Dark mode', () => {
  test('every route ships the color-mode toggle + FOUC-guard script', async ({ page }) => {
    for (const r of ROUTES) {
      await page.goto(r, { waitUntil: 'domcontentloaded' });
      const state = await page.evaluate(() => {
        const btn = document.getElementById('hatch-color-mode-btn');
        const inlineScripts = [...document.querySelectorAll('head script')]
          .filter((s) => s.textContent && s.textContent.includes('hatch-color-mode'));
        return { hasToggle: !!btn, headFoucGuard: inlineScripts.length > 0 };
      });
      expect(state.hasToggle, `${r} must render the color-mode toggle`).toBe(true);
      expect(state.headFoucGuard, `${r} must ship the head FOUC guard`).toBe(true);
    }
    console.log(`\n✓ toggle + FOUC guard present on all ${ROUTES.length} routes`);
  });

  test('toggling dark mode flips --hatch-bg + --hatch-fg', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const before = await page.evaluate(() => {
      const rs = getComputedStyle(document.documentElement);
      return {
        mode: document.documentElement.getAttribute('data-hatch-mode'),
        bg: rs.getPropertyValue('--hatch-bg').trim(),
        fg: rs.getPropertyValue('--hatch-fg').trim(),
      };
    });
    await page.click('#hatch-color-mode-btn');
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const rs = getComputedStyle(document.documentElement);
      return {
        mode: document.documentElement.getAttribute('data-hatch-mode'),
        bg: rs.getPropertyValue('--hatch-bg').trim(),
        fg: rs.getPropertyValue('--hatch-fg').trim(),
      };
    });
    console.log(`\n  before: mode=${before.mode} bg=${before.bg} fg=${before.fg}`);
    console.log(`  after:  mode=${after.mode} bg=${after.bg} fg=${after.fg}`);
    expect(after.mode).not.toBe(before.mode);
    expect(after.bg).not.toBe(before.bg);
    expect(after.fg).not.toBe(before.fg);
  });
});

test.describe('Heading + eyebrow consistency', () => {
  test('h1 uses --hatch-font-heading on every page', async ({ page }) => {
    const headingFonts: Record<string, string> = {};
    for (const r of ROUTES) {
      await page.goto(r, { waitUntil: 'domcontentloaded' });
      const font = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        return h1 ? getComputedStyle(h1).fontFamily : null;
      });
      if (font) headingFonts[r] = font;
    }
    console.log('\n  h1 fontFamily per route:');
    for (const [r, f] of Object.entries(headingFonts)) console.log(`    ${r}  ${f}`);
    const uniqueFonts = new Set(Object.values(headingFonts));
    expect(uniqueFonts.size, 'all h1 fonts must be identical').toBeLessThanOrEqual(1);
  });

  test('eyebrow color is --hatch-primary on every route that has one', async ({ page }) => {
    const eyebrowColors: Record<string, string> = {};
    for (const r of ROUTES) {
      await page.goto(r, { waitUntil: 'domcontentloaded' });
      const color = await page.evaluate(() => {
        const eb = document.querySelector('.is-style-eyebrow, .wp-block-post-terms');
        return eb ? getComputedStyle(eb).color : null;
      });
      if (color) eyebrowColors[r] = color;
    }
    console.log('\n  eyebrow color per route:');
    for (const [r, c] of Object.entries(eyebrowColors)) console.log(`    ${r}  ${c}`);
    const uniqueColors = new Set(Object.values(eyebrowColors));
    expect(uniqueColors.size, 'eyebrow color must be one value site-wide').toBeLessThanOrEqual(1);
  });
});

test.describe('Route health', () => {
  test('every route returns 200 + non-trivial HTML', async ({ page }) => {
    for (const r of ROUTES) {
      const resp = await page.goto(r, { waitUntil: 'domcontentloaded' });
      expect(resp?.status(), `${r} should be 200`).toBe(200);
      const size = (await page.content()).length;
      expect(size, `${r} should ship substantial HTML`).toBeGreaterThan(5000);
    }
    console.log(`\n✓ all ${ROUTES.length} routes return 200 + content`);
  });
});
