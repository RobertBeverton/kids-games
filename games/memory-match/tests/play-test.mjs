// Built-page proof for Memory Match: plays the BUILT page (docs/memory-match.html) in a real browser.
//
//   bash build.sh
//   PLAYWRIGHT_CORE=<path or URL of playwright-core's index.mjs> node games/memory-match/tests/play-test.mjs
//   (playwright-core is deliberately not a repo dependency: `npm i playwright-core` in a scratch folder. Drives Microsoft Edge.)
//   Set PAGE=<url> to test another build (for example a deliberately broken copy, to prove the test can fail).
//
// What it asserts:
//  - the picture set: every theme has 12 pictures, each with a unique short label and drawn paths (no placeholders), the random
//    mix is all of them, no emoji anywhere in the page, and cards carry the picture's label as their accessible name;
//  - every size x theme x peek x age (5 and 8): right number of cards, each picture exactly twice, equal pairs always match,
//    unequal pairs never do, mismatches flip back, nothing is ever left unmatchable, the game always finishes, and the
//    win screen agrees with the taps made (three player strategies: random, remembers-all, perfect);
//  - leaving the board or replaying while a flip, mismatch or peek is pending never corrupts the next game (stale timers);
//  - the hint appears only after 3 wrong pairs in a row, only on the twin of a card the child has already turned over,
//    never during a peek, and never on a card whose twin has not been seen;
//  - settings (size, theme, peek) are saved per player and survive a reload; best times keep the top 3 per size, in order,
//    per player, and the win screen shows the run's place;
//  - keyboard: one tab stop, arrow keys move between cards, Enter turns a card, matched cards keep focus.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const URL = process.env.PAGE || pathToFileURL(path.join(ROOT, 'docs', 'memory-match.html')).href;
const SIZES = { '2x4': 8, '3x4': 12, '4x4': 16, '4x5': 20 };
const THEMES = ['animals', 'food', 'vehicles', 'random'];
const failures = [];
const fail = (m) => { if (failures.length < 60) failures.push(m); };
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const REAL = process.env.REAL_TIMERS === '1';

const browser = await chromium.launch({ channel: 'msedge' });

async function open(age, { fast = true, players, active = 'Mia', keepStorage } = {}) {
  const ctx = keepStorage || (await browser.newContext({ viewport: { width: 900, height: 1000 } }));
  if (!keepStorage) {
    await ctx.addInitScript(([a, fast, players, active]) => {
      if (!localStorage.getItem('kidsgames_players')) {
        const ps = {};
        for (const n of players || ['Mia']) ps[n] = { name: n, dob: null, manualAge: a, theme: 'day', avatar: 0, createdAt: '2026-01-01' };
        localStorage.setItem('kidsgames_players', JSON.stringify(ps));
        localStorage.setItem('kidsgames_activePlayer', JSON.stringify(active));
      }
      if (fast) { const st = window.setTimeout; window.setTimeout = (f, ms, ...r) => st(f, ms >= 300 ? 4 : ms, ...r); }
    }, [age, fast && !REAL, players, active]);
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL);
  await page.waitForSelector('#mm-play-btn');
  return { ctx, page, errors };
}
const cards = (page) => page.evaluate(() => [...document.querySelectorAll('.mm-card')].map((c) => ({
  i: Number(c.dataset.index), k: c.dataset.pic, flipped: c.classList.contains('mm-card--flipped'), matched: c.classList.contains('mm-card--matched'),
  hint: c.classList.contains('mm-card--hint'), label: c.getAttribute('aria-label'), tab: c.tabIndex,
})));
const click = (page, i) => page.evaluate((i) => document.querySelectorAll('.mm-card')[i].click(), i);
const winShown = (page) => page.evaluate(() => !document.getElementById('mm-win-screen').hidden);
async function startWith(page, size, theme, peek) {
  await page.evaluate(() => goSettings());
  await page.click(`#mm-size-row [data-size="${size}"]`);
  await page.click(`#mm-theme-row [data-theme="${theme}"]`);
  if ((await page.isChecked('#mm-peek-toggle')) !== peek) await page.click('.kg-switch');
  await page.click('#mm-play-btn');
  await page.waitForSelector('.mm-card');
  if (peek) await page.waitForFunction(() => !locked);
}
const settle = (page, tag) => page.waitForFunction(() => (flipped.length === 0 && !locked) || !document.getElementById('mm-win-screen').hidden, null, { timeout: 8000 }).catch(() => fail(`${tag}: stuck after a pair`));

