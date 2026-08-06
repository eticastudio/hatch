import { chromium } from '@playwright/test';

const OUT = '/private/tmp/claude-501/-Users-adityasharma-Claude-Projects-Hatch/f572a5b3-6081-4283-807d-7f42d864af3f/scratchpad/screenshots';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();

// Login
await p.goto('http://localhost:8810/wp-login.php', { waitUntil: 'domcontentloaded' });
await p.fill('#user_login', 'admin');
await p.fill('#user_pass', 'hatchadmin');
await Promise.all([p.waitForNavigation({ waitUntil: 'domcontentloaded' }), p.click('#wp-submit')]);

const tabs = ['connection','design','content','blocks','performance','security','status','bridges'];
for (const t of tabs) {
  await p.goto(`http://localhost:8810/wp-admin/admin.php?page=hatch#${t}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/admin-${t}.png`, fullPage: false });
}

// Wizard
for (const s of [1,2,3]) {
  await p.goto(`http://localhost:8810/wp-admin/admin.php?page=hatch-setup${s>1?`&step=${s}`:''}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/wizard-step${s}.png`, fullPage: true });
}

// Refresh mid-wizard on Step 2 to test state restore
await p.goto('http://localhost:8810/wp-admin/admin.php?page=hatch-setup&step=2', { waitUntil: 'networkidle' });
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/wizard-refresh-step2.png`, fullPage: false });

// Refresh mid-wizard to base URL - does it stay at 2 or reset?
await p.goto('http://localhost:8810/wp-admin/admin.php?page=hatch-setup', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/wizard-nostep-refresh.png`, fullPage: false });

// Frontend — dark & light
for (const mode of ['dark','light']) {
  await p.addInitScript(m => { try { localStorage.setItem('hatch-color-mode', m); } catch(e){} }, mode);
  for (const path of ['/', '/blog/', '/blog/the-case-for-headless-wordpress-in-2026/']) {
    await p.goto(`http://localhost:4321${path}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(400);
    const label = path.replace(/\//g,'_') || '_home';
    await p.screenshot({ path: `${OUT}/front-${mode}-${label}.png`, fullPage: false });
  }
}

await b.close();
console.log('done');
