// The Number Bonds -> Maths merge of saved data (shared/storage.js: migrateMathsMerge).
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../../../shared/storage.js', import.meta.url), 'utf8');

function world(initial = {}) {
  const store = new Map(Object.entries(initial).map(([k, v]) => [k, v && v.__raw !== undefined ? v.__raw : JSON.stringify(v)]));
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  };
  // storage.js is written to sit inside the shell's function scope; give it the same surroundings
  const api = new Function('localStorage', 'window', 'document', SRC + '\nreturn { migrateMathsMerge, loadGameData, getProgress };')(localStorage, {}, {});
  const get = (k) => (store.has(k) ? JSON.parse(store.get(k)) : undefined);
  return { store, get, api };
}
const P = (name) => ({ name, dob: null, manualAge: 7, theme: 'colourful-light', avatar: 0, createdAt: '2026-01-01' });
const base = (names) => ({ kidsgames_players: Object.fromEntries(names.map((n) => [n, P(n)])), kidsgames_activePlayer: names[0] });

describe('migrateMathsMerge', () => {
  it('a Maths-only player keeps settings and bests (bests gain the "answer" style) and progress', () => {
    const w = world({
      ...base(['Mia']),
      kidsgames_maths_Mia: { settings: { op: '*', difficulty: 'hard', mode: 'round', custom: { min: 1, max: 9 } }, 'pb_+_easy_sprint': 420, 'pb_*_hard_round': 150 },
      kidsgames_progress_Mia: { maths: 4, opposites: 2 },
      kidsgames_last_Mia: 'maths',
    });
    w.api.migrateMathsMerge();
    const d = w.get('kidsgames_maths_Mia');
    assert.equal(d.v, 2);
    assert.deepEqual([d.settings.op, d.settings.difficulty, d.settings.mode, d.settings.style], ['*', 'hard', 'round', 'answer']);
    assert.equal(d['pb_answer_+_easy_sprint'], 420);
    assert.equal(d['pb_answer_*_hard_round'], 150);
    assert.deepEqual(w.get('kidsgames_progress_Mia'), { maths: 4, opposites: 2 });
    assert.equal(w.get('kidsgames_last_Mia'), 'maths');
  });

  it('a Number Bonds-only player lands on "missing", keeps bests, progress moves to maths, last game follows', () => {
    const w = world({
      ...base(['Leo']),
      kidsgames_numberbonds_Leo: { settings: { op: '-', difficulty: 'easy', mode: 'round', custom: {} }, 'pb_-_easy_round': 190 },
      kidsgames_progress_Leo: { 'number-bonds': 12, 'memory-match': 1 },
      kidsgames_last_Leo: 'number-bonds',
    });
    w.api.migrateMathsMerge();
    const d = w.get('kidsgames_maths_Leo');
    assert.equal(d.settings.style, 'missing');
    assert.equal(d.settings.op, '-');
    assert.equal(d['pb_missing_-_easy_round'], 190);
    assert.deepEqual(w.get('kidsgames_progress_Leo'), { 'memory-match': 1, maths: 12 });
    assert.equal(w.get('kidsgames_last_Leo'), 'maths');
    assert.equal(w.api.getProgress('Leo').maths, 12);
  });

  it('a player of both: all bests kept side by side, progress added up, settings from the game played last', () => {
    const seed = (last) => world({
      ...base(['Ana']),
      kidsgames_maths_Ana: { settings: { op: '+', difficulty: 'medium', mode: 'sprint', custom: {} }, 'pb_+_medium_sprint': 300 },
      kidsgames_numberbonds_Ana: { settings: { op: '/', difficulty: 'hard', mode: 'endless', custom: {} }, 'pb_+_medium_sprint': 500 },
      kidsgames_progress_Ana: { maths: 3, 'number-bonds': 5 },
      kidsgames_last_Ana: last,
    });
    const a = seed('number-bonds'); a.api.migrateMathsMerge();
    const da = a.get('kidsgames_maths_Ana');
    assert.equal(da.settings.style, 'missing'); assert.equal(da.settings.op, '/');
    assert.equal(da['pb_answer_+_medium_sprint'], 300);
    assert.equal(da['pb_missing_+_medium_sprint'], 500);
    assert.equal(a.get('kidsgames_progress_Ana').maths, 8);
    assert.equal(a.get('kidsgames_progress_Ana')['number-bonds'], undefined);

    const b = seed('maths'); b.api.migrateMathsMerge();
    const db = b.get('kidsgames_maths_Ana');
    assert.equal(db.settings.style, 'answer'); assert.equal(db.settings.op, '+');
    assert.equal(db['pb_missing_+_medium_sprint'], 500);
  });

  it('does not delete the old data', () => {
    const w = world({ ...base(['Mia']), kidsgames_maths_Mia: { settings: { op: '+' }, 'pb_+_easy_sprint': 9 }, kidsgames_numberbonds_Mia: { 'pb_+_easy_sprint': 7 } });
    w.api.migrateMathsMerge();
    assert.equal(w.get('kidsgames_numberbonds_Mia')['pb_+_easy_sprint'], 7);
  });

  it('runs once: a second run changes nothing and never double-counts progress', () => {
    const w = world({ ...base(['Mia']), kidsgames_numberbonds_Mia: { settings: { op: '+' } }, kidsgames_progress_Mia: { 'number-bonds': 5, maths: 1 } });
    w.api.migrateMathsMerge();
    const first = JSON.stringify([...w.store.entries()].sort());
    w.api.migrateMathsMerge(); w.api.migrateMathsMerge();
    assert.equal(JSON.stringify([...w.store.entries()].sort()), first);
    assert.equal(w.get('kidsgames_progress_Mia').maths, 6);
  });

  it('a player with no Maths or Number Bonds history gets nothing made up', () => {
    const w = world({ ...base(['New']), kidsgames_progress_New: { opposites: 1 } });
    w.api.migrateMathsMerge();
    assert.equal(w.get('kidsgames_maths_New'), undefined);
    assert.deepEqual(w.get('kidsgames_progress_New'), { opposites: 1 });
  });

  it('data already in the new shape is left alone', () => {
    const w = world({ ...base(['Mia']), kidsgames_maths_Mia: { v: 2, settings: { style: 'missing', op: '+' }, 'pb_missing_+_easy_round': 100 }, kidsgames_numberbonds_Mia: { 'pb_+_easy_round': 1 } });
    w.api.migrateMathsMerge();
    assert.deepEqual(w.get('kidsgames_maths_Mia'), { v: 2, settings: { style: 'missing', op: '+' }, 'pb_missing_+_easy_round': 100 });
  });

  it('each player is migrated on their own; one corrupt record does not stop the others', () => {
    const w = world({
      ...base(['Bad', 'Good']),
      kidsgames_maths_Bad: { __raw: '{not json' },
      kidsgames_numberbonds_Good: { settings: { op: '*' }, 'pb_*_easy_round': 55 },
      kidsgames_progress_Good: { 'number-bonds': 2 },
    });
    mock.method(console, 'error', () => {});
    assert.doesNotThrow(() => w.api.migrateMathsMerge());
    mock.restoreAll();
    assert.equal(w.get('kidsgames_maths_Good')['pb_missing_*_easy_round'], 55);
    assert.equal(w.get('kidsgames_progress_Good').maths, 2);
  });

  it('the new game reads the migrated data back through the normal API', () => {
    const w = world({ ...base(['Mia']), kidsgames_numberbonds_Mia: { settings: { op: '+', difficulty: 'easy', mode: 'round', custom: {} } } });
    w.api.migrateMathsMerge();
    assert.equal(w.api.loadGameData('maths').settings.style, 'missing');
  });
});
