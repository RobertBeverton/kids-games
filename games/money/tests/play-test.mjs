// Built-page proof for Money (minimal for now; grows in Task 16): opens the BUILT page (docs/money.html) in a real browser.
//
//   bash build.sh
//   PLAYWRIGHT_CORE=<path or URL of playwright-core's index.mjs> node games/money/tests/play-test.mjs
//   (playwright-core is deliberately not a repo dependency: `npm i playwright-core` in a scratch folder. Drives Microsoft Edge.)
//   Set PAGE=<url> to test another build. BROWSER_CHANNEL=chrome to use Chrome.
//
//  1. The page title is "Money", the shell bar is there, the heading is there.
//  2. Settings -> Which costs more? round (alternating right and wrong taps) -> results, at 360x640, with no scrolling, nothing priced before an answer.
//  3. A clean console.
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

// ---- 2. a whole round, at 360 x 640, as a five-year-old ----
const ctx2 = await browser.newContext({ viewport: { width: 360, height: 640 } });
await ctx2.addInitScript(() => {
  if (localStorage.getItem('seeded')) return;
  localStorage.setItem('seeded', '1');
  localStorage.setItem('kidsgames_players', JSON.stringify({ Kit: { name: 'Kit', manualAge: 5, theme: 'colourful-light', avatar: 0, createdAt: '2026-01-01' } }));
  localStorage.setItem('kidsgames_activePlayer', JSON.stringify('Kit'));
});
const p2 = await ctx2.newPage();
p2.on('pageerror', (e) => errors.push(String(e)));
p2.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
p2.setDefaultTimeout(4000);
await p2.goto(URL);
await p2.waitForSelector('#mo-settings');
const noScroll = async (where) => {
  const [sh, ih] = await p2.evaluate(() => [document.documentElement.scrollHeight, innerHeight]);
  check(sh <= ih, where + ': the page scrolls (' + sh + ' > ' + ih + ')');
};
check((await p2.locator('.mo-act').count()) === 5, 'settings: expected five activity tiles');
check((await p2.locator('.mo-level').count()) === 3, 'settings: expected three levels');
check((await p2.locator('.mo-act[aria-pressed="true"]').getAttribute('data-activity')) === 'guess', 'settings: a five-year-old should start on Which costs more?');
check(/Typical UK prices, checked Nov 2026./.test(await p2.locator('#mo-note').innerText()), 'settings: price note missing');
await noScroll('settings');
await p2.click('.mo-level[data-level="medium"]');
check((await p2.evaluate(() => JSON.parse(localStorage.getItem('kidsgames_money_Kit')).level)) === 'medium', 'settings: the level choice did not save');
await p2.click('.mo-level[data-level="easy"]');
await p2.click('#mo-play-btn');
for (let i = 0; i < 10; i++) {
  const q = await p2.evaluate(() => { const q = session.questions[session.index]; return { dear: q.dearId, other: q.left.id === q.dearId ? q.right.id : q.left.id }; });
  const labels = await p2.locator('.mo-item').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')));
  check(labels.every((l) => !/[0-9£]/.test(l)), 'question ' + (i + 1) + ': a button label shows a price: ' + labels.join(' | '));
  check((await p2.locator('.mo-reveal:visible').count()) === 0, 'question ' + (i + 1) + ': a reveal shows before the answer');
  const wrong = i % 2 === 1;
  await p2.click('.mo-item[data-id="' + (wrong ? q.other : q.dear) + '"]');
  check((await p2.locator('#mo-next').isVisible()) === !wrong, 'question ' + (i + 1) + ': Next should ' + (wrong ? 'wait for the right tap' : 'show'));
  if (wrong) await p2.click('.mo-item[data-id="' + q.dear + '"]');
  const box = await p2.locator('#mo-next').boundingBox();
  check(box && box.y >= 0 && box.y + box.height <= 640, 'question ' + (i + 1) + ': Next is not fully on screen');
  check((await p2.locator('.mo-tag').first().innerText()).startsWith('about'), 'question ' + (i + 1) + ': the tag should start with "about"');
  await noScroll('question ' + (i + 1));
  await p2.click('#mo-next');
}
check(await p2.locator('#mo-results').isVisible(), 'results screen did not show');
check((await p2.locator('#mo-results-title').innerText()).trim() === 'Well done!', 'results title');
// the biggest wall: sweets against a holiday is exactly 3,000 squares at 1 pound each
await p2.click('#mo-again');
await p2.evaluate(() => { session.questions[0] = { left: ITEMS.find((i) => i.id === 'sweets'), right: ITEMS.find((i) => i.id === 'holiday'), dearId: 'holiday' }; showQuestion(); });
await p2.click('.mo-item[data-id="holiday"]');
const box3 = await p2.locator('#mo-next').boundingBox();
check(box3 && box3.y + box3.height <= 640, '3,000-square wall: Next is not fully on screen');
await noScroll('3,000-square wall');
check((await p2.locator('#mo-caption').innerText()) === 'each square = £1', 'caption: ' + (await p2.locator('#mo-caption').innerText()));
check((await p2.locator('.mo-slot').first().evaluate((s) => s.getAttribute('aria-hidden'))) === 'true', 'the wall should be aria-hidden');
await p2.click('#mo-stop');
check(await p2.locator('#mo-settings').isVisible(), 'Stop did not return to settings');

check(errors.length === 0, 'console/page errors: ' + errors.slice(0, 3).join(' | '));

await browser.close();
if (failures.length) { console.error('FAIL (' + failures.length + '):\n - ' + failures.join('\n - ')); process.exit(1); }
console.log('Money play-test passed.');
