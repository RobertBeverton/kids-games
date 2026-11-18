import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatPrice, validateItems } from '../js/engine.js';
import { ITEMS } from '../js/items.js';

const good = { id: 'bike', name: 'Bike', pence: 15000, lo: 10000, hi: 25000, size: 2, tier: 1 };

describe('formatPrice', () => {
  it('formats UK style', () => {
    assert.equal(formatPrice(50), '50p');
    assert.equal(formatPrice(99), '99p');
    assert.equal(formatPrice(100), '£1');
    assert.equal(formatPrice(150), '£1.50');
    assert.equal(formatPrice(105), '£1.05');
    assert.equal(formatPrice(300000), '£3,000');
    assert.equal(formatPrice(30000000), '£300,000');
    assert.equal(formatPrice(123456789), '£1,234,567.89');
  });
  it('refuses nonsense', () => {
    for (const bad of [0, -5, 1.5, NaN, '100', undefined]) assert.throws(() => formatPrice(bad));
  });
});

describe('validateItems', () => {
  it('accepts a good item', () => assert.deepEqual(validateItems([good]), []));
  it('catches each kind of mistake', () => {
    const cases = [
      [{ ...good, id: 'Bike' }, 'id must be'],
      [{ ...good, name: '' }, 'name must be'],
      [{ ...good, name: 'A very very very long name' }, 'name must be'],
      [{ ...good, name: 'Rich car' }, 'banned word'],
      [{ ...good, pence: 150.5 }, 'pence must be'],
      [{ ...good, lo: 20000 }, 'need lo <= pence <= hi'],
      [{ ...good, hi: 14000 }, 'need lo <= pence <= hi'],
      [{ ...good, pence: 50, lo: 40, hi: 60 }, 'under £1'],
      [{ ...good, size: 4 }, 'size must be'],
      [{ ...good, tier: 3 }, 'tier must be'],
      [{ ...good, group: 'Snack' }, 'group must be'],
    ];
    for (const [item, expect] of cases) {
      const errs = validateItems([item]);
      assert.ok(errs.some((e) => e.includes(expect)), 'expected "' + expect + '", got ' + JSON.stringify(errs));
    }
  });
  it('catches duplicates and missing drawings', () => {
    assert.ok(validateItems([good, good]).some((e) => e.includes('duplicate')));
    assert.ok(validateItems([good], ['house']).some((e) => e.includes('no drawing')));
    assert.deepEqual(validateItems([good], ['bike']), []);
  });
});

describe('the shipped item list', () => {
  it('is valid', () => assert.deepEqual(validateItems(ITEMS), []));
  it('has the 27 core items, all tier 1', () => {
    assert.equal(ITEMS.length, 27);
    assert.equal(ITEMS.filter((i) => i.tier === 1).length, 27);
  });
  it('spans pocket money to a house', () => {
    const p = ITEMS.map((i) => i.pence);
    assert.ok(Math.min(...p) <= 100 && Math.max(...p) >= 25000000);
  });
  it('has big cheap things and small dear things (so size cannot stand in for price)', () => {
    const cheap = ITEMS.filter((i) => i.pence <= 5000), dear = ITEMS.filter((i) => i.pence >= 20000);
    assert.ok(cheap.some((i) => i.size === 3) && dear.some((i) => i.size === 1));
  });
});
