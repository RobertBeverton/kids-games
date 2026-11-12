# Sentence Blocks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add "Sentence Blocks", a colour-coded sentence-building game (two modes, three unlocking stages) to the Kids Games hub.

**Architecture:** A new `games/sentence-blocks/` folder built like Maths: pure-logic JS modules (`engine.js`, `words.js`, `scenes.js`, `pictures.js`) covered by `node --test` and inlined with `main.js` into one `docs/sentence-blocks.html` by `build.sh`. All grammar, round, stage and saved-data rules live in `engine.js` and are tested without a browser. Pictures are our own drawn SVG data, added in batches the user reviews. A Playwright test plays the built page.

**Tech Stack:** Vanilla HTML/CSS/JS (no dependencies), `node --test`, Playwright (`playwright-core`, not a repo dependency) driving Microsoft Edge, bash `build.sh`.

**Design:** `docs/plans/2026-11-12-sentence-blocks-design.md` (read it first, including its "Refinements" section).

**Verification status of this plan:** the code in Tasks 2 and 4 was run before being written here. `engine.test.js` runs 29 tests (28 pass, 1 `todo` that is switched on in Task 12), stable over repeated runs; the tests use seeded randomness, so a failure names its seed. The engine, words and scenes files survive `build.sh`'s import/export stripping (checked by running the same awk, then `node --check` on the joined file). The Task 4 picture module and its test were extracted from this file and run (4 pass, 1 `todo`). The UI code in Tasks 7, 8, 9 and 13 has **not** been run, because nothing may be built yet. The Playwright test in Task 15 is its proof. An adversarial review of this plan, and what it changed, is in `2026-11-12-sentence-blocks-plan-review.md`.

**Size, honestly.** The code is the small part. The cost is art and review: roughly 60 tile drawings (about 12 who, 19 doing, 10 what, 9 where, 6 describing words), 5 slot glyphs, a parametric figure system, and 36 composed scenes, each reviewed by the user. **Recommended release slicing:** ship PR 1 as stages 1 and 2 (both modes), and PR 2 as stage 3 (describing words and places). Stage 3 holds the riskiest art (size and mood must read without a label) and the most useful practice, so it should not hold up the rest. Every task below is written per stage so the split costs nothing. If you slice, Tasks 10 to 12 run twice with a smaller scope, and Task 17 happens once per PR.

---

## Read this before Task 1

**Rules that bite in this repo**

