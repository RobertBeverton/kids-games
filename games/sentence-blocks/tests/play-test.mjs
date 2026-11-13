// Built-page proof for Sentence Blocks: plays the BUILT page (docs/sentence-blocks.html) in a real browser.
//
//   bash build.sh
//   PLAYWRIGHT_CORE=<path or URL of playwright-core's index.mjs> node games/sentence-blocks/tests/play-test.mjs
//   (playwright-core is deliberately not a repo dependency: `npm i playwright-core` in a scratch folder. Drives Microsoft Edge.)
//   Set PAGE=<url> to test another build. HUB=<url> to test another hub.
//
// Expected sentences come from the SOURCE modules (words.js, scenes.js, engine.js), not from the page, so the test also proves the
// embedded copy in the built page matches.
//  1. Describe mode: every scene of every stage, built tile by tile; no sentence before the last slot; the finished sentence is exact.
//  2. Wrong tiles: every wrong tile and a right tile in a wrong slot are refused with a cross, the right tile still locks in, and the
//     help outline appears after 3 misses on exactly the right tile.
//  3. Silly mode: 100 rounds per stage with random choices give grammatical sentences; swapping a tile replaces it.
//  4. Unlocking: stages 2 and 3 are locked for a new player; five finished describe sentences open the next one; silly never counts.
//  5. Sessions: five sentences, one hopscotch square; Stop paints none but keeps the unlock count.
//  6. Saved data per player, surviving a reload, and surviving corrupt storage.
//  7. Keyboard only (Tab, Enter, Space).
//  8. Layout: viewports x themes x ages: no horizontal scroll, target sizes, slots and tray in view, the answer never printed early.
//  9. A clean console throughout.
// 10. The hub: five tiles, the Sentence Blocks tile links to the game and shows the painted square.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DATA } from '../js/words.js';
import { SCENES } from '../js/scenes.js';
import { composeSentence, tileOf, SLOT_ORDER, STAGES } from '../js/engine.js';

const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const URL = process.env.PAGE || pathToFileURL(path.join(ROOT, 'docs', 'sentence-blocks.html')).href;
const HUB = process.env.HUB || pathToFileURL(path.join(ROOT, 'docs', 'index.html')).href;
const SENTENCE = /^[A-Z][a-z]*( [a-z]+)* (is|are) [a-z]+( (a|an) [a-z]+| [a-z]+)?( (in|on|at) (the )?[a-z]+)?\.$/;
const failures = [];
const fail = (m) => { if (failures.length < 80) failures.push(m); };
const check = (cond, m) => { if (!cond) fail(m); };
const browser = await chromium.launch({ channel: 'msedge' });
const allErrors = [];
const savedKey = (n) => 'kidsgames_sentence-blocks_' + n;

