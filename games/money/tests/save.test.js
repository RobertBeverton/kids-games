import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITIES, SAVE_VERSION, LEVEL_IDS, ROUND_LENGTH, MAX_COME_BACK, normaliseSave, defaultsFor, recordMisses, comeBackIds, recordBest, buildSession } from '../js/engine.js';
import { ITEMS } from '../js/items.js';

const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const IDS = ITEMS.map((i) => i.id);
const FRESH = { v: SAVE_VERSION, activity: 'guess', level: 'easy', misses: {}, recent: [], best: { easy: 0, medium: 0, hard: 0 } };

describe('constants', () => {
  it('has five activities', () => { assert.deepEqual(ACTIVITIES, ['guess', 'sort', 'buy', 'howmany', 'price']); assert.equal(SAVE_VERSION, 1); });
});

describe('defaultsFor', () => {
  it('uses player.age, which beats the bracket', () => {
    assert.deepEqual(defaultsFor({ age: 5 }), { activity: 'guess', level: 'easy' });
    assert.deepEqual(defaultsFor({ age: 6 }), { activity: 'guess', level: 'easy' });
    assert.deepEqual(defaultsFor({ age: 7 }), { activity: 'sort', level: 'medium' });
    assert.deepEqual(defaultsFor({ age: 8 }), { activity: 'sort', level: 'medium' });
    assert.deepEqual(defaultsFor({ age: 9 }), { activity: 'buy', level: 'hard' });
    assert.deepEqual(defaultsFor({ age: 40 }), { activity: 'buy', level: 'hard' });
    assert.deepEqual(defaultsFor({ age: 5, ageBracket: '13+' }), { activity: 'guess', level: 'easy' });
  });
  it('falls back to the bracket map', () => {
    assert.deepEqual(defaultsFor({ ageBracket: '4-5' }), { activity: 'guess', level: 'easy' });
    assert.deepEqual(defaultsFor({ ageBracket: '6-8' }), { activity: 'sort', level: 'medium' });
    assert.deepEqual(defaultsFor({ ageBracket: '9-12' }), { activity: 'buy', level: 'hard' });
    assert.deepEqual(defaultsFor({ ageBracket: '13+' }), { activity: 'buy', level: 'hard' });
  });
  it('no player is guess and easy; never "price"', () => {
    assert.deepEqual(defaultsFor(null), { activity: 'guess', level: 'easy' });
    assert.deepEqual(defaultsFor(undefined), { activity: 'guess', level: 'easy' });
    for (let age = 0; age < 100; age++) assert.notEqual(defaultsFor({ age }).activity, 'price');
  });
});

describe('normaliseSave', () => {
  it('garbage gives the defaults and never throws', () => {
    for (const g of [undefined, null, 0, 7, NaN, '', 'save', true, [], [1, 2], () => 1, { activity: 5, level: [], misses: 'x', recent: 'y', best: 3 },
      { activity: 'dance', level: 'impossible' }, { misses: [1, 2], recent: { a: 1 }, best: [] }, { misses: { sweets: 'lots', bike: -1, house: 1.5, tent: NaN }, recent: [1, null, {}, 'sweets'], best: { easy: 'x', medium: null, hard: NaN } }]) {
      const s = normaliseSave(g, IDS);
      assert.equal(s.v, SAVE_VERSION);
      assert.equal(s.activity, 'guess'); assert.equal(s.level, 'easy');
      assert.deepEqual(s.best, { easy: 0, medium: 0, hard: 0 });
      assert.deepEqual(s.misses, {});
      assert.ok(Array.isArray(s.recent));
    }
    assert.deepEqual(normaliseSave(undefined, IDS), FRESH);
    assert.doesNotThrow(() => normaliseSave({ recent: ['sweets'] }, undefined));
    assert.deepEqual(normaliseSave({ recent: ['sweets'] }, null).recent, []);
  });
  it('keeps good data', () => {
    const s = normaliseSave({ v: 1, activity: 'howmany', level: 'hard', misses: { sweets: 2, bike: 1 }, recent: ['bike', 'sweets'], best: { easy: 12, medium: 0, hard: 30 } }, IDS);
    assert.deepEqual(s, { v: 1, activity: 'howmany', level: 'hard', misses: { sweets: 2, bike: 1 }, recent: ['bike', 'sweets'], best: { easy: 12, medium: 0, hard: 30 } });
  });
  it('drops unknown item ids (an item removed from the list does not linger)', () => {
    const s = normaliseSave({ misses: { sweets: 1, 'gone-item': 4 }, recent: ['gone-item', 'sweets', 'sweets', 'also-gone'] }, IDS);
    assert.deepEqual(s.misses, { sweets: 1 });
    assert.deepEqual(s.recent, ['sweets']);
  });
  it('caps and clamps: recent at 12, best 0..30', () => {
    const s = normaliseSave({ recent: IDS, best: { easy: 99, medium: -5, hard: 17.4 } }, IDS);
    assert.equal(s.recent.length, 12);
    assert.deepEqual(s.best, { easy: 30, medium: 0, hard: 17 });
  });
  it('does not alias the input', () => {
    const raw = { misses: { sweets: 1 }, recent: ['sweets'], best: { easy: 3, medium: 0, hard: 0 } };
    const s = normaliseSave(raw, IDS);
    s.misses.bike = 1; s.recent.push('bike'); s.best.easy = 9;
    assert.deepEqual(raw, { misses: { sweets: 1 }, recent: ['sweets'], best: { easy: 3, medium: 0, hard: 0 } });
  });
});