1. **The bundler is dumb.** `build.sh` concatenates `js/*.js` in a list, deleting lines that start with `import `, `export {}`, and removing the word `export` from `export const|function|class|default`. So: every top-level name must be unique across all of `games/sentence-blocks/js/`; only use `export const/function/class`; never write a multi-line `import` that lacks a `;`; never rely on module scope.
2. **Top-level `let`/`const` in the built page are global**, because the built script is classic, not a module. The existing Playwright tests rely on that (`page.evaluate(() => goSettings())`). Keep `main.js` state in top-level bindings and keep function names stable.
3. **Do not commit `docs/` until Task 17, and do not merge or push a `docs/` rebuild before then.** `docs/` is what GitHub Pages serves, so a rebuild on the wrong branch would publish half-drawn art to the children. Every build also stamps a new version into every `docs/*.html`, which creates noise: between tasks run `git restore docs/` before committing. Commit `docs/` once, in its own `build:` commit (the repo's convention). Generated files conflict when two branches both rebuild them (the Opposites PR will too): resolve `docs/` conflicts by taking either side and re-running `bash build.sh`, never by hand-merging HTML.
4. **No emoji, anywhere.** All pictures are drawn SVG. No mascot. No read-aloud. State is never carried by colour alone (every colour cue also has a shape, glyph or word).
5. **Content is reviewed by the user.** Word batches (Task 10), picture batches (Task 11) and scenes (Task 12) each end with a STOP: show the batch, wait for approval. Never ship bulk generated content unreviewed.
6. **Windows shell:** use the Bash tool for the commands below (Git Bash). Paths in this plan are repo-relative.
7. **Playwright:** `PLAYWRIGHT_CORE=<path or URL of playwright-core's index.mjs>` and the Edge channel, exactly like the other games' tests. Install `playwright-core` in a scratch folder, not in the repo.

**File map**

| Create | Purpose |
|---|---|
| `games/sentence-blocks/index.html` | Shell page (stub in Task 7, three screens in Task 8) |
| `games/sentence-blocks/css/style.css` | Game styles |
| `games/sentence-blocks/js/engine.js` | Pure logic (Task 2) |
| `games/sentence-blocks/js/words.js` | Tiles (seed Task 2, full Task 10) |
| `games/sentence-blocks/js/scenes.js` | Scenes (seed Task 2, full Task 12) |
| `games/sentence-blocks/js/pictures.js` | Drawn SVG data and renderers (Tasks 4, 6, 11) |
| `games/sentence-blocks/js/main.js` | DOM, input, storage, sound (stub in Task 7, real in Task 8) |
| `games/sentence-blocks/tests/engine.test.js` | Unit tests (Task 2) |
| `games/sentence-blocks/tests/pictures.test.js` | Picture checks (Task 4) |
| `games/sentence-blocks/tests/contact-sheet.mjs` | Renders every picture for review (Task 5) |
| `games/sentence-blocks/tests/play-test.mjs` | Built-page proof (Task 15) |
| `games/sentence-blocks/tests/package.json` | `{ "type": "module" }` |

| Modify | Why |
|---|---|
| `build.sh` | Run tests, build the game, list it in zip, summary, trap (Tasks 3, 7) |
| `hub.html` | Tile, `data-paint`, five-game layout (Tasks 7, 9) |
| `shared/shell.html` | Sprite symbols, "Games guide" line (Task 7) |
| `shared/tokens.css` | New purple paint, only if decision D1 says yes (Task 1) |
| `DESIGN.md`, `PRODUCT.md`, `README.md`, `design/roadmap.md` | Document the game and the Slot Code exception (Task 16) |

---

### Task 0: Workspace and baseline

**Files:** none.

**Step 1:** The design and this plan are untracked on `master`. Create an isolated branch and carry them over.

```bash
git worktree add .worktrees/sentence-blocks -b feature/sentence-blocks master
mv docs/plans/2026-11-12-sentence-blocks-design.md docs/plans/2026-11-12-sentence-blocks.md docs/plans/2026-11-12-sentence-blocks-plan-review.md .worktrees/sentence-blocks/docs/plans/
cd .worktrees/sentence-blocks
```

(`.worktrees/` is already in `.gitignore`.) Use `mv`, not `cp`: leaving untracked copies in the main checkout would make a later merge refuse with "untracked working tree files would be overwritten". All later commands run from this worktree.

**Step 2:** Baseline. Everything must pass before any change.

```bash
bash build.sh
(cd games/maths/tests && node --test ./*.test.js)
git status --short
```

Expected: build ends with `=== Build Complete ===`; Maths tests pass; `git status` shows only modified `docs/*.html` (version stamps). Run `git restore docs/`.

**Step 3: Commit the design and plan.**

```bash
git add docs/plans/2026-11-12-sentence-blocks-design.md docs/plans/2026-11-12-sentence-blocks.md docs/plans/2026-11-12-sentence-blocks-plan-review.md
git commit -m "docs: Sentence Blocks design, implementation plan and plan review

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Decision gate (STOP: ask the user)

**Files:** none until the user answers.

Ask these three questions, one at a time (AskUserQuestion), and record the answers at the top of the design file under "Decisions made".

**D1: colour.** The One Paint Rule allows one game paint per screen and no game paint is free (red, blue, green and orange are taken; yellow is the system's). Options:
- **(Recommended)** Add one purple paint and a named "Slot Code" exception: the five slot colours (orange, yellow, green, blue, purple) are the game's meaning, and every slot and tile also carries a glyph and a word. Candidate purple, contrast checked: Day `#6A3FB5` (7.02:1 with white text, 5.71:1 against the Day tarmac `#E4E8EE`), Dusk `#B79CFF` (8.10:1 with ink `#10141B`, 7.18:1 against the Dusk tarmac `#1B2028`).
- Keep one paint and carry slot identity by glyph, word and position only (loses the method's colour cue).

Note the shared paints also fail against tarmac on their own: Day yellow is 1.28:1 and Day orange 1.91:1 against tarmac. That is exactly why the design system gives every shape a 3px keyline. Every slot and tile therefore has the keyline, and Day-theme checks must be made with the keyline, not the fill.

**D2: the picture approach.** Confirm the spike in Task 6 will be shown before the full art is drawn, and that a "no" means scaling the game back (fewer scenes, stages 1 and 2 only) and not switching to emoji.

**D3: the hub.** Confirm that five games means rebuilding the hub grid (Task 9) at every breakpoint.

**If D1 = purple:** add to `shared/tokens.css` in the Day set (next to the other `--paint-*`):

```css
  --paint-purple: #6A3FB5;  --on-purple: #FFFFFF;
```

in the Dusk set:

```css
  --paint-purple: #B79CFF;  --on-purple: #10141B;
```

and after the other `[data-paint=...]` rules:

```css
[data-paint="purple"] { --paint: var(--paint-purple); --on-paint: var(--on-purple); }
```

Verify with the contrast script below, then commit.

```bash
node -e "
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const cr=(a,b)=>{const[x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return ((x+.05)/(y+.05)).toFixed(2)};
console.log('day text',cr('#6A3FB5','#FFFFFF'),'day vs tarmac',cr('#6A3FB5','#E4E8EE'),'dusk text',cr('#B79CFF','#10141B'),'dusk vs tarmac',cr('#B79CFF','#1B2028'));"
```

Expected: `7.02 5.71 8.10 7.18`. Commit: `feat(tokens): add a purple game paint`.

---

### Task 2: Engine, seed data and unit tests (TDD)

**Files:**
- Create: `games/sentence-blocks/tests/package.json`, `tests/engine.test.js`, `js/engine.js`, `js/words.js`, `js/scenes.js`

**Step 1: Create the folders and the tests.**

```bash
mkdir -p games/sentence-blocks/js games/sentence-blocks/css games/sentence-blocks/tests
echo '{ "type": "module" }' > games/sentence-blocks/tests/package.json
```

`games/sentence-blocks/tests/engine.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SLOT_ORDER, STAGES, TARGET_SENTENCES, UNLOCK_AT, HELP_AFTER, SILLY_CHOICES, RECENT_KEEP,
  composeSentence, sentenceParts, tileText, lookOf, validateData, poolFor, distractorsFor, buildSceneRound, buildSillyRound, distractorsOf,
  tryPlace, helpTile, roundSentence, pickScenes, normaliseSave, unlockedStage, recordSentence, clampStage, tileOf,
} from '../js/engine.js';
import { DATA } from '../js/words.js';
import { SCENES } from '../js/scenes.js';

const many = (n, fn) => { for (let i = 0; i < n; i++) fn(i); };
// Seeded randomness: a failure names its seed and can be replayed exactly.
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const t = (slot, id) => tileOf(DATA, slot, id);
const SENTENCE = /^[A-Z][a-z]*( [a-z]+)* (is|are) [a-z]+( (a|an) [a-z]+| [a-z]+)?( (in|on|at) the [a-z]+)?\.$/;

describe('the data', () => {
  it('has no problems', () => assert.deepEqual(validateData(DATA, SCENES), []));
  it('validator catches a wrong a/an, a missing picture and a bad scene', () => {
    const bad = { ...DATA, what: [...DATA.what, { id: 'egg', det: 'a', noun: 'egg', tags: ['food'], pic: 'egg' }, { id: 'pear', det: 'a', noun: 'pear', tags: ['food'] }] };
    const probs = validateData(bad, [{ id: 'x', stage: 2, who: 'dog', doing: 'riding', what: 'apple', picture: {} }]);
    assert.ok(probs.some((p) => p.includes('what:egg') && p.includes('"an"')));
    assert.ok(probs.some((p) => p.includes('what:pear has no picture')));
    assert.ok(probs.some((p) => p.includes('cannot be riding')));
    assert.ok(probs.some((p) => p.includes('does not take apple')));
  });
  it('validator flags a scene that is left without enough wrong tiles, and one-way opposites', () => {
    const tight = { ...DATA, where: DATA.where.filter((w) => w.group === 'green') };
    const probs = validateData(tight, [{ id: 's3-x', stage: 3, describe: 'big', who: 'dog', doing: 'running', where: 'park', picture: {} }]);
    assert.ok(probs.some((p) => p.includes('not enough wrong tiles for where')), probs.join('|'));
    const noKind = { ...DATA, who: DATA.who.map((w) => (w.id === 'cat' ? { ...w, kind: undefined } : w)) };
    assert.ok(validateData(noKind, []).some((p) => p.includes('who:cat needs a kind')));
    const badActor = { ...DATA, doing: DATA.doing.map((d) => (d.id === 'running' ? { ...d, actors: ['robot'] } : d)) };
    assert.ok(validateData(badActor, []).some((p) => p.includes('unknown actor kind')));
    const lopsided = { ...DATA, describe: DATA.describe.map((d) => (d.id === 'sad' ? { ...d, opposite: 'big' } : d)) };
    assert.ok(validateData(lopsided, []).some((p) => p.includes('are not opposites of each other')));
  });
  it('every stage has scenes, and scenes fit their stage frames', () => {
    for (const s of STAGES) assert.ok(SCENES.filter((x) => x.stage === s.id).length >= TARGET_SENTENCES, 'stage ' + s.id);
  });
});

describe('composeSentence', () => {
  it('who + doing', () => assert.equal(composeSentence({ who: t('who', 'girl'), doing: t('doing', 'jumping') }), 'The girl is jumping.'));
  it('who + doing + what, with an/a/none', () => {
    assert.equal(composeSentence({ who: t('who', 'boy'), doing: t('doing', 'eating'), what: t('what', 'apple') }), 'The boy is eating an apple.');
    assert.equal(composeSentence({ who: t('who', 'dog'), doing: t('doing', 'eating'), what: t('what', 'carrot') }), 'The dog is eating a carrot.');
    assert.equal(composeSentence({ who: t('who', 'girl'), doing: t('doing', 'drinking'), what: t('what', 'milk') }), 'The girl is drinking milk.');
  });
  it('plural uses are, named people have no "the", describe goes before the noun', () => {
    assert.equal(composeSentence({ who: t('who', 'dogs'), doing: t('doing', 'running'), where: t('where', 'park') }), 'The dogs are running in the park.');
    assert.equal(composeSentence({ who: t('who', 'mum'), doing: t('doing', 'running') }), 'Mum is running.');
    assert.equal(composeSentence({ describe: t('describe', 'big'), who: t('who', 'dog'), doing: t('doing', 'running'), where: t('where', 'park') }), 'The big dog is running in the park.');
  });
  it('refuses what it cannot say', () => {
    assert.throws(() => composeSentence({ who: t('who', 'dog'), doing: t('doing', 'eating') }), /needs a what/);
    assert.throws(() => composeSentence({ who: t('who', 'dog'), doing: t('doing', 'running'), what: t('what', 'apple') }), /cannot take a what/);
    assert.throws(() => composeSentence({ describe: t('describe', 'big'), who: t('who', 'mum'), doing: t('doing', 'running') }), /named person/);
    assert.throws(() => composeSentence({ who: t('who', 'dog') }), /who and a doing/);
  });
});

describe('sentence parts and tile text', () => {
  it('parts carry their slot, the joining word has none, the last part ends the sentence', () => {
    const parts = sentenceParts({ describe: t('describe', 'big'), who: t('who', 'dogs'), doing: t('doing', 'eating'), what: t('what', 'carrot'), where: t('where', 'park') });
    assert.deepEqual(parts.map((p) => p.slot), ['who', 'describe', 'who', null, 'doing', 'what', 'where']);
    assert.deepEqual(parts.map((p) => p.text), ['The', 'big', 'dogs', 'are', 'eating', 'a carrot', 'in the park.']);
    assert.equal(parts.map((p) => p.text).join(' '), 'The big dogs are eating a carrot in the park.');
  });
  it('tile text for every tile is non-empty, and a who tile starts with a capital', () => {
    for (const slot of SLOT_ORDER) for (const tile of DATA[slot]) assert.ok(tileText(slot, tile).length > 0);
    for (const w of DATA.who) assert.match(tileText('who', w), /^[A-Z]/);
    assert.equal(tileText('what', t('what', 'milk')), 'milk');
    assert.equal(tileText('what', t('what', 'apple')), 'an apple');
  });
});

describe('pools', () => {
  it('doing pool matches the frame; describing frames exclude named people', () => {
    const [intr, tran] = [STAGES[0].frames[0], STAGES[1].frames[0]];
    assert.ok(poolFor(DATA, intr, 'doing').every((d) => d.takes.length === 0));
    assert.ok(poolFor(DATA, tran, 'doing').every((d) => d.takes.length > 0));
    assert.ok(poolFor(DATA, STAGES[2].frames[0], 'who').every((w) => !w.named));
    assert.ok(poolFor(DATA, intr, 'who').some((w) => w.named));
  });
});

describe('scene rounds', () => {
  it('every scene builds a round with the right tile and wrong ones, same slot, never the same picture', () => {
    for (const scene of SCENES) many(40, (i) => {
      const r = buildSceneRound(DATA, scene, rng(i));
      const n = distractorsFor(scene.stage);
      assert.deepEqual(r.slots, SLOT_ORDER.filter((k) => scene[k]));
      assert.equal(r.tray.length, r.slots.length * (1 + n));
      for (const k of r.slots) {
        const inSlot = r.tray.filter((x) => x.slot === k);
        assert.equal(inSlot.length, 1 + n);
        assert.equal(inSlot.filter((x) => x.id === scene[k]).length, 1);
        const looks = inSlot.map((x) => lookOf(t(k, x.id)));
        assert.equal(new Set(looks).size, looks.length, 'distinct looks in ' + k);
      }
    });
  });
  it('a describing word is only ever offered against its opposite', () => {
    for (const scene of SCENES.filter((x) => x.describe)) many(30, (i) => {
      const r = buildSceneRound(DATA, scene, rng(i));
      const ids = r.tray.filter((x) => x.slot === 'describe').map((x) => x.id).sort();
      assert.deepEqual(ids, [scene.describe, t('describe', scene.describe).opposite].sort());
    });
  });
  it('a look-alike group-mate of the right tile is never offered', () => {
    const scene = SCENES.find((x) => x.where === 'park');
    many(60, (i) => assert.ok(!buildSceneRound(DATA, scene, rng(i)).tray.some((x) => x.slot === 'where' && x.id === 'garden')));
  });
  it('right tiles lock in, wrong tiles and wrong slots bounce, and the round completes', () => {
    const scene = SCENES.find((s) => s.id === 's2-boy-eating-apple');
    const r = buildSceneRound(DATA, scene, () => 0.3);
    const right = (k) => r.tray.find((x) => x.slot === k && x.id === scene[k]);
    const wrong = (k) => r.tray.find((x) => x.slot === k && x.id !== scene[k]);
    assert.equal(tryPlace(r, wrong('who'), 'who'), 'wrong-tile');
    assert.equal(tryPlace(r, right('who'), 'doing'), 'wrong-slot');
    assert.equal(tryPlace(r, right('who'), 'where'), 'wrong-slot');
    assert.deepEqual(r.placed, {});
    assert.equal(tryPlace(r, right('who'), 'who'), 'ok');
    assert.equal(tryPlace(r, right('doing'), 'doing'), 'ok');
    assert.equal(r.complete, false);
    assert.equal(roundSentence(DATA, r), null);
    assert.equal(tryPlace(r, right('what'), 'what'), 'ok');
    assert.equal(r.complete, true);
    assert.equal(roundSentence(DATA, r), 'The boy is eating an apple.');
  });
  it('help appears only after repeated misses on one slot, and goes once it is placed', () => {
    const scene = SCENES.find((s) => s.id === 's1-girl-jumping');
    const r = buildSceneRound(DATA, scene);
    const wrong = r.tray.find((x) => x.slot === 'who' && x.id !== 'girl');
    many(HELP_AFTER - 1, () => tryPlace(r, wrong, 'who'));
    assert.equal(helpTile(r, 'who'), null);
    tryPlace(r, wrong, 'who');
    assert.equal(helpTile(r, 'who'), 'girl');
    assert.equal(helpTile(r, 'doing'), null);
    tryPlace(r, { slot: 'who', id: 'girl' }, 'who');
    assert.equal(helpTile(r, 'who'), null);
  });
});

describe('silly rounds', () => {
  it('every stage, many rounds: grammatical sentences whatever the child picks', () => {
    for (const stage of STAGES) many(300, (i) => {
      const rnd = rng(i + stage.id * 1000);
      const r = buildSillyRound(DATA, stage.id, rnd);
      assert.equal(r.answer, null);
      for (const k of r.slots) assert.equal(r.tray.filter((x) => x.slot === k).length, Math.min(SILLY_CHOICES, poolFor(DATA, r.frame, k).length));
      const picks = {};
      for (const k of r.slots) {
        const choices = r.tray.filter((x) => x.slot === k);
        const c = choices[Math.floor(rnd() * choices.length)];
        assert.equal(tryPlace(r, c, k), 'ok');
        picks[k] = c;
      }
      assert.equal(r.complete, true);
      const s = roundSentence(DATA, r);
      assert.match(s, SENTENCE, 'stage ' + stage.id + ' seed ' + (i + stage.id * 1000) + ': ' + s);
    });
  });
  it('a tile in the wrong slot is refused', () => {
    const r = buildSillyRound(DATA, 1);
    const who = r.tray.find((x) => x.slot === 'who');
    assert.equal(tryPlace(r, who, 'doing'), 'wrong-slot');
  });
  it('a child can swap a tile after placing one', () => {
    const r = buildSillyRound(DATA, 1);
    const [a, b] = r.tray.filter((x) => x.slot === 'who');
    tryPlace(r, a, 'who'); tryPlace(r, b, 'who');
    assert.equal(r.placed.who, b.id);
  });
});

describe('scenes for a session', () => {
  it('picks the stage, avoids recent ones, never repeats inside a session when it can', () => {
    many(100, (i) => {
      const stage1 = SCENES.filter((s) => s.stage === 1).map((s) => s.id);
      const recent = stage1.slice(0, 2);
      const out = pickScenes(SCENES, 1, TARGET_SENTENCES, recent, rng(i));
      assert.equal(out.length, TARGET_SENTENCES);
      assert.ok(out.every((s) => s.stage === 1));
      assert.equal(new Set(out.map((s) => s.id)).size, out.length);
    });
  });
  it('with too few fresh scenes it reuses recent ones rather than running short', () => {
    const stage1 = SCENES.filter((s) => s.stage === 1).map((s) => s.id);
    const out = pickScenes(SCENES, 1, TARGET_SENTENCES, stage1);
    assert.equal(out.length, TARGET_SENTENCES);
  });
  it('with fewer scenes than the target it repeats from the start, never ends early', () => {
    const few = SCENES.filter((s) => s.stage === 1).slice(0, 2);
    assert.equal(pickScenes(few, 1, 5).length, 5);
    assert.equal(pickScenes([], 1, 5).length, 0);
  });
});

describe('saved data', () => {
  it('survives anything', () => {
    for (const bad of [undefined, null, 7, 'x', [], { stage: 9, mode: 'x', done: 'no' }, { done: { 1: -4, 2: 1.5, 3: '9' }, recent: [1, 'a'] }]) {
      const s = normaliseSave(bad);
      assert.equal(s.v, 1); assert.equal(s.mode, 'scene'); assert.equal(s.stage, 1);
      assert.deepEqual(s.done, { 1: 0, 2: 0, 3: 0 });
    }
    assert.deepEqual(normaliseSave({ done: { 1: -4, 2: 1.5, 3: '9' }, recent: [1, 'a'] }).recent, ['a']);
  });
  it('keeps good values', () => {
    const s = normaliseSave({ mode: 'silly', stage: 2, done: { 1: 6, 2: 1, 3: 0 }, recent: ['a'] });
    assert.deepEqual(s, { v: 1, mode: 'silly', stage: 2, done: { 1: 6, 2: 1, 3: 0 }, recent: ['a'] });
  });
  it('stages unlock in order after UNLOCK_AT finished sentences', () => {
    const at = (a, b, c) => unlockedStage(normaliseSave({ done: { 1: a, 2: b, 3: c } }));
    assert.equal(at(0, 0, 0), 1);
    assert.equal(at(UNLOCK_AT - 1, 0, 0), 1);
    assert.equal(at(UNLOCK_AT, 0, 0), 2);
    assert.equal(at(0, 99, 0), 1, 'stage 2 play alone cannot skip stage 1');
    assert.equal(at(UNLOCK_AT, UNLOCK_AT, 0), 3);
    assert.equal(at(UNLOCK_AT, UNLOCK_AT - 1, 0), 2);
  });
  it('only finished describe-the-picture sentences count, towards their own stage', () => {
    const save = normaliseSave({});
    const scene = buildSceneRound(DATA, SCENES.find((s) => s.stage === 2));
    const silly = buildSillyRound(DATA, 1);
    assert.deepEqual(recordSentence(save, silly), save);
    const next = recordSentence(save, scene);
    assert.equal(next.done[2], 1); assert.equal(next.done[1], 0);
    assert.equal(save.done[2], 0, 'input not mutated');
    assert.deepEqual(next.recent, [scene.scene.id]);
  });
  it('recent list is capped', () => {
    let save = normaliseSave({});
    const r = buildSceneRound(DATA, SCENES[0]);
    many(25, () => { save = recordSentence(save, r); });
    assert.equal(save.recent.length, RECENT_KEEP);
  });
  // Switch this on when the full scene set exists (Task 12): without it a session cannot avoid the scenes just played.
  it('every stage has enough scenes to avoid the last session', { todo: 'enable after Task 12' }, () => {
    for (const s of STAGES) assert.ok(SCENES.filter((x) => x.stage === s.id).length >= RECENT_KEEP + TARGET_SENTENCES, 'stage ' + s.id + ' needs at least ' + (RECENT_KEEP + TARGET_SENTENCES) + ' scenes so a session can avoid the last one');
  });
  it('never offers a locked stage', () => {
    assert.equal(clampStage(normaliseSave({ stage: 3 })), 1);
    assert.equal(clampStage(normaliseSave({ stage: 2, done: { 1: UNLOCK_AT } })), 2);
  });
});
```

**Step 2: Run it and watch it fail.**

Run: `(cd games/sentence-blocks/tests && node --test ./*.test.js)`
Expected: FAIL, `Cannot find module '../js/engine.js'`.

**Step 3: Write the engine.**

`games/sentence-blocks/js/engine.js`:

```js
// engine.js — Sentence Blocks: grammar, rounds, stages and saved progress. Pure logic, no DOM.
// Every function takes the word data as an argument, so nothing here depends on another file at run time.
// (build.sh strips import/export lines and joins the files, so every top-level name must be unique across js/.)

export const SLOT_ORDER = ['describe', 'who', 'doing', 'what', 'where'];
export const TARGET_SENTENCES = 5;  // sentences in one session (one hopscotch square)
export const UNLOCK_AT = 5;         // finished describe-the-picture sentences that open the next stage
export const SAVE_VERSION = 1;
export const RECENT_KEEP = TARGET_SENTENCES; // scenes remembered, so the next session avoids the ones just played (must stay below the scenes per stage)
export const KINDS = ['animal', 'child', 'baby', 'adult'];

// A frame is the set of colour slots one sentence uses. `transitive` says whether its doing word takes a "what".
export const STAGES = [
  { id: 1, name: 'Who and doing', frames: [{ slots: ['who', 'doing'], transitive: false }] },
  { id: 2, name: 'Add a what', frames: [{ slots: ['who', 'doing', 'what'], transitive: true }] },
  {
    id: 3, name: 'Add a where',
    frames: [
      { slots: ['describe', 'who', 'doing', 'where'], transitive: false },
      { slots: ['describe', 'who', 'doing', 'what', 'where'], transitive: true },
    ],
  },
];

// ---------- grammar ----------
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const isTransitive = (doing) => doing.takes.length > 0;
export const tileOf = (data, slot, id) => data[slot].find((t) => t.id === id) || null;

export const whatPhrase = (what) => [what.det, what.noun].filter(Boolean).join(' ');

// What is printed on a tile.
export function tileText(slot, t) {
  if (slot === 'who') return t.named ? t.text : cap(t.det + ' ' + t.noun);
  if (slot === 'doing') return t.ing;
  if (slot === 'what') return whatPhrase(t);
  if (slot === 'where') return t.phrase;
  return t.word;
}

// picks: { describe?, who, doing, what?, where? }, each a tile object.
// The sentence as coloured pieces, in order: [{ slot: 'who' | ... | null, text }]. A null slot is a joining word (is / are).
export function sentenceParts(picks) {
  const { who, doing } = picks;
  if (!who || !doing) throw new Error('A sentence needs a who and a doing');
  if (isTransitive(doing) !== !!picks.what) throw new Error('"' + doing.id + '" ' + (isTransitive(doing) ? 'needs' : 'cannot take') + ' a what');
  if (who.named && picks.describe) throw new Error('A named person cannot take a describing word: ' + who.id);
  const parts = [];
  if (who.named) parts.push({ slot: 'who', text: who.text });
  else {
    parts.push({ slot: 'who', text: cap(who.det) });
    if (picks.describe) parts.push({ slot: 'describe', text: picks.describe.word });
    parts.push({ slot: 'who', text: who.noun });
  }
  parts.push({ slot: null, text: who.plural ? 'are' : 'is' }, { slot: 'doing', text: doing.ing });
  if (picks.what) parts.push({ slot: 'what', text: whatPhrase(picks.what) });
  if (picks.where) parts.push({ slot: 'where', text: picks.where.phrase });
  parts[parts.length - 1] = { ...parts[parts.length - 1], text: parts[parts.length - 1].text + '.' };
  return parts;
}
export const composeSentence = (picks) => sentenceParts(picks).map((p) => p.text).join(' ');

// ---------- data checks (run by the tests and therefore by build.sh) ----------
const VOWEL = /^[aeiou]/i;
export function validateData(data, scenes) {
  const problems = [];
  const say = (m) => problems.push(m);
  for (const slot of SLOT_ORDER) {
    const seen = new Set();
    for (const t of data[slot] || []) {
      if (seen.has(t.id)) say(slot + ': duplicate id ' + t.id);
      seen.add(t.id);
      if (!t.pic) say(slot + ':' + t.id + ' has no picture');
    }
    if (!(data[slot] || []).length) say(slot + ': no tiles');
  }
  for (const w of data.who) {
    if (!KINDS.includes(w.kind)) say('who:' + w.id + ' needs a kind: ' + KINDS.join(', '));
    if (w.named) { if (!w.text) say('who:' + w.id + ' named but no text'); continue; }
    if (w.det !== 'the') say('who:' + w.id + ' must use "the"');
    if (!w.noun) say('who:' + w.id + ' has no noun');
    if (w.plural && !/s$/.test(w.noun)) say('who:' + w.id + ' plural noun should end in s');
    if (!w.plural && /s$/.test(w.noun) && !w.irregularS) say('who:' + w.id + ' looks plural but is not marked plural');
  }
  for (const w of data.what) {
    if (!w.noun) say('what:' + w.id + ' has no noun');
    const wantsAn = VOWEL.test(w.noun || '');
    if (w.det === '') { if (!w.mass) say('what:' + w.id + ' has no determiner but is not marked mass'); }
    else if (w.det !== (wantsAn ? 'an' : 'a')) say('what:' + w.id + ' should use "' + (wantsAn ? 'an' : 'a') + '"');
  }
  for (const d of data.describe) {
    const o = tileOf(data, 'describe', d.opposite);
    if (!o) say('describe:' + d.id + ' has no valid opposite');
    else if (o.opposite !== d.id) say('describe:' + d.id + ' and ' + o.id + ' are not opposites of each other');
  }
  for (const d of data.doing) {
    if (!/ing$/.test(d.ing || '')) say('doing:' + d.id + ' must be an -ing word');
    if (!d.actors || !d.actors.length) say('doing:' + d.id + ' lists no actors');
    else if (d.actors.some((a) => !KINDS.includes(a))) say('doing:' + d.id + ' lists an unknown actor kind');
    if (!d.wheres || !d.wheres.length) say('doing:' + d.id + ' lists no places');
  }
  for (const s of scenes || []) {
    const tag = 'scene ' + s.id;
    const who = tileOf(data, 'who', s.who), doing = tileOf(data, 'doing', s.doing);
    const what = s.what ? tileOf(data, 'what', s.what) : null;
    const where = s.where ? tileOf(data, 'where', s.where) : null;
    const describe = s.describe ? tileOf(data, 'describe', s.describe) : null;
    if (!who || !doing) { say(tag + ': unknown who or doing'); continue; }
    if (s.what && !what) say(tag + ': unknown what ' + s.what);
    if (s.where && !where) say(tag + ': unknown where ' + s.where);
    if (s.describe && !describe) say(tag + ': unknown describe ' + s.describe);
    const stage = STAGES.find((st) => st.id === s.stage);
    if (!stage) { say(tag + ': bad stage'); continue; }
    const slots = SLOT_ORDER.filter((k) => s[k]);
    const frame = stage.frames.find((f) => f.slots.join() === slots.join());
    if (!frame) say(tag + ': slots [' + slots + '] do not match any stage ' + s.stage + ' frame');
    if (!who.kind || !doing.actors.includes(who.kind)) say(tag + ': ' + who.id + ' cannot be ' + doing.id);
    if (what && !what.tags.some((x) => doing.takes.includes(x))) say(tag + ': ' + doing.id + ' does not take ' + what.id);
    if (where && !where.tags.some((x) => doing.wheres.includes(x))) say(tag + ': ' + doing.id + ' does not happen ' + where.phrase);
    if (describe && who.named) say(tag + ': ' + who.id + ' cannot be described');
    if (!s.picture) say(tag + ': no picture recipe');
    if (frame) {
      for (const k of slots) {
        const right = tileOf(data, k, s[k]);
        if (right && distractorsOf(data, frame, k, right, distractorsFor(s.stage), () => 0.5).length < Math.min(distractorsFor(s.stage), k === 'describe' ? 1 : 99)) say(tag + ': not enough wrong tiles for ' + k);
      }
    }
    try {
      if (who && doing && (isTransitive(doing) === !!what)) composeSentence({ who, doing, what, where, describe });
    } catch (e) { say(tag + ': ' + e.message); }
  }
  const ids = (scenes || []).map((s) => s.id);
  if (new Set(ids).size !== ids.length) say('scenes: duplicate ids');
  return problems;
}

// ---------- rounds ----------
const shuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickN = (a, n, rnd) => shuffle(a, rnd).slice(0, n);
// What a tile looks like in the tray: plural people are drawn twice, so "dog" and "dogs" look different but two "dog"s do not.
export const lookOf = (t) => t.pic + (t.plural ? '*2' : '');
// n tiles that all look different from each other (and from anything in `avoid`).
function pickDistinct(a, n, avoid, rnd) {
  const seen = new Set(avoid.map(lookOf)), out = [];
  for (const t of shuffle(a, rnd)) {
    if (out.length === n) break;
    if (seen.has(lookOf(t))) continue;
    seen.add(lookOf(t)); out.push(t);
  }
  return out;
}

export const stageById = (id) => STAGES.find((s) => s.id === id) || STAGES[0];

// Tiles that may stand in a slot for a frame. The doing pool matches the frame's transitivity; a describing frame has no named people.
export function poolFor(data, frame, slot) {
  let pool = data[slot];
  if (slot === 'doing') pool = pool.filter((d) => isTransitive(d) === frame.transitive);
  if (slot === 'who' && frame.slots.includes('describe')) pool = pool.filter((w) => !w.named);
  return pool;
}

// How many wrong tiles sit beside the right one, per slot.
export const distractorsFor = (stageId) => (stageId >= 3 ? 1 : 2);

// Wrong tiles for one slot. They must be clearly wrong for the picture, so:
//  - a describing word is only ever offered against its opposite (a "big" dog is not also "happy" or "tired");
//  - tiles in the same `group` look alike (park / garden / field), so a group-mate of the right tile is never offered.
export function distractorsOf(data, frame, slot, right, n, rnd = Math.random) {
  if (slot === 'describe') { const o = tileOf(data, 'describe', right.opposite); return o ? [o] : []; }
  const pool = poolFor(data, frame, slot).filter((t) => !(right.group && t.group === right.group));
  return pickDistinct(pool, n, [right], rnd);
}

// "Describe the picture": one scene, the right tile per slot plus wrong ones from the same slot.
export function buildSceneRound(data, scene, rnd = Math.random) {
  const stage = stageById(scene.stage);
  const slots = SLOT_ORDER.filter((k) => scene[k]);
  const frame = stage.frames.find((f) => f.slots.join() === slots.join());
  if (!frame) throw new Error('Scene ' + scene.id + ' does not fit a frame');
  const n = distractorsFor(scene.stage);
  const tray = [];
  for (const slot of slots) {
    const right = tileOf(data, slot, scene[slot]);
    tray.push({ slot, id: right.id }, ...distractorsOf(data, frame, slot, right, n, rnd).map((t) => ({ slot, id: t.id })));
  }
  return { mode: 'scene', stage: scene.stage, slots, scene, answer: Object.fromEntries(slots.map((k) => [k, scene[k]])), tray: shuffle(tray, rnd), placed: {}, misses: {}, complete: false };
}

// "Silly sentences": the game picks a frame, the child picks any tile for each slot.
export const SILLY_CHOICES = 3;
export function buildSillyRound(data, stageId, rnd = Math.random) {
  const stage = stageById(stageId);
  const frame = stage.frames[Math.floor(rnd() * stage.frames.length)];
  const tray = [];
  for (const slot of frame.slots) for (const t of pickN(poolFor(data, frame, slot), SILLY_CHOICES, rnd)) tray.push({ slot, id: t.id });
  return { mode: 'silly', stage: stageId, slots: frame.slots.slice(), frame, answer: null, tray: shuffle(tray, rnd), placed: {}, misses: {}, complete: false };
}

// Try a tile in a slot. Returns 'ok' | 'wrong-slot' | 'wrong-tile'. A wrong tile never stays.
export function tryPlace(round, tile, slot) {
  if (!round.slots.includes(slot)) return 'wrong-slot';
  if (tile.slot !== slot) return 'wrong-slot';
  if (round.mode === 'scene' && round.answer[slot] !== tile.id) {
    round.misses[slot] = (round.misses[slot] || 0) + 1;
    return 'wrong-tile';
  }
  round.placed[slot] = tile.id;
  round.complete = round.slots.every((k) => round.placed[k]);
  return 'ok';
}

// After this many wrong tiles on one slot, the right tile gets a gentle outline.
export const HELP_AFTER = 3;
export const helpTile = (round, slot) => (round.mode === 'scene' && (round.misses[slot] || 0) >= HELP_AFTER && !round.placed[slot] ? round.answer[slot] : null);

export function roundSentence(data, round) {
  if (!round.complete) return null;
  const p = {};
  for (const k of round.slots) p[k] = tileOf(data, k, round.placed[k]);
  return composeSentence(p);
}

// Scenes for a session: this stage only, newest-first avoidance of the ones just played.
export function pickScenes(scenes, stageId, n, recentIds = [], rnd = Math.random) {
  const all = scenes.filter((s) => s.stage === stageId);
  const fresh = all.filter((s) => !recentIds.includes(s.id));
  const pool = fresh.length >= n ? fresh : all;
  const out = pickN(pool, Math.min(n, pool.length), rnd);
  // fewer scenes than the target: repeat from the start rather than end the session early
  while (out.length < n && all.length) out.push(all[out.length % all.length]);
  return out;
}

// ---------- saved data ----------
export function normaliseSave(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const count = (v) => (Number.isInteger(v) && v >= 0 ? Math.min(v, 9999) : 0);
  const done = r.done && typeof r.done === 'object' ? r.done : {};
  return {
    v: SAVE_VERSION,
    mode: r.mode === 'silly' ? 'silly' : 'scene',
    stage: [1, 2, 3].includes(r.stage) ? r.stage : 1,
    done: { 1: count(done[1]), 2: count(done[2]), 3: count(done[3]) },
    recent: Array.isArray(r.recent) ? r.recent.filter((x) => typeof x === 'string').slice(-RECENT_KEEP) : [],
  };
}
export function unlockedStage(save) {
  let s = 1;
  if (save.done[1] >= UNLOCK_AT) s = 2;
  if (s === 2 && save.done[2] >= UNLOCK_AT) s = 3;
  return s;
}
// A finished describe-the-picture sentence: counts toward the stage it was played on.
export function recordSentence(save, round) {
  if (round.mode !== 'scene') return save;
  const next = { ...save, done: { ...save.done } };
  next.done[round.stage] += 1;
  next.recent = [...save.recent, round.scene.id].slice(-RECENT_KEEP);
  return next;
}
// The stage to offer first: never a locked one.
export const clampStage = (save) => Math.min(save.stage, unlockedStage(save));
```

**Step 4: Write the seed words and scenes** (the full reviewed sets replace these in Tasks 10 and 12; the tests are written against the structure, so they keep working).

`games/sentence-blocks/js/words.js`:

```js
// words.js — the tiles. SEED SET for the plan's tests; the full reviewed set replaces it in the word batches.
const ALL = ['animal', 'child', 'adult'];
const ANY_PLACE = ['indoor', 'outdoor'];

export const WHO = [
  { id: 'girl', det: 'the', noun: 'girl', kind: 'child', pic: 'girl' },
  { id: 'boy', det: 'the', noun: 'boy', kind: 'child', pic: 'boy' },
  { id: 'dog', det: 'the', noun: 'dog', kind: 'animal', pic: 'dog' },
  { id: 'cat', det: 'the', noun: 'cat', kind: 'animal', pic: 'cat' },
  { id: 'mum', text: 'Mum', named: true, kind: 'adult', pic: 'mum' },
  { id: 'dogs', det: 'the', noun: 'dogs', plural: true, kind: 'animal', pic: 'dog' },
];
export const DOING = [
  { id: 'jumping', ing: 'jumping', takes: [], actors: ALL, wheres: ANY_PLACE, pic: 'jumping' },
  { id: 'sleeping', ing: 'sleeping', takes: [], actors: ALL, wheres: ['indoor'], pic: 'sleeping' },
  { id: 'running', ing: 'running', takes: [], actors: ALL, wheres: ['outdoor'], pic: 'running' },
  { id: 'eating', ing: 'eating', takes: ['food'], actors: ALL, wheres: ANY_PLACE, pic: 'eating' },
  { id: 'drinking', ing: 'drinking', takes: ['drink'], actors: ALL, wheres: ANY_PLACE, pic: 'drinking' },
  { id: 'riding', ing: 'riding', takes: ['rideable'], actors: ['child', 'adult'], wheres: ['outdoor'], pic: 'riding' },
];
export const WHAT = [
  { id: 'apple', det: 'an', noun: 'apple', tags: ['food'], pic: 'apple' },
  { id: 'carrot', det: 'a', noun: 'carrot', tags: ['food'], pic: 'carrot' },
  { id: 'milk', det: '', mass: true, noun: 'milk', tags: ['drink'], pic: 'milk' },
  { id: 'bike', det: 'a', noun: 'bike', tags: ['rideable'], pic: 'bike' },
];
export const WHERE = [
  { id: 'park', phrase: 'in the park', tags: ['outdoor'], group: 'green', pic: 'park' },
  { id: 'garden', phrase: 'in the garden', tags: ['outdoor'], group: 'green', pic: 'garden' },
  { id: 'bed', phrase: 'on the bed', tags: ['indoor'], pic: 'bed' },
  { id: 'beach', phrase: 'at the beach', tags: ['outdoor'], pic: 'beach' },
];
export const DESCRIBE = [
  { id: 'big', word: 'big', opposite: 'small', pic: 'big' },
  { id: 'small', word: 'small', opposite: 'big', pic: 'small' },
  { id: 'happy', word: 'happy', opposite: 'sad', pic: 'happy' },
  { id: 'sad', word: 'sad', opposite: 'happy', pic: 'sad' },
];
export const DATA = { who: WHO, doing: DOING, what: WHAT, where: WHERE, describe: DESCRIBE };
```

`games/sentence-blocks/js/scenes.js`:

```js
// scenes.js — "Describe the picture" scenes. SEED SET; `picture` is the recipe the renderer draws (see the picture task).
export const SCENES = [
  { id: 's1-girl-jumping', stage: 1, who: 'girl', doing: 'jumping', picture: { actor: 'girl', pose: 'jumping' } },
  { id: 's1-dog-sleeping', stage: 1, who: 'dog', doing: 'sleeping', picture: { actor: 'dog', pose: 'sleeping' } },
  { id: 's1-boy-running', stage: 1, who: 'boy', doing: 'running', picture: { actor: 'boy', pose: 'running' } },
  { id: 's1-cat-jumping', stage: 1, who: 'cat', doing: 'jumping', picture: { actor: 'cat', pose: 'jumping' } },
  { id: 's1-mum-running', stage: 1, who: 'mum', doing: 'running', picture: { actor: 'mum', pose: 'running' } },
  { id: 's2-boy-eating-apple', stage: 2, who: 'boy', doing: 'eating', what: 'apple', picture: { actor: 'boy', pose: 'eating', item: 'apple' } },
  { id: 's2-dog-eating-carrot', stage: 2, who: 'dog', doing: 'eating', what: 'carrot', picture: { actor: 'dog', pose: 'eating', item: 'carrot' } },
  { id: 's2-girl-drinking-milk', stage: 2, who: 'girl', doing: 'drinking', what: 'milk', picture: { actor: 'girl', pose: 'drinking', item: 'milk' } },
  { id: 's2-mum-riding-bike', stage: 2, who: 'mum', doing: 'riding', what: 'bike', picture: { actor: 'mum', pose: 'riding', item: 'bike' } },
  { id: 's2-cat-eating-apple', stage: 2, who: 'cat', doing: 'eating', what: 'apple', picture: { actor: 'cat', pose: 'eating', item: 'apple' } },
  { id: 's3-big-dog-running-park', stage: 3, describe: 'big', who: 'dog', doing: 'running', where: 'park', picture: { actor: 'dog', pose: 'running', scale: 'big', place: 'park' } },
  { id: 's3-happy-girl-eating-apple-park', stage: 3, describe: 'happy', who: 'girl', doing: 'eating', what: 'apple', where: 'park', picture: { actor: 'girl', pose: 'eating', item: 'apple', mood: 'happy', place: 'park' } },
  { id: 's3-sad-boy-sleeping-bed', stage: 3, describe: 'sad', who: 'boy', doing: 'sleeping', where: 'bed', picture: { actor: 'boy', pose: 'sleeping', mood: 'sad', place: 'bed' } },
  { id: 's3-small-cat-jumping-beach', stage: 3, describe: 'small', who: 'cat', doing: 'jumping', where: 'beach', picture: { actor: 'cat', pose: 'jumping', scale: 'small', place: 'beach' } },
  { id: 's3-happy-boy-riding-bike-park', stage: 3, describe: 'happy', who: 'boy', doing: 'riding', what: 'bike', where: 'park', picture: { actor: 'boy', pose: 'riding', item: 'bike', mood: 'happy', place: 'park' } },
];
```

**Step 5: Run the tests.**

Run: `(cd games/sentence-blocks/tests && node --test ./*.test.js)`
Expected: `tests 28`, `pass 28`, `fail 0`. Run it five more times: results must be identical (the silly-round test is random, so a flaky pass means a real defect).

**Step 6: Prove it survives the bundler.**

```bash
cd games/sentence-blocks && for f in js/words.js js/scenes.js js/engine.js; do awk '/^import / || /^import\{/ { if ($0 ~ /;/) { next } while ((getline line) > 0) { if (line ~ /;/) break } next } /^export\s*\{\s*\}\s*;?\s*$/ { next } /^export default / { sub(/^export default /, ""); print; next } /^export / { sub(/^export /, ""); print; next } { print }' $f; echo; done > /tmp/sb-bundle.js && node --check /tmp/sb-bundle.js && echo bundle-ok; cd ../..
```

Expected: `bundle-ok`.

**Step 7: Commit.**

```bash
git add games/sentence-blocks
git commit -m "feat(sentence-blocks): engine, seed words and scenes, unit tests

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Run the new tests from build.sh

**Files:** Modify `build.sh` (after the Maths test block, around line 82).

**Step 1:** Add, directly after the Maths tests block:

```bash
# --- Sentence Blocks: unit tests (grammar, rounds, stages, saved data) and word/scene/picture checks ---
if command -v node >/dev/null 2>&1; then
  (cd games/sentence-blocks/tests && node --test ./*.test.js) || { echo "Error: Sentence Blocks tests failed." >&2; exit 1; }
else
  echo "  [WARN] node not found: skipped the Sentence Blocks tests"
fi
echo ""
```

**Step 2:** Prove the gate works. Break a seed word on purpose, e.g. in `words.js` change `det: 'an'` to `det: 'a'` for `apple`, run `bash build.sh`.
Expected: build stops with `Error: Sentence Blocks tests failed.` Revert the edit (`git checkout games/sentence-blocks/js/words.js`) and re-run: the build completes. `git restore docs/`.

**Step 3: Commit** `build: run Sentence Blocks tests`.

---

### Task 4: Pictures module (format, renderer, checks)

**Files:**
- Create: `games/sentence-blocks/js/pictures.js`, `tests/pictures.test.js`

A picture is plain data on a 96x96 square, drawn the same way as Memory Match's (`line` bold strokes, optional `detail` thinner strokes, optional `dots` filled shapes, `label` for the accessible name). Copy the stroke weights from `.mm-pic` in `games/memory-match/index.html`. The Memory Match pictures (cat, rabbit, apple, car, fish, heart) may be copied into `PICTURES` where a tile needs them. Do not import from that file: games stay self-contained.

**Step 1: Write the failing test** `tests/pictures.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PICTURES, pictureSvg, missingSvg, SLOT_GLYPHS } from '../js/pictures.js';
import { DATA } from '../js/words.js';
import { SCENES } from '../js/scenes.js';
import { SLOT_ORDER } from '../js/engine.js';

const PATH_OK = /^[MmLlHhVvCcSsQqTtAaZz0-9 .,\-]+$/;
const everyPath = (p) => [p.line, p.detail, p.dots].filter(Boolean);

describe('picture data', () => {
  it('every picture has a label and a clean main line', () => {
    for (const [k, p] of Object.entries(PICTURES)) {
      assert.ok(p.label, k + ' has no label');
      assert.ok(p.line, k + ' has no line');
      for (const d of everyPath(p)) assert.match(d, PATH_OK, k + ' has a path with odd characters');
    }
  });
  it('every slot has a header glyph', () => {
    for (const k of SLOT_ORDER) assert.ok(SLOT_GLYPHS[k] && SLOT_GLYPHS[k].line, 'no glyph for ' + k);
  });
  it('renders svg strings, aria-hidden, with a real path, for every picture AND every slot glyph', () => {
    const keys = [...Object.keys(PICTURES), ...Object.keys(SLOT_GLYPHS)];
    assert.ok(keys.length >= 5, 'the slot glyphs at least must be checked');
    for (const k of keys) {
      const s = pictureSvg(k);
      assert.match(s, /^<svg [^>]*aria-hidden="true"/);
      assert.match(s, /<path d="M/, k + ' draws nothing');
      assert.ok(!s.includes('undefined') && !s.includes('sb-pic--missing'), k + ' rendered as missing');
    }
  });
  it('a missing picture renders a visible placeholder, never throws', () => {
    assert.match(missingSvg('dog'), /<svg/);
  });
  // Switch this on at the end of the picture batches (Task 11): every tile and every scene must be drawable.
  it('every tile has a picture, and every picture is used', { todo: 'enable after Task 11' }, () => {
    const used = new Set();
    for (const slot of SLOT_ORDER) for (const t of DATA[slot]) { assert.ok(PICTURES[t.pic], slot + ':' + t.id + ' has no picture ' + t.pic); used.add(t.pic); }
    for (const k of Object.keys(PICTURES)) assert.ok(used.has(k) || k.startsWith('fig-') || k.startsWith('item-') || k.startsWith('place-'), 'unused picture ' + k);
    for (const s of SCENES) assert.ok(s.picture, s.id);
  });
});
```

**Step 2:** Run: `(cd games/sentence-blocks/tests && node --test ./pictures.test.js)`. Expected: FAIL, cannot find `../js/pictures.js`.

**Step 3: Write `js/pictures.js`.**

```js
// pictures.js — drawn SVG data and renderers. No emoji: every picture is a path.
// A picture is data on a 96x96 square: line (bold strokes), detail (thinner strokes), dots (small filled shapes), label.
// Stroke weights and round ends come from the .sb-pic CSS. To add or change a picture, edit PICTURES only.

// BEGIN_PICTURES
export const PICTURES = {
  // filled in batches (Task 11): keys are the `pic` field of tiles in words.js
};
// END_PICTURES

// Header glyphs for the five slots: the pack's idea (a person with a question mark, a running figure, a question mark,
// a signpost, a face with a speech bubble), drawn in our own style. Each must read at 40px.
export const SLOT_GLYPHS = {
  describe: { label: 'Describe', line: 'M48 14a22 22 0 1 0 0 44a22 22 0 1 0 0-44Z', detail: 'M40 36h0M56 36h0M38 46q10 8 20 0' },
  who: { label: 'Who', line: 'M48 12a12 12 0 1 0 0 24a12 12 0 1 0 0-24Z M28 84L38 46H58L68 84', detail: '' },
  doing: { label: 'What doing', line: 'M52 12a10 10 0 1 0 0 20a10 10 0 1 0 0-20Z M50 34L36 56L18 54 M50 34L66 48L82 38 M36 56L44 84 M44 56L66 80', detail: '' },
  what: { label: 'What', line: 'M30 30C30 12 66 12 66 32C66 46 48 46 48 62', detail: '', dots: 'M42 78a6 6 0 1 0 12 0a6 6 0 1 0 -12 0' },
  where: { label: 'Where', line: 'M46 90V16 M46 24H82L90 34L82 44H46 M46 52H14L6 62L14 72H46', detail: '' },
};

const attrs = 'viewBox="0 0 96 96" aria-hidden="true"';
export function pictureSvg(key) {
  const p = PICTURES[key] || SLOT_GLYPHS[key];
  if (!p) return missingSvg(key);
  return '<svg class="sb-pic" ' + attrs + '><path d="' + p.line + '"/>' +
    (p.detail ? '<path class="d" d="' + p.detail + '"/>' : '') +
    (p.dots ? '<path class="dot" d="' + p.dots + '"/>' : '') + '</svg>';
}
// Visible, ugly on purpose: a missing drawing must never go unnoticed in review.
export function missingSvg(key) {
  return '<svg class="sb-pic sb-pic--missing" ' + attrs + '><rect x="12" y="12" width="72" height="72" rx="8"/><path class="d" d="M12 12L84 84M84 12L12 84"/></svg>';
}
```

(The glyph paths above are placeholders to be redrawn and reviewed in Task 11, batch E. They only need to be valid path data now.)

**Step 4:** Run: `(cd games/sentence-blocks/tests && node --test ./*.test.js)`. Expected: all pass, with one `todo`.

**Step 5: Commit** `feat(sentence-blocks): picture format, renderer and checks`.

---

### Task 5: Contact sheet (so the user can review drawings)

**Files:** Create `games/sentence-blocks/tests/contact-sheet.mjs`.

A script that writes one HTML page showing every picture and header glyph at tile size and at 40px, in Day and Dusk, labelled with its key and slot colour, then (optionally) screenshots it with Playwright. It exists so drawing review is quick and exact.

```js
// Usage: node games/sentence-blocks/tests/contact-sheet.mjs <out.html> [<out.png>]
// Set PLAYWRIGHT_CORE to also write a screenshot.
import fs from 'node:fs';
import { PICTURES, SLOT_GLYPHS, pictureSvg } from '../js/pictures.js';
import { DATA } from '../js/words.js';
import { SLOT_ORDER, tileText } from '../js/engine.js';

const [out, png] = process.argv.slice(2);
if (!out) { console.error('usage: contact-sheet.mjs <out.html> [<out.png>]'); process.exit(1); }
const css = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const tokens = fs.readFileSync(new URL('../../../shared/tokens.css', import.meta.url), 'utf8').replace(/url\(fonts\/[^)]*\)/g, 'local(sans-serif)');
const cell = (slot, t) => `<figure class="cs sb-tile--${slot}"><div class="cs-pic">${pictureSvg(t.pic)}</div><figcaption>${tileText(slot, t)}<br><small>${t.pic}</small></figcaption></figure>`;
const sections = SLOT_ORDER.map((slot) => `<h2>${slot}</h2><div class="cs-row">${DATA[slot].map((t) => cell(slot, t)).join('')}</div>`).join('');
const glyphs = Object.keys(SLOT_GLYPHS).map((k) => `<figure class="cs"><div class="cs-pic">${pictureSvg(k)}</div><figcaption>${k}</figcaption></figure>`).join('');
const html = (theme) => `<section data-theme="${theme}" class="cs-theme"><h1>${theme}</h1>${sections}<h2>slot glyphs</h2><div class="cs-row">${glyphs}</div></section>`;
fs.writeFileSync(out, `<!doctype html><meta charset=utf-8><style>${tokens}\n${css}\n.cs-theme{background:var(--ground);color:var(--ink);padding:16px}.cs-row{display:flex;flex-wrap:wrap;gap:12px}.cs{margin:0;width:120px;text-align:center;font:14px sans-serif}.cs-pic{width:96px;height:96px;margin:auto}</style><body>${html('colourful-light')}${html('colourful-dark')}`);
if (png && process.env.PLAYWRIGHT_CORE) {
  const { chromium } = await import(process.env.PLAYWRIGHT_CORE);
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  await p.goto('file:///' + out.replace(/\\/g, '/'));
  await p.screenshot({ path: png, fullPage: true });
  await b.close();
}
console.log('wrote', out);
```

Run it with the seed set: `node games/sentence-blocks/tests/contact-sheet.mjs /tmp/sheet.html`. Expected: `wrote /tmp/sheet.html` (all tiles show the ugly placeholder, which is correct this early). Commit `test(sentence-blocks): contact sheet for reviewing drawings`.

---

### Task 6: Picture spike (STOP: user approves before any full art)

**Why this task exists.** The biggest risk in the whole plan: Mode 1 only teaches anything if a scene reads as *a picture of an action* (a girl jumping), not as a row of the same icons the tiles show. If the scene is just the tile icons in a line, the child matches icons to icons and no language is involved. The design hoped to compose scenes from tile art. This spike tests whether that works before anything is drawn at scale.

**Files:** Modify `js/pictures.js`; modify `tests/contact-sheet.mjs` to also render scenes.

**Step 1:** Build a small *parametric figure system* in `pictures.js`:
- `personFigure({ pose, hair, dress })`: a stick-style person on the 96x96 grid with poses `jumping`, `running`, `sleeping`, `eating`. `hair` and `dress` variants make girl, boy and adult distinguishable (pigtails and triangle dress, short hair and shorts, hair bun).
- `quadFigure({ pose, species })`: a four-legged body with poses `running`, `sleeping`, `jumping`, `eating`, and species variants (dog floppy ear, cat pointed ears and long tail, rabbit long ears and round tail).
- `sceneSvg(scene)` (exported; `main.js` and the contact sheet both call it) composes a 160x96 scene, drawing the actor twice when the who is plural: place band (a ground line plus a few cues: trees for park, waves for beach, a bed outline), the figure (scaled larger or smaller for `big`/`small` against a fixed reference), and the item.

**Step 2:** Render exactly three scenes: `s1-girl-jumping`, `s2-boy-eating-apple`, `s3-big-dog-running-park`, plus their wrong-tile neighbours (the girl against the boy, jumping against running), through the contact sheet.

**Acceptance (the user judges, not you):**
1. Can a five-year-old tell girl from boy at tile size, and tell jumping from running?
2. Does each scene read as a picture of someone *doing* something?
3. Is a "big" dog clearly big, in the scene, without a label?

**Step 3:** Fix the shape of `scene.picture` here (the spike decides it; the seed scenes' `{ actor, pose, item, mood, scale, place }` is a starting guess) and extend the coverage test in `tests/pictures.test.js` so every key a scene recipe names must exist.

**Step 4: STOP.** Show the screenshot. If the user says no, do not push on: scale the game back (stage 1 and 2 only; fewer, simpler scenes) or stop. Do not switch to emoji. If yes, the budget is: 12 scenes for stage 1, 12 for stage 2, 12 for stage 3 (see Task 12). Commit the spike code only after approval.

---

### Task 7: Build integration, registration and a stub page

**Files:** Create `games/sentence-blocks/index.html` (stub), `games/sentence-blocks/js/main.js` (stub), `games/sentence-blocks/css/style.css` (empty for now). Modify `build.sh`, `hub.html`, `shared/shell.html`, `README.md`.

This task comes before the real page so the build can be proven early. The stub is as small as possible:

`js/main.js`: `const GAME_ID = 'sentence-blocks';` (one line, so the bundler has a last file).
`index.html`: copy `games/maths/index.html`'s `<head>`, `<body data-page="sentence-blocks" data-page-title="Sentence Blocks" data-paint="purple">` (or the D1 paint), the same three `<link>` tags (pointing at `../../shared/tokens.css`, `../../shared/shell.css`, `css/style.css`), an `<h1>Sentence Blocks</h1>` and `<script type="module" src="js/main.js"></script>`.

**Sprite:** add `<symbol id="m-sentence" viewBox="0 0 96 96">` to `shared/shell.html` next to the other `m-*` marks (the hub tile needs it). Design: three rounded blocks of different widths on two staggered lines (a sentence of blocks), line-art, stroke only, like `m-memory`. Check it at 96px and 48px.

**Step 1: `build.sh`.** Every one of these places must change (a missed one fails silently in the release zip):

1. Preflight loop (`for game in opposites maths memory-match`): add `sentence-blocks`.
2. New build block after Maths, a copy of the Maths block with `SB_` names. JS order: `js/engine.js js/words.js js/scenes.js js/pictures.js js/main.js` (dependencies first; `main.js` last). Output `docs/sentence-blocks.html`. Add every new temp variable (`SB_JS_TEMP`, `SB_CSS_TEMP`, `SB_JS_COMBINED`) to the `_cleanup` trap, which is defined earlier than the Maths block and lists its variables by name. Add sanity greps like Maths': `kg-shell`, and a string that only exists once the JS is inlined (`buildSceneRound`).
3. Summary `echo` list and the final `Test by opening` text.
4. `--release`: the `FILES=(...)` array **and** the `zip -r` line **and** the `(cd "$DOCS_DIR" ...)` call, all three, each get `sentence-blocks.html`.
5. Header comment ("Output: ...").

**Step 2: `hub.html`.** Add a fifth `<a class="mark" data-game="sentence-blocks" data-paint="purple">` (or the D1 paint) after Memory Match, with `#m-sentence`, the name "Sentence Blocks", and a one-line description a parent can trust: "Build sentences from colour blocks." No therapy words, no age claims in the tile.

**Step 3: `shared/shell.html` Games guide.** Add `<li><span>Sentence Blocks</span><span>Ages 4–8</span></li>`. (State the age band the user confirms in Task 10; Ages 4–8 is the proposal.)

**Step 4: `README.md`.** Add the game to the lines that list the built pages.

**Step 5: Prove it.**

```bash
bash build.sh
```

Expected: ends `=== Build Complete ===`; `docs/sentence-blocks.html` exists; `grep -c "^import " docs/sentence-blocks.html` prints `0`; `grep -c "^export " docs/sentence-blocks.html` prints `0`; no `[WARN]` or `[FAIL]` lines about Sentence Blocks. Open `docs/sentence-blocks.html` in Edge and confirm the shell bar shows, the stub heading appears and the console has no errors. Then `bash build.sh --release` and check the zip lists `sentence-blocks.html`. `git restore docs/` and `git clean -n docs/` to confirm only the intended new file is untracked, then delete `release/` output (it is gitignored).

**Step 6: Commit** `build: build and register Sentence Blocks (stub page)`.

---

### Task 8: The page: three screens, play and saved data

**Files:** Replace the stubs in `games/sentence-blocks/index.html`, `css/style.css` and `js/main.js`.

The shell hooks (body attributes, the three `<link>` tags, the module script tag) are already in the stub from Task 7; the build replaces the links and the script tag (see the Maths awk block in `build.sh`).

**Screens** (copy the structure of Memory Match's three stations; use the shared `kg-*` classes: `kg-screen`, `kg-wrap`, `kg-title kg-title--paint`, `kg-seg` and `kg-seg__opt` for choices, `kg-dock` and `kg-btn kg-btn--block` for the primary action, `kg-squares` for progress):

1. `#sb-settings`: title with the game mark; a "How to play" `kg-seg` with two options, **Describe the picture** (`data-mode="scene"`) and **Silly sentences** (`data-mode="silly"`); a "Stage" `kg-seg` with three options (`data-stage="1|2|3"`), each showing its slots as small coloured pills and, if locked, a lock glyph and `aria-disabled="true"`; the Play dock button.
2. `#sb-board`: HUD (five progress squares and a "Stop" icon button), `#sb-picture`, `<ol id="sb-slots">`, `<p id="sb-sentence">`, `<div id="sb-tray" role="group" aria-label="Word tiles">`, and a "Next" button that appears only once a sentence is finished.
3. `#sb-done`: a sentence-count message, `kg-squares`, and two buttons: Play again and Choose again. If a stage was newly unlocked, say so in words and with a shape.

**Top of `js/main.js`** (state in top-level bindings; the Playwright test reads them):

```js
// main.js — Sentence Blocks entry point: screens, input, saved data and sound.
import { SLOT_ORDER, TARGET_SENTENCES, STAGES, normaliseSave, unlockedStage, clampStage, recordSentence, pickScenes,
  buildSceneRound, buildSillyRound, tryPlace, helpTile, roundSentence, sentenceParts, tileOf, tileText } from './engine.js';
import { DATA } from './words.js';
import { SCENES } from './scenes.js';
import { pictureSvg, sceneSvg } from './pictures.js';

const GAME_ID = 'sentence-blocks';
const SLOT_LABEL = { describe: 'Describe', who: 'Who?', doing: 'What doing?', what: 'What?', where: 'Where?' };
const $ = (id) => document.getElementById(id);
const sfx = (n) => { if (window.KidsGames) window.KidsGames.sfx(n); };
const say = (t) => { if (window.KidsGames) window.KidsGames.say(t); };

let save = normaliseSave(null);   // this player's saved data
let session = null;               // { mode, stage, scenes, index, done, startUnlocked }
let round = null;                 // the sentence being built (see engine.js)
let held = null;                  // the tray tile the child has picked up: { slot, id }

function loadSaved() {
  save = normaliseSave(window.KidsGames && window.KidsGames.loadGameData(GAME_ID));
  save.stage = clampStage(save);
  renderSettings();
}
function persist() { if (window.KidsGames) window.KidsGames.saveGameData(GAME_ID, save); }
function showScreen(id) { for (const s of ['sb-settings', 'sb-board', 'sb-done']) $(s).hidden = s !== id; }
```

**Behaviour contract for the rest of `main.js`** (write these functions to exactly this contract; keep each under about 30 lines):

- Choosing a mode or a stage sets `save.mode` / `save.stage` and calls `persist()`, so the choice survives a reload.
- `renderSettings()`: set `aria-pressed` on the mode and stage buttons from `save`; mark stages above `unlockedStage(save)` `aria-disabled="true"` and ignore clicks on them; show `done[stage]` out of `UNLOCK_AT` as squares under each locked stage's neighbour.
- `startSession()`: `session = { mode: save.mode, stage: save.stage, scenes: save.mode === 'scene' ? pickScenes(SCENES, save.stage, TARGET_SENTENCES, save.recent) : [], index: 0, done: 0, startUnlocked: unlockedStage(save) }`. If a scene session has no scenes (a stage with no scenes yet), do not start: stay on settings and say so with `say()`.
- `nextRound()`: `round = save.mode === 'scene' ? buildSceneRound(DATA, session.scenes[session.index]) : buildSillyRound(DATA, session.stage)`; `held = null`; `renderBoard()`.
- `renderBoard()`: build the picture area (scene mode: `sceneSvg`; silly mode: the placed tiles' pictures side by side), the slot buttons in `round.slots` order, and the tray tiles. Slot button: `<button class="sb-slot sb-slot--${k}" data-slot="${k}">` containing the slot glyph, its label word, and (once filled) the tile's picture and text. Tray tile: `<button class="sb-tile sb-tile--${slot}" data-slot data-id aria-pressed="false">` with the picture, the `tileText`, and a small slot-glyph badge. A plural who tile (`t.plural`) draws its picture **twice**, side by side: the engine relies on that when it decides that "dog" and "dogs" look different (`lookOf`). All strings come from our own modules, so `innerHTML` is safe; never insert anything from storage.
- Tap flow: tapping a tray tile **picks it up** (toggle; `sfx('tap')`; `say('Picked up ' + text + '. Choose a slot.')`; move focus to the first empty slot). Tapping a slot **drops** the held tile there via `tryPlace`. If nothing is held, `say('Pick a tile first.')`.
- On `'ok'`: `sfx('match')`; call `renderPlaced()` (rebuild slot contents and set each tray tile `disabled` iff placed; in silly mode a replaced tile returns to the tray); `held = null`.
- On `'wrong-slot'` or `'wrong-tile'`: `sfx('mismatch')`; add `is-bounce` for 400ms **and** show a cross glyph on the tile (shape, not only motion or colour); `held = null`. Wrong tiles never stay in a slot. After `helpTile(round, slot)` returns an id, give that tray tile `is-help` (a thicker keyline pulse; no colour change).
- When `round.complete` first becomes true: show `sentenceParts(...)` as `<span class="sb-w sb-w--${slot||'join'}">` chips in `#sb-sentence`, `say(roundSentence(DATA, round))`, count it once (`if (!round.counted)`): `save = recordSentence(save, round); session.done++; persist()`. Set `round.counted = true` so it is counted once. In silly mode the child may still swap a tile afterwards: redraw the chips and `say()` the new sentence, without counting again. Reveal the Next button (labelled Finish on the last sentence). **Nothing advances by itself**: the design system says nothing moves unless the child did something.
- Next: if `session.done >= TARGET_SENTENCES`, `finishSession()`, else advance `session.index` and `nextRound()`.
- `finishSession()`: `window.KidsGames.recordSession(GAME_ID)` (one hopscotch square); show `#sb-done`; mention a newly opened stage by comparing `unlockedStage(save)` with `session.startUnlocked`.
- Stop button: back to settings. A stopped session does not paint a square, but sentences already finished still count towards unlocking.
- `window.KidsGames.onPlayerChange(...)`: if settings is visible, `loadSaved()`.
- Keyboard: tiles and slots are real `<button>`s. Enter/Space does what a tap does. After a tile is picked up, focus moves to the first empty slot; after a drop, focus returns to the next tile.

**Verify (the page now plays with text-only tiles; pictures show the ugly placeholder, which is correct until Task 11):**

```bash
bash build.sh
(cd games/sentence-blocks/tests && node --test ./*.test.js)
```

Open `docs/sentence-blocks.html` in Edge. Play five sentences of each mode on stage 1 with the seed words; confirm stage 2 opens after five finished describe-the-picture sentences, a reload keeps the choices, and the console has no errors. `git restore docs/`. Commit `feat(sentence-blocks): page, screens and play`.

---

### Task 9: Hub layout for five games

**Files:** Modify `hub.html` (the `<style>` block and the `render()` script).

The hub grid assumes one lead plus three others at every breakpoint. Five games needs a deliberate layout; do not just add a fourth row.

| Breakpoint | Today | Five games |
|---|---|---|
| Landscape tablet and laptop | lead spans 3 rows (left), 3 rows (right) | lead spans 4 rows (left), 4 rows (right) |
| Portrait | lead across the top; 3 across below | lead across the top; 2x2 below |
| Phone | lead then 3 rows | lead then 4 rows |
| Short landscape phone | 1.5fr + 3 columns | 1.5fr + 4 columns |

Change every `repeat(3, ...)`, `1 / span 3`, `grid-template-rows` and `grid-template-columns` that depends on the game count. Prefer one `--others: 4` custom property on `.plan` and use `repeat(var(--others), ...)` so the next game is not another rewrite. Also revisit the `.mark:not(.mark--lead) .mk-wrap { max-width: 128px }` and font sizes at the new, shorter row heights.

**Verify by looking, not by reasoning:** screenshot the hub at 1280x800, 1024x768, 768x1024, 390x844 and 844x390, in Day and Dusk, for a 4-5 player and a 6+ player, and check that no tile is clipped, every tile target is at least 72px for the young bracket and 56px otherwise, and the keyboard icon on Type Trainer still shows. Run with Playwright, save the images in the scratchpad, and show the user at least the first, third and fifth.

Also check the lead logic at the bottom of the script: `lead = ... 'memory-match' : 'maths'` still points at real games, and `last` can be `'sentence-blocks'`.

Commit `feat(hub): five-game layout`.

---

### Task 10: Words (STOP after each batch)

**Files:** Modify `games/sentence-blocks/js/words.js`.

Replace the seed with the full set in four batches, **showing each batch to the user and waiting before the next** (the user reviews content themselves). Show the batch as a table of the exact `tileText` the child will see plus its tags.

| Batch | Contents |
|---|---|
| A | Who: the boy, girl, baby, dog, cat, horse, rabbit, Mum, Dad, plus the plurals the user wants (the dogs, the boys, the girls). Every who has a `kind` (`animal`, `child`, `baby`, `adult`); the baby is kind `baby`, and `baby` appears in a doing word's `actors` only where it makes sense. Plural tiles are drawn twice, so they need no separate picture. Describe: big/small, happy/sad, tired/scared with their opposites (`tired`/`scared` need partners, e.g. tired/awake; do not ship a describing word without an opposite whose picture is unambiguous) |
| B | Doing, intransitive: jumping, sleeping, running, swimming, crying, climbing, sitting, standing, walking |
| C | Doing, transitive: eating, drinking, reading, riding, kicking, throwing, pushing, painting, washing, brushing; What for each, with `tags` and `det` |
| D | Where: park, garden, beach, house, kitchen, bed, pool, school, shop; assign `group` to look-alikes |

Rules for every batch:
- Every tile has the fields `validateData` requires. Run the tests after each edit; the validator catches `a`/`an`, plural agreement, a missing opposite, a scene left without enough wrong tiles, and impossible combinations.
- `Mum` and `Dad` are `named: true` and never describable.
- Each `doing` lists `actors` (which of `animal`, `child`, `adult` can do it) and `wheres`; each transitive one lists `takes` tags that its `what` tiles carry.
- Mark visually confusable tiles with the same `group` (park/garden/field; walking/running if the drawings end up looking alike, which only the Task 11 review can tell).
- UK spelling and vocabulary; words a five-year-old knows.

After each batch: `(cd games/sentence-blocks/tests && node --test ./*.test.js)` passes; commit `content(sentence-blocks): words batch X`.

---

### Task 11: Pictures, by batch (STOP after each batch)

**Files:** Modify `games/sentence-blocks/js/pictures.js`.

Draw, in this order (hardest first, so a failure shows up early): **A** doing pictures (a neutral figure mid-action, using the spike's figure system), **B** who pictures, **C** what pictures, **D** where pictures and describing-word pictures (size pairs shown against a reference, faces for happy/sad), **E** the five slot glyphs, redrawn properly.

After each batch: run `node games/sentence-blocks/tests/contact-sheet.mjs <scratch>/sheet.html <scratch>/sheet.png` with `PLAYWRIGHT_CORE` set, show the PNG, and wait for approval. Review checks for the user:
- Can each be told apart from its tray neighbours at 72px?
- Does a Day-theme tile still read? Check the keyline, not the fill.
- Do the people read as people without a mascot or a branded character?

When batch E is approved, remove `{ todo: ... }` from the coverage test in `tests/pictures.test.js` so missing pictures fail the build from then on. Run the tests. Commit per batch: `art(sentence-blocks): pictures batch X`.

---

### Task 12: Scenes (STOP after each stage)

**Files:** Modify `games/sentence-blocks/js/scenes.js`.

Write 12 scenes per stage (36 total), stage by stage, showing each stage's scenes **rendered** (contact sheet with scene pictures) for the user to approve. The validator already checks that a scene's who can do the doing, the what fits, the where fits, the frame is a real one for its stage, and the sentence composes. It cannot check that the picture is unambiguous, so the user's review is the control.

Rules:
- Stage 1 uses only intransitive doing tiles; stage 2 only transitive ones; stage 3 uses describe and where together, and alternates the two frames.
- Spread the cast: no more than three scenes with the same who in a stage.
- A plural who draws the actor twice and is used only in a scene whose sentence still reads naturally ("The dogs are running", not "The dogs are eating a carrot", which sounds like they share one).
- At least `RECENT_KEEP + TARGET_SENTENCES` (10) scenes per stage, or a session cannot avoid the scenes just played.
- A scene's picture must make exactly one tile true in every slot. Where a wrong tile could also be true (two similar places, two similar verbs), put them in one `group` so they are never offered together; if that leaves too few wrong tiles the validator says `not enough wrong tiles for <slot>`.

When all three stages are written, remove `{ todo: 'enable after Task 12' }` from the "enough scenes to avoid the last session" test in `tests/engine.test.js` and run the tests. Commit per stage: `content(sentence-blocks): stage N scenes`.

---

### Task 13: Layout, themes, motion and touch

**Files:** Modify `css/style.css`.

Acceptance, checked by screenshot and by Task 15's layout assertions:
1. **Targets:** tray tiles and slots are at least `var(--hit)` (72px young, 56px older) in both dimensions; gaps at least `var(--gap-tile)`.
2. **Fit:** with the largest tray (stage 3, five slots, two tiles per slot = 10 tiles) the slots, picture and tray are all visible without scrolling at 360x640 and 390x844, and the layout wraps rather than overflows at 768x1024 in both orientations. No horizontal page scroll anywhere.
3. **Slot code:** slot colours come from tokens (`--paint-orange` etc. with their `--on-*` text colours), every slot, tile and sentence chip has the 3px `--line` keyline, and each slot also shows its glyph and its word. A colour-blind child can complete a round by glyph and word alone: check this by taking a screenshot with `filter: grayscale(1)` applied to `html` and playing one round by reading the screenshot.
4. **Themes:** Day and Dusk both pass the contrast figures in Task 1; Dusk uses ink text on every paint.
5. **Motion:** only the held-tile lift, the bounce, and the landing. All durations use the `--dur-*` tokens, which already collapse under `prefers-reduced-motion`. Nothing moves on its own.
6. **Touch:** `touch-action: manipulation` on tiles and slots; no hover-only information; pressing a tile gives visible `:active` feedback.
7. **Right/wrong:** wrong is a cross shape plus the bounce; a locked right tile shows a tick shape. No red/green fills carrying meaning alone.

Commit `style(sentence-blocks): layout, themes and touch`.

---

### Task 14: Drag-and-drop (OPTIONAL: ask the user first)

Tap-then-tap already works on touch and keyboard. Drag adds pointer-event handling, scroll conflicts and a second code path to test. Only build it if the user wants it after playing the tap version. If so: use Pointer Events with `setPointerCapture`, `touch-action: none` on tiles only, reuse the same `tryPlace` path as a tap on the slot under the pointer, and never make drag the only way. Add Playwright cases for drag (mouse) and keep every keyboard and tap test green.

---

### Task 15: Built-page proof (Playwright)

**Files:** Create `games/sentence-blocks/tests/play-test.mjs`.

Header comment and setup copy `games/memory-match/tests/play-test.mjs` (the `open(age, ...)` helper seeds `kidsgames_players` and `kidsgames_activePlayer` through `addInitScript`; uses `channel: 'msedge'`; reads `PAGE` and `PLAYWRIGHT_CORE`). Read expected data from the **source** modules (`import { DATA } from '../js/words.js'`, `SCENES`, and the engine's `composeSentence`), not from the page, so the test also proves the embedded copy matches.

Assertions (each failing message names the stage, mode and age):

1. **Describe mode, every stage, every scene.** For each scene, force it into the round (set `session.scenes` through `page.evaluate`, then call `nextRound()`), place each right tile by clicking the tile then the slot, and assert that the sentence shown in `#sb-sentence` equals `composeSentence` for that scene, character for character. No sentence appears before the last slot is filled.
2. **Wrong tiles.** For each slot of each scene, click every wrong tile and the right tile into the wrong slot; assert nothing is placed, the cross shape appears, and the right tile still locks in afterwards. After 3 wrong tiles on one slot, assert `.is-help` is on exactly the right tile and on no other.
3. **Silly mode.** At every stage, 100 rounds with random tile choices: every finished sentence matches the grammar regex used in `engine.test.js`; swapping a tile after placing replaces it.
4. **Unlocking.** A fresh player sees stages 2 and 3 disabled; five finished stage-1 describe sentences open stage 2 (and not stage 3); silly sentences never count; five finished stage-2 sentences open stage 3.
5. **Sessions.** A session ends after 5 finished sentences, paints exactly one hopscotch square (`kidsgames_progress_<name>` increments by 1), and shows the done screen; Stop mid-session paints none but keeps the unlock count.
6. **Saved data.** Mode and stage persist per player across a reload; two players do not share data; deliberately corrupt JSON in `kidsgames_sentence-blocks_<name>` (and `null`, a number, a wrong version) and assert the game opens on stage 1 without errors.
7. **Keyboard only.** Complete a full round using Tab, Enter and Space only.
8. **Layout.** At 360x640, 390x844, 768x1024 and 1024x768, in Day and Dusk, for ages 4-5 and 6+: no horizontal scroll, every tray tile and slot is at least 72px (young) or 56px (older), the slots and the tray are inside the viewport without scrolling for the largest tray, and the answer is never printed on the page before the child answers.
9. **Clean console.** No `pageerror` and no console errors across all of the above.
10. **Hub.** The hub shows five tiles, the Sentence Blocks tile links to `sentence-blocks.html`, and after a session the tile has one painted square.

Run:

```bash
bash build.sh
PLAYWRIGHT_CORE=<playwright-core index.mjs> node games/sentence-blocks/tests/play-test.mjs
```

Expected: ends with a pass line and an assertion count, and exits 0. A test that cannot fail proves nothing: after it passes, temporarily break the engine (for example make `tryPlace` accept wrong tiles) and confirm the Playwright test goes red, then revert.

Commit `test(sentence-blocks): built-page proof`.

---

### Task 16: Documentation

**Files:** Modify `DESIGN.md`, `PRODUCT.md`, `README.md`, `design/roadmap.md`.

- `DESIGN.md`: add the purple paint to Colors if D1 says so; add a named rule **"The Slot Code Rule"**: in Sentence Blocks the five slot colours are the game's meaning and are allowed together on one screen; each always has a keyline, a glyph and a word, and right/wrong cues are shapes. Add the game's mark to the Overview's list of markings.
- `PRODUCT.md`: add Sentence Blocks to Product Purpose and Live games.
- `README.md`: a game section: what it is, the two modes, the stages, and the plain statement that it is a practice game and not therapy.
- `design/roadmap.md`: add it under Literacy with an honest score note.

Commit `docs: Sentence Blocks`.

---

### Task 17: Verification, rebuild and pull request

**Step 1: Fresh evidence (superpowers:verification-before-completion).**

```bash
bash build.sh
(cd games/maths/tests && node --test ./*.test.js)
(cd games/sentence-blocks/tests && node --test ./*.test.js)
PLAYWRIGHT_CORE=<path> node games/sentence-blocks/tests/play-test.mjs
PLAYWRIGHT_CORE=<path> node games/memory-match/tests/play-test.mjs
PLAYWRIGHT_CORE=<path> node games/maths/tests/play-test.mjs
PLAYWRIGHT_CORE=<path> node games/opposites/tests/play-test.mjs
```

Also confirm no deferred check was forgotten: `grep -rn "todo:" games/sentence-blocks/tests` must print nothing (the picture-coverage and scene-count checks start as `todo` and are switched on in Tasks 11 and 12; nothing else enforces that).

Expected: every command exits 0. The three other games' tests prove the hub, shell and `tokens.css` changes broke nothing. Play each mode on a real phone-sized and a tablet-sized window.

**Step 2:** `git add docs/ && git commit -m "build: rebuild docs with Sentence Blocks"` (the only commit that contains `docs/` changes).

**Step 3:** Push and open a PR. Description: what it is, the honest limit on learning benefit, what was reviewed by the user (words, pictures, scenes), test evidence, and the design-system exception. End with the attribution line from the session reminder.

**Step 4: Play-test with the children (the user runs this; the plan cannot).** Agree with the user what counts as success before shipping, for example: both children finish a stage-1 session without help, they ask to play again, and nothing frustrates them. Record what happened in the PR. If it falls flat, that is a result, not a failure of the plan: the code is cheap to keep and the art can be reused (Memory Match could use the drawings).

**Step 5:** If Opposites (PR #13) merged first, `docs/` will conflict: rebuild, do not hand-merge (see rule 3). Then superpowers:finishing-a-development-branch.

---

## Execution handoff

Two options: **Subagent-driven** (this session, a fresh subagent per task with review between tasks) or **a parallel session** using superpowers:executing-plans. Either way Tasks 1, 6, 10, 11, 12 and 14 stop for the user.
