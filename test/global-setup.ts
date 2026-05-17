import { chromium, FullConfig } from '@playwright/test';

export default async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto('http://localhost:8810/wp-login.php');
  await page.getByLabel('Username or Email Address').fill('admin');
  await page.getByLabel('Password', { exact: true }).fill('hatch-test-2026');
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.waitForURL(/wp-admin/);

  await ctx.storageState({ path: 'auth.json' });
  await browser.close();
}
