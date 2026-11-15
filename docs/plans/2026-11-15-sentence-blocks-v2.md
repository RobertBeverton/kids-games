# Sentence Blocks v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Help ladder (Pictures + colours, Colours only, Words only), a Story mode (3, 5 or 10 sentences, an early "The end", then a book-page reveal) and a bigger word bank to Sentence Blocks, with no new hub tile. Simple new words get a drawing (reviewed by the user); words too complex to draw simply stay as plain word tiles that appear in Silly and Story.

**Architecture:** All new logic goes into the existing `engine.js` (pure, unit tested). `words.js` tiles get an optional `pic`. `bankFor(data, help, mode)` keeps drawn-only words in exactly one case: Describe the picture at the easy level (an undrawn wrong tile would give away the one drawn right tile). Everywhere else every word is offered, and a word with no drawing is a coloured word tile. `main.js` and `index.html` gain two settings rows, a story session flow and a reveal screen. **No new JS files**, so `build.sh` does not change (it joins `js/` files in a fixed order and strips import/export lines).

**Tech Stack:** vanilla JS (ES modules in source, bundled to one classic script by `build.sh`), `node --test`, Playwright (`playwright-core`, Edge) over the built page.

**Design:** `2026-11-15-sentence-blocks-v2-design.md` (agreed). Read it first.

**Baseline (run 2026-11-15 on `master`):** `cd games/sentence-blocks/tests && node --test ./*.test.js` gives 37 tests, 37 pass. Nothing in this plan has been run; each task says what to expect.

---

## Rules for every task

1. **Bundler rules.** Every top-level name must be unique across all files in `games/sentence-blocks/js/` (the bundler joins them in one scope). No multi-line `import` lists in new code beyond the style already used. Do not add files to `js/`.
2. **Do not commit `docs/` by hand.** CI rebuilds `docs/` and commits it to the PR branch. Run `bash build.sh` locally to check the build, then `git checkout -- docs` (or leave it unstaged). Never resolve a `docs/` conflict by hand; rebuild.
3. **Seeded randomness in tests**, as in `engine.test.js` (`rng(seed)`), so a failure names its seed.
4. **STOP gates** (Tasks 9 to 12, word batches and drawings): the user reviews every word list and every drawing before it is committed. Show the table or contact sheet the task prints; do not commit until the user says yes.
5. **No therapy claims, no read-aloud, no emoji, no timers or scores** in any new copy (design decisions carried in).
6. Commit after every task. End each commit message with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

---

### Task 1: Saved data gains `help`, `storyLength` and `mode: 'story'`

**Files:**
- Modify: `games/sentence-blocks/js/engine.js` (constants near line 5-10, `normaliseSave` near line 236)
- Modify: `games/sentence-blocks/tests/engine.test.js:205-212` (the "keeps good values" test)
- Create: `games/sentence-blocks/tests/v2.test.js`

**Step 1: Write the failing tests.** Create `tests/v2.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HELP_LEVELS, STORY_LENGTHS, STAGES, SILLY_CHOICES, SLOT_ORDER,
  bankFor, lookOf, hasPic, storyHeading, canEndEarly, buildStoryRound, buildSillyRound, buildSceneRound,
  normaliseSave, recordSentence, tryPlace, roundSentence, poolFor, validateData, tileOf, distractorsOf,
} from '../js/engine.js';
import { DATA } from '../js/words.js';
import { SCENES } from '../js/scenes.js';

const many = (n, fn) => { for (let i = 0; i < n; i++) fn(i); };
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
// Same shape as engine.test.js, widened to allow a two-word "what" (ice cream) and more place words.
const SENTENCE = /^[A-Z][a-z]*( [a-z]+)* (is|are) [a-z]+( (a|an) [a-z]+( [a-z]+)?| [a-z]+)?( (in|on|at) (the |a )?[a-z]+)?\.$/;

describe('saved data: help and story', () => {
  it('defaults and survives anything', () => {
    for (const bad of [undefined, null, 7, 'x', [], { help: 'x', storyLength: 4, mode: 'x' }, { help: 5, storyLength: '5' }]) {
      const s = normaliseSave(bad);
      assert.equal(s.help, 'pictures'); assert.equal(s.storyLength, 5); assert.equal(s.mode, 'scene'); assert.equal(s.v, 1);
    }
  });
  it('keeps good values', () => {
    for (const help of HELP_LEVELS) assert.equal(normaliseSave({ help }).help, help);
    for (const n of STORY_LENGTHS) assert.equal(normaliseSave({ storyLength: n }).storyLength, n);
    assert.equal(normaliseSave({ mode: 'story' }).mode, 'story');
    assert.equal(normaliseSave({ mode: 'silly' }).mode, 'silly');
  });
  it('an old save (no help, no story length) loads as the easy level', () => {
    const s = normaliseSave({ v: 1, mode: 'silly', stage: 2, done: { 1: 6, 2: 1, 3: 0 }, recent: ['a'] });
    assert.deepEqual(s, { v: 1, mode: 'silly', stage: 2, help: 'pictures', storyLength: 5, done: { 1: 6, 2: 1, 3: 0 }, recent: ['a'] });
  });
});
```

**Step 2: Run to verify it fails**

Run: `cd games/sentence-blocks/tests && node --test ./v2.test.js`
Expected: FAIL (import error: `HELP_LEVELS` is not exported).

**Step 3: Implement.** In `engine.js`, after `KINDS` (line 10) add:

```js
export const HELP_LEVELS = ['pictures', 'colours', 'words'];  // how much the tiles help, easiest first
export const STORY_LENGTHS = [3, 5, 10];
export const DEFAULT_STORY_LENGTH = 5;
```

Replace the `return { ... }` of `normaliseSave` with:

```js
  return {
    v: SAVE_VERSION,
    mode: r.mode === 'silly' || r.mode === 'story' ? r.mode : 'scene',
    stage: [1, 2, 3].includes(r.stage) ? r.stage : 1,
    help: HELP_LEVELS.includes(r.help) ? r.help : 'pictures',
    storyLength: STORY_LENGTHS.includes(r.storyLength) ? r.storyLength : DEFAULT_STORY_LENGTH,
    done: { 1: count(done[1]), 2: count(done[2]), 3: count(done[3]) },
    recent: Array.isArray(r.recent) ? r.recent.filter((x) => typeof x === 'string').slice(-RECENT_KEEP) : [],
  };
```

`SAVE_VERSION` stays 1: the two new fields default safely, so old saves load unchanged and no migration is needed.

In `tests/engine.test.js` replace the expected object in "keeps good values" (line 212) with `{ v: 1, mode: 'silly', stage: 2, help: 'pictures', storyLength: 5, done: { 1: 6, 2: 1, 3: 0 }, recent: ['a'] }`.

**Step 4: Run all tests**

Run: `cd games/sentence-blocks/tests && node --test ./*.test.js`
Expected: PASS, 40 tests (37 + 3 new).

**Step 5: Commit**

```bash
git add games/sentence-blocks/js/engine.js games/sentence-blocks/tests/engine.test.js games/sentence-blocks/tests/v2.test.js
git commit -m "feat(sentence-blocks): saved data carries help level and story length"
```

---

### Task 2: Words may have no drawing; `bankFor` limits Describe the picture at the easy level

**Files:**
- Modify: `games/sentence-blocks/js/engine.js` (`lookOf` line 141, `validateData` lines 65-135)
- Modify: `games/sentence-blocks/tests/engine.test.js:19-26`
- Modify: `games/sentence-blocks/tests/pictures.test.js:51-57`
- Modify: `games/sentence-blocks/tests/v2.test.js` (append)

**Why this task is subtle:** three things assume every tile has a drawing: `lookOf` (two undrawn tiles would both look like `undefined`, so one could never be offered beside the other), `validateData` (flags a missing picture) and `pictures.test.js` (asserts every tile has a picture). A fourth is a trap: in **Describe the picture at the easy level** the tray must hold only drawn words (the right tile is always drawn, so an undrawn wrong tile would give it away), so a drawn describing word whose **opposite** is undrawn would lose its wrong tile. In Silly and Story every word is offered at every level.

**Step 1: Append failing tests to `v2.test.js`:**

