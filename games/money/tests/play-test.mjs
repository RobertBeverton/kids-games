// Built-page proof for Money (minimal for now; grows in Task 16): opens the BUILT page (docs/money.html) in a real browser.
//
//   bash build.sh
//   PLAYWRIGHT_CORE=<path or URL of playwright-core's index.mjs> node games/money/tests/play-test.mjs
//   (playwright-core is deliberately not a repo dependency: `npm i playwright-core` in a scratch folder. Drives Microsoft Edge.)
//   Set PAGE=<url> to test another build. BROWSER_CHANNEL=chrome to use Chrome.
//
//  1. The page title is "Money", the shell bar is there, the heading is there.
//  2. Settings -> Which costs more? round (alternating right and wrong taps) -> results, at 360x640, with no scrolling, nothing priced before an answer.
//  3. Put in order and Can you buy it?, every level, ten questions each, right path and wrong path, worked out from the SOURCE items and the
//     engine (not from page text): right taps accepted, wrong ones refused or marked, Next only when it should, no price or order number before
//     the answer in Put in order, prices shown in Can you buy it?, results, Next/Done in view at 360x640.
//  4. How many £1 coins? and What's the price?, every level, ten questions each, right path and wrong path: counts and tiles checked against
//     the SOURCE items and engine, nothing hinted before the tap, points and the ring after it, totals, the saved best, "New best!" only when
//     an earlier best above 0 was beaten, no score anywhere in the other four activities' results.
//  5. Progress and saving: one finished round is one hub square (KidsGames.progress.money), Stop adds none but keeps the misses already made,
//     saves survive a reload and belong to the player, corrupt storage still lets the game start.
//  6. No visible text or label anywhere contains afford/cheap/expensive/rich/poor/posh/dear.
//  7. A clean console.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const URL = process.env.PAGE || pathToFileURL(path.join(ROOT, 'docs', 'money.html')).href;
const SRC = pathToFileURL(path.join(ROOT, 'games', 'money', 'js')).href;
const { ITEMS } = await import(SRC + '/items.js');
const { LEVEL_IDS, ROUND_LENGTH, SORT, BUY, buyable, tooDear, sortMissesFor, priceTagText, formatPrice, howManyPool, wallFor, niceRound, pointsFor, MAX_POINTS, PRICE_TILES, PRICE_MIN_TILE, PRICE_MAX_TILE } = await import(SRC + '/engine.js');
const failures = [];
let checks = 0;
const check = (cond, m) => { checks++; if (!cond) failures.push(m); };
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


// ---- 3 and 4: Put in order and Can you buy it?, every level ----
const BANNED = /\b(afford\w*|cheap\w*|expensive|rich|poor|posh)\b/i;
const itemOf = (id) => ITEMS.find((i) => i.id === id);
const saved = () => p2.evaluate(() => JSON.parse(localStorage.getItem('kidsgames_money_Kit')));
const bannedCheck = async (where) => {
  const text = await p2.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('[aria-label],[title]')].map((e) => (e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || '')).join(' '));
  check(!BANNED.test(text), where + ': banned word on screen: ' + (BANNED.exec(text) || [''])[0]);
};
const inView = async (sel, where) => {
  const b = await p2.locator(sel).boundingBox();
  check(b && b.y >= 0 && b.y + b.height <= 640 && b.x >= 0 && b.x + b.width <= 360, where + ': ' + sel + ' is not fully on screen');
};
const startActivity = async (activity, level) => {
  if (await p2.locator('#mo-results').isVisible()) await p2.click('#mo-change');
  else if (await p2.locator('#mo-game').isVisible()) await p2.click('#mo-stop');
  await p2.click('.mo-act[data-activity="' + activity + '"]');
  await p2.click('.mo-level[data-level="' + level + '"]');
  await bannedCheck('settings ' + activity);
  await p2.click('#mo-play-btn');
};
check((await p2.locator('.mo-act[data-activity="sort"] .mo-act__name').innerText()) === 'Put in order', 'settings: the sort tile should be named "Put in order"');

