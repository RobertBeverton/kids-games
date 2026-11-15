import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HELP_LEVELS, STORY_LENGTHS, STAGES, SILLY_CHOICES, SLOT_ORDER, bankFor, lookOf, hasPic, storyHeading, canEndEarly, buildStoryRound,
  buildSceneRound, buildSillyRound, normaliseSave, recordSentence, tryPlace, roundSentence, poolFor, validateData, tileOf,
} from '../js/engine.js';
import { DATA } from '../js/words.js';
import { SCENES } from '../js/scenes.js';

// Same shape as engine.test.js, widened to allow a two-word "what" (ice cream) and more place words.
const SENTENCE = /^[A-Z][a-z]*( [a-z]+)* (is|are) [a-z]+( (a|an) [a-z]+( [a-z]+)?| [a-z]+)?( (in|on|at) (the |a )?[a-z]+)?.$/;
const many = (n, fn) => { for (let i = 0; i < n; i++) fn(i); };
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

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
    many(200, (i) => { if (buildSillyRound(bankFor(data, 'words', 'silly'), 1, rng(i)).tray.some((x) => x.id === 'queen')) seen = true; });
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
