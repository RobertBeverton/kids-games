// Built-page proof for Maths: plays the BUILT page (docs/maths.html) in a real browser.
//
//   bash build.sh
//   PLAYWRIGHT_CORE=<path or URL of playwright-core's index.mjs> node games/maths/tests/play-test.mjs
//   (playwright-core is deliberately not a repo dependency: install it anywhere, e.g. `npm i playwright-core` in a scratch folder.
//    The test drives Microsoft Edge: change `channel` below to use another browser. Add REALTIME=1 for the ~2 minute real-clock
//    section; PER=n changes the questions per combination, SHOTS=<folder> saves hub screenshots.)
//
// For BOTH styles ("Work it out" 7 + 5 = ? and "Find the missing number" 7 + ? = 12), every operation, every level and every
// length, it reads each DISPLAYED question and its four buttons from the page, solves the printed equation itself, and asserts:
//   - the printed question has the exact format for its style, with a single "?" and nothing else carrying a number;
//   - exactly one of the four buttons makes the printed equation true, and the game agrees (marks it right);
//   - no two buttons look different before the child answers; no duplicate buttons;
//   - a wrong answer is marked, the right one revealed, and in Round/Endless only the right one moves on (Sprint moves on alone).
// Then: Round is exactly ten questions; the age defaults; the Number Bonds address and saved data; the player-switch leak;
// what counts as a finished game (progress square, personal best); custom tables typed as 0 or 1; the hub at four screen shapes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DOCS = (f) => pathToFileURL(path.join(ROOT, process.env.DOCS || 'docs', f)).href;
const PER = Number(process.env.PER || 350);
const P = 'maths';
const issues = [];
const note = (m) => { if (issues.length < 80) issues.push(m); };
const out = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
// A crash (for example a screen that never appears because the game is broken) is reported as a failure, with what was found first.
function finish() {
  if (issues.length) { out(`\nFAILED (${issues.length}):`); issues.forEach((i) => out('  - ' + i)); process.exit(1); }
  out('\nAll built-page checks passed.');
}
process.on('uncaughtException', (e) => { note('crash: ' + String(e.message).split('\n')[0]); finish(); });

