import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_IDS, ROUND_LENGTH, MAX_COME_BACK, MAX_ITEM_USES, BUY, BUY_SIZE_DEFEAT_MIN, buyable, tooDear, buildBuySession, gradeBuy } from '../js/engine.js';
import { ITEMS } from '../js/items.js';

const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const SEEDS = 3000;
// The "biggest looks dearest" shortcut: buy everything smaller than the biggest thing on the shelf, skip the biggest.
// A question defeats the shortcut when the true answer differs from that guess.
const sizeGuess = (shelf) => { const m = Math.max(...shelf.map((i) => i.size)); return shelf.filter((i) => i.size < m).map((i) => i.id).sort(); };
const defeatsSize = (q) => JSON.stringify(sizeGuess(q.shelf)) !== JSON.stringify([...q.buyIds].sort());
// Easy has only two budgets, so ten questions need five of each; otherwise a budget is used at most four times.
const maxBudgetUses = (level) => Math.max(4, Math.ceil(ROUND_LENGTH / BUY[level].budgets.length));

describe('coverage on the real list', () => {
  it('every budget has at least 1 buyable and 2 too-dear items', () => {
    for (const level of LEVEL_IDS) for (const budget of BUY[level].budgets) {
      const pool = ITEMS.filter((i) => i.tier <= BUY[level].maxTier);
      const b = pool.filter((i) => buyable(i, level, budget)).length, d = pool.filter((i) => tooDear(i, level, budget)).length;
      console.log('   ' + level + ' ' + budget + 'p: ' + b + ' buyable, ' + d + ' too dear');
      assert.ok(b >= 1, level + ' ' + budget + ': nothing to buy');
      assert.ok(d >= 2, level + ' ' + budget + ': only ' + d + ' too dear');
    }
  });
});

describe('buildBuySession: audit over ' + SEEDS + ' seeds per level', () => {
  for (const level of LEVEL_IDS) it(level, () => {
    const cfg = BUY[level];
    let defeated = 0, total = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const s = buildBuySession(ITEMS, level, rng(seed));
      const why = level + ' seed ' + seed;
      assert.equal(s.length, ROUND_LENGTH, why);
      const budgetUses = {}, uses = {};
      let defeat = 0;
      for (const q of s) {
        assert.ok(cfg.budgets.includes(q.budget), why + ': budget');
        assert.equal(q.shelf.length, cfg.shelf, why + ': shelf size');
        assert.equal(new Set(q.shelf.map((i) => i.id)).size, cfg.shelf, why + ': item twice on a shelf');
        for (const i of q.shelf) {
          assert.ok(i.tier <= cfg.maxTier, why + ': tier');
          assert.ok(buyable(i, level, q.budget) !== tooDear(i, level, q.budget), why + ': ' + i.id + ' is arguable for ' + q.budget);
          uses[i.id] = (uses[i.id] || 0) + 1;
        }
        const expected = q.shelf.filter((i) => i.hi * cfg.aff <= q.budget).map((i) => i.id);
        assert.deepEqual([...q.buyIds].sort(), [...expected].sort(), why + ': buyIds');
        for (const i of q.shelf) if (!q.buyIds.includes(i.id)) assert.ok(i.lo >= q.budget * cfg.un, why + ': ' + i.id + ' is not clearly too dear');
        assert.ok(q.buyIds.length >= 1 && q.buyIds.length < cfg.shelf, why + ': all or none');
        budgetUses[q.budget] = (budgetUses[q.budget] || 0) + 1;
        if (defeatsSize(q)) defeat++;
      }
      assert.ok(Math.max(...Object.values(budgetUses)) <= maxBudgetUses(level), why + ': budget used too often');
      assert.ok(Math.max(...Object.values(uses)) <= MAX_ITEM_USES, why + ': item used too often');
      assert.ok(defeat >= BUY_SIZE_DEFEAT_MIN, why + ': only ' + defeat + ' questions the size shortcut gets wrong');
      defeated += defeat; total += ROUND_LENGTH;
    }
    console.log('   ' + level + ': the size shortcut is wrong in ' + (100 * defeated / total).toFixed(1) + '% of questions');
    assert.ok(defeated / total >= 0.3, level + ': size shortcut too good');
  });
  it('is deterministic for a seed', () => {
    assert.deepEqual(buildBuySession(ITEMS, 'hard', rng(7)), buildBuySession(ITEMS, 'hard', rng(7)));
  });
  it('brings missed items back, at most three', () => {
    for (const level of LEVEL_IDS) for (let seed = 1; seed <= 200; seed++) {
      const missed = ['house', 'sweets', 'balloon', 'comic'].filter((id) => ITEMS.find((x) => x.id === id).tier <= BUY[level].maxTier);
      const ids = new Set(buildBuySession(ITEMS, level, rng(seed), missed).flatMap((q) => q.shelf.map((i) => i.id)));
      assert.ok(missed.slice(0, MAX_COME_BACK).every((m) => ids.has(m)), level + ' seed ' + seed + ' lost a missed item');
    }
  });
});

describe('gradeBuy', () => {
  const q = { budget: 1000, shelf: [], buyIds: ['a', 'b'] };
  it('right answer', () => assert.deepEqual(gradeBuy(q, ['b', 'a']), { correct: true, wronglyChosen: [], missed: [] }));
  it('one wrongly chosen', () => assert.deepEqual(gradeBuy(q, ['a', 'b', 'x']), { correct: false, wronglyChosen: ['x'], missed: [] }));
  it('one missed', () => assert.deepEqual(gradeBuy(q, ['a']), { correct: false, wronglyChosen: [], missed: ['b'] }));
  it('both wrong at once', () => assert.deepEqual(gradeBuy(q, ['a', 'x']), { correct: false, wronglyChosen: ['x'], missed: ['b'] }));
});