for (const level of LEVEL_IDS) {
  await startActivity('sort', level);
  for (let i = 0; i < ROUND_LENGTH; i++) {
    const where = 'sort ' + level + ' q' + (i + 1);
    const ids = await p2.locator('.mo-sitem').evaluateAll((bs) => bs.map((b) => b.dataset.id));
    const order = ids.slice().sort((a, b) => itemOf(a).pence - itemOf(b).pence);
    check(ids.length === SORT[level].n, where + ': expected ' + SORT[level].n + ' items, got ' + ids.length);
    check((await p2.locator('.mo-slots .mo-snum').count()) === ids.length, where + ': numbered slots missing');
    // nothing priced or numbered before the set is finished (the slot numbers themselves are the only digits allowed)
    const leaks = await p2.evaluate(() => {
      const root = document.getElementById('mo-sort'), out = [];
      const clone = root.cloneNode(true);
      clone.querySelectorAll('.mo-snum').forEach((n) => n.remove());
      if (/[0-9£]|about|which is/i.test(clone.textContent)) out.push('text: ' + clone.textContent);
      for (const el of [root, ...root.querySelectorAll('*')]) {
        if (el.closest('svg')) continue;   // drawing geometry is numbers, not content
        for (const a of el.attributes) {
          if (a.name === 'data-id' || a.name === 'class' || a.name === 'type') continue;
          if (/[0-9£]/.test(a.value) || /about/i.test(a.value)) out.push(el.tagName + ' ' + a.name + '=' + a.value);
        }
      }
      return out;
    });
    check(leaks.length === 0, where + ': leak before answering: ' + leaks.slice(0, 2).join(' | '));
    check((await p2.locator('#mo-prompt').innerText()).includes('Tap the one that costs least.'), where + ': prompt text');
    const wrongPath = i % 2 === 1;
    const log = [];
    if (wrongPath) {
      // a wrong tap at position 0 (twice), then another wrong tap at position 1
      const bad = ids.find((id) => id !== order[0]);
      log.push({ position: 0, tappedId: bad });
      await p2.click('.mo-sitem[data-id="' + bad + '"]');
      check((await p2.locator('.mo-sbody .mo-sitem').count()) === 0, where + ': a wrong tap was accepted');
      check((await p2.locator('.mo-sitem[data-id="' + bad + '"].is-wrong').count()) === 1, where + ': wrong item not marked');
      check((await p2.locator('#mo-prompt').innerText()).includes('Not this one'), where + ': wrong tap should say "Not this one"');
      check(!(await p2.locator('#mo-next').isVisible()), where + ': Next showed early');
      await p2.click('.mo-sitem[data-id="' + bad + '"]');   // the same wrong tap again: still refused, still one miss at this position
      log.push({ position: 0, tappedId: bad });
    }
    for (let k = 0; k < order.length; k++) {
      if (wrongPath && k === 1 && order.length > 2) {
        const bad2 = order[order.length - 1];
        log.push({ position: 1, tappedId: bad2 });
        await p2.click('.mo-sitem[data-id="' + bad2 + '"]');
        check((await p2.locator('.mo-sbody .mo-sitem').count()) === 1, where + ': a second wrong tap was accepted');
      }
      log.push({ position: k, tappedId: order[k] });
      if (i === 0 && k === 0) { await p2.locator('.mo-sitem[data-id="' + order[0] + '"]').focus(); await p2.keyboard.press('Enter'); }   // keyboard: Enter works
      else await p2.click('.mo-sitem[data-id="' + order[k] + '"]');
      check((await p2.locator('.mo-sbody .mo-sitem').count()) === k + 1, where + ': right tap ' + (k + 1) + ' was not placed');
      check((await p2.locator('#mo-next').isVisible()) === (k === order.length - 1), where + ': Next visibility after tap ' + (k + 1));
    }
    // reveal: the correct order with tags, walls for the two ends only
    const placedIds = await p2.locator('.mo-slots .mo-sitem').evaluateAll((bs) => bs.map((b) => b.dataset.id));
    check(placedIds.join() === order.join(), where + ': slots are not in price order');
    const tags = await p2.locator('.mo-slots .mo-tag').allInnerTexts();
    check(tags.join('|') === order.map((id) => priceTagText(itemOf(id).pence)).join('|'), where + ': tags are wrong: ' + tags.join(' | '));
    check(tags.every((t) => t.startsWith('about')), where + ': a tag does not start with "about"');
    check((await p2.locator('.mo-walls .mo-slot').count()) === 2, where + ': walls should be for the two ends only');
    check(await p2.locator('.mo-walls .mo-slot').evaluateAll((ss) => ss.every((x) => x.clientWidth > 0 && x.clientHeight > 0 && x.getAttribute('aria-hidden') === 'true')), where + ': a wall slot has no size or is not aria-hidden');
    check(/^each square = £/.test(await p2.locator('#mo-caption').innerText()), where + ': caption');
    const expectedMisses = sortMissesFor({ order }, log);
    const sv = await saved();
    check(expectedMisses.every((id) => sv.misses[id] >= 1), where + ': misses not recorded: ' + expectedMisses.join());
    if (!wrongPath) check(expectedMisses.length === 0, where + ': a clean set should have no misses');
    await inView('#mo-next', where);
    await noScroll(where);
    await bannedCheck(where);
    await p2.click('#mo-next');
  }
  check(await p2.locator('#mo-results').isVisible(), 'sort ' + level + ': results did not show');
  await bannedCheck('sort results');
}

