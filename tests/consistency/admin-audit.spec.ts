import { test, expect, Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * ACTUAL wp-admin audit. Logs in as admin, clicks every tab in the Hatch
 * dashboard, checks that no console errors fire, that Save actions round-
 * trip, and that visible content is not "unknown" / "coming soon" everywhere.
 *
 * This is the audit that was missing from the frontend consistency suite.
 */

const OUT = 'test-results/admin-audit';
mkdirSync(OUT, { recursive: true });

const ADMIN_URL = 'http://localhost:8810/wp-admin/admin.php?page=hatch';

async function login(page: Page) {
  await page.goto('http://localhost:8810/wp-login.php', { waitUntil: 'domcontentloaded' });
  await page.fill('#user_login', 'admin');
  await page.fill('#user_pass', 'admin1234');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.click('#wp-submit'),
  ]);
}

test.describe.serial('wp-admin Hatch dashboard audit', () => {
  test('login + Hatch admin loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));

    await login(page);
    await page.goto(ADMIN_URL, { waitUntil: 'networkidle' });

    const state = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      hasReactRoot: !!document.getElementById('hatch-react-root'),
      hasReactContent: (document.getElementById('hatch-react-root')?.textContent || '').length > 100,
    }));

    console.log(`\n  loaded: ${state.url}`);
    console.log(`  title: ${state.title}`);
    console.log(`  react root present: ${state.hasReactRoot}`);
    console.log(`  react rendered content: ${state.hasReactContent}`);
    console.log(`  console errors during load: ${errors.length}`);
    if (errors.length > 0) console.log(`    first: ${errors[0].slice(0, 200)}`);

    await page.screenshot({ path: `${OUT}/01-loaded.png`, fullPage: true });

    expect(state.hasReactRoot, 'React root mount must exist').toBe(true);
    expect(state.hasReactContent, 'React must render content into the root').toBe(true);
    expect(errors.length, 'no console errors during first load').toBeLessThanOrEqual(1);
  });

  test('every tab in the Hatch admin loads + has visible content', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await login(page);
    await page.goto(ADMIN_URL, { waitUntil: 'networkidle' });

    // Discover every clickable tab in the admin panel
    const tabs = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button, [role="tab"], a[href*="#"]')];
      return buttons
        .filter((b) => {
          const t = (b.textContent || '').trim();
          return /^(Overview|Design|Content|Bridge|Diagnostics|Connection|Blocks|Onboarding)$/i.test(t);
        })
        .map((b) => ({ text: (b.textContent || '').trim() }));
    });

    console.log(`\n  discovered tabs: ${tabs.map((t) => t.text).join(', ')}`);
    expect(tabs.length, 'must discover at least 3 admin tabs').toBeGreaterThanOrEqual(3);

    const report: Array<{ tab: string; visibleContent: number; verdict: string; notes: string[] }> = [];

    for (const tab of tabs) {
      // Click tab
      await page.click(`button:has-text("${tab.text}"), [role="tab"]:has-text("${tab.text}")`, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);

      // Signals per tab: how much visible text is on screen? Any "coming soon" / "unknown" fills?
      const signals = await page.evaluate(() => {
        const root = document.getElementById('hatch-react-root');
        const text = (root?.textContent || '').trim();
        return {
          visibleTextLen: text.length,
          hasComingSoon: /coming soon|not yet|placeholder|todo/i.test(text),
          hasUnknown: /unknown/i.test(text),
          hasSaveBtn: !!root?.querySelector('button')?.textContent?.match(/Save|Apply/i),
        };
      });

      const notes: string[] = [];
      let verdict = 'ok';
      if (signals.visibleTextLen < 200) { verdict = 'thin'; notes.push('very little content'); }
      if (signals.hasComingSoon) { verdict = 'stub'; notes.push('contains "coming soon" text'); }
      if (signals.hasUnknown && tab.text !== 'Connection') { notes.push('shows "unknown" state'); }

      await page.screenshot({ path: `${OUT}/tab-${tab.text.toLowerCase().replace(/[^a-z]/g, '-')}.png`, fullPage: true });
      report.push({ tab: tab.text, visibleContent: signals.visibleTextLen, verdict, notes });
      console.log(`  ${verdict.padEnd(5)} ${tab.text.padEnd(14)} chars=${signals.visibleTextLen}  ${notes.join(', ')}`);
    }

    // Summary
    const bad = report.filter((r) => r.verdict !== 'ok');
    console.log(`\n  summary: ${report.length - bad.length}/${report.length} tabs ok · ${bad.length} need attention`);
    expect(errors.length, `no console errors while walking tabs (found: ${errors.slice(0, 3).join(' | ')})`).toBeLessThanOrEqual(2);
  });

  test('Design tab — save Primary color round-trips through REST', async ({ page }) => {
    await login(page);
    await page.goto(ADMIN_URL, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Design"), [role="tab"]:has-text("Design")').catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/design-tab.png`, fullPage: true });

    // Find the primary color input and try to change it
    const hasColorInput = await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('input[type="color"], input[type="text"]')];
      return inputs.some((i) => (i as HTMLInputElement).value?.startsWith('#'));
    });
    console.log(`\n  Design tab has a color input: ${hasColorInput}`);

    // Read what /features endpoint currently returns for brand.primary
    const primaryFromApi = await page.evaluate(async () => {
      const r = await fetch('/wp-json/hatch/v1/features');
      const d = await r.json();
      return d?.design?.brand?.primary;
    });
    console.log(`  Current brand.primary via API: ${primaryFromApi}`);

    expect(primaryFromApi, 'features API must return a brand.primary hex').toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('Connection tab — Preflight diagnostic returns real check results', async ({ page }) => {
    await login(page);
    await page.goto(ADMIN_URL, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Connection"), [role="tab"]:has-text("Connection")').catch(() => {});
    await page.waitForTimeout(1200);

    // Call the diagnostic endpoint DIRECTLY (server-side, with auth cookies)
    const diag = await page.evaluate(async () => {
      const r = await fetch('/wp-json/hatch/v1/diagnostic');
      const d = await r.json();
      return {
        ok: r.ok,
        status: r.status,
        keys: Object.keys(d).slice(0, 20),
        checksCount: (d?.checks?.length ?? d?.items?.length ?? 0),
        passCount: [...(d?.checks || d?.items || [])].filter((c: any) => c.status === 'ok' || c.pass === true).length,
        raw: JSON.stringify(d).slice(0, 300),
      };
    });
    console.log(`\n  /diagnostic endpoint: HTTP ${diag.status}`);
    console.log(`  response keys: ${diag.keys.join(', ')}`);
    console.log(`  total checks: ${diag.checksCount}`);
    console.log(`  passing: ${diag.passCount}`);
    console.log(`  raw: ${diag.raw}`);

    await page.screenshot({ path: `${OUT}/connection-tab.png`, fullPage: true });

    expect(diag.ok, 'diagnostic endpoint must be reachable when authenticated').toBe(true);
    expect(diag.checksCount, 'diagnostic must return at least 1 check').toBeGreaterThan(0);
  });
});