```js
// Fixtures use words the word batches do not add (newt, hamster), so the ids never collide with the shipped data.
const UNDRAWN_WHO = { id: 'newt', det: 'the', noun: 'newt', kind: 'animal' };   // no pic on purpose
const UNDRAWN_WHO2 = { id: 'hamster', det: 'the', noun: 'hamster', kind: 'animal' };
const withUndrawn = { ...DATA, who: [...DATA.who, UNDRAWN_WHO, UNDRAWN_WHO2] };

describe('words without a drawing', () => {
  it('hasPic and lookOf: undrawn tiles look different from each other', () => {
    assert.equal(hasPic(UNDRAWN_WHO), false);
    assert.equal(hasPic(DATA.who[0]), true);
    assert.notEqual(lookOf(UNDRAWN_WHO), lookOf(UNDRAWN_WHO2));
    assert.notEqual(lookOf(UNDRAWN_WHO), 'undefined');
  });
  it('bankFor: only Describe the picture at the easy level is limited to drawn tiles', () => {
    const drawnOnly = bankFor(withUndrawn, 'pictures', 'scene');
    assert.ok(drawnOnly.who.every(hasPic));
    assert.equal(drawnOnly.who.length, DATA.who.filter(hasPic).length);
    for (const slot of SLOT_ORDER) assert.ok(Array.isArray(drawnOnly[slot]));
    for (const [help, mode] of [['pictures', 'silly'], ['pictures', 'story'], ['colours', 'scene'], ['colours', 'story'], ['words', 'scene'], ['words', 'silly']]) {
      assert.equal(bankFor(withUndrawn, help, mode).who.length, withUndrawn.who.length, help + ' ' + mode);
    }
  });
  it('the scene bank is the whole bank once every tile is drawn', () => {
    if (SLOT_ORDER.every((s) => DATA[s].every(hasPic))) assert.deepEqual(bankFor(DATA, 'pictures', 'scene'), DATA);
  });
  it('validator accepts an undrawn tile, and rejects a scene whose right answer is undrawn', () => {
    assert.deepEqual(validateData(withUndrawn, SCENES), []);
    const sc = { id: 's1-newt-jumping', stage: 1, who: 'newt', doing: 'jumping', picture: {} };
    assert.ok(validateData(withUndrawn, [sc]).some((p) => p.includes('has no drawing')));
  });
  it('validator: a drawn describing word needs a drawn opposite (or the easy level loses its wrong tile)', () => {
    const bad = { ...DATA, describe: [...DATA.describe, { id: 'tall', word: 'tall', opposite: 'short', pic: 'big' }, { id: 'short', word: 'short', opposite: 'tall' }] };
    assert.ok(validateData(bad, []).some((p) => p.includes('its opposite')));
  });
  it('validator: a slot with too few tiles in the whole bank is flagged', () => {
    const thin = { ...DATA, where: DATA.where.slice(0, 2) };
    const probs = validateData(thin, []);
    assert.ok(probs.some((p) => p.includes('too few where')), probs.join('|'));
    assert.ok(!validateData(DATA, []).some((p) => p.includes('too few')));
  });
  it('a scene round at the easy level never offers an undrawn tile; at harder levels it can', () => {
    const scene = SCENES.find((s) => s.id === 's1-boy-running');
    many(60, (i) => assert.ok(buildSceneRound(bankFor(withUndrawn, 'pictures', 'scene'), scene, rng(i)).tray.every((x) => hasPic(tileOf(withUndrawn, x.slot, x.id)))));
    let seen = false;
    many(200, (i) => { if (buildSceneRound(bankFor(withUndrawn, 'words', 'scene'), scene, rng(i)).tray.some((x) => !hasPic(tileOf(withUndrawn, x.slot, x.id)))) seen = true; });
    assert.ok(seen, 'harder levels should be able to offer undrawn words');
  });
  it('a tile flagged freeOnly is offered in Silly and Story but never as a wrong tile in a scene', () => {
    const data = { ...DATA, who: [...DATA.who, { id: 'queen', det: 'the', noun: 'queen', kind: 'adult', freeOnly: true }] };
    const scene = SCENES.find((s) => s.id === 's1-boy-running');
    many(200, (i) => assert.ok(!buildSceneRound(bankFor(data, 'words', 'scene'), scene, rng(i)).tray.some((x) => x.id === 'queen')));
    let seen = false;
    many(200, (i) => { if (buildStoryRound(bankFor(data, 'words', 'story'), 1, 0, 3, rng(i)).tray.some((x) => x.id === 'queen')) seen = true; });
    assert.ok(seen, 'a freeOnly tile should still turn up in free-choice rounds');
    const bad = validateData(data, [{ id: 's1-queen-running', stage: 1, who: 'queen', doing: 'running', picture: {} }]);
    assert.ok(bad.some((p) => p.includes('freeOnly')), bad.join('|'));
  });
  it('wrong tiles are never also right: a group-mate is not offered, undrawn or not', () => {
    const data = { ...DATA, where: [...DATA.where, { id: 'playground', phrase: 'in the playground', tags: ['outdoor'], group: 'green' }] };
    const scene = SCENES.find((s) => s.where === 'park');
    many(80, (i) => assert.ok(!buildSceneRound(bankFor(data, 'words', 'scene'), scene, rng(i)).tray.some((x) => x.slot === 'where' && (x.id === 'garden' || x.id === 'playground'))));
  });
});
```

**Step 2: Run:** `node --test ./v2.test.js`. Expected: FAIL (`bankFor`, `hasPic` not exported).

**Step 3: Implement in `engine.js`.**

Replace `lookOf`:

```js
export const hasPic = (t) => !!t.pic;
// What a tile looks like in the tray: plural people are drawn twice, so "dog" and "dogs" look different but two "dog"s do not.
// A word with no drawing looks like only itself, so two undrawn words never count as look-alikes.
export const lookOf = (t) => (t.pic || 'word:' + t.id) + (t.plural ? '*2' : '');

// The tiles on offer. Describe the picture at the easy level offers only words that have a drawing: the right tile is always
// drawn, so an undrawn wrong tile would give it away. Everywhere else (Silly, Story, the harder levels) every word is offered,
// and a word with no drawing is a coloured word tile.
export function bankFor(data, help, mode) {
  if (help !== 'pictures' || mode !== 'scene') return data;
  return Object.fromEntries(Object.entries(data).map(([slot, tiles]) => [slot, tiles.filter(hasPic)]));
}
```

In `validateData` replace line 73 (`if (!t.pic) say(...)`) with:

```js
      if (t.pic !== undefined && (typeof t.pic !== 'string' || !t.pic)) say(slot + ':' + t.id + ' has a bad pic');
```

Replace the `pool` line in `distractorsOf` (line 171) so a `freeOnly` tile is never a wrong tile. These are words that may be **true of a picture by accident** (a *princess* or *queen* for a girl, a *teacher* for Mum). They stay available in Silly and Story:

```js
  const pool = poolFor(data, frame, slot).filter((t) => !(right.group && t.group === right.group) && !t.freeOnly);
```

In the scene loop (the block below), a scene whose right tile is `freeOnly` is a data error. That line is already in the block.

In the `for (const d of data.describe)` loop (line 91) add after the opposite checks:

```js
    if (o && d.pic && !o.pic) say('describe:' + d.id + ' is drawn but its opposite ' + o.id + ' is not');
    if (o && !d.pic && o.pic) say('describe:' + o.id + ' is drawn but its opposite ' + d.id + ' is not');
```

(The second line is redundant when both are walked, but keeps the message on the drawn word in a one-way case; the tests only need the `its opposite` text.)

After the `for (const d of data.doing)` loop add the bank-size check (free-choice rounds draw from the whole bank; the per-scene check below covers the drawn-only scene case):

```js
  for (const st of STAGES) for (const f of st.frames) for (const k of f.slots) {
    const n = poolFor(data, f, k).length;
    if (n < SILLY_CHOICES) say('stage ' + st.id + ': too few ' + k + ' tiles (' + n + ', need ' + SILLY_CHOICES + ')');
  }
```

In the scene loop replace the `if (frame) { for (const k of slots) {...} }` block (lines 122-127) with:

```js
    if (frame) {
      for (const k of slots) {
        const right = tileOf(data, k, s[k]);
        if (!right) continue;
        if (!right.pic) say(tag + ': ' + k + ' tile ' + right.id + ' has no drawing');
        if (right.freeOnly) say(tag + ': ' + k + ' tile ' + right.id + ' is freeOnly, so it cannot be a scene answer');
        const want = Math.min(distractorsFor(s.stage), k === 'describe' ? 1 : 99);
        for (const help of HELP_LEVELS) {
          if (distractorsOf(bankFor(data, help, 'scene'), frame, k, right, distractorsFor(s.stage), () => 0.5).length < want) say(tag + ': not enough wrong tiles for ' + k + ' at help ' + help);
        }
      }
    }
```

(The existing test expects the substring `not enough wrong tiles for where`; this message still contains it.)

Update existing tests:
- `engine.test.js` line 15: widen `SENTENCE` to the pattern `v2.test.js` uses: `/^[A-Z][a-z]*( [a-z]+)* (is|are) [a-z]+( (a|an) [a-z]+( [a-z]+)?| [a-z]+)?( (in|on|at) (the |a )?[a-z]+)?\.$/`. **Needed even though the words arrive in Tasks 9 to 11**: that file's silly-round test runs over the shipped data and fails on "an ice cream" (found by running it).
- `engine.test.js` line 20: remove the `pear` entry's role in the "has no picture" assertion. Replace line 23 with `assert.ok(!probs.some((p) => p.includes('what:pear')), 'an undrawn tile is allowed now');`
- `pictures.test.js` line 54: change to `for (const slot of SLOT_ORDER) for (const t of DATA[slot]) { if (!t.pic) continue; assert.ok(PICTURES[t.pic], slot + ':' + t.id + ' has no picture ' + t.pic); used.add(t.pic); }` and rename the test `'every drawn tile has a picture, and every picture is used'`.

**Step 4: Run all tests.** Expected: PASS (40 + 8 new = 48).