for (const level of LEVEL_IDS) {
  await startActivity('buy', level);
  for (let i = 0; i < ROUND_LENGTH; i++) {
    const where = 'buy ' + level + ' q' + (i + 1);
    const ids = await p2.locator('.mo-bitem').evaluateAll((bs) => bs.map((b) => b.dataset.id));
    const budget = await p2.evaluate(() => session.questions[session.index].budget);
    const can = ids.filter((id) => buyable(itemOf(id), level, budget)), dear = ids.filter((id) => tooDear(itemOf(id), level, budget));
    check(ids.length === BUY[level].shelf, where + ': expected ' + BUY[level].shelf + ' items');
    check(can.length >= 1 && dear.length >= 1 && can.length + dear.length === ids.length, where + ': shelf is not clearly buyable/too dear');
    check((await p2.locator('.mo-wallet__sum').innerText()) === formatPrice(budget), where + ': budget numerals');
    check((await p2.locator('#mo-prompt').innerText()).includes('Tap everything you can buy.'), where + ': prompt text');
    for (const id of ids) {
      const tagText = await p2.locator('.mo-bitem[data-id="' + id + '"] .mo-bitem__price').innerText();
      check(tagText === 'about ' + formatPrice(itemOf(id).pence), where + ': the price tag of ' + id + ' is "' + tagText + '"');
    }
    check((await p2.locator('.mo-bitem[aria-pressed="false"]').count()) === ids.length, where + ': items should start unselected');
    check(await p2.locator('#mo-done').isDisabled(), where + ': Done should be disabled with nothing selected');
    check(!(await p2.locator('#mo-next').isVisible()), where + ': Next showed before Done');
    await inView('#mo-done', where);
    await noScroll(where);
    await bannedCheck(where);
    // toggling on and off
    await p2.click('.mo-bitem[data-id="' + ids[0] + '"]');
    check((await p2.locator('.mo-bitem[data-id="' + ids[0] + '"]').getAttribute('aria-pressed')) === 'true' && !(await p2.locator('#mo-done').isDisabled()), where + ': selecting did not enable Done');
    await p2.click('.mo-bitem[data-id="' + ids[0] + '"]');
    check(await p2.locator('#mo-done').isDisabled(), where + ': deselecting everything should disable Done again');
    const wrongPath = i % 2 === 1;
    const choice = wrongPath ? [dear[0]] : can;   // wrong path: tap only something too dear (chosen wrongly, and everything buyable missed)
    for (const id of choice) {
      if (i === 0 && id === choice[0]) { await p2.locator('.mo-bitem[data-id="' + id + '"]').focus(); await p2.keyboard.press('Space'); }   // keyboard: Space toggles
      else await p2.click('.mo-bitem[data-id="' + id + '"]');
    }
    check((await p2.locator('.mo-bitem[aria-pressed="true"]').count()) === choice.length, where + ': selected count');
    const before = (await saved()).misses;
    await p2.click('#mo-done');
    check(await p2.locator('#mo-done').isHidden(), where + ': Done should go after it is pressed');
    check(await p2.locator('#mo-next').isVisible(), where + ': Next should show after Done');
    for (const id of ids) {
      const st = (await p2.locator('.mo-bitem[data-id="' + id + '"] .mo-bitem__status').innerText()).split('\n')[0].trim();
      check(st === (can.includes(id) ? 'Can buy' : 'Not enough'), where + ': ' + id + ' status is "' + st + '"');
    }
    const flagged = await p2.locator('.mo-bitem.is-flag').count();
    check(flagged === (wrongPath ? 1 + can.length : 0), where + ': flagged items ' + flagged);
    const after = (await saved()).misses;
    const expectedMiss = wrongPath ? [dear[0], ...can] : [];
    check(expectedMiss.every((id) => (after[id] || 0) > (before[id] || 0)), where + ': misses not recorded');
    check(wrongPath || JSON.stringify(after) === JSON.stringify(before), where + ': a right answer should record nothing');
    check((await p2.locator('#mo-prompt').innerText()).startsWith(wrongPath ? 'Not quite' : 'Right'), where + ': verdict word');
    await inView('#mo-next', where);
    await noScroll(where);
    await bannedCheck(where);
    await p2.click('#mo-next');
  }
  check(await p2.locator('#mo-results').isVisible(), 'buy ' + level + ': results did not show');
  await bannedCheck('buy results');
}
await p2.click('#mo-change');

// ---- 5 and 6: How many £1 coins? and What's the price?, every level; results, progress and saving ----
const itemByName = (n) => ITEMS.find((i) => i.name === n);
const progressCount = () => p2.evaluate(() => (JSON.parse(localStorage.getItem('kidsgames_progress_Kit')) || {}).money || 0);
const missTotal = async () => Object.values((await saved()).misses || {}).reduce((a, b) => a + b, 0);
const parsePence = (t) => (t.endsWith('p') ? parseInt(t, 10) : Math.round(parseFloat(t.slice(1).replace(/,/g, '')) * 100));
const pointsWord = (n) => n + (n === 1 ? ' point' : ' points');
// Before the tap, the pane may carry only these attributes: no title, alt, data-* (bar data-i, the tile's own index) or aria-label with a hint.
const attrLeaks = (sel) => p2.evaluate((sel) => {
  const root = document.querySelector(sel), out = [], ok = new Set(['class', 'type', 'data-i', 'hidden', 'aria-hidden', 'role', 'id', 'aria-label']);
  for (const el of [root, ...root.querySelectorAll('*')]) {
    if (el.closest('svg')) continue;
    for (const a of el.attributes) if (!ok.has(a.name)) out.push(el.tagName + ' ' + a.name + '=' + a.value);
    if (el.hasAttribute('aria-label') && el !== root && !el.classList.contains('mo-count')) out.push(el.tagName + ' aria-label=' + el.getAttribute('aria-label'));
  }
  return out;
}, sel);

