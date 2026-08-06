import { chromium } from 'playwright';
const SHOTS = '/private/tmp/claude-501/-Users-adityasharma-Claude-Projects-Hatch/f572a5b3-6081-4283-807d-7f42d864af3f/scratchpad/shots';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1440,height:900}, colorScheme:'dark' })).newPage();
await p.goto('http://localhost:4321/');
await p.waitForTimeout(1500);
// try click theme toggle in top right
await p.evaluate(() => {
  const btn = document.querySelector('[data-theme-toggle], .theme-toggle, button[aria-label*="dark" i], button[aria-label*="theme" i]');
  if (btn) btn.click();
});
await p.waitForTimeout(500);
await p.screenshot({ path: `${SHOTS}/fe-dark-home.png`, fullPage: true });
console.log('dark mode class:', await p.evaluate(()=>document.documentElement.className+'|'+document.documentElement.dataset.theme));
await b.close();
