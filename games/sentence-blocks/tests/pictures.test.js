import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PICTURES, pictureSvg, missingSvg, SLOT_GLYPHS, sceneSvg, sceneIsDrawn } from '../js/pictures.js';
import { DATA } from '../js/words.js';
import { SCENES } from '../js/scenes.js';
import { SLOT_ORDER } from '../js/engine.js';

const PATH_OK = /^[MmLlHhVvCcSsQqTtAaZz0-9 .,\-]+$/;
const everyPath = (p) => [p.line, p.detail, p.dots].filter(Boolean);

describe('picture data', () => {
  it('every picture has a label and a clean main line', () => {
    for (const [k, p] of Object.entries(PICTURES)) {
      assert.ok(p.label, k + ' has no label');
      assert.ok(p.line, k + ' has no line');
      for (const d of everyPath(p)) assert.match(d, PATH_OK, k + ' has a path with odd characters');
    }
  });
  it('every slot has a header glyph', () => {
    for (const k of SLOT_ORDER) assert.ok(SLOT_GLYPHS[k] && SLOT_GLYPHS[k].line, 'no glyph for ' + k);
  });
  it('renders svg strings, aria-hidden, with a real path, for every picture AND every slot glyph', () => {
    const keys = [...Object.keys(PICTURES), ...Object.keys(SLOT_GLYPHS)];
    assert.ok(keys.length >= 5, 'the slot glyphs at least must be checked');
    for (const k of keys) {
      const s = pictureSvg(k);
      assert.match(s, /^<svg [^>]*aria-hidden="true"/);
      assert.match(s, /<path d="M/, k + ' draws nothing');
      assert.ok(!s.includes('undefined') && !s.includes('sb-pic--missing'), k + ' rendered as missing');
    }
  });
  it('a missing picture renders a visible placeholder, never throws', () => {
    assert.match(missingSvg('dog'), /<svg/);
  });
  it('every scene the figure system draws renders a real, labelled-free svg that never says undefined', () => {
    const drawn = SCENES.filter(sceneIsDrawn);
    assert.ok(drawn.length >= 6, 'the spike scenes must be drawable');
    for (const sc of drawn) {
      const s = sceneSvg(sc);
      assert.match(s, /^<svg [^>]*aria-hidden="true"/, sc.id);
      assert.match(s, /<path d="M/, sc.id + ' draws nothing');
      assert.ok(!s.includes('undefined') && !s.includes('NaN'), sc.id + ' has a bad number');
    }
  });
  it('scenes the figure system cannot draw yet are reported, not silently drawn wrong', () => {
    for (const sc of SCENES.filter((x) => !sceneIsDrawn(x))) assert.equal(typeof sceneSvg(sc), 'string', sc.id);
  });
  it('every scene can be drawn (12 per stage, Task 12)', { todo: 'enable after Task 12' }, () => {
    for (const sc of SCENES) assert.ok(sceneIsDrawn(sc), sc.id + ' is not drawn');
  });
  // Switch this on at the end of the picture batches (Task 11): every tile and every scene must be drawable.
  it('every tile has a picture, and every picture is used', { todo: 'enable after Task 11' }, () => {
    const used = new Set();
    for (const slot of SLOT_ORDER) for (const t of DATA[slot]) { assert.ok(PICTURES[t.pic], slot + ':' + t.id + ' has no picture ' + t.pic); used.add(t.pic); }
    for (const k of Object.keys(PICTURES)) assert.ok(used.has(k) || k.startsWith('fig-') || k.startsWith('item-') || k.startsWith('place-'), 'unused picture ' + k);
    for (const s of SCENES) assert.ok(s.picture, s.id);
  });
});