// seed: { players: ['Mia'], active, ages: {name: age}, save: {name: value|raw string}, theme }
async function open(opts = {}) {
  const { age = 5, players = ['Mia'], active = players[0], saves = {}, viewport = { width: 900, height: 1000 }, ctx: given, url = URL, theme } = opts;
  const ctx = given || (await browser.newContext({ viewport }));
  if (!given) {
    await ctx.addInitScript(([age, players, active, saves]) => {
      if (!localStorage.getItem('kidsgames_players')) {
        const ps = {};
        for (const n of players) ps[n] = { name: n, dob: null, manualAge: age, theme: 'day', avatar: 0, createdAt: '2026-01-01' };
        localStorage.setItem('kidsgames_players', JSON.stringify(ps));
        localStorage.setItem('kidsgames_activePlayer', JSON.stringify(active));
        for (const [k, v] of Object.entries(saves)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
    }, [age, players, active, Object.fromEntries(Object.entries(saves).map(([n, v]) => [savedKey(n), v]))]);
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.setDefaultTimeout(4000);
  await page.goto(url);
  await page.waitForSelector(url === URL ? '#sb-play-btn' : '.mark');
  if (theme) await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  allErrors.push(errors);
  return { ctx, page, errors };
}
const OPEN = { v: 1, mode: 'scene', stage: 1, done: { 1: 5, 2: 5, 3: 0 }, recent: [] }; // all three stages open
const startStage = async (page, stage, mode = 'scene') => {
  await page.click('#sb-mode-row [data-mode="' + mode + '"]');
  await page.click('#sb-stage-row [data-stage="' + stage + '"]');
  await page.click('#sb-play-btn');
  await page.waitForSelector('#sb-tray .sb-tile');
};
const forceScene = (page, id) => page.evaluate((id) => { session.scenes = [SCENES.find((s) => s.id === id)]; session.index = 0; nextRound(); }, id);
const tile = (page, slot, id) => page.locator('#sb-tray [data-slot="' + slot + '"][data-id="' + id + '"]');
const slotEl = (page, slot) => page.locator('#sb-slots [data-slot="' + slot + '"]');
const sentenceText = (page) => page.evaluate(() => { const e = document.getElementById('sb-sentence'); return e.hidden ? null : e.textContent.replace(/\s+/g, ' ').trim(); });
async function place(page, slot, id) { await tile(page, slot, id).click(); await slotEl(page, slot).click(); }
// The right answers of the round on screen, read from the page's own state.
const answerOf = (page) => page.evaluate(() => ({ slots: round.slots.slice(), answer: round.answer, mode: round.mode }));
async function finishRound(page) {
  const { slots, answer } = await answerOf(page);
  for (const k of slots) {
    const id = answer ? answer[k] : await page.evaluate((k) => document.querySelector('#sb-tray [data-slot="' + k + '"]').dataset.id, k);
    await place(page, k, id);
  }
}
const progressOf = (page) => page.evaluate(() => (window.KidsGames.progress || {})['sentence-blocks'] || 0);
const saveOf = (page) => page.evaluate(() => JSON.parse(JSON.stringify(save)));

// ---------- 1. every scene, every stage ----------
{
  const { page, ctx } = await open({ saves: { Mia: OPEN } });
  for (const stage of [1, 2, 3]) {
    await page.reload();
    await page.waitForSelector('#sb-play-btn');
    await startStage(page, stage);
    for (const sc of SCENES.filter((s) => s.stage === stage)) {
      await forceScene(page, sc.id);
      const slots = SLOT_ORDER.filter((k) => sc[k]);
      const tag = 'stage ' + stage + ' scene ' + sc.id;
      check(await sentenceText(page) === null, tag + ': a sentence showed before anything was placed');
      for (let i = 0; i < slots.length; i++) {
        const k = slots[i];
        try { await place(page, k, sc[k]); } catch (e) { fail(tag + ': could not place ' + k + ' (' + String(e).split('\n')[0] + ')'); break; }
        if (i < slots.length - 1) check(await sentenceText(page) === null, tag + ': the sentence appeared before the last slot');
      }
      const expected = composeSentence(Object.fromEntries(slots.map((k) => [k, tileOf(DATA, k, sc[k])])));
      check(await sentenceText(page) === expected, tag + ': sentence "' + await sentenceText(page) + '" expected "' + expected + '"');
      check(await page.locator('#sb-picture svg').count() > 0, tag + ': no picture');
      check((await page.locator('#sb-picture .sb-pic--missing').count()) === 0, tag + ': a missing drawing is showing');
    }
  }
  await ctx.close();
}

// ---------- 2. wrong tiles ----------
{
  const { page, ctx } = await open({ saves: { Mia: OPEN } });
  for (const [stage, id] of [[1, 's1-boy-running'], [2, 's2-girl-eating-apple'], [3, 's3-happy-girl-eating-apple-park']]) {
    await startStage(page, stage);
    await forceScene(page, id);
    const sc = SCENES.find((s) => s.id === id);
    const slots = SLOT_ORDER.filter((k) => sc[k]);
    const tag = 'stage ' + stage + ' wrong tiles';
    for (const k of slots) {
      const wrongIds = await page.evaluate((k) => [...document.querySelectorAll('#sb-tray [data-slot="' + k + '"]')].map((b) => b.dataset.id), k);
      const wrong = wrongIds.filter((x) => x !== sc[k]);
      for (let n = 0; n < wrong.length; n++) {
        await tile(page, k, wrong[n]).click();
        await slotEl(page, k).click();
        check(await page.evaluate(([k]) => !round.placed[k], [k]), tag + ': a wrong ' + k + ' tile stayed');
        check(await tile(page, k, wrong[n]).evaluate((b) => b.classList.contains('is-bounce') && getComputedStyle(b.querySelector('.sb-tile__cross')).display !== 'none'), tag + ': no cross on wrong ' + k + ' tile ' + wrong[n]);
      }
      // the right tile into a slot of another colour
      const other = await page.evaluate(([slots, k]) => slots.find((s) => s !== k && !round.placed[s]), [slots, k]);
      if (other) {
        await tile(page, k, sc[k]).click();
        await slotEl(page, other).click();
        check(await page.evaluate((o) => !round.placed[o], other), tag + ': a ' + k + ' tile went into the ' + other + ' slot');
      }
      // help: after 3 misses, exactly the right tile
      if (wrong.length) {
        for (let n = 0; n < 3; n++) { await tile(page, k, wrong[0]).click(); await slotEl(page, k).click(); }
        const helped = await page.evaluate(() => [...document.querySelectorAll('#sb-tray .is-help')].map((b) => b.dataset.slot + ':' + b.dataset.id));
        check(helped.length === 1 && helped[0] === k + ':' + sc[k], tag + ': help was ' + JSON.stringify(helped) + ' for ' + k);
      }
      await place(page, k, sc[k]);
      check(await page.evaluate((k) => !!round.placed[k], k), tag + ': the right ' + k + ' tile did not lock in after misses');
    }
    check(!!(await sentenceText(page)), tag + ': no sentence after the last right tile');
    await page.click('#sb-stop');
  }
  await ctx.close();
}

// ---------- 3. silly mode ----------
{
  const { page, ctx } = await open({ saves: { Mia: OPEN } });
  for (const stage of [1, 2, 3]) {
    await startStage(page, stage, 'silly');
    const bad = await page.evaluate(([stage, rx]) => {
      const re = new RegExp(rx), out = [];
      for (let i = 0; i < 100; i++) {
        for (const k of round.slots) {
          const choices = [...document.querySelectorAll('#sb-tray [data-slot="' + k + '"]')];
          choices[Math.floor(Math.random() * choices.length)].click();
          document.querySelector('#sb-slots [data-slot="' + k + '"]').click();
        }
        const s = document.getElementById('sb-sentence').textContent.replace(/\s+/g, ' ').trim();
        if (!re.test(s)) out.push(s);
        if (i === 0 && round.answer !== null) out.push('silly round had an answer');
        nextRound();
      }
      return out;
    }, [stage, SENTENCE.source]);
    check(bad.length === 0, 'stage ' + stage + ' silly: bad sentences ' + JSON.stringify(bad.slice(0, 3)));
    // swapping replaces
    const first = await page.evaluate(() => { const k = round.slots[0]; return [k, [...document.querySelectorAll('#sb-tray [data-slot="' + k + '"]')].map((b) => b.dataset.id)]; });
    await place(page, first[0], first[1][0]);
    await place(page, first[0], first[1][1]);
    check(await page.evaluate(([k, id]) => round.placed[k] === id, [first[0], first[1][1]]), 'stage ' + stage + ' silly: a swapped tile did not replace the first');
    check(await tile(page, first[0], first[1][0]).isEnabled(), 'stage ' + stage + ' silly: the swapped-out tile did not come back');
    await page.click('#sb-stop');
  }
  await ctx.close();
}

// ---------- 4. unlocking, 5. sessions ----------
async function playSession(page, n = 5) {
  for (let i = 0; i < n; i++) {
    await finishRound(page);
    await page.click('#sb-next');
  }
}
{
  const { page, ctx } = await open();
  const locked = () => page.evaluate(() => [...document.querySelectorAll('#sb-stage-row [data-stage]')].map((b) => b.getAttribute('aria-disabled') === 'true'));
  check(JSON.stringify(await locked()) === '[false,true,true]', 'a new player should see stages 2 and 3 locked: ' + JSON.stringify(await locked()));
  await page.click('#sb-stage-row [data-stage="2"]', { force: true });
  check((await saveOf(page)).stage === 1, 'tapping a locked stage changed the stage');
  // silly never counts
  await startStage(page, 1, 'silly');
  await playSession(page);
  check((await saveOf(page)).done[1] === 0, 'silly sentences counted toward unlocking');
  check(await progressOf(page) === 1, 'a silly session should still paint one square');
  await page.click('#sb-choose');
  // describe sessions count
  await startStage(page, 1, 'scene');
  await playSession(page);
  check(await page.evaluate(() => !document.getElementById('sb-done').hidden), 'the done screen did not show after five sentences');
  check((await saveOf(page)).done[1] === 5, 'five finished describe sentences were not counted: ' + (await saveOf(page)).done[1]);
  check(await progressOf(page) === 2, 'the second session should make two squares, got ' + await progressOf(page));
  check(await page.locator('#sb-unlock').isVisible(), 'the unlock note did not show');
  await page.click('#sb-choose');
  check(JSON.stringify(await locked()) === '[false,false,true]', 'after five stage-1 sentences only stage 3 should be locked: ' + JSON.stringify(await locked()));
  // Stop mid-session: no square, but sentences keep counting
  await startStage(page, 2, 'scene');
  await playSession(page, 2);
  await finishRound(page);
  await page.click('#sb-stop');
  check(await progressOf(page) === 2, 'Stop painted a square');
  check((await saveOf(page)).done[2] === 3, 'Stop lost finished sentences: ' + (await saveOf(page)).done[2]);
  await page.click('#sb-stage-row [data-stage="2"]');
  await page.click('#sb-play-btn');
  await playSession(page);
  check((await saveOf(page)).done[2] >= 5, 'stage 2 did not reach 5');
  await page.click('#sb-choose');
  check(JSON.stringify(await locked()) === '[false,false,false]', 'stage 3 should be open after five stage-2 sentences: ' + JSON.stringify(await locked()));
  await ctx.close();
}

// ---------- 6. saved data ----------
{
  const { page, ctx } = await open({ players: ['Mia', 'Leo'], saves: { Mia: { ...OPEN, mode: 'silly', stage: 2 }, Leo: { v: 1, mode: 'scene', stage: 1, done: { 1: 0, 2: 0, 3: 0 }, recent: [] } } });
  const state = () => page.evaluate(() => ({ mode: document.querySelector('#sb-mode-row [aria-pressed="true"]').dataset.mode, stage: document.querySelector('#sb-stage-row [aria-pressed="true"]').dataset.stage }));
  check(JSON.stringify(await state()) === '{"mode":"silly","stage":"2"}', 'Mia\'s saved choices did not load: ' + JSON.stringify(await state()));
  await page.reload();
  await page.waitForSelector('#sb-play-btn');
  check(JSON.stringify(await state()) === '{"mode":"silly","stage":"2"}', 'choices did not survive a reload');
  await page.evaluate(() => localStorage.setItem('kidsgames_activePlayer', JSON.stringify('Leo')));
  await page.reload();
  await page.waitForSelector('#sb-play-btn');
  check(JSON.stringify(await state()) === '{"mode":"scene","stage":"1"}', 'Leo shares Mia\'s data: ' + JSON.stringify(await state()));
  await ctx.close();
}
for (const [label, raw] of [['broken JSON', '{bad'], ['null', 'null'], ['a number', '42'], ['a wrong version', '{"v":99,"mode":"silly","stage":3,"done":{"1":"x"}}'], ['an array', '[1,2]']]) {
  const { page, ctx, errors } = await open({ saves: { Mia: raw } });
  const stage = await page.evaluate(() => document.querySelector('#sb-stage-row [aria-pressed="true"]').dataset.stage);
  check(stage === '1', 'corrupt storage (' + label + ') should open on stage 1, got ' + stage);
  await startStage(page, 1);
  const real = errors.filter((e) => !e.includes('KidsGames: corrupt data')); // the shell logs corrupt storage on purpose and falls back
  check(real.length === 0, 'corrupt storage (' + label + ') raised errors: ' + real.join(' | '));
  await ctx.close();
}

// ---------- 7. keyboard only ----------
{
  const { page, ctx } = await open({ saves: { Mia: OPEN } });
  await page.focus('#sb-play-btn');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#sb-tray .sb-tile');
  const { slots, answer } = await answerOf(page);
  const focusOn = async (sel, key = 'Tab') => {
    for (let i = 0; i < 60; i++) {
      if (await page.evaluate((s) => !!document.activeElement && document.activeElement.matches(s), sel)) return true;
      await page.keyboard.press(key);
    }
    return false;
  };
  let ok = true;
  for (const k of slots) {
    if (!(await focusOn('#sb-tray [data-slot="' + k + '"][data-id="' + answer[k] + '"]'))) { ok = false; fail('keyboard: could not reach the ' + k + ' tile'); break; }
    await page.keyboard.press('Enter');
    if (!(await focusOn('#sb-slots [data-slot="' + k + '"]'))) { ok = false; fail('keyboard: focus did not reach the ' + k + ' slot'); break; }
    await page.keyboard.press('Space');
  }
  if (ok) check(!!(await sentenceText(page)), 'keyboard: the sentence did not finish');
  if (ok) {
    check(await page.evaluate(() => document.activeElement.id === 'sb-next'), 'keyboard: focus did not move to Next');
    await page.keyboard.press('Enter');
    check(await page.evaluate(() => session.index === 1), 'keyboard: Next did not advance');
  }
  await ctx.close();
}

// ---------- 8. layout ----------
for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }]) {
  for (const theme of ['colourful-light', 'colourful-dark']) {
    for (const age of [5, 8]) {
      const tag = viewport.width + 'x' + viewport.height + ' ' + theme + ' age ' + age;
      const { page, ctx } = await open({ age, viewport, saves: { Mia: OPEN }, theme });
      await startStage(page, 3);
      await forceScene(page, 's3-happy-girl-eating-apple-park'); // the biggest tray: five slots
      const m = await page.evaluate((hit) => {
        const rect = (el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height, top: r.top, bottom: r.bottom }; };
        const tiles = [...document.querySelectorAll('#sb-tray .sb-tile')].map(rect);
        const slots = [...document.querySelectorAll('#sb-slots .sb-slot')].map(rect);
        const sc = document.scrollingElement;
        return {
          hscroll: sc.scrollWidth > innerWidth + 1,
          minTile: Math.min(...tiles.map((t) => Math.min(t.w, t.h))), minSlot: Math.min(...slots.map((t) => Math.min(t.w, t.h))),
          traySeen: Math.min(...tiles.map((t) => t.top)) + Math.min(...tiles.map((t) => t.h)) <= innerHeight, slotsSeen: Math.max(...slots.map((t) => t.bottom)) <= innerHeight,
          vscroll: sc.scrollHeight > innerHeight + 1, hit: getComputedStyle(document.documentElement).getPropertyValue('--hit'),
          text: document.body.innerText,
        };
      });
      const need = age < 6 ? 72 : 56;
      check(!m.hscroll, tag + ': horizontal scroll');
      check(m.minTile >= need, tag + ': smallest tile ' + Math.round(m.minTile) + 'px, needs ' + need);
      check(m.minSlot >= need, tag + ': smallest slot ' + Math.round(m.minSlot) + 'px, needs ' + need);
      check(m.slotsSeen, tag + ': the slots are not in view');
      const sc = SCENES.find((s) => s.id === 's3-happy-girl-eating-apple-park');
      const answer = composeSentence(Object.fromEntries(SLOT_ORDER.filter((k) => sc[k]).map((k) => [k, tileOf(DATA, k, sc[k])])));
      check(!m.text.includes(answer), tag + ': the answer is printed before the child answers');
      check(m.traySeen, tag + ': the first row of the tray is not in view without scrolling');
      await ctx.close();
    }
  }
}