const hmBest = {};
for (const level of LEVEL_IDS) {
  const before = await progressCount();
  await startActivity('howmany', level);
  const pool = howManyPool(ITEMS, level), seen = new Set();
  for (let i = 0; i < ROUND_LENGTH; i++) {
    const where = 'howmany ' + level + ' q' + (i + 1);
    const item = itemByName((await p2.locator('.mo-subject__name').innerText()).trim());
    check(item && pool.includes(item), where + ': the item is not in the level pool');
    if (!item) continue;
    check(!seen.has(item.id), where + ': ' + item.id + ' came up twice in a round');
    seen.add(item.id);
    const texts = await p2.locator('.mo-count').allInnerTexts(), labels = await p2.locator('.mo-count').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')));
    const nums = texts.map((t) => Number(t.replace(/,/g, ''))), right = item.pence / 100;
    check(texts.length === 3 && new Set(nums).size === 3, where + ': expected three different counts: ' + texts.join(' | '));
    check(nums.includes(right), where + ': the right count ' + right + ' is not among ' + texts.join(' | '));
    check(texts.every((t, k) => t === nums[k].toLocaleString('en-GB')) && labels.join() === texts.join(), where + ': counts need thousands commas, and labels must be the number only: ' + labels.join(' | '));
    check((await p2.locator('#mo-prompt').innerText()).trim() === 'About how many £1 coins is this?', where + ': prompt');
    const leaks = await attrLeaks('#mo-howmany');
    check(leaks.length === 0, where + ': leak before answering: ' + leaks.slice(0, 2).join(' | '));
    check((await p2.locator('#mo-howmany .mo-reveal').isVisible()) === false && !(await p2.locator('#mo-next').isVisible()), where + ': a reveal or Next shows before the answer');
    check(!/about|which is|each square/i.test(await p2.locator('#mo-howmany').innerText() + ' ' + (await p2.locator('#mo-caption').isVisible() ? await p2.locator('#mo-caption').innerText() : '')), where + ': price words before the answer');
    await bannedCheck(where);
    const rightIdx = nums.indexOf(right), wrongIdx = nums.map((n, k) => k).filter((k) => k !== rightIdx);
    const missesBefore = await missTotal();
    if (i % 2 === 1) {
      await p2.locator('.mo-count').nth(wrongIdx[0]).click();
      check(!(await p2.locator('#mo-next').isVisible()), where + ': Next showed after a wrong count');
      check((await p2.locator('.mo-count.is-wrong').count()) === 1 && (await p2.locator('.mo-count').nth(rightIdx).getAttribute('class')).includes('is-hint'), where + ': wrong count not marked or right one not shown');
      check((await p2.locator('#mo-prompt').innerText()).includes('Not this one'), where + ': wrong tap should say "Not this one"');
      check(await p2.locator('#mo-howmany .mo-reveal').isVisible(), where + ': the reveal should show right away');
      check((await missTotal()) === missesBefore + 1 && (await saved()).misses[item.id] >= 1, where + ': the miss was not saved');
      await p2.locator('.mo-count').nth(wrongIdx[1]).click();   // another wrong count: still refused, no second miss
      check(!(await p2.locator('#mo-next').isVisible()) && (await missTotal()) === missesBefore + 1, where + ': a second wrong tap should change nothing');
    }
    if (i === 0) { await p2.locator('.mo-count').nth(rightIdx).focus(); await p2.keyboard.press('Enter'); }   // keyboard: Enter works
    else await p2.locator('.mo-count').nth(rightIdx).click();
    check(await p2.locator('#mo-next').isVisible(), where + ': Next should show after the right count');
    check(i % 2 === 1 || (await missTotal()) === missesBefore, where + ': a right answer should record nothing');
    check((await p2.locator('.mo-count.is-right').count()) === 1 && (await p2.locator('.mo-count:not(:disabled)').count()) === 0, where + ': the right count is not marked, or counts are still live');
    check((await p2.locator('#mo-howmany .mo-tag').innerText()) === priceTagText(item.pence), where + ': tag is "' + (await p2.locator('#mo-howmany .mo-tag').innerText()) + '"');
    check((await p2.locator('#mo-caption').innerText()) === 'each square = ' + formatPrice(wallFor([item.pence]).unit), where + ': caption');
    check((await p2.locator('#mo-howmany .mo-slot').count()) === 1 && await p2.locator('#mo-howmany .mo-slot').evaluate((x) => x.clientWidth > 0 && x.clientHeight > 0 && x.getAttribute('aria-hidden') === 'true'), where + ': the wall slot should be one, sized and aria-hidden');
    await inView('#mo-next', where);
    await noScroll(where);
    await bannedCheck(where);
    await p2.click('#mo-next');
  }
  check(await p2.locator('#mo-results').isVisible(), 'howmany ' + level + ': results did not show');
  check((await progressCount()) === before + 1, 'howmany ' + level + ': a finished round should add exactly one progress square');
  check(await p2.locator('#mo-score').isHidden() && await p2.locator('#mo-best').isHidden() && !/point|best|out of|\d/i.test(await p2.locator('#mo-results').innerText()), 'howmany ' + level + ': results must show no score');
  await bannedCheck('howmany results');
}
// the biggest and the smallest walls, at 360 x 640: a £275,000 house (a £100 square) and a £3 item (three squares)
await startActivity('howmany', 'hard');
for (const [id, wantUnit, wantSquares] of [['house', 10000, null], ['ice-cream', 100, 3]]) {
  await p2.evaluate((id) => { const it = ITEMS.find((i) => i.id === id); session.questions[session.index] = { item: it, options: [it.pence / 100 * 10, it.pence / 100, it.pence / 1000 < 1 ? it.pence / 100 * 100 : it.pence / 1000], correctCount: it.pence / 100 }; showQuestion(); }, id);
  await p2.locator('.mo-count').nth(1).click();
  check((await p2.locator('#mo-caption').innerText()) === 'each square = ' + formatPrice(wantUnit), id + ': caption ' + (await p2.locator('#mo-caption').innerText()));
  const squares = await p2.evaluate(() => [...document.querySelectorAll('#mo-howmany .mo-wall')].reduce((n, w) => { const c = parseFloat(w.style.getPropertyValue('--c')); return n + (c ? Math.round(w.offsetWidth / c) * Math.round(w.offsetHeight / c) : 0); }, 0));
  if (wantSquares) check(squares === wantSquares, id + ': expected ' + wantSquares + ' squares, got ' + squares);
  else check(squares === 2750 || (await p2.locator('#mo-howmany .mo-wall--solid').count()) >= 1, id + ': the house wall is neither 2,750 squares nor one solid block');
  await inView('#mo-next', id + ' wall');
  await noScroll(id + ' wall');
  const slotBox = await p2.locator('#mo-howmany .mo-slot').boundingBox();
  check(slotBox && slotBox.height >= 56, id + ': the wall slot is too small: ' + (slotBox && slotBox.height));
  check((await p2.locator('#mo-howmany .mo-tag').innerText()).startsWith('about £'), id + ': tag');
}