describe('recordMisses', () => {
  it('never mutates its input', () => {
    const before = JSON.stringify(FRESH);
    const out = recordMisses(FRESH, ['sweets', 'bike']);
    assert.equal(JSON.stringify(FRESH), before);
    assert.notEqual(out, FRESH);
    const again = recordMisses(out, ['house']);
    assert.deepEqual(out.recent, ['bike', 'sweets']);
    assert.deepEqual(again.recent, ['house', 'bike', 'sweets']);
  });
  it('counts misses and keeps the newest first and unique', () => {
    let s = recordMisses(FRESH, ['sweets']);
    s = recordMisses(s, ['bike', 'sweets']);
    assert.equal(s.misses.sweets, 2); assert.equal(s.misses.bike, 1);
    assert.deepEqual(s.recent, ['sweets', 'bike']);
    assert.equal(new Set(s.recent).size, s.recent.length);
  });
  it('caps recent at 12', () => {
    let s = FRESH;
    for (const id of IDS) s = recordMisses(s, [id]);
    assert.equal(s.recent.length, 12);
    assert.equal(s.recent[0], IDS[IDS.length - 1]);
    assert.equal(new Set(s.recent).size, 12);
    assert.equal(s.misses[IDS[0]], 1);
    s = recordMisses(s, IDS.slice(0, 20));
    assert.equal(s.recent.length, 12); assert.equal(new Set(s.recent).size, 12);
  });
  it('keeps the rest of the save', () => {
    const s = recordMisses({ ...FRESH, activity: 'buy', level: 'hard', best: { easy: 5, medium: 6, hard: 7 } }, ['sweets']);
    assert.equal(s.activity, 'buy'); assert.equal(s.level, 'hard'); assert.deepEqual(s.best, { easy: 5, medium: 6, hard: 7 });
  });
});

describe('comeBackIds', () => {
  it('returns at most MAX_COME_BACK ids from recent, newest first, only valid ones', () => {
    assert.equal(MAX_COME_BACK, 3);
    const s = { ...FRESH, recent: ['a1', 'sweets', 'bike', 'house', 'tent', 'phone'] };
    assert.deepEqual(comeBackIds(s, IDS), ['sweets', 'bike', 'house']);
    assert.deepEqual(comeBackIds(FRESH, IDS), []);
    assert.ok(comeBackIds({ ...FRESH, recent: IDS.slice(0, 12) }, IDS).length <= 3);
  });
});

describe('recordBest', () => {
  it('never lowers a best, and returns a new save', () => {
    let s = recordBest(FRESH, 'easy', 20);
    assert.equal(s.best.easy, 20); assert.equal(FRESH.best.easy, 0);
    s = recordBest(s, 'easy', 12); assert.equal(s.best.easy, 20);
    s = recordBest(s, 'easy', 25); assert.equal(s.best.easy, 25);
    assert.deepEqual(s.best, { easy: 25, medium: 0, hard: 0 });
  });
  it('clamps nonsense and ignores unknown levels', () => {
    assert.equal(recordBest(FRESH, 'hard', 500).best.hard, 30);
    assert.equal(recordBest(FRESH, 'hard', -4).best.hard, 0);
    assert.equal(recordBest(FRESH, 'hard', NaN).best.hard, 0);
    assert.equal(recordBest(FRESH, 'hard', 'lots').best.hard, 0);
    assert.deepEqual(recordBest(FRESH, 'nope', 10).best, FRESH.best);
  });
});

describe('buildSession', () => {
  it('builds all five activities at all three levels, 200 seeds each', () => {
    for (const activity of ACTIVITIES) for (const level of LEVEL_IDS) for (let seed = 1; seed <= 200; seed++) {
      const s = buildSession(activity, level, ITEMS, rng(seed), FRESH);
      assert.equal(s.length, ROUND_LENGTH, activity + ' ' + level + ' ' + seed);
    }
  });
  it('passes the come-back list to the builder', () => {
    const save = { ...FRESH, recent: ['football', 'phone', 'trainers'] };
    for (const activity of ['howmany', 'price']) for (let seed = 1; seed <= 100; seed++) {
      const s = buildSession(activity, 'hard', ITEMS, rng(seed), save);
      const ids = s.map((q) => q.item.id);
      for (const id of save.recent) assert.ok(ids.includes(id), activity + ' ' + seed + ' ' + id);
    }
    const g = buildSession('guess', 'hard', ITEMS, rng(1), save);
    assert.ok(g.some((q) => [q.left.id, q.right.id].includes('football')));
  });
  it('works without a save and rejects an unknown activity', () => {
    assert.equal(buildSession('guess', 'easy', ITEMS, rng(1)).length, ROUND_LENGTH);
    assert.throws(() => buildSession('dance', 'easy', ITEMS, rng(1), FRESH));
  });
});