**Step 5: Commit**

```bash
git add games/sentence-blocks/js/engine.js games/sentence-blocks/tests
git commit -m "feat(sentence-blocks): words may have no drawing; Help levels filter the bank"
```

---

### Task 3: Story rounds

**Files:**
- Modify: `games/sentence-blocks/js/engine.js` (after `buildSillyRound`, near line 198)
- Modify: `games/sentence-blocks/tests/v2.test.js` (append)

**Step 1: Failing tests:**

```js
describe('story rounds', () => {
  it('headings: first, last, and the middle alternate', () => {
    assert.deepEqual([0, 1, 2].map((i) => storyHeading(i, 3)), ['Once upon a time…', 'Then…', 'In the end…']);
    assert.deepEqual([0, 1, 2, 3, 4].map((i) => storyHeading(i, 5)), ['Once upon a time…', 'Then…', 'Suddenly…', 'Then…', 'The end…']);
    assert.equal(storyHeading(0, 10), 'Once upon a time…');
    assert.equal(storyHeading(9, 10), 'The end…');
    assert.equal(new Set([1, 2, 3, 4, 5, 6, 7, 8].map((i) => storyHeading(i, 10))).size, 2);
  });
  it('a story round is a free-choice round with a heading and no answer', () => {
    const r = buildStoryRound(DATA, 2, 1, 5, rng(1));
    assert.equal(r.mode, 'story'); assert.equal(r.answer, null); assert.equal(r.heading, 'Then…');
    assert.equal(r.index, 1); assert.equal(r.length, 5);
  });
  it('every stage and Help level, many rounds: any choice gives a grammatical sentence', () => {
    for (const help of HELP_LEVELS) for (const stage of STAGES) many(150, (i) => {
      const seed = i + stage.id * 1000 + HELP_LEVELS.indexOf(help) * 100000, rnd = rng(seed);
      const bank = bankFor(withUndrawn, help, 'story');
      const r = buildStoryRound(bank, stage.id, i % 5, 5, rnd);
      for (const k of r.slots) {
        const choices = r.tray.filter((x) => x.slot === k);
        assert.equal(choices.length, Math.min(SILLY_CHOICES, poolFor(bank, r.frame, k).length));
        assert.equal(tryPlace(r, choices[Math.floor(rnd() * choices.length)], k), 'ok');
      }
      assert.equal(r.complete, true);
      const s = roundSentence(withUndrawn, r);
      assert.match(s, SENTENCE, help + ' stage ' + stage.id + ' seed ' + seed + ': ' + s);
    });
  });
  it('even at the easy level a story can offer words with no drawing', () => {
    let seen = false;
    many(200, (i) => { if (buildStoryRound(bankFor(withUndrawn, 'pictures', 'story'), 1, 0, 3, rng(i)).tray.some((x) => !hasPic(tileOf(withUndrawn, x.slot, x.id)))) seen = true; });
    assert.ok(seen);
  });
  it('"The end" is offered from the third finished sentence until the last', () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5].map((d) => canEndEarly(d, 5)), [false, false, false, true, true, false]);
    assert.deepEqual([3].map((d) => canEndEarly(d, 3)), [false], 'a 3-sentence story is finished by its last sentence');
    assert.equal(canEndEarly(7, 10), true);
    assert.equal(canEndEarly(10, 10), false);
  });
  it('each sentence is a fresh draw: ten rounds are not all the same tray', () => {
    const trays = new Set();
    many(10, (i) => trays.add(buildStoryRound(DATA, 1, i, 10, rng(i * 7 + 1)).tray.map((x) => x.id).sort().join()));
    assert.ok(trays.size > 3, 'got ' + trays.size + ' different trays');
  });
  it('story sentences never count towards unlocking stages', () => {
    const save = normaliseSave({});
    const r = buildStoryRound(DATA, 1, 0, 3, rng(2));
    for (const k of r.slots) tryPlace(r, r.tray.find((x) => x.slot === k), k);
    assert.deepEqual(recordSentence(save, r), save);
  });
  it('a child can swap a tile after finishing the sentence', () => {
    const r = buildStoryRound(DATA, 1, 0, 3, rng(3));
    for (const k of r.slots) tryPlace(r, r.tray.find((x) => x.slot === k), k);
    const before = roundSentence(DATA, r);
    const other = r.tray.filter((x) => x.slot === 'who').find((x) => x.id !== r.placed.who);
    assert.equal(tryPlace(r, other, 'who'), 'ok');
    assert.notEqual(roundSentence(DATA, r), before);
  });
});
```

**Step 2: Run:** FAIL (`storyHeading` not exported).

**Step 3: Implement** after `buildSillyRound` in `engine.js`:

```js
// "Story": a free-choice round (like Silly) with a heading for where it sits in the story. The heading is decoration only.
const STORY_MIDDLE = ['Then…', 'Suddenly…'];
export function storyHeading(index, length) {
  if (index === 0) return 'Once upon a time…';
  if (index === length - 1) return length === 3 ? 'In the end…' : 'The end…';
  return STORY_MIDDLE[(index - 1) % STORY_MIDDLE.length];
}
// A story can be finished early from this many finished sentences (and never when it is already at its length).
export const STORY_EARLY_END = 3;
export const canEndEarly = (done, length) => done >= STORY_EARLY_END && done < length;
// Every call is a fresh random draw (buildSillyRound picks new tiles each time), so two stories rarely match.
export function buildStoryRound(data, stageId, index, length, rnd = Math.random) {
  return { ...buildSillyRound(data, stageId, rnd), mode: 'story', heading: storyHeading(index, length), index, length };
}
```

`tryPlace`, `helpTile` and `recordSentence` already treat any mode other than `'scene'` as free choice and not counted, so they need no change (the tests prove it).

**Step 4: Run all tests.** Expected: PASS (48 + 7 = 55).

**Step 5: Commit**

```bash
git add games/sentence-blocks/js/engine.js games/sentence-blocks/tests/v2.test.js
git commit -m "feat(sentence-blocks): story rounds with headings and a fresh tile draw"
```

---

### Task 4: Settings screen markup and styles

**Files:**
- Modify: `games/sentence-blocks/index.html:25-36` and add the story screen after line 72
- Modify: `games/sentence-blocks/css/style.css` (append a settings block; edit the `.sb-opt` area)

**Step 1: Replace the two fieldsets** (lines 25-36) with:

```html
      <fieldset class="sb-fieldset">
        <legend class="kg-label">How to play</legend>
        <div class="kg-seg" id="sb-mode-row" role="group" aria-label="How to play">
          <button type="button" class="kg-seg__opt sb-opt" data-mode="scene" aria-pressed="true"><span class="sb-opt__name">Describe the picture</span><small>Build the sentence for a picture</small></button>
          <button type="button" class="kg-seg__opt sb-opt" data-mode="silly" aria-pressed="false"><span class="sb-opt__name">Silly sentences</span><small>Mix any blocks you like</small></button>
          <button type="button" class="kg-seg__opt sb-opt" data-mode="story" aria-pressed="false"><span class="sb-opt__name">Make a story</span><small>Build sentences, then read your story</small></button>
        </div>
      </fieldset>

      <fieldset class="sb-fieldset">
        <legend class="kg-label">Stage</legend>
        <div class="kg-seg" id="sb-stage-row" role="group" aria-label="Stage"><!-- filled by main.js --></div>
      </fieldset>

      <fieldset class="sb-fieldset">
        <legend class="kg-label">Help</legend>
        <div class="kg-seg" id="sb-help-row" role="group" aria-label="Help"><!-- filled by main.js --></div>
      </fieldset>

      <fieldset class="sb-fieldset" id="sb-length-set" hidden>
        <legend class="kg-label">Story length</legend>
        <div class="kg-seg" id="sb-length-row" role="group" aria-label="Story length"><!-- filled by main.js --></div>
      </fieldset>
```

**Step 2: Add the story reveal screen** after the `sb-done` block (after line 72, before `</div>` closing `sb-app`):

```html
  <!-- SCREEN 4: the finished story -->
  <div id="sb-story" class="kg-screen sb-screen" hidden>
    <div class="kg-wrap" style="align-items:center;text-align:center">
      <h2 class="kg-title" id="sb-story-title">Your story</h2>
      <div class="sb-book" id="sb-book"></div>
      <div class="sb-done-actions">
        <button type="button" class="kg-btn" id="sb-story-again"><svg class="ic" aria-hidden="true"><use href="#i-replay"/></svg><span>New story</span></button>
        <button type="button" class="kg-btn kg-btn--ghost" id="sb-story-choose"><span>Choose again</span></button>
      </div>
    </div>
  </div>
```

(The design listed "New story" and "Same settings" as two buttons. They do the same thing, a fresh draw with the same settings, so this plan has one button. See the review file.)

**Step 3: Add the board heading** inside `.sb-sticky` in `index.html`, above `<ol class="sb-slots">`:

```html
      <p class="sb-heading" id="sb-heading" hidden></p>
```

**Step 3b: Add the early-finish button** inside `.sb-nextdock`, after the Next button:

