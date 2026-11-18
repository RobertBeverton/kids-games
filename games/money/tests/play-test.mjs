// Built-page proof for Money (minimal for now; grows in Task 16): opens the BUILT page (docs/money.html) in a real browser.
//
//   bash build.sh
//   PLAYWRIGHT_CORE=<path or URL of playwright-core's index.mjs> node games/money/tests/play-test.mjs
//   (playwright-core is deliberately not a repo dependency: `npm i playwright-core` in a scratch folder. Drives Microsoft Edge.)
//   Set PAGE=<url> to test another build. BROWSER_CHANNEL=chrome to use Chrome.
//
//  1. The page title is "Money", the shell bar is there, the heading is there.
//  2. A clean console.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const URL = process.env.PAGE || pathToFileURL(path.join(ROOT, 'docs', 'money.html')).href;
const failures = [];
const check = (cond, m) => { if (!cond) failures.push(m); };
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge' });
const errors = [];
const page = await (await browser.newContext({ viewport: { width: 900, height: 1000 } })).newPage();
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.setDefaultTimeout(4000);
await page.goto(URL);
await page.waitForSelector('#mo-app');

check((await page.title()) === 'Money', 'page title is not "Money": ' + (await page.title()));
check((await page.locator('#kg-shell').count()) === 1, 'shell bar missing');
check((await page.locator('h1').first().innerText()).trim() === 'Money', 'heading is not "Money"');
check(errors.length === 0, 'console/page errors: ' + errors.slice(0, 3).join(' | '));

await browser.close();
if (failures.length) { console.error('FAIL (' + failures.length + '):\n - ' + failures.join('\n - ')); process.exit(1); }
console.log('Money play-test passed.');
