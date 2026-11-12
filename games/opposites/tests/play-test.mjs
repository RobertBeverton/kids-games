// Built-page proof for Opposites: plays the BUILT page (docs/opposites.html) in a real browser.
//
//   bash build.sh
//   PLAYWRIGHT_CORE=<path or URL of playwright-core's index.mjs> node games/opposites/tests/play-test.mjs
//   (playwright-core is deliberately not a repo dependency: install it anywhere, e.g. `npm i playwright-core` in a scratch folder.
//    The test drives Microsoft Edge: change `channel` below to use another browser.)
//
// What it asserts, per age bracket (4-5, 6-8, 9-12, 13+):
//  - 200+ questions played in choose mode and 200+ in typed mode through the real UI, in games of the right length and level mix,
//    with no repeated word inside a game, missed words coming back, and nothing but missed words repeating between games;
//  - choose mode never shows two acceptable options, and every option is an answer or a listed distractor;
//  - typed mode accepts every curated answer and misspelling (capitals and spaces ignored) and rejects distractors;
//  - the answer is never printed on the page before the child answers.
// For the 6-8 bracket it also runs an exhaustive pass: every accepted word, every distractor and random other words for every
// entry through the real input box, and every entry rendered in choose mode repeatedly at both distractor counts.
// Expected answers are read from tools/opposites-words.txt, opposites-misspellings.txt and opposites-forms.txt, not from the page, so this
// also proves the data embedded in the game matches the list.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseWords } from '../../../tools/opposites-lib.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const URL = process.env.PAGE || pathToFileURL(path.join(ROOT, 'docs', 'opposites.html')).href;
// Expected data comes from the SOURCE list files, not from the page, so the test also proves the embedded copy is right.
const { entries } = parseWords(fs.readFileSync(`${ROOT}/tools/opposites-words.txt`, 'utf8'));
const readMap = (file) => {
  const out = new Map();
  for (const raw of fs.readFileSync(`${ROOT}/tools/${file}`, 'utf8').split(/\r?\n/)) {
    const m = raw.replace(/#.*$/, '').trim().match(/^([a-z]+):\s*([a-z ]+)$/);
    if (m) out.set(m[1], m[2].trim().split(/\s+/));
  }
  return out;
};
const slips = readMap('opposites-misspellings.txt');
const forms = readMap('opposites-forms.txt');
const src = new Map(entries.map((e) => {
  const choosable = e.answers.filter((a) => !e.typedOnly.includes(a));
  const typed = new Set(e.typedOnly);
  for (const a of e.answers) for (const s of [...(forms.get(a) || []), ...(slips.get(a) || [])]) typed.add(s);
  const accepted = new Set([...choosable, ...typed]);
  return [e.word, { level: e.level, choosable, typed: [...typed], accepted, distractors: e.distractors }];
}));
const everyWord = [...new Set(entries.flatMap((e) => [e.word, ...e.answers, ...e.distractors]))];

const failures = [];
const fail = (m) => { if (failures.length < 40) failures.push(m); else if (failures.length === 40) failures.push('... more failures not shown'); };
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];

const AGES = { '4-5': 5, '6-8': 7, '9-12': 10, '13+': 14 };
const CFG = { '4-5': { len: 10, dist: 2, levels: { 1: 10 } }, '6-8': { len: 20, dist: 3, levels: { 1: 5, 2: 15 } }, '9-12': { len: 20, dist: 3, levels: { 1: 5, 2: 15 } }, '13+': { len: 20, dist: 3, levels: { 1: 5, 2: 15 } } };

async function open(browser, age) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  await ctx.addInitScript((a) => {
    localStorage.setItem('kidsgames_players', JSON.stringify({ Mia: { name: 'Mia', dob: null, manualAge: a, theme: 'day', avatar: 0, createdAt: '2026-01-01' } }));
    localStorage.setItem('kidsgames_activePlayer', JSON.stringify('Mia'));
    const st = window.setTimeout; // the game waits ~2 s between questions; shorten waits so 1000s of questions run quickly
    window.setTimeout = (f, ms, ...r) => st(f, ms >= 300 ? 4 : ms, ...r);
  }, age);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL);
  await page.waitForSelector('#gameCard .opp-word');
  await page.evaluate(() => {
    const oc = checkChoice, ot = checkTyped;
    window.checkChoice = function (b, c) { window.__at = shuffledPairs[currentIndex].w; return oc(b, c); };
    window.checkTyped = function () { window.__at = shuffledPairs[currentIndex].w; return ot(); };
    const hc = handleCorrect, hw = handleWrong; // the game's own verdict, captured the instant it is made
    window.handleCorrect = function () { window.__res = 'right'; return hc.apply(this, arguments); };
    window.handleWrong = function () { window.__res = 'wrong'; return hw.apply(this, arguments); };
  });
  return { ctx, page, errors };
}

