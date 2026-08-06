// Quick screenshot script — grabs current-theme frontend in both modes.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT = '/private/tmp/claude-501/-Users-adityasharma-Claude-Projects-Hatch/f572a5b3-6081-4283-807d-7f42d864af3f/scratchpad/screenshots';
mkdirSync(OUT, { recursive: true });
const paths = [
  ['home',     '/'],
  ['blog',     '/blog/'],
  ['category', '/blog/category/design'],
];
(async () => {
  const b = await chromium.launch();
  for (const mode of ['light', 'dark']) {
    const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await c.newPage();
    await p.addInitScript((m) => { try { localStorage.setItem('hatch-color-mode', m); } catch {} }, mode);
    for (const [name, url] of paths) {
      await p.goto('http://localhost:4321' + url, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1200);
      await p.screenshot({ path: `${OUT}/final-tech-${name}-${mode}.png`, fullPage: true });
      console.log(`OK ${name} ${mode}`);
    }
    await c.close();
  }
  await b.close();
})();