```html
      <button type="button" class="kg-btn kg-btn--ghost" id="sb-end" hidden><span>The end</span></button>
```

**Step 4: Append to `style.css`:**

```css
/* ===== v2: mode cards, Help row, story length, heading, book ===== */
#sb-mode-row .sb-opt { flex: 1 1 200px; }
.sb-help { flex: 1 1 200px; }
.sb-length { flex: 1 1 120px; min-height: 72px; }
.sb-mini { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 2px; width: 72px; height: 72px; padding: 14px 4px 4px;
  --slot: var(--paint-orange); background: linear-gradient(var(--slot) 0 10px, var(--chalk) 10px); border: 2px solid var(--line); border-radius: var(--r-1); }
.sb-mini--plain { --slot: var(--chalk); }
.sb-mini__pic { display: block; width: 32px; height: 32px; }
.sb-mini__word { font-size: 13px; font-weight: 700; line-height: 1; }

.sb-nextdock { gap: var(--s3); flex-wrap: wrap; }
.sb-nextdock .kg-btn[hidden] { display: none; }
.sb-scene__word { padding: var(--s2) var(--s3); background: var(--chalk); border: var(--line-w) solid var(--line); border-radius: var(--r-1); font-weight: 700; }
.sb-heading { margin: 0; text-align: center; font-size: var(--t-lead); font-weight: 700; font-style: italic; }
.sb-heading[hidden] { display: none; }

.sb-book { display: flex; flex-direction: column; gap: var(--s3); max-width: 720px; padding: var(--s4); background: var(--chalk); border: var(--line-w) solid var(--line); border-radius: var(--r-2); text-align: left; }
.sb-book__line { margin: 0; display: flex; flex-wrap: wrap; gap: var(--s1) var(--s2); }

/* ===== Help levels. The class is on #sb-app. Colours only: no drawings (main.js leaves them out). Words only: no colour either. ===== */
#sb-app[data-help="words"] :is(.sb-slot, .sb-tile, .sb-w) { --slot: var(--chalk); --on-slot: var(--ink); }
#sb-app[data-help="words"] .sb-tile__badge { display: none; }
```

**Step 5: Verify nothing broke.** Run `cd games/sentence-blocks/tests && node --test ./*.test.js` (expected: 55 pass; no JS changed yet). Open `games/sentence-blocks/index.html` is not meaningful until Task 5, so the visual check waits.

**Step 6: Commit**

```bash
git add games/sentence-blocks/index.html games/sentence-blocks/css/style.css
git commit -m "feat(sentence-blocks): markup and styles for story, Help rows and the book page"
```

---

### Task 5: Settings behaviour (render, click, remember)

**Files:**
- Modify: `games/sentence-blocks/js/main.js` (imports line 3-4, constants, `renderSettings` line 40, handlers near line 237)

**Step 1: Imports.** Add `HELP_LEVELS, STORY_LENGTHS, bankFor, buildStoryRound` to the engine import list (the list may span two lines already; keep that style).

**Step 2: Constants** after `SLOT_LABEL`:

```js
const HELP_TEXT = {
  pictures: ['Pictures + colours', 'Drawings and colours help'],
  colours: ['Colours only', 'Colours help, no drawings'],
  words: ['Words only', 'Just the words'],
};
const LENGTH_TEXT = { 3: 'Beginning, middle, end', 5: 'A short story', 10: 'A long story' };
```

**Step 3: In `renderSettings`**, after the stage row, add:

```js
  $('sb-help-row').innerHTML = HELP_LEVELS.map((h) => {
    const pic = h === 'pictures' ? '<span class="sb-mini__pic">' + pictureSvg('dog') + '</span>' : '';
    const mini = '<span class="sb-mini' + (h === 'words' ? ' sb-mini--plain' : '') + '" aria-hidden="true">' + pic + '<span class="sb-mini__word">The dog</span></span>';
    return '<button type="button" class="kg-seg__opt sb-opt sb-help" data-help="' + h + '" aria-pressed="' + String(h === save.help) + '">' + mini +
      '<span class="sb-opt__name">' + HELP_TEXT[h][0] + '</span><small>' + HELP_TEXT[h][1] + '</small></button>';
  }).join('');
  $('sb-length-set').hidden = save.mode !== 'story';
  $('sb-length-row').innerHTML = STORY_LENGTHS.map((n) =>
    '<button type="button" class="kg-seg__opt sb-opt sb-length" data-length="' + n + '" aria-pressed="' + String(n === save.storyLength) + '">' +
    '<span class="sb-opt__name">' + n + ' sentences</span><small>' + LENGTH_TEXT[n] + '</small></button>').join('');
```

**Step 4: Handlers** after the stage-row handler:

```js
$('sb-help-row').addEventListener('click', (e) => {
  const b = e.target.closest('[data-help]');
  if (!b) return;
  save.help = b.dataset.help;
  persist();
  sfx('tap');
  renderSettings();
  $('sb-help-row').querySelector('[data-help="' + save.help + '"]').focus();
});
$('sb-length-row').addEventListener('click', (e) => {
  const b = e.target.closest('[data-length]');
  if (!b) return;
  save.storyLength = Number(b.dataset.length);
  persist();
  sfx('tap');
  renderSettings();
  $('sb-length-row').querySelector('[data-length="' + save.storyLength + '"]').focus();
});
```

The existing mode-row handler already saves `save.mode` and calls `renderSettings()`, so the Story length row appears and disappears with no extra code.

**Step 5: Build and look.** Run `bash build.sh`, open `docs/sentence-blocks.html` at 360, 768 and 1024 px wide. Expected: three mode cards, Stage, Help with three tile previews, and Story length only after choosing "Make a story". Check the screen needs no scrolling on a 360x640 phone for the three-row case; **if it does, take the fallback in the design (a "Make it harder" second step) and stop to tell the user.** Then `git checkout -- docs`.

**Step 6: Commit**

```bash
git add games/sentence-blocks/js/main.js
git commit -m "feat(sentence-blocks): settings screen with Help and story length"
```

---

### Task 6: Help levels on the board

**Files:**
- Modify: `games/sentence-blocks/js/main.js` (`startSession`, `nextRound`, `picsOf`, `tileHtml`, `renderPicture`, `syncBoard`, `drop`)

**Behaviour:** `session.help` is fixed at Play (changing it needs the settings screen, so it cannot change mid-session). `#sb-app[data-help]` drives the CSS added in Task 4.

**Step 1: Session and bank.** In `startSession` add `help: save.help` to the `session` object and, after it, `$('sb-app').dataset.help = session.help;`. In `nextRound` pass the bank to the round builders:

```js
const bank = bankFor(DATA, session.help, session.mode);
round = session.mode === 'scene' ? buildSceneRound(bank, session.scenes[session.index])
  : session.mode === 'story' ? buildStoryRound(bank, session.stage, session.index, session.target)
  : buildSillyRound(bank, session.stage);
```

(`session.target` arrives in Task 7; until then story is not reachable from Play. Do Task 6 and 7 back to back, or guard `session.target || TARGET_SENTENCES`.)

**Step 2: Drawings only at the easy level, and only where a word has one.** Replace `picsOf`:

```js
const picsOf = (tile) => (session && session.help !== 'pictures') || !tile.pic ? '' : pictureSvg(tile.pic) + (tile.plural ? pictureSvg(tile.pic) : '');
```

In `tileHtml` the `.sb-tile__pic` span is then empty at the harder levels and for any undrawn word at the easy level (a Silly or Story tile with no drawing is just a coloured word tile); hide an empty one with this rule appended to `style.css`:

```css
.sb-tile__pic:empty, .sb-slot__pic:empty { display: none; }
```

In `syncBoard` the slot fill builds `<span class="sb-slot__pic">` from `picsOf(tile)`; it is empty at the harder levels and hidden by the rule above.

**Step 3: The picture strip.** In `renderPicture`, at the top of the non-scene branch (after `shownScene = null;`) and before the existing `el.innerHTML = ...`, add `el.hidden = session.help !== 'pictures';`, and in the scene branch add `el.hidden = false;`. Add to `style.css`: `.sb-picture[hidden] { display: none; }`. (Describe the picture keeps its scene drawing at every Help level; only the strip of placed tiles in free-choice modes goes.) At the easy level in Silly and Story the strip stays, but a placed word with no drawing needs something to show: in the strip's `map`, when `picsOf(tile)` is empty render `'<span class="sb-scene__word">' + tileText(k, tile) + '</span>'` instead of the drawing (the class is in the Task 4 CSS).

**Step 4: Wrong-slot message.** In `drop`, change the wrong-slot text to depend on the level:

```js
say(result === 'wrong-slot' ? (session.help === 'words' ? 'That one goes in a different slot.' : 'That one goes in a different colour.') : 'Not that one. Try another.');
```

**Step 5: Verify in the built page.** `bash build.sh`; open the page; for each Help level start Silly at stage 3 and Describe the picture at stage 1 (use a seeded save with all stages open, see `OPEN` in `play-test.mjs`). Expected: pictures level looks as today; colours level has coloured tiles with no drawings and no strip; words level has plain tiles, no badge, plain slots with their glyph and label; the scene drawing shows at every level in Describe mode. `git checkout -- docs`.