const state = (page) => page.evaluate(() => ({
  w: shuffledPairs[currentIndex].w, idx: currentIndex, len: shuffledPairs.length,
  words: shuffledPairs.map((p) => p.w), levels: shuffledPairs.map((p) => p.l),
  shownWord: document.querySelector('.opp-word').textContent.trim(),
  options: [...document.querySelectorAll('.opp-choice')].map((b) => b.textContent.trim().toLowerCase()),
  cardText: [...document.getElementById('gameCard').children].filter((c) => !c.matches('.opp-progress, .opp-hint, .opp-label')).map((c) => c.innerText).join(' ').toLowerCase(),
}));
const settle = (page) => page.waitForFunction(() => answered === false || !!document.getElementById('oppAgain'), null, { timeout: 5000 });

async function playFlow(page, bracket, mode, minQuestions, stats) {
  await page.click(mode === 'choice' ? '#choiceMode' : '#typeMode');
  let asked = 0, game = 0, prev = null, missedLast = [];
  while (asked < minQuestions) {
    game++;
    const first = await state(page);
    const cfg = CFG[bracket];
    // game shape: right length, no repeated word, right level mix, nothing from outside the bracket's levels
    if (first.len !== cfg.len) fail(`${bracket}/${mode}: game length ${first.len}, expected ${cfg.len}`);
    if (new Set(first.words).size !== first.words.length) fail(`${bracket}/${mode}: a word repeats within one game`);
    for (const [lvl, n] of Object.entries(cfg.levels)) {
      const got = first.levels.filter((l) => l === Number(lvl)).length;
      if (got !== n) fail(`${bracket}/${mode}: ${got} level-${lvl} words, expected ${n}`);
    }
    {
      const saved = await page.evaluate(() => savedData.missed || []);
      const poolLevels = Object.keys(cfg.levels).map(Number);
      const inPool = saved.filter((w) => src.get(w) && poolLevels.includes(src.get(w).level));
      const back = first.words.filter((w) => inPool.includes(w)).length;
      if (back < Math.min(3, inPool.length)) fail(`${bracket}/${mode}: only ${back} of ${inPool.length} saved missed words came back (expected at least ${Math.min(3, inPool.length)})`);
      stats.missedBack.push(back);
      if (prev) {
        const shared = first.words.filter((w) => prev.includes(w));
        stats.consecShared.push(shared.length);
        const unexplained = shared.filter((w) => !inPool.includes(w)).length;
        if (unexplained > 0) fail(`${bracket}/${mode}: ${unexplained} word(s) repeated between consecutive games that were not missed words: ${shared.filter((w) => !inPool.includes(w)).join(', ')}`);
      }
    }
    prev = first.words; missedLast = [];
    for (let q = 0; q < first.len; q++) {
      const s = await state(page);
      const e = src.get(s.w);
      if (!e) { fail(`${bracket}/${mode}: unknown word ${s.w}`); break; }
      if (s.shownWord.toLowerCase() !== s.w) fail(`${bracket}/${mode}: shown word "${s.shownWord}" != "${s.w}"`);
      const cardAnswers = [...e.accepted].filter((a) => new RegExp(`\\b${a}\\b`).test(mode === 'type' ? s.cardText : s.cardText.replace(/\s+/g, ' ')));
      let wantRight, detail = '';
      await page.evaluate(() => { window.__res = null; });
      if (mode === 'choice') {
        const right = s.options.filter((o) => e.accepted.has(o));
        if (s.options.length !== cfg.dist + 1) fail(`${bracket}: ${s.options.length} options for "${s.w}", expected ${cfg.dist + 1}`);
        if (right.length !== 1) fail(`${bracket}: "${s.w}" shows ${right.length} acceptable options: ${s.options.join(', ')}`);
        if (new Set(s.options).size !== s.options.length) fail(`${bracket}: duplicate options for "${s.w}"`);
        for (const o of s.options) if (!e.choosable.includes(o) && !e.distractors.includes(o)) fail(`${bracket}: option "${o}" for "${s.w}" is neither an answer nor a listed distractor`);
        stats.longest += right.length === 1 && s.options.every((o) => o === right[0] || o.length < right[0].length) ? 1 : 0;
        stats.shortest += right.length === 1 && s.options.every((o) => o === right[0] || o.length > right[0].length) ? 1 : 0;
        wantRight = q % 3 !== 0; // every third question is answered wrongly on purpose
        const target = wantRight ? right[0] : s.options.find((o) => !e.accepted.has(o));
        detail = `clicked "${target}" of [${s.options.join(', ')}]`;
        await page.click(`.opp-choice[data-opt="${target}"]`);
      } else {
        if (cardAnswers.length) fail(`${bracket}/type: the answer(s) ${cardAnswers.join(', ')} are printed on screen for "${s.w}"`);
        const kind = q % 3;
        let typed;
        if (kind === 0) { wantRight = false; typed = pick(e.distractors); }
        else if (kind === 1) { wantRight = true; typed = pick([...e.accepted]); }
        else { wantRight = true; typed = pick(e.typed.length ? e.typed : e.choosable).toUpperCase() + ' '; } // capitals and a trailing space must not matter
        detail = `typed "${typed}"`;
        await page.fill('#typeInput', typed);
        await page.press('#typeInput', 'Enter');
      }
      await page.waitForFunction(() => window.__res !== null);
      const rightShown = (await page.evaluate(() => window.__res)) === 'right';
      const checkedWord = await page.evaluate(() => window.__at);
      if (checkedWord !== s.w) { stats.races = (stats.races || 0) + 1; await settle(page); asked++; stats.asked++; continue; }
      if (rightShown !== wantRight) fail(`${bracket}/${mode}: "${s.w}" expected ${wantRight ? 'right' : 'wrong'} but the game said ${rightShown ? 'right' : 'wrong'} (${detail})`);
      if (!wantRight) missedLast.push(s.w);
      asked++; stats.asked++;
      await settle(page);
    }
    // after the last question the end screen shows; play again
    await page.waitForSelector('#oppAgain');
    await page.click('#oppAgain');
    await page.waitForSelector('#gameCard .opp-word');
  }
}

