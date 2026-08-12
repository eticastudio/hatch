/**
 * Forms Bridge client-side validator, click-verified.
 *
 * We do not depend on the WP container here: the test injects the HatchForm
 * hydration script directly and mocks the /api/hatch-form/... proxy, so this
 * test is stable against Docker/WP state and Agent A's parallel edits.
 *
 * Assertions (matches acceptance criteria):
 *   1. Submit empty: 3 field-error slots visible, 3 inputs aria-invalid,
 *      first invalid focused, NO submit POST fires.
 *   2. Submit valid: single POST to submit endpoint, 2xx, success block.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentPath = resolve(
  __dirname,
  '..',
  '..',
  'astro-starter',
  'src',
  'components',
  'HatchForm.astro',
);

function extractRuntimeScript(): string {
  const src = readFileSync(componentPath, 'utf8');
  const m = src.match(/<script is:inline>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('Could not extract runtime script from HatchForm.astro');
  return m[1];
}

const schema = {
  ok: true,
  provider: 'fluent',
  id: 1,
  title: 'Contact',
  fields: [
    {
      name: 'names[first_name]',
      type: 'text',
      label: 'Name',
      required: true,
      rules: [{ type: 'required' }],
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      required: true,
      rules: [{ type: 'required' }, { type: 'email' }],
    },
    {
      name: 'message',
      type: 'textarea',
      label: 'Message',
      required: true,
      rules: [{ type: 'required' }, { type: 'min', value: 10 }],
    },
  ],
  submit: { url: '/api/hatch-form/fluent/1/submit', method: 'POST', button_text: 'Send' },
};

test.describe('Forms Bridge validator', () => {
  test('blocks submit on empty, paints per-field errors', async ({ page }) => {
    const runtime = extractRuntimeScript();
    let submitCalls = 0;

    await page.route('**/api/hatch-form/fluent/1', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(schema) }),
    );
    await page.route('**/api/hatch-form/fluent/1/submit', (route) => {
      submitCalls += 1;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, message: 'Thanks, received.' }),
      });
    });

    await page.route('**/hatch-test-page', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!doctype html><html><body>
          <div class="hatch-form-mount" data-hatch-form-provider="fluent" data-hatch-form-id="1"></div>
          <script>${runtime}</script>
        </body></html>`,
      }),
    );
    await page.goto('http://hatch.test/hatch-test-page');

    // Wait for hydration to swap the mount with a real form.
    await page.waitForSelector('form.hatch-form');

    // Submit empty.
    await page.click('button.hatch-form__submit');

    // Three per-field error slots become visible.
    const visibleErrors = page.locator('[data-hatch-field-error]:not([hidden])');
    await expect(visibleErrors).toHaveCount(3);

    // Three inputs get aria-invalid=true.
    const invalid = page.locator('[aria-invalid="true"]');
    await expect(invalid).toHaveCount(3);

    // First invalid input is focused.
    const firstInvalidFocused = await page.evaluate(() => {
      const first = document.querySelector('[aria-invalid="true"]');
      return first && document.activeElement === first;
    });
    expect(firstInvalidFocused).toBe(true);

    // No submit POST fired.
    expect(submitCalls).toBe(0);
  });

  test('valid input posts once and shows success', async ({ page }) => {
    const runtime = extractRuntimeScript();
    let submitCalls = 0;
    let lastBody: any = null;

    await page.route('**/api/hatch-form/fluent/1', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(schema) }),
    );
    await page.route('**/api/hatch-form/fluent/1/submit', async (route, request) => {
      submitCalls += 1;
      lastBody = JSON.parse(request.postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, message: 'Thanks, received.' }),
      });
    });

    await page.route('**/hatch-test-page', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!doctype html><html><body>
          <div class="hatch-form-mount" data-hatch-form-provider="fluent" data-hatch-form-id="1"></div>
          <script>${runtime}</script>
        </body></html>`,
      }),
    );
    await page.goto('http://hatch.test/hatch-test-page');

    await page.waitForSelector('form.hatch-form');

    await page.fill('input[name="names[first_name]"]', 'Aditya');
    await page.fill('input[name="email"]', 'aditya@example.com');
    await page.fill('textarea[name="message"]', 'Hello there this is a test message.');

    await page.click('button.hatch-form__submit');

    await expect(page.locator('.hatch-form__status--success')).toBeVisible();
    expect(submitCalls).toBe(1);
    expect(lastBody?.fields?.email).toBe('aditya@example.com');
    // Client should never have painted field errors on the valid path.
    await expect(page.locator('[data-hatch-field-error]:not([hidden])')).toHaveCount(0);
  });

  test('server-side field errors get painted per-field', async ({ page }) => {
    const runtime = extractRuntimeScript();

    await page.route('**/api/hatch-form/fluent/1', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(schema) }),
    );
    await page.route('**/api/hatch-form/fluent/1/submit', (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          errors: { email: ['Server says: already used.'] },
        }),
      }),
    );

    await page.route('**/hatch-test-page', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!doctype html><html><body>
          <div class="hatch-form-mount" data-hatch-form-provider="fluent" data-hatch-form-id="1"></div>
          <script>${runtime}</script>
        </body></html>`,
      }),
    );
    await page.goto('http://hatch.test/hatch-test-page');

    await page.waitForSelector('form.hatch-form');
    await page.fill('input[name="names[first_name]"]', 'A');
    await page.fill('input[name="email"]', 'a@b.co');
    await page.fill('textarea[name="message"]', 'A long enough message body.');
    await page.click('button.hatch-form__submit');

    const emailErr = page.locator('[data-hatch-field-error="email"]');
    await expect(emailErr).toHaveText(/already used/);
    await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-invalid', 'true');
  });
});