// ---- What's the price? ----
let expectedBest = { easy: 0, medium: 0, hard: 0 };
// Plays one whole round. path: 'mixed' (right tile on even questions, the worst on odd), 'best' or 'worst'. Returns the expected total.
const playPrice = async (level, path) => {
  const before = await progressCount();
  await startActivity('price', level);
  let total = 0;
  const seen = new Set();
  for (let i = 0; i < ROUND_LENGTH; i++) {
    const where = 'price ' + level + ' ' + path + ' q' + (i + 1);
    const item = itemByName((await p2.locator('.mo-subject__name').innerText()).trim());
    check(!!item, where + ': unknown item');
    if (!item) continue;
    check(!seen.has(item.id), where + ': ' + item.id + ' came up twice');
    seen.add(item.id);
    const texts = (await p2.locator('.mo-ptile .mo-ptile__price').allInnerTexts()).map((t) => t.trim()), pence = texts.map(parsePence);
    const base = niceRound(item.pence);
    check(texts.length === PRICE_TILES, where + ': expected six tiles, got ' + texts.length);
    check(pence.every((v, k) => k === 0 || v > pence[k - 1]), where + ': tiles do not rise: ' + texts.join(' | '));
    check(pence.includes(base), where + ': the typical price ' + base + ' (' + formatPrice(base) + ') is not among ' + texts.join(' | '));
    check(pence.every((v) => v >= PRICE_MIN_TILE && v <= PRICE_MAX_TILE), where + ': a tile is outside 20p to £2,000,000: ' + texts.join(' | '));
    check(texts.every((t, k) => t === formatPrice(pence[k])), where + ': a tile is not a formatPrice string: ' + texts.join(' | '));
    const pts = pence.map((v) => pointsFor(item, v)), bestIdx = pence.indexOf(base);
    check(pts.filter((x) => x === MAX_POINTS).length <= 3 && pts.some((x) => x <= 1), where + ': fairness: at most three full-points tiles, and one that earns 0 or 1');
    check((await p2.locator('#mo-prompt').innerText()).trim() === 'What is the price?', where + ': prompt');
    // nothing marks a tile before the tap
    const leaks = await attrLeaks('#mo-price');
    check(leaks.length === 0, where + ': leak before answering: ' + leaks.slice(0, 2).join(' | '));
    check((await p2.locator('.mo-ptile__pts:visible').count()) === 0 && (await p2.locator('.mo-ptile.is-best, .mo-ptile.is-chosen').count()) === 0, where + ': points or a ring show before the tap');
    check((await p2.locator('.mo-ptile[aria-label]').count()) === 0, where + ': a tile has an aria-label before the tap');
    check((await p2.locator('#mo-price .mo-walls').isVisible()) === false && !(await p2.locator('#mo-next').isVisible()), where + ': a reveal or Next before the tap');
    check((await p2.locator('#mo-points').innerText()) === 'Points: ' + total, where + ': running total shows "' + (await p2.locator('#mo-points').innerText()) + '", expected ' + total);
    // six tiles in a grid: at 360 wide, three rows of two; every tile at least 48px tall, its text inside it
    const geo = await p2.locator('.mo-ptile').evaluateAll((bs) => bs.map((b) => { const r = b.getBoundingClientRect(), t = b.querySelector('.mo-ptile__price').getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), h: r.height, textInside: t.left >= r.left - 0.5 && t.right <= r.right + 0.5 && t.width <= b.clientWidth }; }));
    check(geo.every((g) => g.h >= 48 && g.textInside), where + ': a tile is under 48px tall or its text is clipped: ' + JSON.stringify(geo.find((g) => g.h < 48 || !g.textInside)));
    check(new Set(geo.map((g) => g.y)).size === 3 && geo.filter((g) => g.y === geo[0].y).length === 2, where + ': at 360 wide the tiles should be three rows of two');
    await bannedCheck(where);
    const worst = pts.indexOf(Math.min(...pts)), pick = path === 'best' ? bestIdx : path === 'worst' ? worst : (i % 2 === 1 ? worst : bestIdx);
    const missesBefore = await missTotal();
    if (i === 0 && level === 'easy' && path === 'mixed') { await p2.locator('.mo-ptile').nth(pick).focus(); await p2.keyboard.press('Space'); }   // keyboard: Space works
    else await p2.locator('.mo-ptile').nth(pick).click();
    total += pts[pick];
    // after the tap: points on every tile, ring on the typical price, keyline on the pick
    const shownPts = await p2.locator('.mo-ptile__pts').evaluateAll((es) => es.map((e) => ({ digit: e.querySelector('b').textContent, on: e.querySelectorAll('i.on').length, all: e.querySelectorAll('i').length, vis: !e.hidden })));
    check(shownPts.every((s, k) => s.vis && s.digit === String(pts[k]) && s.on === pts[k] && s.all === MAX_POINTS), where + ': the points on the tiles are not ' + pts.join() + ': ' + JSON.stringify(shownPts));
    const ring = await p2.locator('.mo-ptile').evaluateAll((bs) => bs.map((b, k) => b.classList.contains('is-best') ? k : -1).filter((k) => k >= 0));
    check(ring.length === 1 && ring[0] === bestIdx, where + ': the ring should be on tile ' + bestIdx + ' only, is on ' + ring.join());
    check((await p2.locator('.mo-ptile.is-chosen').count()) === 1 && (await p2.locator('.mo-ptile').nth(pick).getAttribute('class')).includes('is-chosen'), where + ': the pick has no keyline');
    check((await p2.locator('.mo-ptile:not(:disabled)').count()) === 0, where + ': tiles should be done after the tap');
    check((await p2.locator('#mo-prompt').innerText()).trim() === pointsWord(pts[pick]), where + ': the line should say "' + pointsWord(pts[pick]) + '": ' + (await p2.locator('#mo-prompt').innerText()));
    check((await p2.locator('#mo-points').innerText()) === 'Points: ' + total, where + ': running total after the tap');
    check(await p2.locator('#mo-next').isVisible(), where + ': Next should show after every answer');
    check((await p2.locator('#mo-price .mo-slot').count()) === 2 && await p2.locator('#mo-price .mo-slot').evaluateAll((ss) => ss.every((x) => x.clientWidth > 0 && x.clientHeight > 0 && x.getAttribute('aria-hidden') === 'true')), where + ': two sized, aria-hidden walls expected');
    const tag = await p2.locator('#mo-price .mo-ptag').innerText();
    check(tag.includes(priceTagText(item.pence)) && tag.startsWith(item.name), where + ': tag is "' + tag + '"');
    check((await p2.locator('#mo-caption').innerText()) === 'each square = ' + formatPrice(wallFor([pence[pick], item.pence]).unit), where + ': caption');
    const expectMiss = pts[pick] <= 1;
    check((await missTotal()) === missesBefore + (expectMiss ? 1 : 0), where + ': ' + (expectMiss ? 'a 0 or 1 should be a miss' : 'a 2 or 3 should not be a miss'));
    if (expectMiss) check((await saved()).misses[item.id] >= 1, where + ': miss for ' + item.id + ' not saved');
    await inView('#mo-next', where);
    await inView('#mo-price .mo-walls', where);
    await noScroll(where);
    await bannedCheck(where);
    await p2.click('#mo-next');
  }
  check(await p2.locator('#mo-results').isVisible(), 'price ' + level + ': results did not show');
  check((await progressCount()) === before + 1, 'price ' + level + ' ' + path + ': a finished round should add exactly one progress square');
  const prevBest = expectedBest[level];
  expectedBest[level] = Math.max(prevBest, total);
  check((await p2.locator('#mo-score').innerText()) === 'Points: ' + total + ' out of ' + ROUND_LENGTH * MAX_POINTS, 'price ' + level + ' ' + path + ': results score is "' + (await p2.locator('#mo-score').innerText()) + '", expected ' + total);
  check((await p2.locator('#mo-best').innerText()).includes('best') && (await p2.locator('#mo-best').innerText()).includes(': ' + expectedBest[level]), 'price ' + level + ': best line is "' + (await p2.locator('#mo-best').innerText()) + '"');
  const wantNew = prevBest > 0 && total > prevBest;
  check((await p2.locator('.mo-newbest').count()) === (wantNew ? 1 : 0), 'price ' + level + ' ' + path + ': "New best!" should ' + (wantNew ? '' : 'not ') + 'show (earlier best ' + prevBest + ', total ' + total + ')');
  check((await saved()).best[level] === expectedBest[level], 'price ' + level + ': saved best is ' + (await saved()).best[level] + ', expected ' + expectedBest[level]);
  check((await p2.locator('#mo-results-title').innerText()).trim() === 'Well done!', 'price results title');
  await bannedCheck('price results');
  await inView('#mo-again', 'price results');
  await noScroll('price results');
  return total;
};
for (const level of LEVEL_IDS) await playPrice(level, 'mixed');
await playPrice('easy', 'worst');   // a lower total: the best stays, no "New best!"
await playPrice('easy', 'best');    // a full-marks total: beats the earlier best above 0, so "New best!"
check(expectedBest.easy === ROUND_LENGTH * MAX_POINTS, 'the ring tile should always earn 3 points: easy best is ' + expectedBest.easy);

