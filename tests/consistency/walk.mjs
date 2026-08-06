import { chromium } from 'playwright';
const SHOTS = '/private/tmp/claude-501/-Users-adityasharma-Claude-Projects-Hatch/f572a5b3-6081-4283-807d-7f42d864af3f/scratchpad/shots';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto('http://localhost:8810/wp-login.php');
await p.fill('#user_login', 'admin');
await p.fill('#user_pass', 'hatchadmin');
await Promise.all([p.waitForNavigation(), p.click('#wp-submit')]);
const tabs = ['connection','design','content','bridges','performance','security','status'];
for (const t of tabs) {
  await p.goto(`http://localhost:8810/wp-admin/admin.php?page=hatch#${t}`);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${SHOTS}/admin-${t}.png`, fullPage: true });
  console.log('admin', t, 'ok');
}
// wizard
for (let step=1; step<=3; step++) {
  await p.goto(`http://localhost:8810/wp-admin/admin.php?page=hatch-setup&step=${step}`);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${SHOTS}/wizard-step${step}.png`, fullPage: true });
  console.log('wizard', step, 'ok');
}
// frontend
const routes = ['/','/blog','/blog/canary-all-core-blocks/'];
for (const r of routes) {
  await p.goto('http://localhost:4321'+r);
  await p.waitForTimeout(1500);
  const slug = r.replace(/\W+/g,'_') || 'home';
  await p.screenshot({ path: `${SHOTS}/fe-light-${slug}.png`, fullPage: true });
}
// dark
await p.goto('http://localhost:4321/');
await p.evaluate(() => { document.documentElement.setAttribute('data-theme','dark'); try{localStorage.setItem('hatch-color-mode','dark');}catch(e){} });
await p.waitForTimeout(500);
await p.screenshot({ path: `${SHOTS}/fe-dark-home.png`, fullPage: true });
await b.close();
console.log('done');
