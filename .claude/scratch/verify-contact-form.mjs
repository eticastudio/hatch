// verify-contact-form.mjs
// Verifies #208 fix: /contact renders native Hatch form (no .ff-btn),
// hydrates via /api/hatch-form/{provider}/{id}, submits, gets 2xx.
import { chromium } from '/Users/adityasharma/Claude Projects/Hatch/test/node_modules/playwright/index.mjs';

const BASE = process.env.HATCH_BASE || 'http://localhost:4321';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const fails = [];
const oks = [];
const record = (label, cond, extra = '') => {
  (cond ? oks : fails).push(`${cond ? 'PASS' : 'FAIL'} ${label}${extra ? ' — ' + extra : ''}`);
};

const netRequests = [];
page.on('request', (r) => {
  const u = r.url();
  if (u.includes('/api/hatch-form') || u.includes('/hatch/v1/forms')) netRequests.push({ url: u, method: r.method() });
});
const netResponses = [];
page.on('response', async (r) => {
  const u = r.url();
  if (u.includes('/api/hatch-form') || u.includes('/hatch/v1/forms')) netResponses.push({ url: u, status: r.status(), method: r.request().method() });
});

await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });

const html = await page.content();
record('no .ff-btn in served HTML', !/ff-btn/.test(html), /ff-btn/.test(html) ? 'plugin scaffold leaked' : '');
record('no .fluentform wrapper in served HTML', !/fluentform_wrapper|frm-fluent-form/.test(html));
record('has hatch-form-mount marker OR hydrated .hatch-form', /hatch-form-mount|class="[^"]*hatch-form[^"]*"/.test(html));

// Wait for hydration to swap the mount for a native <form class="hatch-form">.
try {
  await page.waitForSelector('form.hatch-form', { timeout: 8000 });
  record('native .hatch-form rendered after hydration', true);
} catch (e) {
  record('native .hatch-form rendered after hydration', false, e.message);
}

// Fill every required input the client validator will complain about.
const inputs = await page.$$('form.hatch-form [name], form.hatch-form textarea[name], form.hatch-form select[name]');
for (const el of inputs) {
  const tag = await el.evaluate((n) => n.tagName.toLowerCase());
  const type = (await el.getAttribute('type')) || '';
  const name = (await el.getAttribute('name')) || '';
  const required = await el.evaluate((n) => n.required || n.getAttribute('aria-required') === 'true');
  if (!required && type !== 'email') continue;
  if (type === 'email' || /email/i.test(name)) await el.fill('qa+hatch@example.com');
  else if (tag === 'select') { const opt = await el.$('option[value]:not([value=""])'); if (opt) await el.selectOption(await opt.getAttribute('value')); }
  else if (type === 'checkbox' || type === 'radio') await el.check().catch(() => {});
  else if (tag === 'textarea') await el.fill('Hatch verify: message body for #208 regression.');
  else await el.fill('Hatch QA');
}

const submitBtn = await page.$('form.hatch-form button.hatch-form__submit, form.hatch-form button[type="submit"], form.hatch-form [type="submit"], form.hatch-form button');
record('submit button exists (native)', !!submitBtn);

if (submitBtn) {
  const btnText = await submitBtn.evaluate((n) => n.textContent?.trim() || '');
  console.log('  submit button text:', btnText);
  await submitBtn.click();
  await page.waitForTimeout(3500);
}

const submitCall = netResponses.find((r) => /\/api\/hatch-form\/[^/]+\/\d+\/submit/.test(r.url) && r.method === 'POST');
record('POST /api/hatch-form/.../submit fired', !!submitCall, submitCall ? `status=${submitCall.status}` : '');
record('submit response is 2xx', submitCall && submitCall.status >= 200 && submitCall.status < 300, submitCall ? String(submitCall.status) : '');

const success = await page.$('form.hatch-form .hatch-form__status--success, form.hatch-form [data-hatch-form-success], .hatch-form-success');
const successText = success ? await success.evaluate((n) => n.textContent?.trim() || '') : '';
record('success message visible after submit', !!success && successText.length > 0, successText);

await browser.close();

console.log('\n--- verify-contact-form.mjs ---');
oks.forEach((l) => console.log(l));
fails.forEach((l) => console.log(l));
console.log(`\n${oks.length} pass, ${fails.length} fail\n`);
console.log('Network calls seen:');
netResponses.forEach((r) => console.log(`  ${r.method} ${r.status} ${r.url}`));
process.exit(fails.length ? 1 : 0);
