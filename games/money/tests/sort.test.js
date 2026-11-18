import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_IDS, ROUND_LENGTH, MAX_COME_BACK, SORT, SORT_NOT_SIZE_MIN, SORT_MAX_ITEM_USES, clearlyDearer, sortChains, buildSortSession, nextSortId, gradeSortTap, sortMissesFor } from '../js/engine.js';
import { ITEMS } from '../js/items.js';

const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const SEEDS = 3000;
// Size-sortable: size never decreases as price rises, so "smallest first" would win.
const sizeSortable = (orderIds) => orderIds.every((id, i) => i === 0 || ITEMS.find((x) => x.id === id).size >= ITEMS.find((x) => x.id === orderIds[i - 1]).size);

describe('sortChains: the real list', () => {
  it('has many sets, and many that size cannot solve', () => {
    for (const level of LEVEL_IDS) {
      const all = sortChains(ITEMS, level), ns = all.filter((c) => !sizeSortable(c.map((i) => i.id)));
      console.log('   ' + level + ': ' + all.length + ' sets, ' + ns.length + ' not size-sortable');
      assert.ok(ns.length >= 100, level + ' has only ' + ns.length);
    }
  });
});

describe('buildSortSession: audit over ' + SEEDS + ' seeds per level', () => {
  for (const level of LEVEL_IDS) it(level, () => {
    const { n, ratio, maxTier } = SORT[level];
    let notSizeTotal = 0, minNotSize = Infinity;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const s = buildSortSession(ITEMS, level, rng(seed));
      const why = level + ' seed ' + seed;
      assert.equal(s.length, ROUND_LENGTH, why);
      const uses = {}, keys = new Set();
      let notSize = 0;
      for (const q of s) {
        assert.equal(q.items.length, n, why);
        assert.equal(q.order.length, n, why);
        assert.deepEqual([...q.items.map((i) => i.id)].sort(), [...q.order].sort(), why + ': order must be the shown items');
        const byId = Object.fromEntries(q.items.map((i) => [i.id, i]));
        for (let k = 1; k < n; k++) assert.ok(clearlyDearer(byId[q.order[k]], byId[q.order[k - 1]], ratio), why + ': neighbours ' + q.order[k - 1] + ' < ' + q.order[k]);
        const groups = q.items.filter((i) => i.group).map((i) => i.group);
        assert.equal(new Set(groups).size, groups.length, why + ': shared group');
        for (const i of q.items) { assert.ok(i.tier <= maxTier, why + ': tier'); uses[i.id] = (uses[i.id] || 0) + 1; }
        assert.notDeepEqual(q.items.map((i) => i.id), q.order, why + ': shown in the right order');
        if (!sizeSortable(q.order)) notSize++;
        const key = [...q.order].sort().join('|'); assert.ok(!keys.has(key), why + ': repeated set'); keys.add(key);
      }
      assert.ok(notSize >= SORT_NOT_SIZE_MIN, why + ': only ' + notSize + ' sets not size-sortable');
      assert.ok(Math.max(...Object.values(uses)) <= SORT_MAX_ITEM_USES, why + ': item used too often');
      notSizeTotal += notSize; minNotSize = Math.min(minNotSize, notSize);
    }
    console.log('   ' + level + ': not size-sortable sets per round, min ' + minNotSize + ', mean ' + (notSizeTotal / SEEDS).toFixed(2) + ' of ' + ROUND_LENGTH);
  });
  it('is deterministic for a seed', () => {
    assert.deepEqual(buildSortSession(ITEMS, 'medium', rng(7)), buildSortSession(ITEMS, 'medium', rng(7)));
  });
  it('brings missed items back, at most three', () => {
    for (const level of LEVEL_IDS) for (let seed = 1; seed <= 200; seed++) {
      const missed = ['house', 'sweets', 'balloon', 'comic'].filter((id) => ITEMS.find((x) => x.id === id).tier <= SORT[level].maxTier);
      const s = buildSortSession(ITEMS, level, rng(seed), missed);
      const ids = new Set(s.flatMap((q) => q.order));
      assert.ok(missed.slice(0, MAX_COME_BACK).every((m) => ids.has(m)), level + ' seed ' + seed + ' lost a missed item');
    }
  });
});

describe('grading a sort', () => {
  const q = { items: [], order: ['a', 'b', 'c'] };
  it('nextSortId follows the order and ends with null', () => {
    assert.equal(nextSortId(q, []), 'a');
    assert.equal(nextSortId(q, ['a']), 'b');
    assert.equal(nextSortId(q, ['a', 'b', 'c']), null);
  });
  it('a correct run places everything in order', () => {
    const placed = [];
    for (const id of q.order) { const g = gradeSortTap(q, placed, id); assert.equal(g.correct, true); assert.equal(g.expectedId, id); placed.push(id); }
    assert.deepEqual(placed, q.order);
  });
  it('a wrong tap is refused and changes nothing', () => {
    const placed = ['a'];
    const g = gradeSortTap(q, placed, 'c');
    assert.deepEqual(g, { correct: false, expectedId: 'b' });
    assert.deepEqual(placed, ['a']);
  });
  it('a missed position is recorded once, however many wrong taps follow', () => {
    // position 0: first tap wrong (c), then wrong again (b), then right (a); position 1: right first time; position 2: right.
    const log = [{ position: 0, tappedId: 'c' }, { position: 0, tappedId: 'b' }, { position: 0, tappedId: 'a' }, { position: 1, tappedId: 'b' }, { position: 2, tappedId: 'c' }];
    assert.deepEqual(sortMissesFor(q, log).sort(), ['a', 'c']);
  });
  it('a wrong tap after a right one at the same position is not a miss', () => {
    assert.deepEqual(sortMissesFor(q, [{ position: 0, tappedId: 'a' }, { position: 0, tappedId: 'c' }]), []);
  });
  it('a clean run has no misses', () => {
    assert.deepEqual(sortMissesFor(q, q.order.map((id, position) => ({ position, tappedId: id }))), []);
  });
  it('misses at two positions are each recorded', () => {
    const log = [{ position: 0, tappedId: 'b' }, { position: 0, tappedId: 'a' }, { position: 1, tappedId: 'c' }, { position: 1, tappedId: 'b' }, { position: 2, tappedId: 'c' }];
    // position 0 expected a, tapped b; position 1 expected b, tapped c: four entries (a, b, b, c)
    assert.deepEqual(sortMissesFor(q, log).sort(), ['a', 'b', 'b', 'c']);
  });
});
