import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_IDS, ROUND_LENGTH, MAX_COME_BACK, HOWMANY_CAP, HOWMANY_MIN, HOWMANY_BIG, HOWMANY_BIG_MIN, howManyPool, buildHowManySession } from '../js/engine.js';
import { ITEMS } from '../js/items.js';

const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const SEEDS = 3000;

describe('feasibility on the real list', () => {
  for (const level of LEVEL_IDS) it(level, () => {
    const pool = howManyPool(ITEMS, level), big = pool.filter((i) => i.pence / 100 >= HOWMANY_BIG).length;
    console.log('   ' + level + ': ' + pool.length + ' items, ' + big + ' with a count of ' + HOWMANY_BIG + ' or more');
    assert.ok(pool.length >= ROUND_LENGTH, level + ': ten different items');
    assert.ok(big >= HOWMANY_BIG_MIN, level + ': enough big counts');
    for (const i of pool) { assert.equal(i.pence % 100, 0); assert.ok(i.pence >= HOWMANY_MIN && i.pence <= HOWMANY_CAP[level]); }
  });
});

describe('buildHowManySession: audit over ' + SEEDS + ' seeds per level', () => {
  for (const level of LEVEL_IDS) it(level, () => {
    const pos = [0, 0, 0], rank = [0, 0, 0]; let n = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const s = buildHowManySession(ITEMS, level, rng(seed)), why = level + ' seed ' + seed;
      assert.equal(s.length, ROUND_LENGTH, why);
      assert.equal(new Set(s.map((q) => q.item.id)).size, ROUND_LENGTH, why + ': different items');
      const at = [0, 0, 0];
      for (const q of s) {
        assert.equal(q.options.length, 3, why);
        assert.equal(new Set(q.options).size, 3, why + ': options distinct');
        assert.equal(q.correctCount, q.item.pence / 100, why);
        assert.ok(q.item.pence <= HOWMANY_CAP[level] && q.item.pence >= HOWMANY_MIN && q.item.pence % 100 === 0, why + ': item');
        for (const o of q.options) assert.ok(Number.isInteger(o) && o >= 1, why + ': count ' + o);
        const sorted = [...q.options].sort((a, b) => a - b);
        for (const w of q.options) if (w !== q.correctCount) {
          const f = Math.max(w, q.correctCount) / Math.min(w, q.correctCount);
          assert.ok(f === 10 || f === 100, why + ': factor ' + f);
        }
        const sp = q.options.indexOf(q.correctCount);
        at[sp]++; pos[sp]++;
        rank[sorted.indexOf(q.correctCount)]++; n++;
      }
      for (const c of at) assert.ok(c === 3 || c === 4, why + ': positions ' + at);
      assert.ok(s.filter((q) => q.correctCount >= HOWMANY_BIG).length >= HOWMANY_BIG_MIN, why + ': big counts');
    }
    const pct = (a) => a.map((c) => (100 * c / n).toFixed(1) + '%').join(' ');
    console.log('   ' + level + ' position shares: ' + pct(pos) + '; rank low/mid/high: ' + pct(rank));
    for (const r of rank) assert.ok(r / n >= 0.15 && r / n <= 0.55, level + ' rank share ' + r / n);
  });
  it('is deterministic for a seed', () => assert.deepEqual(buildHowManySession(ITEMS, 'hard', rng(9)), buildHowManySession(ITEMS, 'hard', rng(9))));
  it('missed items come back (at most MAX_COME_BACK), unusable ids are ignored', () => {
    for (const level of LEVEL_IDS) for (let seed = 1; seed <= 500; seed++) {
      const want = howManyPool(ITEMS, level).slice(0, 5).map((i) => i.id);
      const ids = buildHowManySession(ITEMS, level, rng(seed), want).map((q) => q.item.id);
      assert.ok(want.slice(0, MAX_COME_BACK).every((id) => ids.includes(id)), level + ' seed ' + seed);
      const s = buildHowManySession(ITEMS, level, rng(seed), ['sweets', 'nonsense', want[0]]);
      assert.equal(s.length, ROUND_LENGTH);
      assert.ok(!s.some((q) => q.item.id === 'sweets'));
      assert.ok(s.some((q) => q.item.id === want[0]));
    }
  });
});