async function play(page, strategy, tag) {
  const cs0 = await cards(page);
  const count = new Map();
  for (const c of cs0) count.set(c.k, (count.get(c.k) || 0) + 1);
  for (const [k, n] of count) if (n !== 2) fail(`${tag}: picture ${k} appears ${n} times`);
  const known = new Map();
  if (strategy === 'perfect') cs0.forEach((c) => known.set(c.i, c.k));
  let taps = 0, guard = 0;
  while (guard++ < 300) {
    const cs = await cards(page);
    if (cs.every((c) => c.matched)) break;
    const open = cs.filter((c) => !c.matched).map((c) => c.i);
    const twinOf = (i) => [...known].find(([j, k]) => j !== i && k === cs[i].k && !cs[j].matched);
    let first;
    if (strategy === 'random') first = shuffle(open)[0];
    else { const kp = open.find((i) => known.has(i) && twinOf(i)); first = kp != null ? kp : shuffle(open.filter((i) => !known.has(i)))[0]; }
    await click(page, first); taps++; known.set(first, cs[first].k);
    let second;
    if (strategy === 'random') second = shuffle(open.filter((i) => i !== first))[0];
    else { const t = twinOf(first); second = t ? t[0] : shuffle(open.filter((i) => i !== first && !known.has(i)))[0]; if (second == null) second = shuffle(open.filter((i) => i !== first))[0]; }
    await click(page, second); taps++; known.set(second, cs[second].k);
    await settle(page, tag);
    const same = cs[first].k === cs[second].k;
    if (!(await winShown(page))) {
      const after = await cards(page);
      if (same && !(after[first].matched && after[second].matched)) fail(`${tag}: equal pair not matched`);
      if (!same && (after[first].matched || after[second].matched)) fail(`${tag}: unequal pair matched`);
      if (!same && (after[first].flipped || after[second].flipped)) fail(`${tag}: mismatch cards did not flip back`);
    }
  }
  return taps;
}

// ---------- 1. The picture set ----------
{
  const { ctx, page, errors } = await open(5);
  const info = await page.evaluate(() => ({ P: PICTURES, T: THEMES }));
  const labels = new Set();
  for (const [theme, keys] of Object.entries(info.T)) {
    if (keys.length !== 12) fail(`theme ${theme} has ${keys.length} pictures, expected 12`);
    for (const k of keys) {
      const p = info.P[k];
      if (!p) { fail(`theme ${theme} lists unknown picture ${k}`); continue; }
      if (p.todo) fail(`picture ${k} is still a placeholder`);
      if (!p.line || !/^[MmLlHhVvCcSsQqTtAaZz0-9 .,\-]+$/.test(p.line)) fail(`picture ${k} has no valid path data`);
      if (p.dots && !/^[MmLlHhVvCcSsQqTtAaZz0-9 .,\-]+$/.test(p.dots)) fail(`picture ${k} has invalid dots`);
      if (!p.label || p.label.length > 20 || /[^\x20-\x7e]/.test(p.label)) fail(`picture ${k} label "${p.label}" is empty, long or not plain text`);
      if (labels.has(p.label)) fail(`label "${p.label}" is used twice`);
      labels.add(p.label);
    }
  }
  const unused = Object.keys(info.P).filter((k) => !Object.values(info.T).flat().includes(k));
  if (unused.length) fail(`pictures not in any theme: ${unused.join(', ')}`);
  if (errors.length) fail('picture set page errors: ' + errors.join(' | '));
  console.log('picture set:', Object.fromEntries(Object.entries(info.T).map(([k, v]) => [k, v.length])), 'labels', labels.size);
  // no emoji or pictographs anywhere in the page text or accessible names
  await startWith(page, '4x5', 'random', false);
  const emoji = await page.evaluate(() => {
    const re = /\p{Extended_Pictographic}/u; const hits = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) if (re.test(w.currentNode.nodeValue)) hits.push(w.currentNode.nodeValue.trim().slice(0, 20));
    document.querySelectorAll('[aria-label],[title]').forEach((e) => { const v = (e.getAttribute('aria-label') || '') + (e.getAttribute('title') || ''); if (re.test(v)) hits.push(v.slice(0, 20)); });
    return hits;
  });
  if (emoji.length) fail('emoji left in the page: ' + emoji.join(' | '));
  // card labels use the picture's name
  const c0 = await cards(page);
  await click(page, 0);
  const faceUp = (await cards(page))[0];
  const name = info.P[c0[0].k].label;
  if (c0[0].label !== 'Card 1, face down') fail('face-down label is ' + c0[0].label);
  if (!faceUp.label.includes(name)) fail(`face-up label "${faceUp.label}" lacks "${name}"`);
  const svgs = await page.evaluate(() => [...document.querySelectorAll('.mm-card-front svg')].every((s) => s.getAttribute('aria-hidden') === 'true' && s.querySelector('path')));
  if (!svgs) fail('a card face is missing its drawing or is not hidden from screen readers');
  await ctx.close();
}