// Every entry, every accepted word, every distractor, plus random other words, through the real input box.
async function exhaustiveTyped(page, stats) {
  await page.click('#typeMode');
  await page.evaluate(() => { window.nextQuestion = () => {}; });
  for (const [word, e] of src) {
    const others = [];
    while (others.length < 5) { const w = pick(everyWord); if (w !== word && !e.accepted.has(w) && !others.includes(w)) others.push(w); }
    const cases = [
      ...[...e.accepted].map((t) => [t, true]),
      ...e.distractors.map((t) => [t, false]),
      ...others.map((t) => [t, false]),
      [word, false], // typing the question word itself is wrong
    ];
    for (const [typed, expect] of cases) {
      await page.evaluate((w) => { window.__res = null; const p = wordPairs.find((x) => x.w === w); shuffledPairs = [p]; currentIndex = 0; answered = false; renderQuestion(); }, word);
      await page.fill('#typeInput', typed);
      await page.press('#typeInput', 'Enter');
      await page.waitForFunction(() => window.__res !== null);
      const ok = (await page.evaluate(() => window.__res)) === 'right';
      stats.typedChecks++;
      if (ok !== expect) fail(`typed "${typed}" for "${word}": expected ${expect ? 'right' : 'wrong'}, got ${ok ? 'right' : 'wrong'}`);
    }
  }
}

// Every entry rendered in choose mode several times, at every distractor count.
async function exhaustiveChoice(page, stats) {
  await page.click('#choiceMode');
  const bad = await page.evaluate((srcEntries) => {
    const out = []; let n = 0;
    for (const dist of [2, 3]) {
      config = { ...config, distractorCount: dist };
      for (const p of wordPairs) {
        const e = srcEntries[p.w];
        for (let r = 0; r < 6; r++) {
          shuffledPairs = [p]; currentIndex = 0; answered = false; renderQuestion(); n++;
          const opts = [...document.querySelectorAll('.opp-choice')].map((b) => b.textContent.trim().toLowerCase());
          const right = opts.filter((o) => e.accepted.includes(o));
          if (opts.length !== dist + 1 || right.length !== 1 || new Set(opts).size !== opts.length) out.push(`${p.w}: ${opts.join(',')}`);
        }
      }
    }
    return { out, n };
  }, Object.fromEntries([...src].map(([w, e]) => [w, { accepted: [...e.accepted] }])));
  stats.choiceScreens += bad.n;
  bad.out.forEach((m) => fail(`choose screen problem: ${m}`));
}

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const report = {};
for (const bracket of Object.keys(AGES)) {
  const stats = { asked: 0, missedBack: [], consecShared: [], longest: 0, shortest: 0, typedChecks: 0, choiceScreens: 0 };
  const { ctx, page, errors } = await open(browser, AGES[bracket]);
  const reported = await page.evaluate(() => window.KidsGames.player.ageBracket);
  if (reported !== bracket) fail(`seeded age gives bracket ${reported}, expected ${bracket}`);
  await playFlow(page, bracket, 'choice', 200, stats);
  const choiceAsked = stats.asked;
  await playFlow(page, bracket, 'type', 200, stats);
  if (bracket === '6-8') { await exhaustiveTyped(page, stats); await exhaustiveChoice(page, stats); }
  if (errors.length) fail(`${bracket}: page errors: ${errors.slice(0, 3).join(' | ')}`);
  report[bracket] = { harnessRaces: stats.races || 0, choiceQuestions: choiceAsked, typedQuestions: stats.asked - choiceAsked, avgMissedWordsBackPerGame: (stats.missedBack.reduce((a, b) => a + b, 0) / Math.max(1, stats.missedBack.length)).toFixed(2), avgConsecutiveShared: (stats.consecShared.reduce((a, b) => a + b, 0) / Math.max(1, stats.consecShared.length)).toFixed(2), correctIsLongestPct: (100 * stats.longest / Math.max(1, choiceAsked)).toFixed(0), correctIsShortestPct: (100 * stats.shortest / Math.max(1, choiceAsked)).toFixed(0), exhaustiveTypedChecks: stats.typedChecks, exhaustiveChoiceScreens: stats.choiceScreens };
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
console.log(failures.length ? `\nFAILURES (${failures.length}):\n` + failures.join('\n') : '\nALL CHECKS PASSED');
process.exit(failures.length ? 1 : 0);