**Step 6: Commit**

```bash
git add games/sentence-blocks/js/main.js games/sentence-blocks/css/style.css
git commit -m "feat(sentence-blocks): Help levels change what the tiles show"
```

---

### Task 7: Story session flow and the book page

**Files:**
- Modify: `games/sentence-blocks/js/main.js` (`showScreen`, `startSession`, `renderBoard`, `afterPlace`, the Next handler, `finishSession`, wiring)

**Rules this task must keep:**
- A session's length is `session.target` (3, 5 or 10 for a story, `TARGET_SENTENCES` otherwise). **Replace every use of `TARGET_SENTENCES` inside the board code** (lines 102-103, 205-206, 209, 229 of the current file) with `session.target`.
- The finished sentence is stored **when the child presses Next**, not when the last slot fills, because a child can swap a tile after finishing (design: swap allowed; engine test in Task 3).
- A finished story paints one hub square (same as any finished session), whether it ran to its length or was ended early. Stop (the X) mid-story paints none and saves nothing.
- **"The end"** (the early finish): from the third finished sentence until the last, a ghost button beside Next ends the story there and shows the book page with the sentences built so far. A 3-sentence story never shows it (its last sentence already finishes it).

**Step 1: `showScreen`** list becomes `['sb-settings', 'sb-board', 'sb-done', 'sb-story']`.

**Step 2: `startSession`:**

```js
function startSession() {
  save.stage = clampStage(save);
  const story = save.mode === 'story';
  const scenes = save.mode === 'scene' ? pickScenes(SCENES, save.stage, TARGET_SENTENCES, save.recent) : [];
  if (save.mode === 'scene' && !scenes.length) { say('There are no pictures for this stage yet.'); return; }
  session = { mode: save.mode, stage: save.stage, help: save.help, scenes, index: 0, done: 0, target: story ? save.storyLength : TARGET_SENTENCES, sentences: [], startUnlocked: unlockedStage(save) };
  $('sb-app').dataset.help = session.help;
  showScreen('sb-board');
  nextRound();
}
```

**Step 3: `renderBoard`** — after the progress lines (now using `session.target`) add:

```js
  const h = $('sb-heading');
  h.hidden = round.mode !== 'story';
  h.textContent = round.mode === 'story' ? round.heading : '';
  if (round.mode === 'story') say(round.heading);
```

**Step 4: `afterPlace`** — `session.target` in the squares and in `Finish` label (`session.done >= session.target`). After the `sb-next` lines add `$('sb-end').hidden = !(session.mode === 'story' && canEndEarly(session.done, session.target));`. In `renderBoard`, next to `$('sb-next').hidden = true;`, add `$('sb-end').hidden = true;`. Add `canEndEarly` to the engine import. The `if (!round.counted)` block is unchanged (it counts progress for every mode; `recordSentence` only changes `save` for scene mode).

**Step 5: Next handler and finish.**

```js
$('sb-next').addEventListener('click', () => {
  if (session.mode === 'story') session.sentences[session.index] = sentenceParts(picks());
  if (session.done >= session.target) { finishSession(); return; }
  session.index++;
  nextRound();
});
```

At the top of `finishSession` keep `recordSession`, then:

```js
  if (session.mode === 'story') { renderStory(); showScreen('sb-story'); $('sb-story-again').focus(); return; }
```

```js
function renderStory() {
  $('sb-book').innerHTML = session.sentences.map((parts) =>
    '<p class="sb-book__line">' + parts.map((p) => '<span class="sb-w sb-w--' + (p.slot || 'join') + '">' + p.text + '</span>').join(' ') + '</p>').join('');
  say(session.sentences.map((parts) => parts.map((p) => p.text).join(' ')).join(' '));
}
```

**Step 6: Wiring** (near the other buttons):

```js
$('sb-end').addEventListener('click', () => {
  session.sentences[session.index] = sentenceParts(picks());
  session.sentences.length = session.index + 1;   // only the sentences built so far
  finishSession();
});
$('sb-story-again').addEventListener('click', startSession);
$('sb-story-choose').addEventListener('click', () => { renderSettings(); showScreen('sb-settings'); $('sb-play-btn').focus(); });
```

**Step 7: Check by hand.** `bash build.sh`; play length 3 at stage 1 on each Help level. Expected: heading changes (Once upon a time… / Then… / In the end…); 3 dots fill; Finish on the last; the book page shows three sentences in the slot colours (plain at Words only); New story starts again; Stop mid-story leaves the hub unchanged. At length 10, "The end" shows from the third finished sentence and the book then holds just those sentences. `git checkout -- docs`.

**Step 8: Commit**

```bash
git add games/sentence-blocks/js/main.js
git commit -m "feat(sentence-blocks): story mode and the book-page reveal"
```

---

### Task 8: Browser tests for the new behaviour (Playwright)

**Files:**
- Modify: `games/sentence-blocks/tests/play-test.mjs`

Run it as the existing header says: `bash build.sh`, then `PLAYWRIGHT_CORE=<playwright-core index.mjs> node games/sentence-blocks/tests/play-test.mjs`.

**Step 1: Keep the existing sections green.** First run it unchanged against the Task 7 build. Expected: passes (the existing selectors `#sb-mode-row [data-mode]`, `#sb-stage-row`, `session`, `round`, `save` all still exist). If the layout check fails because the settings screen grew, that is the Task 5 fallback signal, not a test to loosen.

**Step 2: Widen the sentence regex** on line 31 to match `v2.test.js`:

```js
const SENTENCE = /^[A-Z][a-z]*( [a-z]+)* (is|are) [a-z]+( (a|an) [a-z]+( [a-z]+)?| [a-z]+)?( (in|on|at) (the |a )?[a-z]+)?\.$/;
```

**Step 3: Add helpers** after `startStage`:

```js
const startWith = async (page, { mode, stage = 1, help = 'pictures', length }) => {
  await page.click('#sb-mode-row [data-mode="' + mode + '"]');
  await page.click('#sb-stage-row [data-stage="' + stage + '"]');
  await page.click('#sb-help-row [data-help="' + help + '"]');
  if (length) await page.click('#sb-length-row [data-length="' + length + '"]');
  await page.click('#sb-play-btn');
  await page.waitForSelector('#sb-tray .sb-tile');
};
const headingText = (page) => page.evaluate(() => { const e = document.getElementById('sb-heading'); return e.hidden ? null : e.textContent; });
const bookLines = (page) => page.evaluate(() => [...document.querySelectorAll('#sb-book .sb-book__line')].map((p) => p.textContent.replace(/\s+/g, ' ').trim()));
```

**Step 4: Add sections** before `// ---------- 9. console ----------`:

