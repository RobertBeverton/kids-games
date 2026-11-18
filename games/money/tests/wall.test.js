import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WALL_MAX, wallFor, wallLayout, priceTagText } from '../js/engine.js';
import { ITEMS } from '../js/items.js';

describe('wallFor', () => {
  it('sweets beside the motorbike: unit £1', () => {
    assert.deepEqual(wallFor([100, 300000]), { unit: 100, items: [{ squares: 1, dot: false }, { squares: 3000, dot: false }] });
  });
  it('sweets beside the tractor: a dot, never a full square', () => {
    assert.deepEqual(wallFor([100, 5000000]), { unit: 10000, items: [{ squares: 0, dot: true }, { squares: 500, dot: false }] });
  });
  it('sweets beside the house', () => {
    assert.deepEqual(wallFor([100, 30000000]), { unit: 10000, items: [{ squares: 0, dot: true }, { squares: 3000, dot: false }] });
  });
  it('bike beside the house: 1.5 rounds to 2', () => {
    assert.deepEqual(wallFor([15000, 30000000]).items, [{ squares: 2, dot: false }, { squares: 3000, dot: false }]);
  });
  it('football beside the car: unit £10', () => {
    assert.deepEqual(wallFor([1000, 2000000]), { unit: 1000, items: [{ squares: 1, dot: false }, { squares: 2000, dot: false }] });
  });
  it('the dearest never exceeds WALL_MAX squares for any pair of real items, and a sub-half-square item is a dot', () => {
    let dots = 0;
    for (const a of ITEMS) for (const b of ITEMS) {
      const pences = [a.pence, b.pence], w = wallFor(pences), why = a.id + ' ' + b.id;
      w.items.forEach((it, k) => {
        assert.ok(it.squares <= WALL_MAX, why);
        if (pences[k] / w.unit < 0.5) { assert.deepEqual(it, { squares: 0, dot: true }, why); dots++; }
        else assert.ok(it.squares >= 1 && !it.dot, why);
      });
    }
    assert.ok(dots > 0, 'the real list has dots');
  });
});

describe('wallLayout', () => {
  it('cols * fullRows + rest === n for every n from 1 to 3000, roughly square', () => {
    for (let n = 1; n <= 3000; n++) {
      const { cols, fullRows, rest } = wallLayout(n);
      assert.equal(cols * fullRows + rest, n, 'n ' + n);
      assert.ok(rest >= 0 && rest < cols, 'n ' + n + ' rest');
      assert.ok(fullRows >= 1, 'n ' + n);
      assert.ok(Math.abs(cols - Math.sqrt(n)) < 1.01, 'n ' + n + ' not square-ish');
    }
  });
});

describe('priceTagText', () => {
  it('whole pounds get a coins clause with separators', () => {
    const t = priceTagText(300000);
    assert.ok(t.includes('£3,000') && t.includes('3,000 pound coins'), t);
    assert.equal(priceTagText(15000), 'about £150, which is 150 pound coins');
  });
  it('non-whole pounds have no coins clause', () => {
    assert.equal(priceTagText(150), 'about £1.50');
    assert.ok(!priceTagText(1250).includes('coin'));
  });
});
