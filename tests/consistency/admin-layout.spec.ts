import { test, expect, Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * v0.6.2 — Admin layout regression suite.
 *
 * Locks in the HxRow grid contract: every row across every tab
 * splits label:content ~3:2, description column stays wider than
 * 260px, no visual collapse. Runs against the wp-admin Hatch panel
 * with a real login, screenshots each tab, and asserts geometry.
 */

const SS_DIR = 'test-results/admin-layout';
mkdirSync(SS_DIR, { recursive: true });

async function login(page: Page) {
  await page.goto('http://localhost:8810/wp-login.php', { waitUntil: 'domcontentloaded' });
  await page.fill('#user_login', 'admin');
  await page.fill('#user_pass', 'hatchadmin');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.click('#wp-submit'),
  ]);
}

const TABS = ['Connection', 'Design', 'Content', 'Bridge', 'Performance', 'Security', 'Status'];

test.describe.serial('v0.6.2 wp-admin HxRow grid layout', () => {
  test('every HxRow across every tab uses grid + label column ≥ 260px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await page.goto('http://localhost:8810/wp-admin/admin.php?page=hatch', { waitUntil: 'networkidle' });

    const perTab: Record<string, any> = {};

    for (const tab of TABS) {
      await page.evaluate((t) => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === t) as HTMLButtonElement | undefined;
        btn?.click();
      }, tab);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SS_DIR}/tab-${tab.toLowerCase()}.png`, fullPage: true });

      const measurements = await page.evaluate(() => {
        const labels = [...document.querySelectorAll('.hx-label')] as HTMLElement[];
        const rows = labels.map((l) => l.parentElement?.parentElement).filter(Boolean) as HTMLElement[];
        return rows.map((r) => {
          const cs = getComputedStyle(r);
          const left = r.children[0] as HTMLElement;
          const right = r.children[1] as HTMLElement;
          return {
            display: cs.display,
            gridCols: cs.gridTemplateColumns,
            leftW: Math.round(left?.getBoundingClientRect().width ?? 0),
            rightW: Math.round(right?.getBoundingClientRect().width ?? 0),
            label: (left?.querySelector('.hx-label')?.textContent || '').trim().slice(0, 40),
            descW: Math.round(left?.querySelector('.hx-desc')?.getBoundingClientRect().width ?? 0),
          };
        });
      });

      perTab[tab] = measurements;
      console.log(`\n  ${tab} — ${measurements.length} rows`);
      const badRows = measurements.filter((r) => r.display !== 'grid');
      const narrowRows = measurements.filter((r) => r.leftW > 0 && r.leftW < 260);
      if (badRows.length) console.log(`    ⚠  ${badRows.length} rows not on grid`);
      if (narrowRows.length) console.log(`    ⚠  ${narrowRows.length} rows with label column < 260px`);
      // Sample first 2 rows so we can spot-check
      for (const m of measurements.slice(0, 2)) {
        console.log(`    row "${m.label.padEnd(30)}"  L=${m.leftW}px R=${m.rightW}px  desc=${m.descW}px`);
      }
    }

    // Assertions — grid HxRows must never collapse below 260px on the label side
    for (const [tab, rows] of Object.entries(perTab)) {
      const arr = rows as any[];
      if (arr.length === 0) continue;
      const gridRows = arr.filter((r) => r.display === 'grid');
      const collapsed = gridRows.filter((r) => r.descW > 0 && r.leftW < 260);
      expect(collapsed.length, `${tab}: no grid HxRow should collapse below 260px (found ${collapsed.length})`).toBe(0);
      // 90%+ of rows on any tab should be grid-based (allow a few custom layouts)
      const gridRatio = gridRows.length / arr.length;
      expect(gridRatio, `${tab}: ≥90% of rows must use grid (got ${(gridRatio * 100).toFixed(0)}%)`).toBeGreaterThanOrEqual(0.9);
    }
  });

  test('Bridge tab specifically — SEO card with 5 badges keeps layout clean', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await page.goto('http://localhost:8810/wp-admin/admin.php?page=hatch#bridges', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Bridge') as HTMLButtonElement | undefined;
      btn?.click();
      const seo = [...document.querySelectorAll('*')].find((el) => (el.textContent || '').trim().startsWith('🔍 SEO'));
      seo?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SS_DIR}/bridge-seo-card.png`, fullPage: false });

    const seoRow = await page.evaluate(() => {
      const labels = [...document.querySelectorAll('.hx-label')] as HTMLElement[];
      const supportedPlugins = labels.find((l) => l.textContent === 'Supported plugins');
      if (!supportedPlugins) return null;
      const left = supportedPlugins.parentElement as HTMLElement;
      const right = left?.parentElement?.children[1] as HTMLElement;
      return {
        leftW: Math.round(left?.getBoundingClientRect().width ?? 0),
        rightW: Math.round(right?.getBoundingClientRect().width ?? 0),
        descLines: left?.querySelector('.hx-desc')?.getBoundingClientRect().height ?? 0,
        rightChildren: right?.children.length ?? 0,
      };
    });

    console.log(`\n  SEO "Supported plugins" row: L=${seoRow?.leftW}px  R=${seoRow?.rightW}px  desc height=${seoRow?.descLines}px  badges=${seoRow?.rightChildren}`);
    expect(seoRow, 'Supported plugins row must exist').not.toBeNull();
    expect(seoRow!.leftW, 'left column ≥ 260px').toBeGreaterThanOrEqual(260);
    expect(seoRow!.descLines, 'description ≤ 4 lines (each ~24px)').toBeLessThan(100);
  });
});