// a house (seven-digit tiles) and a £1 sweet at 360 x 640: six tiles of 48px or more, nothing clipped, points and walls in view
await startActivity('price', 'hard');
for (const id of ['house', 'sweets']) {
  await p2.evaluate((id) => { const it = ITEMS.find((i) => i.id === id); session.questions[session.index] = { item: it, ...priceTiles(it, 'hard', Math.random) }; showQuestion(); }, id);
  const geo = await p2.locator('.mo-ptile').evaluateAll((bs) => bs.map((b) => { const r = b.getBoundingClientRect(), t = b.querySelector('.mo-ptile__price').getBoundingClientRect(); return r.height >= 48 && t.left >= r.left && t.right <= r.right; }));
  check(geo.length === 6 && geo.every(Boolean), id + ': tiles under 48px or clipped');
  await p2.locator('.mo-ptile').nth(await p2.evaluate(() => session.questions[session.index].bestIndex)).click();
  const boxes = await p2.locator('#mo-price .mo-walls, #mo-next, #mo-price .mo-ptag, #mo-caption').evaluateAll((es) => es.map((e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }));
  check(boxes.every(Boolean), id + ': points, walls, tag or Next are not in view at 360x640');
  await noScroll(id + ' reveal');
}
// the tiles on a wide screen: two rows of three
await p2.setViewportSize({ width: 900, height: 700 });
await p2.evaluate(() => showQuestion());
check(await p2.locator('.mo-ptile').evaluateAll((bs) => new Set(bs.map((b) => Math.round(b.getBoundingClientRect().y))).size === 2), 'wide screen: six tiles should be two rows of three');
await p2.setViewportSize({ width: 360, height: 640 });

