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
const SENTENCE = /^[A-Z][a-z]*( [a-z]+)* (is|are) [a-z]+( (a|an) [a-z]+| [a-z]+)?( (in|on|at) (the )?[a-z]+)?\.$/;

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