async function open({ url = DOCS('maths.html'), age = 7, fast = true, seed = {}, name = 'Mia', viewport = { width: 1024, height: 768 }, players } = {}) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript(([age, fast, name, seed, players]) => {
    if (!localStorage.getItem('__seeded')) {
      const pl = players || (age ? { [name]: age } : {});
      const o = {};
      for (const [n, a] of Object.entries(pl)) o[n] = { name: n, dob: null, manualAge: a, theme: 'colourful-light', avatar: 0, createdAt: '2026-01-01' };
      if (Object.keys(o).length) {
        localStorage.setItem('kidsgames_players', JSON.stringify(o));
        localStorage.setItem('kidsgames_activePlayer', JSON.stringify(name));
      }
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v));
      localStorage.setItem('__seeded', '1');
    }
    if (fast) {
      const st = window.setTimeout, si = window.setInterval;
      window.setTimeout = (f, ms, ...r) => st(f, ms >= 500 && ms <= 700 ? 3 : ms, ...r); // the answer pause only (hints are 15 s+)
      window.setInterval = (f, ms, ...r) => si(f, ms === 1000 ? 1e7 : ms, ...r);          // freeze the sprint clock
    }
  }, [age, fast, name, seed, players]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => note(`pageerror: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') note(`console.error: ${m.text()}`); });
  await page.goto(url);
  return { ctx, page };
}

// Records every question the page draws (question text + the four buttons) and every class change on the buttons.
async function observe(page) {
  await page.evaluate((P) => {
    window.__q = []; window.__v = [];
    const qEl = document.getElementById(P + '-question'), cEl = document.getElementById(P + '-choices');
    new MutationObserver(() => {
      window.__q.push({
        q: qEl.textContent, qhtml: qEl.innerHTML,
        choices: [...cEl.querySelectorAll('button')].map((b) => ({ text: b.textContent, cls: b.className, aria: b.getAttribute('aria-label'),
          attrs: [...b.attributes].filter((a) => a.name !== 'aria-label').map((a) => a.name + '=' + a.value).sort().join('|') })),
        screen: document.getElementById(P + '-game').innerText,
      });
    }).observe(cEl, { childList: true });
  }, P);
}

const MINUS = '−';
// Runs inside the page: plays `count` questions, checking each one.
const DRIVER = async ({ P, style, count, wrongRate, mode, label }) => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const res = { played: 0, problems: [], wrongFlow: 0, rightFlow: 0, ops: {}, sample: [] };
  const prob = (m) => { if (res.problems.length < 12) res.problems.push(label + ': ' + m); };
  const NUM = '(?:\\u2212)?\\d+(?:\\.\\d)?';
  const OP = '[+\\u2212\\u00d7\\u00f7]';
  const FMT = style === 'answer'
    ? new RegExp(`^${NUM} ${OP} (?:${NUM}|\\(${NUM}\\)) = \\?$`)
    : new RegExp(`^(?:\\? ${OP} (?:${NUM}|\\(${NUM}\\)) = ${NUM}|${NUM} ${OP} \\? = ${NUM})$`);
  const n = (t) => Number(t.replace(/[()]/g, '').replace(/−/g, '-'));
  const parse = (text) => {
    const t = text.split(' ');
    if (t.length !== 5) return null;
    const op = { '+': '+', '−': '-', '×': '*', '÷': '/' }[t[1]];
    return { a: t[0] === '?' ? null : n(t[0]), op, b: t[2] === '?' ? null : n(t[2]), c: t[4] === '?' ? null : n(t[4]) };
  };
  const holds = (p, x) => {
    const a = p.a === null ? x : p.a, b = p.b === null ? x : p.b;
    const v = p.op === '+' ? a + b : p.op === '-' ? a - b : p.op === '*' ? a * b : (b === 0 ? NaN : a / b);
    return Math.abs(v - (p.c === null ? x : p.c)) < 1e-9;
  };
  let seen = 0;
  const waitNext = async () => { const t0 = performance.now(); while (window.__q.length <= seen) { if (performance.now() - t0 > 4000) return null; await sleep(1); } return window.__q[seen++]; };
  for (let i = 0; i < count; i++) {
    const snap = await waitNext();
    if (!snap) { prob('no next question after ' + i); break; }
    res.played++;
    const q = snap.q.trim();
    if (!FMT.test(q)) prob('DISPLAY FORMAT for style ' + style + ': "' + q + '"');
    if ((q.match(/\?/g) || []).length !== 1) prob('not exactly one "?": ' + q);
    const p = parse(q);
    if (!p) { prob('unparseable: ' + q); break; }
    res.ops[p.op] = (res.ops[p.op] || 0) + 1;
    const texts = snap.choices.map((c) => c.text);
    if (texts.length !== 4) prob(texts.length + ' buttons for ' + q);
    if (new Set(texts).size !== texts.length) prob('duplicate buttons ' + q + ' ' + texts);
    for (const c of snap.choices) {
      if (!/^(?:−)?\d+(?:\.\d)?$/.test(c.text)) prob('odd button text ' + c.text);
      if (c.aria !== 'Answer: ' + c.text) prob('aria-label mismatch ' + c.aria);
      if (c.cls !== snap.choices[0].cls || c.attrs !== snap.choices[0].attrs) prob('buttons differ before answering (leak): ' + c.cls + ' / ' + c.attrs);
    }
    const sat = snap.choices.filter((c) => holds(p, n(c.text)));
    if (sat.length !== 1) { prob('printed question has ' + sat.length + ' correct buttons: ' + q + ' [' + texts + ']'); break; }
    // nothing else on the play screen but the question, the four buttons and the HUD numbers
    const lines = snap.screen.split('\n').map((s) => s.trim()).filter(Boolean);
    const stray = lines.filter((l) => l !== q && !texts.includes(l) && !/^\d+$/.test(l) && !/^(Score|Seconds left)$/i.test(l));
    if (stray.length) prob('unexpected text on the play screen: ' + JSON.stringify(stray));
    if (res.sample.length < 2) res.sample.push(q + '  -> ' + sat[0].text);

    const correct = sat[0];
    const btns = [...document.getElementById(P + '-choices').querySelectorAll('button')];
    const byText = (t) => btns.find((b) => b.textContent === t);
    const wrongs = snap.choices.filter((c) => c !== correct);
    if (Math.random() < wrongRate) {
      const w = wrongs[Math.floor(Math.random() * wrongs.length)];
      byText(w.text).click();
      await sleep(2);
      if (!byText(w.text).classList.contains('is-wrong')) prob('wrong answer not marked ' + q);
      if (!byText(correct.text).classList.contains('is-reveal')) prob('right answer not revealed after a wrong one ' + q);
      if (mode !== 'sprint') {
        const qlen = window.__q.length;
        const other = wrongs.find((c) => c !== w);
        if (!byText(other.text).disabled) prob('another wrong button still live while waiting for the right one ' + q);
        if (byText(correct.text).disabled) prob('right button disabled while waiting for it ' + q);
        byText(other.text).click(); byText(w.text).click(); await sleep(8);
        if (window.__q.length !== qlen) prob('moved on without the right answer ' + q);
        byText(correct.text).click(); await sleep(2);
        if (!byText(correct.text).classList.contains('is-right')) prob('right tap after a mistake not marked ' + q);
      }
      res.wrongFlow++;
    } else {
      byText(correct.text).click(); await sleep(2);
      if (!byText(correct.text).classList.contains('is-right')) prob('right answer not accepted: ' + q);
      for (const w of wrongs) if (!byText(w.text).disabled) prob('wrong buttons still live after a right answer ' + q);
      res.rightFlow++;
    }
  }
  return res;
};

const pressed = (page, row, key) => page.evaluate(([P, row, key]) => { const b = document.querySelector(`#${P}-${row} [aria-pressed="true"]`); return b ? b.dataset[key] : null; }, [P, row, key]);
async function choose(page, { style, op, diff, mode, custom }) {
  if (!(await page.locator(`#${P}-settings`).isVisible())) await page.click(`#${P}-change-settings-btn`);
  if (style) await page.click(`[data-style="${style}"]`);
  await page.click(`[data-op="${op}"]`); await page.click(`[data-diff="${diff}"]`); await page.click(`[data-mode="${mode}"]`);
  if (custom) {
    await page.fill(`#${P}-min`, String(custom.min)); await page.fill(`#${P}-max`, String(custom.max)); await page.fill(`#${P}-table`, String(custom.maxTable));
    await page.setChecked(`#${P}-negatives`, !!custom.negatives); await page.setChecked(`#${P}-decimals`, !!custom.decimals);
  }
}
async function play(page, cfg, count, wrongRate = 0.25) {
  if (cfg.mode === 'round') count = Math.ceil(count / 10) * 10;   // play whole rounds
  await choose(page, cfg);
  await page.evaluate(() => { window.__q.length = 0; });
  await page.click(`#${P}-start-btn`);
  const label = `${cfg.style}/${cfg.op}/${cfg.diff}/${cfg.mode}`;
  const tally = { n: 0, ops: {} };
  let left = count;
  while (left > 0) {
    const want = cfg.mode === 'round' ? Math.min(10, left) : left;
    const r = await page.evaluate(DRIVER, { P, style: cfg.style, count: want, wrongRate, mode: cfg.mode, label });
    tally.n += r.played; for (const [k, v] of Object.entries(r.ops)) tally.ops[k] = (tally.ops[k] || 0) + v;
    r.problems.forEach(note);
    left -= r.played;
    if (r.problems.length) break;
    if (cfg.mode === 'round') {
      await page.waitForSelector(`#${P}-results:not([hidden])`, { timeout: 3000 }).catch(() => note(`${label}: results screen did not appear after ten questions`));
      const shown = await page.evaluate(() => window.__q.length);
      if (shown !== 10) note(`${label}: a Round showed ${shown} questions, expected 10`);
      if (left > 0) { await page.evaluate(() => { window.__q.length = 0; }); await page.click(`#${P}-play-again-btn`); }
    }
  }
  return tally;
}
async function leave(page, mode) {
  if (mode !== 'round') {
    await page.click(`#${P}-quit-btn`).catch(() => {});
    await page.waitForSelector(`#${P}-results:not([hidden])`, { timeout: 2000 }).catch(() => note('quit did not show the results screen'));
  }
  await page.click(`#${P}-change-settings-btn`).catch(() => {});
}

// ---------------------------------------------------------------------------------------------------------------------
// 1. Every displayed question, both styles, every operation / level / length
// ---------------------------------------------------------------------------------------------------------------------
const totals = { answer: 0, missing: 0 };
const opsSeen = { answer: {}, missing: {} };
const t0 = Date.now();
await Promise.all(['answer', 'missing'].map(async (style) => {
  const { ctx, page } = await open({ age: 7, fast: true });
  await observe(page);
  try {
  for (const mode of ['sprint', 'round', 'endless']) for (const diff of ['easy', 'medium', 'hard']) for (const op of ['+', '-', '*', '/', 'mixed']) {
    const s = await play(page, { style, op, diff, mode }, PER);
    if (issues.length) throw new Error('stopped at the first failure');
    totals[style] += s.n;
    for (const [k, v] of Object.entries(s.ops)) opsSeen[style][k] = (opsSeen[style][k] || 0) + v;
    if (s.n < PER) note(`${style}/${op}/${diff}/${mode}: only ${s.n} of ${PER} questions played`);
    await leave(page, mode);
  }
  const customs = [
    { min: -20, max: 20, maxTable: 12, negatives: true, decimals: false },
    { min: 1, max: 20, maxTable: 12, negatives: false, decimals: true },
    { min: -50, max: 50, maxTable: 12, negatives: true, decimals: true },
    { min: 100, max: 999, maxTable: 20, negatives: false, decimals: false },
    { min: 1, max: 10, maxTable: 0, negatives: false, decimals: false },
    { min: 1, max: 10, maxTable: 1, negatives: false, decimals: false },
  ];
  for (const c of customs) for (const op of ['+', '-', '*', '/', 'mixed']) {
    const s = await play(page, { style, op, diff: 'custom', mode: 'endless', custom: c }, 150);
    if (issues.length) throw new Error('stopped at the first failure');
    totals[style] += s.n;
    await leave(page, 'endless');
  }
  } catch (e) { note(`${style}: ${String(e.message).split('\n')[0]}`); }
  await ctx.close();
}));
out(`1. displayed questions checked in the built page: "Work it out" ${totals.answer}, "Find the missing number" ${totals.missing} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
out('   operations seen:', JSON.stringify(opsSeen));
for (const style of ['answer', 'missing']) {
  if (totals[style] < 5000) note(`only ${totals[style]} displayed questions for ${style} (need 5,000)`);
  for (const op of ['+', '-', '*', '/']) if (!opsSeen[style][op]) note(`${style}: operation ${op} never shown`);
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. Age defaults (what a child sees first, with nothing saved)
// ---------------------------------------------------------------------------------------------------------------------
{
  const expect = { 5: ['easy', 'round'], 6: ['easy', 'round'], 7: ['easy', 'round'], 8: ['medium', 'sprint'], 9: ['medium', 'sprint'], 10: ['hard', 'sprint'], 14: ['hard', 'sprint'], none: ['medium', 'sprint'] };
  const rows = [];
  for (const [age, [diff, mode]] of Object.entries(expect)) {
    const { ctx, page } = await open({ age: age === 'none' ? null : Number(age), fast: false });
    const got = [await pressed(page, 'op-row', 'op'), await pressed(page, 'style-row', 'style'), await pressed(page, 'diff-row', 'diff'), await pressed(page, 'mode-row', 'mode')];
    rows.push(`age ${age}: ${got.join(' / ')}`);
    if (got[0] !== '+' || got[1] !== 'answer' || got[2] !== diff || got[3] !== mode) note(`age ${age} defaults ${got} expected + / answer / ${diff} / ${mode}`);
    await ctx.close();
  }
  out('2. defaults:', rows.join(' | '));
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. Old Number Bonds address and saved data
// ---------------------------------------------------------------------------------------------------------------------
{
  const seed = {
    kidsgames_numberbonds_Mia: { settings: { op: '-', difficulty: 'easy', mode: 'round', custom: { min: 1, max: 9, maxTable: 5, negatives: false, decimals: false } }, 'pb_-_easy_round': 190 },
    kidsgames_maths_Mia: { settings: { op: '+', difficulty: 'medium', mode: 'sprint', custom: {} }, 'pb_+_medium_sprint': 420 },
    kidsgames_progress_Mia: { 'number-bonds': 3, maths: 2 },
    kidsgames_last_Mia: 'number-bonds',
  };
  const { ctx, page } = await open({ url: DOCS('number-bonds.html'), age: 7, fast: false, seed });
  await page.waitForURL(/maths\.html/, { timeout: 5000 }).catch(() => note('number-bonds.html did not redirect to maths.html'));
  await page.waitForSelector(`#${P}-settings`);
  const url = page.url();
  const style = await pressed(page, 'style-row', 'style');
  if (style !== 'missing') note(`old Number Bonds link opened on style "${style}", expected missing`);
  if (/style=/.test(url)) note('the ?style= is still in the address after loading');
  const data = await page.evaluate(() => ({ d: JSON.parse(localStorage.getItem('kidsgames_maths_Mia')), prog: JSON.parse(localStorage.getItem('kidsgames_progress_Mia')), last: JSON.parse(localStorage.getItem('kidsgames_last_Mia')), nb: localStorage.getItem('kidsgames_numberbonds_Mia') !== null }));
  if (data.d['pb_missing_-_easy_round'] !== 190 || data.d['pb_answer_+_medium_sprint'] !== 420) note('personal bests not carried over: ' + JSON.stringify(data.d));
  if (data.prog.maths !== 5 || data.prog['number-bonds'] !== undefined) note('progress not merged: ' + JSON.stringify(data.prog));
  if (data.last !== 'maths') note('last game not moved to maths: ' + data.last);
  if (!data.nb) note('old Number Bonds data was deleted');
  // and the hub shows the merged squares, with the lead tile Maths
  await page.goto(DOCS('index.html'));
  await page.waitForSelector('.mark--lead');
  const hub = await page.evaluate(() => ({ lead: document.querySelector('.mark--lead').dataset.game, marks: [...document.querySelectorAll('.mark')].map((m) => m.dataset.game), maths: document.querySelector('.mark[data-game="maths"] .kg-squares').getAttribute('aria-label') }));
  if (hub.lead !== 'maths') note('hub lead tile is ' + hub.lead + ', expected maths');
  if (hub.marks.length !== 5 || hub.marks.includes('number-bonds')) note('hub tiles: ' + hub.marks);
  if (!/5 of 10/.test(hub.maths)) note('hub squares for Maths: ' + hub.maths);
  out('3. old link ->', url.replace(/^.*docs\//, ''), '| style', style, '| progress', JSON.stringify(data.prog), '| hub', JSON.stringify(hub.marks), hub.maths);
  await ctx.close();
}

// ---------------------------------------------------------------------------------------------------------------------
// 4. What counts as a finished game; the player-switch leak; custom tables typed as 0 or 1
// ---------------------------------------------------------------------------------------------------------------------
{
  const { ctx, page } = await open({ age: 7, fast: true });
  await observe(page);
  const stored = () => page.evaluate(() => ({ d: JSON.parse(localStorage.getItem('kidsgames_maths_Mia') || '{}'), prog: JSON.parse(localStorage.getItem('kidsgames_progress_Mia') || '{}') }));
  // Endless stopped after 12 answers counts; shows no wrong flow here
  await play(page, { style: 'missing', op: '+', diff: 'easy', mode: 'endless' }, 12, 0);
  await page.click(`#${P}-quit-btn`);
  let s = await stored();
  if (s.prog.maths !== 1) note('Endless stopped after 12 answers did not count as played: ' + JSON.stringify(s.prog));
  if (!s.d['pb_missing_+_easy_endless']) note('Endless best not saved: ' + JSON.stringify(s.d));
  // Round quit after one answer does not
  await page.click(`#${P}-change-settings-btn`);
  await choose(page, { style: 'answer', op: '*', diff: 'hard', mode: 'round' });
  await page.evaluate(() => { window.__q.length = 0; });
  await page.click(`#${P}-start-btn`);
  (await page.evaluate(DRIVER, { P, style: 'answer', count: 1, wrongRate: 0, mode: 'round', label: 'partial round' })).problems.forEach(note);
  await sleep(50);
  await page.click(`#${P}-quit-btn`);
  s = await stored();
  const star = await page.locator(`#${P}-stats [aria-label="New best"]`).count();
  if (star) note('a quit Round showed the "new best" star');
  if (s.prog.maths !== 1) note('a quit Round counted as played');
  if (s.d['pb_answer_*_hard_round']) note('a quit Round saved a personal best');
  // a finished Round counts, with the best under its style
  await page.click(`#${P}-change-settings-btn`);
  await play(page, { style: 'answer', op: '+', diff: 'easy', mode: 'round' }, 10, 0);
  await page.waitForSelector(`#${P}-results:not([hidden])`);
  s = await stored();
  if (s.prog.maths !== 2 || !s.d['pb_answer_+_easy_round']) note('finished Round not recorded: ' + JSON.stringify(s));
  // the style is saved per player and remembered
  await page.reload(); await page.waitForSelector(`#${P}-settings`); await observe(page);
  const rem = [await pressed(page, 'style-row', 'style'), await pressed(page, 'mode-row', 'mode')];
  if (rem[0] !== 'answer' || rem[1] !== 'round') note('saved choices not restored: ' + rem);
  // custom: a typed table of 0 or 1 is lifted to 2 when the box is left, and the game shows four buttons
  for (const t of ['0', '1']) {
    await page.click('[data-diff="custom"]'); await page.click('[data-op="/"]');
    await page.fill(`#${P}-table`, t); await page.press(`#${P}-table`, 'Tab');
    const shown = await page.inputValue(`#${P}-table`);
    if (shown !== '2') note(`table typed as ${t} left as ${shown}`);
    await page.evaluate(() => { window.__q.length = 0; });
    await page.click(`#${P}-start-btn`);
    const info = await page.evaluate((P) => ({ q: document.getElementById(P + '-question').textContent, n: document.querySelectorAll(`#${P}-choices button`).length }), P);
    if (info.n !== 4 || /÷ 0/.test(info.q)) note(`table ${t}: ${info.n} buttons for "${info.q}"`);
    await page.click(`#${P}-quit-btn`); await page.click(`#${P}-change-settings-btn`);
  }
  await ctx.close();
  out('4. finished-game rules, saved style and custom tables: checked');
}
{
  // Switching player: the second child must not inherit the first child's operation or length
  const { ctx, page } = await open({ players: { Mia: 5, Big: 10 }, name: 'Mia', fast: true });
  await choose(page, { style: 'missing', op: '*', diff: 'easy', mode: 'endless' });
  await page.click(`#${P}-start-btn`); await page.click(`#${P}-quit-btn`); await page.click(`#${P}-change-settings-btn`);
  await page.click('#kg-player-btn');
  await page.locator('#kg-player-grid').getByText('Big').first().click();
  await sleep(300);
  const got = [await pressed(page, 'op-row', 'op'), await pressed(page, 'style-row', 'style'), await pressed(page, 'diff-row', 'diff'), await pressed(page, 'mode-row', 'mode')];
  if (got.join() !== '+,answer,hard,sprint') note(`switching to a new 10-year-old gave ${got} (expected + / answer / hard / sprint)`);
  out('   player switch ->', got.join(' / '));
  await ctx.close();
}

// ---------------------------------------------------------------------------------------------------------------------
// 5. The hub at four screen shapes (four games: one lead and three others), Day and Dusk
// ---------------------------------------------------------------------------------------------------------------------
{
  const shapes = { 'tablet landscape': { width: 1180, height: 820 }, 'tablet portrait': { width: 820, height: 1180 }, phone: { width: 390, height: 844 }, 'short landscape': { width: 844, height: 390 } };
  for (const [name, viewport] of Object.entries(shapes)) {
    for (const theme of ['colourful-light', 'colourful-dark']) {
      const { ctx, page } = await open({ url: DOCS('index.html'), age: 7, fast: false, viewport });
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      await page.waitForSelector('.mark--lead');
      await sleep(500);
      const m = await page.evaluate(() => {
        const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
        const marks = [...document.querySelectorAll('.mark')].map((el) => ({ id: el.dataset.game, lead: el.classList.contains('mark--lead'), ...r(el), nameW: el.querySelector('.mark__name').scrollWidth, nameBox: el.querySelector('.mark__name').clientWidth }));
        return { marks, docW: document.documentElement.scrollWidth, vw: window.innerWidth, docH: document.documentElement.scrollHeight, vh: window.innerHeight };
      });
      if (m.marks.length !== 5) note(`${name}: ${m.marks.length} tiles`);
      if (m.docW > m.vw + 1) note(`${name}/${theme}: sideways scroll (${m.docW} > ${m.vw})`);
      for (const k of m.marks) {
        if (k.w < 44 || k.h < 44) note(`${name}: tile ${k.id} is ${Math.round(k.w)}x${Math.round(k.h)}`);
        if (k.x < -1 || k.x + k.w > m.vw + 1) note(`${name}: tile ${k.id} off the side of the screen`);
      }
      for (let i = 0; i < m.marks.length; i++) for (let j = i + 1; j < m.marks.length; j++) {
        const a = m.marks[i], b = m.marks[j];
        if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) note(`${name}: tiles ${a.id} and ${b.id} overlap`);
      }
      const lead = m.marks.find((k) => k.lead);
      const others = m.marks.filter((k) => !k.lead);
      const minOther = Math.min(...others.map((k) => k.w * k.h));
      if (lead && lead.w * lead.h < minOther * 1.3) note(`${name}: lead tile is not clearly the biggest`);
      if (process.env.SHOTS) { fs.mkdirSync(process.env.SHOTS, { recursive: true }); await page.screenshot({ path: path.join(process.env.SHOTS, `hub-${name.replace(/ /g, '-')}-${theme === 'colourful-dark' ? 'dusk' : 'day'}.png`), fullPage: true }); }
      await ctx.close();
    }
  }
  out('5. hub: five tiles, no overlap or sideways scroll, lead clearly biggest, at', Object.keys(shapes).join(', '));
}

// ---------------------------------------------------------------------------------------------------------------------
// 6. Real clock (REALTIME=1): sprint length and hint timers
// ---------------------------------------------------------------------------------------------------------------------
if (process.env.REALTIME) {
  const solve = (page) => page.evaluate((P) => {
    const t = document.getElementById(P + '-question').textContent.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/[()]/g, '').split(' ');
    const a = t[0] === '?' ? null : Number(t[0]), b = t[2] === '?' ? null : Number(t[2]), c = t[4] === '?' ? null : Number(t[4]);
    const ok = (x) => { const A = a === null ? x : a, B = b === null ? x : b; const v = t[1] === '+' ? A + B : t[1] === '-' ? A - B : t[1] === '*' ? A * B : A / B; return Math.abs(v - (c === null ? x : c)) < 1e-9; };
    return [...document.querySelectorAll(`#${P}-choices button`)].filter((bt) => ok(Number(bt.textContent.replace(/−/g, '-')))).map((bt) => bt.textContent);
  }, P);
  const click = (page, text) => page.evaluate(([P, text]) => { [...document.querySelectorAll(`#${P}-choices button`)].find((b) => b.textContent === text).click(); }, [P, text]);
  await Promise.all([
    (async () => {
      const { ctx, page } = await open({ age: 8, fast: false });
      await choose(page, { style: 'missing', op: '+', diff: 'medium', mode: 'sprint' });
      const start = Date.now(); await page.click(`#${P}-start-btn`);
      while (await page.locator(`#${P}-game`).isVisible()) { const a = await solve(page); if (a.length === 1) await click(page, a[0]); await sleep(600); }
      const dt = (Date.now() - start) / 1000;
      if (dt < 59.5 || dt > 62) note(`Sprint lasted ${dt.toFixed(1)} s`);
      out(`6. Sprint lasted ${dt.toFixed(1)} s; results: ${(await page.textContent(`#${P}-stats`)).replace(/\s+/g, ' ').trim()}`);
      await ctx.close();
    })(),
    ...[['easy', 'round', 15, 20], ['medium', 'round', 25, 30], ['hard', 'round', null, 30], ['easy', 'sprint', null, 20]].map(async ([diff, mode, want, wait]) => {
      const { ctx, page } = await open({ age: 8, fast: false });
      await choose(page, { style: 'answer', op: '+', diff, mode }); await page.click(`#${P}-start-btn`);
      const t = Date.now(); let at = null;
      while ((Date.now() - t) / 1000 < wait) { if (await page.locator(`#${P}-choices .is-hint`).count()) { at = (Date.now() - t) / 1000; break; } await sleep(200); }
      if (want === null ? at !== null : at === null || Math.abs(at - want) > 1) note(`hint for ${diff}/${mode}: ${at === null ? 'none' : at.toFixed(1) + ' s'}, expected ${want === null ? 'none' : want + ' s'}`);
      if (at !== null) { const hinted = await page.evaluate((P) => document.querySelector(`#${P}-choices .is-hint`).textContent, P); const a = await solve(page); if (a[0] !== hinted) note('hint highlighted a wrong answer'); }
      out(`   hint ${diff}/${mode}: ${at === null ? 'none' : at.toFixed(1) + ' s'}`);
      await ctx.close();
    }),
  ]);
}

await browser.close();
finish();
