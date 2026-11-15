import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HELP_LEVELS, STORY_LENGTHS, normaliseSave } from '../js/engine.js';

describe('saved data: help and story', () => {
  it('defaults and survives anything', () => {
    for (const bad of [undefined, null, 7, 'x', [], { help: 'x', storyLength: 4, mode: 'x' }, { help: 5, storyLength: '5' }]) {
      const s = normaliseSave(bad);
      assert.equal(s.help, 'pictures'); assert.equal(s.storyLength, 5); assert.equal(s.mode, 'scene'); assert.equal(s.v, 1);
    }
  });
  it('keeps good values', () => {
    for (const help of HELP_LEVELS) assert.equal(normaliseSave({ help }).help, help);
    for (const n of STORY_LENGTHS) assert.equal(normaliseSave({ storyLength: n }).storyLength, n);
    assert.equal(normaliseSave({ mode: 'story' }).mode, 'story');
    assert.equal(normaliseSave({ mode: 'silly' }).mode, 'silly');
  });
  it('an old save (no help, no story length) loads as the easy level', () => {
    const s = normaliseSave({ v: 1, mode: 'silly', stage: 2, done: { 1: 6, 2: 1, 3: 0 }, recent: ['a'] });
    assert.deepEqual(s, { v: 1, mode: 'silly', stage: 2, help: 'pictures', storyLength: 5, done: { 1: 6, 2: 1, 3: 0 }, recent: ['a'] });
  });
});