// ---- progress and saving ----
// Stop adds no hub square but keeps the misses already made (a wrong count, then a worst tile).
for (const act of ['howmany', 'price']) {
  await startActivity(act, 'easy');
  const before = await progressCount(), missesBefore = await missTotal();
  if (act === 'howmany') {
    const item = itemByName((await p2.locator('.mo-subject__name').innerText()).trim());
    const nums = (await p2.locator('.mo-count').allInnerTexts()).map((t) => Number(t.replace(/,/g, '')));
    await p2.locator('.mo-count').nth(nums.findIndex((n) => n !== item.pence / 100)).click();
  } else {
    const worst = await p2.evaluate(() => { const q = session.questions[session.index]; return q.points.indexOf(Math.min(...q.points)); });
    await p2.locator('.mo-ptile').nth(worst).click();
  }
  await p2.click('#mo-stop');
  check(await p2.locator('#mo-settings').isVisible(), act + ': Stop should go to settings');
  check((await progressCount()) === before, act + ': Stop must not add a progress square');
  check((await missTotal()) > missesBefore, act + ': Stop must keep the misses already made');
  const bestNow = (await saved()).best;
  check(JSON.stringify(bestNow) === JSON.stringify(expectedBest), act + ': Stop must not change the best: ' + JSON.stringify(bestNow));
}
check((await p2.evaluate(() => KidsGames.lastGame)) === 'money', 'the last game played should be money');

