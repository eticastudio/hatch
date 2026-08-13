// Verify the guest comment form renders and posts successfully on the docs theme
// blog single page. No login. Fills valid data, submits, asserts success.
import { chromium } from '/Users/adityasharma/Claude Projects/Hatch/test/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const ASTRO  = process.env.ASTRO || 'http://localhost:4321';
const SLUG   = process.env.SLUG  || '/blog/canary-all-core-blocks';
const OUTDIR = '/Users/adityasharma/Claude Projects/Hatch/docs/screenshots/blog-comments';
mkdirSync(OUTDIR, { recursive: true });

let failed = false;
const log = (ok, msg) => {
  if (!ok) failed = true;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

// Fresh page, no login
await ctx.clearCookies();
const resp = await page.goto(`${ASTRO}${SLUG}`, { waitUntil: 'networkidle' });
log(resp && resp.ok(), `GET ${SLUG} ${resp && resp.status()}`);

// Form + fields exist
const form   = await page.$('#hatch-comment-form');
const name   = await page.$('#hatch-comment-form input[name="author"]');
const email  = await page.$('#hatch-comment-form input[name="email"]');
const body   = await page.$('#hatch-comment-form textarea[name="content"]');
const submit = await page.$('#hatch-comment-form button[type="submit"]');
log(!!form,   'form#hatch-comment-form present');
log(!!name,   'input[name=author] present');
log(!!email,  'input[name=email] present');
log(!!body,   'textarea[name=content] present');
log(!!submit, 'submit button present');

await page.screenshot({ path: `${OUTDIR}/01-form-visible.png`, fullPage: true });

// Fill + submit
const stamp = Date.now();
await name.fill('Guest Verifier');
await email.fill(`verify+${stamp}@example.com`);
await body.fill(`Automated verify at ${new Date().toISOString()}. Confirming the guest comment flow.`);

// Wait for the POST + form status update
const [postResp] = await Promise.all([
  page.waitForResponse(r => r.url().includes('/api/hatch-comments/post') && r.request().method() === 'POST', { timeout: 15000 }),
  submit.click(),
]);
log(postResp.status() >= 200 && postResp.status() < 300, `POST /api/hatch-comments/post ${postResp.status()}`);

// Status message should transition to a success line
await page.waitForFunction(() => {
  const el = document.querySelector('[data-hatch-form-status]');
  if (!el) return false;
  const t = (el.textContent || '').trim();
  return t.length > 0 && t !== 'Posting...';
}, { timeout: 10000 });

const status = (await page.textContent('[data-hatch-form-status]')) || '';
const okMsg  = /posted|moderation/i.test(status);
log(okMsg, `status message: "${status.trim()}"`);

await page.screenshot({ path: `${OUTDIR}/02-after-submit.png`, fullPage: true });
await page.screenshot({ path: `${OUTDIR}/verified.png`, fullPage: true });

await browser.close();
if (failed) process.exit(1);
console.log('\nAll checks passed.');