// ---------- 10. the hub ----------
{
  const { page, ctx } = await open({ url: HUB, saves: { Mia: OPEN } });
  const marks = await page.evaluate(() => [...document.querySelectorAll('.mark')].map((a) => ({ g: a.dataset.game, h: a.getAttribute('href') })));
  check(marks.length === 5, 'the hub should show five tiles, found ' + marks.length);
  check(marks.some((m) => m.g === 'sentence-blocks' && m.h === 'sentence-blocks.html'), 'the Sentence Blocks tile does not link to the game');
  const before = await page.evaluate(() => document.querySelectorAll('.mark[data-game="sentence-blocks"] .kg-squares i.on').length);
  const gp = await ctx.newPage();
  await gp.goto(URL);
  await gp.waitForSelector('#sb-play-btn');
  await startStage(gp, 1);
  await playSession(gp);
  await gp.close();
  await page.reload();
  await page.waitForSelector('.mark');
  const after = await page.evaluate(() => document.querySelectorAll('.mark[data-game="sentence-blocks"] .kg-squares i.on').length);
  check(after === before + 1, 'the hub tile should gain one painted square (was ' + before + ', now ' + after + ')');
  await ctx.close();
}

// ---------- 9. console ----------
const errs = allErrors.flat().filter((e) => !e.includes('KidsGames: corrupt data'));
check(errs.length === 0, 'console/page errors: ' + errs.slice(0, 3).join(' | '));

await browser.close();
if (failures.length) { console.error('FAIL (' + failures.length + '):\n - ' + failures.join('\n - ')); process.exit(1); }
console.log('Sentence Blocks play-test passed (' + SCENES.length + ' scenes, ' + STAGES.length + ' stages).');
