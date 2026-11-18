import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, LEVEL_IDS, ROUND_LENGTH, NOT_BIGGER_MIN, MAX_ITEM_USES, pairsFor, buildGuessSession, clearlyDearer, notBigger } from '../js/engine.js';
import { ITEMS } from '../js/items.js';

const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const SEEDS = 3000;

describe('pairsFor', () => {
  it('only gives pairs whose price ranges do not overlap and that are far enough apart', () => {
    for (const level of LEVEL_IDS) for (const { dear, cheap } of pairsFor(ITEMS, level)) {
      assert.ok(dear.lo > cheap.hi, level + ': ' + dear.id + ' vs ' + cheap.id);
      assert.ok(dear.pence >= cheap.pence * LEVELS[level].ratio);
    }
  });
  it('never pairs two items of one group', () => {
    for (const level of LEVEL_IDS) for (const { dear, cheap } of pairsFor(ITEMS, level)) assert.ok(!(dear.group && dear.group === cheap.group));
  });
  it('has plenty of pairs where the bigger one does not win', () => {
    for (const level of LEVEL_IDS) {
      const ps = pairsFor(ITEMS, level), nb = ps.filter((p) => notBigger(p.dear, p.cheap));
      console.log('   ' + level + ': ' + ps.length + ' pairs, ' + nb.length + ' where the dearer is not bigger');
      assert.ok(nb.length >= 40, level + ' has only ' + nb.length);
    }
  });
});

describe('buildGuessSession: audit over ' + SEEDS + ' seeds per level', () => {
  for (const level of LEVEL_IDS) it(level, () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const s = buildGuessSession(ITEMS, level, rng(seed));
      const why = level + ' seed ' + seed;
      assert.equal(s.length, ROUND_LENGTH, why);
      const uses = {}, pairs = new Set();
      let nb = 0, left = 0;
      for (const q of s) {
        const dear = q.left.id === q.dearId ? q.left : q.right, cheap = dear === q.left ? q.right : q.left;
        assert.ok(clearlyDearer(dear, cheap, LEVELS[level].ratio), why);
        assert.ok(dear.tier <= LEVELS[level].maxTier && cheap.tier <= LEVELS[level].maxTier, why);
        if (notBigger(dear, cheap)) nb++;
        if (q.left.id === q.dearId) left++;
        for (const i of [dear, cheap]) uses[i.id] = (uses[i.id] || 0) + 1;
        const key = [dear.id, cheap.id].sort().join('|'); assert.ok(!pairs.has(key), why + ' repeated pair'); pairs.add(key);
      }
      assert.ok(nb >= NOT_BIGGER_MIN, why + ': only ' + nb + ' not-bigger questions');
      assert.equal(left, ROUND_LENGTH / 2, why + ': dearer on the left ' + left + ' times');
      assert.ok(Math.max(...Object.values(uses)) <= MAX_ITEM_USES, why + ' item used too often');
    }
  });
  it('is deterministic for a seed', () => {
    assert.deepEqual(buildGuessSession(ITEMS, 'medium', rng(7)), buildGuessSession(ITEMS, 'medium', rng(7)));
  });
  it('brings missed items back, at most three, when a pair exists', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = buildGuessSession(ITEMS, 'easy', rng(seed), ['house', 'sweets', 'phone', 'bike']);
      const ids = new Set(s.flatMap((q) => [q.left.id, q.right.id]));
      assert.ok(['house', 'sweets', 'phone'].every((m) => ids.has(m)), 'seed ' + seed + ' lost a missed item');
    }
  });
});
