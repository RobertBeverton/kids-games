import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PICTURES, CHROME, pictureSvg } from '../js/pictures.js';
import { ITEMS } from '../js/items.js';

// Item ids not drawn yet. Each drawing batch moves ids out of this list (and into PICTURES).
const PENDING = [
  'beach-ball', 'cardboard-box', 'pizza', 'football', 'teddy',
  'paddling-pool', 'xmas-tree', 'trainers', 'scooter', 'tent',
  'bike', 'tablet', 'trampoline', 'console', 'phone', 'tv',
  'sofa', 'holiday', 'motorbike', 'car', 'tractor', 'house',
];

const ELEMENTS = new Set(['path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon', 'g']);
const ATTRS = new Set(['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2', 'points', 'class']);
const CLASSES = new Set(['d', 'dot']);
const all = () => [...Object.entries(PICTURES), ...Object.entries(CHROME)];

function parse(markup) {
  const tags = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
  let m, last = 0, text = '';
  while ((m = re.exec(markup))) {
    text += markup.slice(last, m.index);
    last = re.lastIndex;
    if (!m[1]) tags.push({ name: m[2], attrs: m[3] });
  }
  text += markup.slice(last);
  return { tags, text };
}

describe('money pictures', () => {
  it('PENDING and the drawn ids are disjoint and together are exactly the items', () => {
    const ids = ITEMS.map((i) => i.id);
    const drawn = Object.keys(PICTURES);
    for (const id of PENDING) assert.ok(!drawn.includes(id), id + ' is drawn but still PENDING');
    assert.deepEqual([...drawn, ...PENDING].sort(), [...ids].sort());
  });
  it('every picture id is a real item id, and no chrome id is an item id', () => {
    const ids = new Set(ITEMS.map((i) => i.id));
    for (const k of Object.keys(PICTURES)) assert.ok(ids.has(k), k + ' is not an item');
    for (const k of Object.keys(CHROME)) assert.ok(!ids.has(k), k + ' clashes with an item id');
  });
  it('markup uses only allowed elements, attributes and classes, and has no text', () => {
    for (const [k, markup] of all()) {
      const { tags, text } = parse(markup);
      assert.ok(tags.length > 0, k + ' is empty');
      assert.equal(text.trim(), '', k + ' contains text');
      for (const t of tags) {
        assert.ok(ELEMENTS.has(t.name), k + ' uses <' + t.name + '>');
        for (const a of t.attrs.matchAll(/([^\s=]+)\s*=\s*"([^"]*)"/g)) {
          assert.ok(ATTRS.has(a[1]), k + ' uses attribute ' + a[1]);
          if (a[1] === 'class') for (const c of a[2].split(/\s+/)) assert.ok(CLASSES.has(c), k + ' uses class ' + c);
        }
        const rest = t.attrs.replace(/[^\s=]+\s*=\s*"[^"]*"/g, '').replace(/\//g, '').trim();
        assert.equal(rest, '', k + ' has a malformed attribute: ' + rest);
      }
    }
  });
  it('no forbidden element or attribute anywhere', () => {
    for (const [k, markup] of all()) {
      assert.ok(!/<\s*(text|image|use|script|style|foreignObject|svg|a)\b/i.test(markup), k + ' has a forbidden element');
      assert.ok(!/(href|xlink|style|\bon\w+=|\bfill=|\bstroke|filter|url\()/i.test(markup), k + ' has a forbidden attribute');
      assert.ok(!/[^\x00-\x7F]/.test(markup), k + ' has a non-ASCII character (emoji?)');
    }
  });
  it('every picture has at least one stroked element', () => {
    for (const [k, markup] of all()) {
      const { tags } = parse(markup);
      assert.ok(tags.some((t) => t.name !== 'g' && !/class="[^"]*\bdot\b/.test(t.attrs)), k + ' has nothing stroked');
    }
  });
  it('pictureSvg wraps markup in a hidden 96 box and returns empty for an unknown id', () => {
    for (const [k] of all()) assert.match(pictureSvg(k), /^<svg class="mo-pic" viewBox="0 0 96 96" aria-hidden="true">/);
    assert.equal(pictureSvg('nope'), '');
  });
});