```js
// ---------- 11. settings: Help, story length, remembered ----------
{
  const { page, ctx } = await open({ saves: { Mia: OPEN } });
  check(await page.locator('#sb-length-set').isHidden(), 'story length should be hidden until Story is chosen');
  check(await page.locator('#sb-help-row [data-help]').count() === 3, 'the Help row should have three options');
  check(await page.evaluate(() => document.querySelector('#sb-help-row [aria-pressed="true"]').dataset.help) === 'pictures', 'a new player should start on Pictures + colours');
  await page.click('#sb-mode-row [data-mode="story"]');
  check(await page.locator('#sb-length-set').isVisible(), 'story length should show when Story is chosen');
  check(await page.locator('#sb-length-row [data-length]').count() === 3, 'story length should offer 3, 5 and 10');
  await page.click('#sb-help-row [data-help="words"]');
  await page.click('#sb-length-row [data-length="10"]');
  await page.reload();
  await page.waitForSelector('#sb-play-btn');
  const s = await saveOf(page);
  check(s.help === 'words' && s.storyLength === 10 && s.mode === 'story', 'Help, length and mode were not remembered: ' + JSON.stringify(s));
  await page.click('#sb-mode-row [data-mode="silly"]');
  check(await page.locator('#sb-length-set').isHidden(), 'story length should hide again for Silly');
  await ctx.close();
}

// ---------- 12. Help levels ----------
for (const help of ['pictures', 'colours', 'words']) {
  for (const mode of ['scene', 'silly']) {
    const { page, ctx } = await open({ saves: { Mia: OPEN } });
    await startWith(page, { mode, stage: 3, help });
    const tag = help + ' ' + mode;
    const m = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll('#sb-tray .sb-tile')];
      const strips = new Set(tiles.map((t) => getComputedStyle(t).backgroundImage));
      return {
        drawn: document.querySelectorAll('#sb-tray .sb-tile__pic svg').length,
        strips: strips.size,
        badge: getComputedStyle(document.querySelector('#sb-tray .sb-tile__badge')).display,
        stripShown: !document.getElementById('sb-picture').hidden, sceneDrawn: document.querySelectorAll('#sb-picture svg').length > 0,
        slotGlyphs: document.querySelectorAll('#sb-slots .sb-slot__glyph svg').length, slotLabels: document.querySelectorAll('#sb-slots .sb-slot__label').length, slots: document.querySelectorAll('#sb-slots .sb-slot').length,
      };
    });
    check(help === 'pictures' ? m.drawn > 0 : m.drawn === 0, tag + ': tile drawings ' + m.drawn);
    check(help === 'words' ? m.strips === 1 && m.badge === 'none' : m.strips > 1, tag + ': colour cue wrong (strips ' + m.strips + ', badge ' + m.badge + ')');
    if (mode === 'scene') check(m.stripShown && m.sceneDrawn, tag + ': the scene drawing should show at every level');
    else check(m.stripShown === (help === 'pictures'), tag + ': the picture strip should show only at the easy level (shown: ' + m.stripShown + ')');
    check(m.slotGlyphs === m.slots && m.slotLabels === m.slots, tag + ': every slot keeps its glyph and label');
    // a finished sentence is the same words at every level
    await finishRound(page);
    check(SENTENCE.test((await sentenceText(page)) || ''), tag + ': bad sentence ' + (await sentenceText(page)));
    await ctx.close();
  }
}

// ---------- 13. story ----------
{
  const { page, ctx } = await open({ saves: { Mia: { ...OPEN, mode: 'story' } } });
  const progressBefore = await progressOf(page);
  for (const [length, stage, help] of [[3, 1, 'pictures'], [3, 3, 'words'], [5, 2, 'colours'], [10, 1, 'words']]) {
    await startWith(page, { mode: 'story', stage, help, length });
    const tag = 'story ' + length + ' stage ' + stage + ' ' + help;
    const heads = [], shown = [];
    for (let i = 0; i < length; i++) {
      heads.push(await headingText(page));
      await finishRound(page);
      shown.push(await sentenceText(page));
      check(await page.locator('#sb-progress i.on').count() === i + 1, tag + ': progress dots after sentence ' + (i + 1));
      await page.click('#sb-next');
    }
    check(heads[0] === 'Once upon a time…', tag + ': first heading ' + heads[0]);
    check(heads[length - 1] === (length === 3 ? 'In the end…' : 'The end…'), tag + ': last heading ' + heads[length - 1]);
    check(await page.evaluate(() => !document.getElementById('sb-story').hidden), tag + ': the book page did not show');
    const lines = await bookLines(page);
    check(lines.length === length, tag + ': book has ' + lines.length + ' lines');
    check(JSON.stringify(lines) === JSON.stringify(shown), tag + ': the book does not match what was built: ' + JSON.stringify(lines.slice(0, 2)));
    check(lines.every((l) => SENTENCE.test(l)), tag + ': a book line is not a sentence');
    await page.click('#sb-story-choose');
  }
  check(await progressOf(page) === progressBefore + 4, 'each finished story should paint one square');
  check((await saveOf(page)).done[1] === 5 && (await saveOf(page)).done[2] === 5, 'stories must not change stage progress');
  // swapping a tile after finishing: the book keeps the swapped sentence
  await startWith(page, { mode: 'story', stage: 1, help: 'pictures', length: 3 });
  await finishRound(page);
  const swapped = await page.evaluate(() => {
    const k = round.slots[0], other = [...document.querySelectorAll('#sb-tray [data-slot="' + k + '"]')].find((b) => b.dataset.id !== round.placed[k]);
    other.click(); document.querySelector('#sb-slots [data-slot="' + k + '"]').click();
    return document.getElementById('sb-sentence').textContent.replace(/\s+/g, ' ').trim();
  });
  await page.click('#sb-next');
  await finishRound(page); await page.click('#sb-next');
  await finishRound(page); await page.click('#sb-next');
  check((await bookLines(page))[0] === swapped, 'the book kept the sentence from before the swap');
  await page.click('#sb-story-choose');
  // The end, early: from the third finished sentence of a ten-sentence story
  {
    const sq = await progressOf(page);
    await startWith(page, { mode: 'story', stage: 1, help: 'pictures', length: 10 });
    for (let i = 0; i < 4; i++) {
      await finishRound(page);
      const shownEnd = await page.locator('#sb-end').isVisible();
      check(shownEnd === (i + 1 >= 3), 'The end button after sentence ' + (i + 1) + ' should be ' + (i + 1 >= 3) + ', was ' + shownEnd);
      if (i < 3) await page.click('#sb-next');
    }
    await page.click('#sb-end');
    check((await bookLines(page)).length === 4, 'ending early should keep the 4 sentences built');
    check(await progressOf(page) === sq + 1, 'an early-ended story should paint one square');
    await page.click('#sb-story-choose');
    await startWith(page, { mode: 'story', stage: 1, help: 'pictures', length: 3 });
    for (let i = 0; i < 3; i++) { await finishRound(page); check(!(await page.locator('#sb-end').isVisible()), 'a 3-sentence story should never offer The end'); await page.click('#sb-next'); }
    await page.click('#sb-story-choose');
  }
  // Stop mid-story: no square, nothing saved
  const before = await progressOf(page);
  await startWith(page, { mode: 'story', stage: 1, help: 'pictures', length: 5 });
  await finishRound(page); await page.click('#sb-next');
  await page.click('#sb-stop');
  check(await progressOf(page) === before, 'Stop mid-story painted a square');
  await ctx.close();
}

// ---------- 13b. layout: a ten-sentence story on the smallest phone ----------
for (const theme of ['colourful-light', 'colourful-dark']) {
  const { page, ctx } = await open({ viewport: { width: 360, height: 640 }, saves: { Mia: OPEN }, theme });
  await startWith(page, { mode: 'story', stage: 3, help: 'words', length: 10 });
  const m = await page.evaluate(() => ({ h: document.scrollingElement.scrollWidth > innerWidth + 1, dots: document.querySelectorAll('#sb-progress i').length }));
  check(!m.h, 'story 10 at 360px: horizontal scroll (' + theme + ')');
  check(m.dots === 10, 'story 10 should show 10 dots, got ' + m.dots);
  for (let i = 0; i < 10; i++) { await finishRound(page); await page.click('#sb-next'); }
  check(!(await page.evaluate(() => document.scrollingElement.scrollWidth > innerWidth + 1)), 'the book page scrolls sideways at 360px (' + theme + ')');
  await ctx.close();
}
```

**Step 5: Run.** Expected: `Sentence Blocks play-test passed (...)`. If section 12's colour-cue check is flaky because the computed `backgroundImage` string includes the paint, compare the set of strings, not their content (already done).

**Step 6: Commit**

```bash
git add games/sentence-blocks/tests/play-test.mjs
git commit -m "test(sentence-blocks): browser checks for Help levels and story mode"
```

---

### Task 9: Word batch A: Who and Describe (STOP for review)

**Files:**
- Modify: `games/sentence-blocks/js/words.js` (append to `WHO`, `DESCRIBE`)

All new tiles have **no `pic`**. `kind` only matters to hand-written scenes, so fantasy characters take the nearest of `animal | child | baby | adult`. These are **proposals**: the user edits the list before it is committed.

**Step 1: Proposed Who tiles** (append inside `WHO`, before the closing `];`):

```js
  // v2, undrawn. Animals:
  ...['bird', 'duck', 'fish', 'pig', 'cow', 'sheep', 'mouse', 'frog', 'monkey', 'lion', 'elephant', 'tiger']
    .map((n) => ({ id: n, det: 'the', noun: n, kind: 'animal' })),
  ...['dinosaur', 'dragon'].map((n) => ({ id: n, det: 'the', noun: n, kind: 'animal', freeOnly: true })),
  // People and characters:
  // freeOnly: could also be true of a picture (a princess for a girl, Grandma for Mum), so never a wrong tile in a scene.
  ...['teacher', 'nurse', 'king', 'queen', 'pirate', 'wizard', 'robot']
    .map((n) => ({ id: n, det: 'the', noun: n, kind: 'adult', freeOnly: true })),
  { id: 'princess', det: 'the', noun: 'princess', irregularS: true, kind: 'adult', freeOnly: true },   // ends in s but is singular
  { id: 'grandma', text: 'Grandma', named: true, kind: 'adult', freeOnly: true },
  { id: 'grandad', text: 'Grandad', named: true, kind: 'adult', freeOnly: true },
```

(`sheep` does not end in s, so it needs no marking. No plural words are proposed; `ducks` and `pigs` can follow if the kids ask.)

**Step 2: Proposed Describe tiles**, always in opposite pairs (the validator requires it):

```js
  // v2, undrawn pairs:
  { id: 'fast', word: 'fast', opposite: 'slow' }, { id: 'slow', word: 'slow', opposite: 'fast' },
  { id: 'hot', word: 'hot', opposite: 'cold' }, { id: 'cold', word: 'cold', opposite: 'hot' },
  { id: 'tall', word: 'tall', opposite: 'short' }, { id: 'short', word: 'short', opposite: 'tall' },
  { id: 'loud', word: 'loud', opposite: 'quiet' }, { id: 'quiet', word: 'quiet', opposite: 'loud' },
  { id: 'wet', word: 'wet', opposite: 'dry' }, { id: 'dry', word: 'dry', opposite: 'wet' },
  { id: 'giant', word: 'giant', opposite: 'tiny' }, { id: 'tiny', word: 'tiny', opposite: 'giant' },
  { id: 'brave', word: 'brave', opposite: 'scared' }, { id: 'scared', word: 'scared', opposite: 'brave' },
  { id: 'clean', word: 'clean', opposite: 'dirty' }, { id: 'dirty', word: 'dirty', opposite: 'clean' },
```

