import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_IDS, ROUND_LENGTH, PRICE_TILES, PRICE_MIN_TILE, PRICE_MAX_TILE, PRICE_MAX_FULL, MAX_POINTS, niceRound, pointsFor, priceTiles, buildPriceSession } from '../js/engine.js';
import { ITEMS } from '../js/items.js';

const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const SEEDS = 2000;
const sig2 = (n) => { const s = String(n).replace(/0+$/, ''); return s.length <= 2; };

describe('niceRound and pointsFor', () => {
  it('rounds to two significant figures', () => {
    assert.equal(niceRound(1234), 1200); assert.equal(niceRound(275000), 280000); assert.equal(niceRound(33.3), 33); assert.equal(niceRound(100), 100); assert.equal(niceRound(1500000), 1500000);
  });
  const bike = { lo: 9000, pence: 18000, hi: 45000 };
  it('gives full points anywhere in the range and fewer the further out', () => {
    assert.equal(pointsFor(bike, 9000), 3); assert.equal(pointsFor(bike, 18000), 3); assert.equal(pointsFor(bike, 45000), 3);
    assert.equal(pointsFor(bike, 6000), 2);     // 9000/6000 = 1.5
    assert.equal(pointsFor(bike, 60000), 2);    // 60000/45000 = 1.33
    assert.equal(pointsFor(bike, 4000), 1);     // 2.25
    assert.equal(pointsFor(bike, 100000), 1);   // 2.22
    assert.equal(pointsFor(bike, 1000), 0);
    assert.equal(pointsFor(bike, 500000), 0);
  });
});

describe('priceTiles: audit of every item and level, ' + SEEDS + ' seeds', () => {
  for (const level of LEVEL_IDS) it(level, () => {
    const posSeen = new Array(PRICE_TILES).fill(0); let n = 0;
    for (const item of ITEMS) for (let seed = 1; seed <= SEEDS; seed++) {
      const why = level + ' ' + item.id + ' seed ' + seed;
      const t = priceTiles(item, level, rng(seed));
      assert.equal(t.tiles.length, PRICE_TILES, why);
      for (let k = 1; k < PRICE_TILES; k++) assert.ok(t.tiles[k] > t.tiles[k - 1], why + ' not rising');
      for (const v of t.tiles) { assert.ok(v >= PRICE_MIN_TILE && v <= PRICE_MAX_TILE, why + ' out of bounds ' + v); assert.ok(sig2(v), why + ' not 2 s.f. ' + v); }
      assert.equal(t.tiles[t.bestIndex], niceRound(item.pence), why);
      assert.equal(t.points[t.bestIndex], MAX_POINTS, why + ' best tile must score full points');
      assert.ok(t.points.filter((p) => p === MAX_POINTS).length <= PRICE_MAX_FULL, why + ' too many full-point tiles: ' + t.points);
      assert.ok(t.points.some((p) => p === 0 || p === 1), why + ' no clearly wrong tile');
      posSeen[t.bestIndex]++; n++;
    }
    const share = posSeen.map((c) => c / n);
    console.log('   ' + level + ' position of the best tile: ' + share.map((s) => (100 * s).toFixed(0) + '%').join(' '));
    for (const s of share) assert.ok(s >= 0.05 && s <= 0.40, level + ' position share ' + s);
  });
  it('is deterministic for a seed', () => assert.deepEqual(priceTiles(ITEMS[5], 'hard', rng(3)), priceTiles(ITEMS[5], 'hard', rng(3))));
});

describe('buildPriceSession', () => {
  it('ten different items, tier respected, missed ones first', () => {
    for (const level of LEVEL_IDS) for (let seed = 1; seed <= 500; seed++) {
      const s = buildPriceSession(ITEMS, level, rng(seed), ['house', 'sweets', 'phone', 'bike']);
      assert.equal(s.length, ROUND_LENGTH);
      assert.equal(new Set(s.map((q) => q.item.id)).size, ROUND_LENGTH);
      const ids = s.map((q) => q.item.id);
      assert.ok(['house', 'sweets', 'phone'].every((m) => ids.includes(m)), level + ' seed ' + seed);
    }
  });
});