// saves survive a reload
const beforeReload = await saved();
await p2.reload();
await p2.waitForSelector('#mo-settings');
const afterReload = await saved();
check(JSON.stringify(afterReload) === JSON.stringify(beforeReload), 'a reload changed the saved data');
check(JSON.stringify(afterReload.best) === JSON.stringify(expectedBest) && Object.keys(afterReload.misses).length > 0 && afterReload.recent.length > 0, 'best, misses and recent should survive a reload: ' + JSON.stringify(afterReload));
check((await p2.locator('.mo-act[aria-pressed="true"]').getAttribute('data-activity')) === afterReload.activity && (await p2.locator('.mo-level[aria-pressed="true"]').getAttribute('data-level')) === afterReload.level, 'settings after a reload do not match the saved choice');
check((await progressCount()) >= 3 * 5, 'progress squares should have survived the reload');

// saves belong to the player: a second player starts clean, and switching mid-round drops the round without writing under the new name
await p2.evaluate(() => { const pl = JSON.parse(localStorage.getItem('kidsgames_players')); pl.Lou = { name: 'Lou', manualAge: 9, theme: 'colourful-light', avatar: 1, createdAt: '2026-01-02' }; localStorage.setItem('kidsgames_players', JSON.stringify(pl)); });
await p2.reload();
await p2.waitForSelector('#mo-settings');
await startActivity('howmany', 'easy');
await p2.locator('.mo-count').first().click();   // maybe wrong, maybe right: either way a round is open
const kitBefore = await saved();
await p2.click('#kg-player-btn');
await p2.click('.kg-player-card[data-player="Lou"]');
check(await p2.locator('#mo-settings').isVisible(), 'switching player mid-round should return to settings');
check((await p2.locator('.mo-act[aria-pressed="true"]').getAttribute('data-activity')) === 'buy' && (await p2.locator('.mo-level[aria-pressed="true"]').getAttribute('data-level')) === 'hard', 'a nine-year-old should start on Can you buy it? at Hard');
const lou = await p2.evaluate(() => JSON.parse(localStorage.getItem('kidsgames_money_Lou')));
check(!lou || (Object.keys(lou.misses || {}).length === 0 && !lou.best), 'nothing of Kit\'s round should be saved under Lou: ' + JSON.stringify(lou));
check(JSON.stringify(await saved()) === JSON.stringify(kitBefore), 'Kit\'s save changed while Lou was playing');
await startActivity('price', 'medium');
check((await p2.evaluate(() => KidsGames.player.name)) === 'Lou', 'the active player should be Lou');
await p2.click('#mo-stop');
await p2.click('#kg-player-btn');
await p2.click('.kg-player-card[data-player="Kit"]');
check((await p2.locator('.mo-act[aria-pressed="true"]').getAttribute('data-activity')) === kitBefore.activity, 'switching back should bring Kit\'s choices back');

// corrupt or missing storage never stops play
for (const junk of ['{{{ not json', '[1,2,3]', '"just a string"', '{"best":{"easy":"x"},"misses":5,"recent":"no","activity":"nope","level":7}', 'null']) {
  await p2.evaluate((junk) => localStorage.setItem('kidsgames_money_Kit', junk), junk);
  await p2.reload();
  await p2.waitForSelector('#mo-settings');
  check(await p2.locator('#mo-play-btn').isEnabled(), 'corrupt storage (' + junk + '): Play should be enabled');
  await p2.click('#mo-play-btn');
  check(await p2.locator('#mo-game').isVisible(), 'corrupt storage (' + junk + '): the game did not start');
  await p2.click('#mo-stop');
}
await p2.evaluate(() => localStorage.removeItem('kidsgames_money_Kit'));
await p2.reload();
await p2.waitForSelector('#mo-settings');
await p2.click('#mo-play-btn');
check(await p2.locator('#mo-game').isVisible(), 'missing storage: the game did not start');
await p2.click('#mo-stop');

// The shell itself reports corrupt saved data with a console error (on purpose, shared code); that is expected in the corrupt-storage section.
const realErrors = errors.filter((e) => !e.startsWith('KidsGames: corrupt data for key kidsgames_money_'));
check(realErrors.length === 0, 'console/page errors: ' + realErrors.slice(0, 3).join(' | '));

await browser.close();
if (failures.length) { console.error('FAIL (' + failures.length + '):\n - ' + failures.join('\n - ')); process.exit(1); }
console.log('Money play-test passed (' + checks + ' checks).');