**Step 2b: Which of these get a drawing (Task 12).** The rule: **a word gets a drawing if it can be shown as one simple picture; otherwise it stays a plain word tile**, which appears in Silly and Story (at every level) and in Describe the picture only at the harder levels. Proposed split for this batch:

| Slot | Draw (Task 12) | Plain word tile only |
|---|---|---|
| Who | the animals: bird, duck, fish, pig, cow, sheep, mouse, frog, monkey, lion, elephant, tiger | teacher, nurse, king, queen, pirate, wizard, robot, princess, Grandma, Grandad (roles need props and costumes), dinosaur, dragon |
| Describe | the pairs that draw as a contrast: hot/cold, wet/dry, loud/quiet, tall/short | fast/slow, giant/tiny (too close to big/small), brave/scared, clean/dirty |

Show this split to the user with the word list; they may move words either way. The `pic` field is added in Task 12, not here.

**Step 3: Run the tests:** `node --test ./*.test.js`. Expected: PASS (validator, bank sizes, story grammar over the bigger bank). Fix any `problems` line it prints.

**Step 4: Print a review table and sample sentences** for the user:

```bash
cd games/sentence-blocks/tests && node --input-type=module -e "
import { DATA } from '../js/words.js';
import { buildStoryRound, tryPlace, roundSentence, bankFor } from '../js/engine.js';
const bank = bankFor(DATA, 'words');
for (let i = 0; i < 25; i++) { const r = buildStoryRound(bank, 3, 1, 5); for (const k of r.slots) tryPlace(r, r.tray.find((x) => x.slot === k), k); console.log(roundSentence(DATA, r)); }"
```

Show the user the full new word list plus those 25 sentences. **STOP.** Ask: any word to remove or change; any near-synonym of an existing word (these need a shared `group` so a wrong tile is never also true of a scene).

**Step 5: After approval, commit**

```bash
git add games/sentence-blocks/js/words.js
git commit -m "feat(sentence-blocks): word batch A, new Who and Describe words (undrawn)"
```

---

### Task 10: Word batch B: Doing (STOP for review)

**Files:**
- Modify: `games/sentence-blocks/js/words.js` (append to `DOING`)

Transitive words must reuse an existing `what` tag, so a hand-written scene could use them later; new tags would need new `what` tiles too.

**Step 1: Proposed Doing tiles** (inside `DOING`):

```js
  // v2, undrawn. `group` = could also be true of a picture of the same action, so never offered together (as with places).
  // Intransitive (no "what"):
  ...['singing', 'waving', 'hiding', 'spinning'].map((w) => ({ id: w, ing: w, takes: [], actors: NOT_BABY, wheres: ANY_PLACE })),
  ...['dancing', 'hopping'].map((w) => ({ id: w, ing: w, takes: [], actors: NOT_BABY, wheres: ANY_PLACE, group: 'jump' })),
  ...['laughing', 'giggling'].map((w) => ({ id: w, ing: w, takes: [], actors: NOT_BABY, wheres: ANY_PLACE, group: 'laugh' })),
  { id: 'yawning', ing: 'yawning', takes: [], actors: NOT_BABY, wheres: ANY_PLACE, group: 'sleep' },
  { id: 'playing', ing: 'playing', takes: [], actors: NOT_BABY, wheres: ANY_PLACE, freeOnly: true },   // too general to be wrong of any picture
  { id: 'flying', ing: 'flying', takes: [], actors: NOT_BABY, wheres: ['outdoor'] },
  { id: 'skipping', ing: 'skipping', takes: [], actors: PEOPLE, wheres: ['outdoor'], group: 'jump' },
  { id: 'splashing', ing: 'splashing', takes: [], actors: NOT_BABY, wheres: ['water'], group: 'swim' },
  // Transitive (each takes a "what" carrying one of its tags):
  { id: 'catching', ing: 'catching', takes: ['throwable'], actors: PEOPLE, wheres: ['outdoor'], group: 'throw' },
  { id: 'baking', ing: 'baking', takes: ['food'], actors: PEOPLE, wheres: ['indoor'], group: 'cook' },
  { id: 'cooking', ing: 'cooking', takes: ['food'], actors: PEOPLE, wheres: ['indoor'], group: 'cook' },
  { id: 'cleaning', ing: 'cleaning', takes: ['washable'], actors: PEOPLE, wheres: ['indoor'], group: 'clean' },
  { id: 'drawing', ing: 'drawing', takes: ['paintable'], actors: PEOPLE, wheres: ['indoor'], group: 'draw' },
  { id: 'carrying', ing: 'carrying', takes: ['pushable', 'throwable'], actors: PEOPLE, wheres: ANY_PLACE, group: 'move' },
  { id: 'tasting', ing: 'tasting', takes: ['food', 'drink'], actors: WITH_BABY, wheres: ANY_PLACE, freeOnly: true },   // true of any eating or drinking picture
```

**Step 2: Give the matching existing words the same `group`** so a new word is never offered beside the old word it could also describe. Edit these existing `DOING` entries by adding the field: `jumping` `group: 'jump'`, `washing` `group: 'clean'`, `painting` `group: 'draw'`, `throwing` `group: 'throw'`, `pushing` `group: 'move'`, `swimming` `group: 'swim'`, `sleeping` `group: 'sleep'`.

**Step 2b: Run the tests.** Expected: PASS. (The validator requires `-ing`, non-empty `actors` and `wheres`; the story test proves grammar. A scene such as "girl jumping" must still have wrong `doing` tiles at every Help level, which the scene check proves.)

**Step 2c: Which get a drawing (Task 12).** Proposed: **draw** dancing, hopping, waving, catching (each is one new pose of the existing figure); **plain word tile only** for the rest (singing, hiding, spinning, laughing, giggling, yawning, playing, flying, skipping, splashing, baking, cooking, cleaning, drawing, carrying, tasting: they either do not read as one still picture or look like an existing pose).

**Step 3: Show the user** the list and 25 sample sentences (same command as Task 9, stage 2). Note that some combinations will be silly ("baking a stick"), which is what Story mode is for, and that **Describe the picture** only ever pairs a word with what a hand-written scene says. **STOP** for approval.

**Step 4: Commit** (`feat(sentence-blocks): word batch B, new Doing words (undrawn)`).

---

### Task 11: Word batch C: What and Where (STOP for review)

**Files:**
- Modify: `games/sentence-blocks/js/words.js` (append to `WHAT`, `WHERE`; add `group: 'pushchair'` to `pram`)

**Step 1: Proposed What tiles** (inside `WHAT`):

```js
  // v2, undrawn. a/an and mass nouns are checked by the validator.
  { id: 'orange', det: 'an', noun: 'orange', tags: ['food'] }, { id: 'pear', det: 'a', noun: 'pear', tags: ['food'] },
  { id: 'biscuit', det: 'a', noun: 'biscuit', tags: ['food'] }, { id: 'pizza', det: 'a', noun: 'pizza', tags: ['food'] },
  { id: 'icecream', det: 'an', noun: 'ice cream', tags: ['food'] },
  { id: 'cheese', det: '', mass: true, noun: 'cheese', tags: ['food'] }, { id: 'toast', det: '', mass: true, noun: 'toast', tags: ['food'] },
  { id: 'pasta', det: '', mass: true, noun: 'pasta', tags: ['food'] }, { id: 'grapes', det: '', mass: true, noun: 'grapes', tags: ['food'] },
  { id: 'soup', det: '', mass: true, noun: 'soup', tags: ['food'] },
  { id: 'tea', det: '', mass: true, noun: 'tea', tags: ['drink'] }, { id: 'lemonade', det: '', mass: true, noun: 'lemonade', group: 'juice', tags: ['drink'] },
  { id: 'comic', det: 'a', noun: 'comic', group: 'reading', tags: ['readable'] }, { id: 'map', det: 'a', noun: 'map', tags: ['readable'] },
  { id: 'magazine', det: 'a', noun: 'magazine', group: 'reading', tags: ['readable'] }, { id: 'letter', det: 'a', noun: 'letter', tags: ['readable'] },
  { id: 'trike', det: 'a', noun: 'trike', tags: ['rideable'] }, { id: 'skateboard', det: 'a', noun: 'skateboard', tags: ['rideable'] },
  { id: 'bus', det: 'a', noun: 'bus', tags: ['rideable'] }, { id: 'train', det: 'a', noun: 'train', tags: ['rideable'] },
  { id: 'stone', det: 'a', noun: 'stone', tags: ['kickable', 'throwable'] }, { id: 'box', det: 'a', noun: 'box', tags: ['kickable', 'pushable'] },
  { id: 'frisbee', det: 'a', noun: 'frisbee', tags: ['throwable'] }, { id: 'stick', det: 'a', noun: 'stick', tags: ['throwable'] },
  { id: 'snowball', det: 'a', noun: 'snowball', tags: ['throwable'] },
  { id: 'trolley', det: 'a', noun: 'trolley', tags: ['pushable'] }, { id: 'wheelbarrow', det: 'a', noun: 'wheelbarrow', tags: ['pushable'] },
  { id: 'door', det: 'a', noun: 'door', tags: ['pushable', 'paintable'] },
  { id: 'buggy', det: 'a', noun: 'buggy', group: 'pushchair', tags: ['pushable'] },
  { id: 'wall', det: 'a', noun: 'wall', tags: ['paintable'] }, { id: 'fence', det: 'a', noun: 'fence', tags: ['paintable'] },
  { id: 'flower', det: 'a', noun: 'flower', tags: ['paintable'] }, { id: 'rainbow', det: 'a', noun: 'rainbow', tags: ['paintable'] },
  { id: 'cup', det: 'a', noun: 'cup', tags: ['washable'] }, { id: 'bowl', det: 'a', noun: 'bowl', tags: ['washable'] },
  { id: 'window', det: 'a', noun: 'window', tags: ['washable'] },
```