// ---------- 2. Matrix ----------
const t0 = Date.now();
let games = 0;
for (const age of [5, 8]) for (const size of Object.keys(SIZES)) for (const theme of THEMES) for (const peek of [true, false]) {
  const { ctx, page, errors } = await open(age);
  const tag = `age${age}/${size}/${theme}/peek=${peek}`;
  await startWith(page, size, theme, peek);
  if ((await cards(page)).length !== SIZES[size]) fail(`${tag}: wrong card count`);
  if (theme !== 'random') {
    const pool = await page.evaluate((t) => THEMES[t], theme);
    if ((await cards(page)).some((c) => !pool.includes(c.k))) fail(`${tag}: a card from the wrong theme`);
  }
  const bracket = await page.evaluate(() => window.KidsGames.player.ageBracket);
  if (bracket !== (age === 5 ? '4-5' : '6-8')) fail(`${tag}: bracket ${bracket}`);
  const strategies = ['random', 'memory', 'perfect'];
  for (const [n, s] of strategies.entries()) {
    if (n) { await page.evaluate(() => startGame()); if (peek) await page.waitForFunction(() => !locked); }
    const taps = await play(page, s, tag + '/' + s);
    games++;
    const ok = await page.waitForSelector('#mm-win-screen:not([hidden]) .mm-win', { timeout: 8000 }).catch(() => null);
    if (!ok) { fail(`${tag}/${s}: no win screen`); continue; }
    const shown = Number((await page.textContent('#mm-win-screen .mm-flipsnote')).match(/(\d+) flip/)[1]);
    if (shown !== taps) fail(`${tag}/${s}: win says ${shown} flips, ${taps} taps made`);
  }
  if (errors.length) fail(`${tag}: page errors ${errors.slice(0, 2).join(' | ')}`);
  await ctx.close();
}
console.log(`matrix: ${games} games in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

// ---------- 3. Stale timers ----------
{
  const { ctx, page, errors } = await open(5, { fast: false });
  const newGame = async () => { await page.click('#mm-play-btn'); await page.waitForSelector('.mm-card'); };
  await page.click('.kg-switch'); // peek off
  let bad = 0;
  for (const wait of [100, 500, 1000]) { // inside the check window, the mismatch window, and near its end
    await newGame();
    const cs = await cards(page);
    const b = cs.findIndex((c) => c.k !== cs[0].k);
    await click(page, 0); await click(page, b);
    await page.waitForTimeout(wait);
    await page.click('#mm-back-btn'); await newGame();
    await click(page, 0);
    await page.waitForTimeout(1500);
    const st = await page.evaluate(() => ({ f: flipped.length, up: document.querySelectorAll('.mm-card--flipped').length, flips, matched }));
    if (st.f !== 1 || st.up !== 1 || st.flips !== 1 || st.matched !== 0) { bad++; fail(`stale timer (${wait} ms): ${JSON.stringify(st)}`); }
    await page.click('#mm-back-btn');
  }
  // a pending peek when leaving: the next game must not be cleared or unlocked early
  await page.click('.kg-switch'); // peek on
  await newGame();
  await page.click('#mm-back-btn'); await newGame();
  await page.waitForTimeout(300);
  const mid = await page.evaluate(() => ({ locked, up: document.querySelectorAll('.mm-card--flipped').length }));
  if (!mid.locked || mid.up !== 12) fail('a second peek was cut short by the first one: ' + JSON.stringify(mid));
  await page.waitForFunction(() => !locked);
  if (errors.length) fail('stale-timer page errors: ' + errors.slice(0, 2).join(' | '));
  console.log('stale timers: ' + (bad ? bad + ' bad cases' : 'clean in 3 windows + peek'));
  await ctx.close();
}

// ---------- 4. Hint ----------
{
  const { ctx, page } = await open(5);
  let given = 0, wrong = 0, early = 0, unseenGiven = 0, offered = 0;
  for (let g = 0; g < 40; g++) {
    await startWith(page, '4x4', 'animals', g % 2 === 0); // half the games with a peek
    let misses = 0;
    for (let turn = 0; turn < 60; turn++) {
      const cs = await cards(page);
      if (cs.every((c) => c.matched)) break;
      const seenSet = new Set(await page.evaluate(() => [...seen].map((c) => Number(c.dataset.index))));
      const open = cs.filter((c) => !c.matched).map((c) => c.i);
      // play badly on purpose: pick two cards that do NOT match when we can, so misses pile up
      const a = shuffle(open)[0];
      const miss = open.filter((i) => i !== a && cs[i].k !== cs[a].k);
      const b = shuffle(miss.length ? miss : open.filter((i) => i !== a))[0];
      if (misses < 3 && cs.some((c) => c.hint)) early++;
      const streak = await page.evaluate(() => missStreak);
      await click(page, a);
      const afterA = await cards(page);
      const h = afterA.filter((c) => c.hint);
      if (h.length) {
        given++;
        if (streak < 3) early++;
        if (h.length !== 1 || h[0].k !== cs[a].k || h[0].i === a) wrong++;
        if (!seenSet.has(h[0].i)) unseenGiven++;
      } else if (streak >= 3 && open.some((i) => i !== a && cs[i].k === cs[a].k && seenSet.has(i))) offered++; // should have been offered
      await click(page, b);
      await settle(page, 'hint');
      const after = await cards(page);
      misses = after[a].matched ? 0 : misses + 1;
      if (after.some((c) => c.hint)) fail('a hint ring is left on the board after the pair was judged');
    }
  }
  if (!given) fail('the hint was never offered in 40 games of deliberate misses');
  if (wrong) fail(`${wrong} hints were not on the single twin of the card turned`);
  if (early) fail(`${early} hints or rings appeared before 3 wrong pairs in a row`);
  if (unseenGiven) fail(`${unseenGiven} hints pointed at a card the child had not seen`);
  if (offered) fail(`${offered} turns had 3+ misses and a seen twin but no hint`);
  console.log(`hint: given ${given} times, wrong ${wrong}, early ${early}, on unseen ${unseenGiven}, missed offers ${offered}`);
  // never during or because of the peek
  await startWith(page, '4x4', 'animals', true);
  await page.evaluate(() => { missStreak = 5; });
  const during = await cards(page);
  if (during.some((c) => c.hint)) fail('hint shown during the peek');
  await page.waitForFunction(() => !locked);
  await click(page, 0);
  if ((await cards(page)).some((c) => c.hint)) fail('hint pointed at a twin that was only seen in the peek');
  await ctx.close();
}

// ---------- 5. Saved settings and best times ----------
{
  const { ctx, page } = await open(5, { players: ['Mia', 'Zoe'], active: 'Mia' });
  await page.click('#mm-size-row [data-size="4x4"]'); await page.click('#mm-theme-row [data-theme="vehicles"]'); await page.click('.kg-switch');
  await page.reload(); await page.waitForSelector('#mm-play-btn');
  const s1 = await page.evaluate(() => ({ size: state.size, theme: state.theme, peek: state.peek, pressed: document.querySelector('#mm-size-row [aria-pressed=true]').dataset.size, box: document.getElementById('mm-peek-toggle').checked }));
  if (s1.size !== '4x4' || s1.theme !== 'vehicles' || s1.peek !== false || s1.pressed !== '4x4' || s1.box !== false) fail('saved settings not restored: ' + JSON.stringify(s1));
  // best times: play 5 quick games at 4x4 and read what is kept
  const finishFast = async () => { await page.click('#mm-play-btn'); await page.waitForSelector('.mm-card'); const cs = await cards(page); const byK = new Map(); cs.forEach((c) => byK.set(c.k, [...(byK.get(c.k) || []), c.i])); for (const [, [a, b]] of byK) { await click(page, a); await click(page, b); await settle(page, 'best'); } await page.waitForSelector('#mm-win-screen:not([hidden]) .mm-win'); };
  const notes = [], placed = [];
  for (let g = 0; g < 5; g++) {
    await finishFast();
    notes.push(await page.textContent('#mm-win-screen .mm-note'));
    placed.push(await page.evaluate(() => [...document.querySelectorAll('.mm-top li')].findIndex((l) => l.classList.contains('mm-me'))));
    await page.click('#mm-change-settings');
  }
  const best = await page.evaluate(() => JSON.parse(localStorage.getItem('kidsgames_memory-match_Mia')).best);
  const list = best['4x4'];
  if (!list || list.length !== 3) fail('best times for 4x4 should keep exactly 3: ' + JSON.stringify(best));
  else if (list.some((v, i) => i && v < list[i - 1])) fail('best times not sorted: ' + list);
  if (Object.keys(best).some((k) => k !== '4x4')) fail('best times recorded for another size');
  if (!/first time/i.test(notes[0])) fail('first game note: ' + notes[0]);
  if (placed[0] !== 0) fail('first game should be marked first');
  const zoe = await page.evaluate(() => localStorage.getItem('kidsgames_memory-match_Zoe'));
  if (zoe) fail("another player's data was written: " + zoe);
  // the settings tile shows the best time for that size
  const tile = await page.textContent('#mm-size-row [data-size="4x4"] .mm-best');
  if (!/^Best \d+:\d\d$/.test(tile)) fail('size tile best time: "' + tile + '"');
  const other = await page.textContent('#mm-size-row [data-size="2x4"] .mm-best');
  if (other !== '') fail('2x4 tile should show no best time: "' + other + '"');
  // rank logic directly: a slower run than all three, a middle run, a new best
  const logic = await page.evaluate(() => { saved.best = { '3x4': [10000, 20000, 30000] }; const r = [recordTime('3x4', 40000), recordTime('3x4', 25000), recordTime('3x4', 5000)]; return { r, kept: saved.best['3x4'] }; });
  if (logic.r[0].rank !== -1 || logic.r[1].rank !== 2 || logic.r[2].rank !== 0 || logic.kept.join() !== '5000,10000,20000') fail('rank logic wrong: ' + JSON.stringify(logic));
  // a second player starts clean
  await page.evaluate(() => { localStorage.setItem('kidsgames_activePlayer', JSON.stringify('Zoe')); });
  await page.reload(); await page.waitForSelector('#mm-play-btn');
  const z = await page.evaluate(() => ({ size: state.size, best: bestTimes('4x4').length }));
  if (z.size !== '3x4' || z.best !== 0) fail("second player did not start clean: " + JSON.stringify(z));
  console.log('saved data: notes', JSON.stringify(notes), 'kept', JSON.stringify(list));
  await ctx.close();
}

// ---------- 6. Keyboard ----------
{
  const { ctx, page } = await open(5);
  await startWith(page, '4x4', 'animals', false);
  const tabs = (await cards(page)).filter((c) => c.tab === 0).length;
  if (tabs !== 1) fail('expected one tab stop on the board, found ' + tabs);
  await page.evaluate(() => document.querySelectorAll('.mm-card')[0].focus());
  const idx = () => page.evaluate(() => Number(document.activeElement.dataset.index));
  await page.keyboard.press('ArrowRight'); if ((await idx()) !== 1) fail('ArrowRight did not move to card 2');
  await page.keyboard.press('ArrowDown'); const cols = await page.evaluate(() => getComputedStyle(document.getElementById('mm-grid')).gridTemplateColumns.split(' ').length);
  if ((await idx()) !== 1 + cols) fail(`ArrowDown moved to ${await idx()}, expected ${1 + cols}`);
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowUp'); if ((await idx()) !== 0) fail('Left then Up did not return to card 1');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowUp'); if ((await idx()) !== 0) fail('arrows left the board edge');
  await page.keyboard.press('End'); if ((await idx()) !== 15) fail('End did not go to the last card');
  await page.keyboard.press('Home'); if ((await idx()) !== 0) fail('Home did not go to the first card');
  const stops = (await cards(page)).filter((c) => c.tab === 0).map((c) => c.i);
  if (stops.length !== 1 || stops[0] !== 0) fail('roving tab stop did not follow focus: ' + stops);
  // play one whole pair by keyboard; the matched card must keep focus
  const cs = await cards(page); const twin = cs.findIndex((c, i) => i !== 0 && c.k === cs[0].k);
  await page.keyboard.press('Enter');
  for (let n = 0; n < twin; n++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await settle(page, 'keyboard');
  const state = await page.evaluate(() => ({ matched, active: document.activeElement.classList.contains('mm-card'), idx: Number(document.activeElement.dataset.index) }));
  if (state.matched !== 1) fail('keyboard pair was not matched: ' + JSON.stringify(state));
  if (!state.active || state.idx !== twin) fail('focus left the matched card: ' + JSON.stringify(state));
  await page.keyboard.press('Enter'); // a matched card ignores Enter
  if ((await page.evaluate(() => flips)) !== 2) fail('Enter on a matched card counted a flip');
  await ctx.close();
}

await browser.close();
console.log(failures.length ? 'FAILURES:\n' + failures.join('\n') : 'ALL ASSERTIONS PASSED');
process.exit(failures.length ? 1 : 0);