Edit the existing `pram` entry to add `group: 'pushchair'` (it is a near-synonym of `buggy`). Also add `group: 'reading'` to the existing `book` and to the new `comic` and `magazine` (a picture of someone reading a book could be a comic), and `group: 'juice'` to the existing `juice` and the new `lemonade`. The validator's a/an rule flags any wrong article. (`irregularS` is only checked for `who` tiles, so `bus` needs none.)

**Step 2: Proposed Where tiles** (inside `WHERE`):

```js
  // v2, undrawn. `group` = could also be true of a scene, so never offered as its wrong tile.
  { id: 'playground', phrase: 'in the playground', tags: ['outdoor'], group: 'green' },
  { id: 'forest', phrase: 'in the forest', tags: ['outdoor'], group: 'green' },
  { id: 'farm', phrase: 'on the farm', tags: ['outdoor'], group: 'green' },
  { id: 'hill', phrase: 'on the hill', tags: ['outdoor'], group: 'green' },
  { id: 'zoo', phrase: 'at the zoo', tags: ['outdoor'] },
  { id: 'street', phrase: 'in the street', tags: ['outdoor'] },
  { id: 'castle', phrase: 'at the castle', tags: ['outdoor'] },
  { id: 'cave', phrase: 'in the cave', tags: ['outdoor'] },
  { id: 'sea', phrase: 'in the sea', tags: ['water'], group: 'water' },
  { id: 'bath', phrase: 'in the bath', tags: ['water', 'indoor'], group: 'water' },
  { id: 'bedroom', phrase: 'in the bedroom', tags: ['indoor'], group: 'room' },
  { id: 'space', phrase: 'in space', tags: ['outdoor'], group: 'space' },
  { id: 'moon', phrase: 'on the moon', tags: ['outdoor'], group: 'space' },
```

**Step 3: Run the tests.** Expected: PASS. In particular the scene checks run against every Help level: a park scene must still have wrong `where` tiles at every level (the `green` group is now big, so this is the one most likely to go red; if it does, shrink the group rather than lowering the test).

**Step 3b: Which get a drawing (Task 12).** Proposed: **draw** every What object (they are all simple objects), and the Where places farm, forest, hill, sea, bath, bedroom, playground, castle, street, cave; **plain word tile only** for zoo, space and moon.

**Step 4: Show the user** the full list, the 25 sample sentences at stage 3, and the near-synonym question again (cup/mug, bus/coach and so on were left out on purpose). **STOP** for approval.

**Step 5: Commit** (`feat(sentence-blocks): word batch C, new What and Where words (undrawn)`).

---

### Task 12: Drawings for the simple words (STOP after each batch)

**Files:**
- Modify: `games/sentence-blocks/js/pictures.js` (add to `PICTURES`; extend `animalPic` and `PERSON_POSES`)
- Modify: `games/sentence-blocks/js/words.js` (add `pic` to each drawn tile)
- Use: `games/sentence-blocks/tests/contact-sheet.mjs` (the review sheet; it already shows only tiles that have a drawing)

**Why:** the rule from the user is "if it is a simple word we can draw, draw it; if not, plain word tile". A drawn word is a better tile than a plain one and is the only kind Describe the picture offers at the easy level, so every drawing widens the easy level. The drawing style is fixed: a 96 by 96 square, `line` (bold), `detail` (thin), `dots` (filled), one stroke weight, round ends, our own paths, **no emoji**. Follow the existing entries in `PICTURES`.

**The same four steps for each batch:**
1. Add the `PICTURES` entries (key = the tile's `pic`) and set `pic: '<key>'` on the tile in `words.js`.
2. `cd games/sentence-blocks/tests && node --test ./*.test.js`. Expected: PASS. The existing coverage test fails on a tile whose `pic` has no entry, and on an entry no tile uses.
3. Render the contact sheet and look at it (needs `PLAYWRIGHT_CORE`): `node games/sentence-blocks/tests/contact-sheet.mjs <scratch>/sheet.html <scratch>/sheet.png`, then show the PNG. Check each drawing at 40 px (tile size on a phone) and in Dusk (`sheet-dark.png`).
4. **STOP.** The user approves or asks for redraws. Commit per batch: `art(sentence-blocks): pictures batch V2-X`.

**Batches** (draw only the words the user approved for drawing in Tasks 9 to 11):

| Batch | Words | How |
|---|---|---|
| V2-A | What objects (about 35) | One path set each, in the style of `apple`, `cup`-like outlines, `bus` and `train` as a side view with wheels |
| V2-B | Where places (farm, forest, hill, sea, bath, bedroom, playground, castle, street, cave) | A few cues each, in the style of `park` and `kitchen`. Look-alikes share a `group` so they are never offered together |
| V2-C | Describe pairs (hot/cold, wet/dry, loud/quiet, tall/short) | A pair must be drawn together (the validator rejects a drawn word with an undrawn opposite). Contrast pictures like `big`/`small`; faces like `happy`/`sad` |
| V2-D | Who animals | Quadrupeds (pig, cow, sheep, mouse, monkey, lion, elephant, tiger): add a species branch to `animalPic` for the head parts (pig snout and ears, cow horns, sheep woolly cloud, lion mane, tiger stripes, elephant trunk, mouse round ears and long tail, monkey round ears and curled tail) using the `standing` pose. Bird, duck and fish are not four-legged: give each its own `line`/`detail` entry. Set `group: 'cat'` on cat, lion, tiger and `group: 'small'` on rabbit and mouse, so look-alikes are never each other's wrong tile |
| V2-E | Doing poses (dancing, hopping, waving, catching) | Add each as a `PERSON_POSES` entry (head, torso, arms, legs, and an item for catching) and a `PICTURES` line `personPic('<pose>', null, '<label>')`, as for `jumping` |

**After each batch, one more check that matters for scenes:** a drawn word can now be a wrong tile at the **easy** level in Describe the picture. Run `SHEET=scenes node games/sentence-blocks/tests/contact-sheet.mjs <scratch>/scenes.html <scratch>/scenes.png` and look at the trays: no wrong tile may look like the right one (the `group` marks are how to fix one).

**Done when:** every word the user chose to draw has a drawing and `node --test ./*.test.js` passes. Words left undrawn are not an error; they are the plain word tiles.


### Task 13: Docs and the full proof

**Files:**
- Modify: `PRODUCT.md:31`, `docs/plans/2026-11-15-sentence-blocks-v2-design.md` (status line)

**Step 1: PRODUCT.md line 31:** change the Sentence Blocks entry to `Sentence Blocks (build sentences from colour-coded blocks: for a picture, for fun, or as a short story; three Help levels from pictures to words only; ages 4 to 8)`.

**Step 2: Design status** becomes `Built; see the plan 2026-11-15-sentence-blocks-v2.md.`

**Step 3: Full proof.** Run, and paste the real output into the PR:

```bash
node --test games/*/tests/*.test.js
bash build.sh
PLAYWRIGHT_CORE=<path> node games/sentence-blocks/tests/play-test.mjs
grep -rn "todo:" games/sentence-blocks/tests    # must print nothing
git status --short docs                          # leave docs/ unstaged; CI rebuilds and commits it
```

Expected: all unit tests pass; build OK; `Sentence Blocks play-test passed`.

**Step 4: Commit** (`docs: Sentence Blocks v2 status and product line`) and open the PR from `feature/sentence-blocks-v2` to `master`. The PR description lists: what changed, the three word batches the user approved, and the play-test with the children (below).

---

### Task 14: Play-test with the children (not automatable)

Agree the success criteria with the user before the session. Suggested, to tune after one session:
- Do they choose Story unprompted, and finish a 5-sentence story?
- At Words only, do they find the right slot for most words, or does it take many goes? (Trying slots until one accepts is fine in a learning game; this only tells us how long Words only takes them, and whether it is too easy.)
- Do they use "The end" to finish a long story early, and does it feel right to them?
- At the easy level, do they notice and enjoy the new words, including the plain word tiles among the drawn ones?
- Do they ask for a level above Words only, or for How/When words? That tells us whether Stage 4 is next.
- Does the settings screen get them to Play without help from an adult?

Record the answers in `docs/plans/` as a short note; do not change thresholds without them.
