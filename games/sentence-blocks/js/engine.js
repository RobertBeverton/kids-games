// engine.js — Sentence Blocks: grammar, rounds, stages and saved progress. Pure logic, no DOM.
// Every function takes the word data as an argument, so nothing here depends on another file at run time.
// (build.sh strips import/export lines and joins the files, so every top-level name must be unique across js/.)

export const SLOT_ORDER = ['describe', 'who', 'doing', 'what', 'where'];
export const TARGET_SENTENCES = 5;  // sentences in one session (one hopscotch square)
export const UNLOCK_AT = 5;         // finished describe-the-picture sentences that open the next stage
export const SAVE_VERSION = 1;
export const RECENT_KEEP = TARGET_SENTENCES; // scenes remembered, so the next session avoids the ones just played (must stay below the scenes per stage)
export const KINDS = ['animal', 'child', 'baby', 'adult'];

// A frame is the set of colour slots one sentence uses. `transitive` says whether its doing word takes a "what".
export const STAGES = [
  { id: 1, name: 'Who and doing', frames: [{ slots: ['who', 'doing'], transitive: false }] },
  { id: 2, name: 'Add a what', frames: [{ slots: ['who', 'doing', 'what'], transitive: true }] },
  {
    id: 3, name: 'Add a where',
    frames: [
      { slots: ['describe', 'who', 'doing', 'where'], transitive: false },
      { slots: ['describe', 'who', 'doing', 'what', 'where'], transitive: true },
    ],
  },
];

// ---------- grammar ----------
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const isTransitive = (doing) => doing.takes.length > 0;
export const tileOf = (data, slot, id) => data[slot].find((t) => t.id === id) || null;

export const whatPhrase = (what) => [what.det, what.noun].filter(Boolean).join(' ');

// What is printed on a tile.
export function tileText(slot, t) {
  if (slot === 'who') return t.named ? t.text : cap(t.det + ' ' + t.noun);
  if (slot === 'doing') return t.ing;
  if (slot === 'what') return whatPhrase(t);
  if (slot === 'where') return t.phrase;
  return t.word;
}

// picks: { describe?, who, doing, what?, where? }, each a tile object.
// The sentence as coloured pieces, in order: [{ slot: 'who' | ... | null, text }]. A null slot is a joining word (is / are).
export function sentenceParts(picks) {
  const { who, doing } = picks;
  if (!who || !doing) throw new Error('A sentence needs a who and a doing');
  if (isTransitive(doing) !== !!picks.what) throw new Error('"' + doing.id + '" ' + (isTransitive(doing) ? 'needs' : 'cannot take') + ' a what');
  if (who.named && picks.describe) throw new Error('A named person cannot take a describing word: ' + who.id);
  const parts = [];
  if (who.named) parts.push({ slot: 'who', text: who.text });
  else {
    parts.push({ slot: 'who', text: cap(who.det) });
    if (picks.describe) parts.push({ slot: 'describe', text: picks.describe.word });
    parts.push({ slot: 'who', text: who.noun });
  }
  parts.push({ slot: null, text: who.plural ? 'are' : 'is' }, { slot: 'doing', text: doing.ing });
  if (picks.what) parts.push({ slot: 'what', text: whatPhrase(picks.what) });
  if (picks.where) parts.push({ slot: 'where', text: picks.where.phrase });
  parts[parts.length - 1] = { ...parts[parts.length - 1], text: parts[parts.length - 1].text + '.' };
  return parts;
}
export const composeSentence = (picks) => sentenceParts(picks).map((p) => p.text).join(' ');

// ---------- data checks (run by the tests and therefore by build.sh) ----------
const VOWEL = /^[aeiou]/i;
export function validateData(data, scenes) {
  const problems = [];
  const say = (m) => problems.push(m);
  for (const slot of SLOT_ORDER) {
    const seen = new Set();
    for (const t of data[slot] || []) {
      if (seen.has(t.id)) say(slot + ': duplicate id ' + t.id);
      seen.add(t.id);
      if (!t.pic) say(slot + ':' + t.id + ' has no picture');
    }
    if (!(data[slot] || []).length) say(slot + ': no tiles');
  }
  for (const w of data.who) {
    if (!KINDS.includes(w.kind)) say('who:' + w.id + ' needs a kind: ' + KINDS.join(', '));
    if (w.named) { if (!w.text) say('who:' + w.id + ' named but no text'); continue; }
    if (w.det !== 'the') say('who:' + w.id + ' must use "the"');
    if (!w.noun) say('who:' + w.id + ' has no noun');
    if (w.plural && !/s$/.test(w.noun)) say('who:' + w.id + ' plural noun should end in s');
    if (!w.plural && /s$/.test(w.noun) && !w.irregularS) say('who:' + w.id + ' looks plural but is not marked plural');
  }
  for (const w of data.what) {
    if (!w.noun) say('what:' + w.id + ' has no noun');
    const wantsAn = VOWEL.test(w.noun || '');
    if (w.det === '') { if (!w.mass) say('what:' + w.id + ' has no determiner but is not marked mass'); }
    else if (w.det !== (wantsAn ? 'an' : 'a')) say('what:' + w.id + ' should use "' + (wantsAn ? 'an' : 'a') + '"');
  }
  for (const d of data.describe) {
    const o = tileOf(data, 'describe', d.opposite);
    if (!o) say('describe:' + d.id + ' has no valid opposite');
    else if (o.opposite !== d.id) say('describe:' + d.id + ' and ' + o.id + ' are not opposites of each other');
  }
  for (const d of data.doing) {
    if (!/ing$/.test(d.ing || '')) say('doing:' + d.id + ' must be an -ing word');
    if (!d.actors || !d.actors.length) say('doing:' + d.id + ' lists no actors');
    else if (d.actors.some((a) => !KINDS.includes(a))) say('doing:' + d.id + ' lists an unknown actor kind');
    if (!d.wheres || !d.wheres.length) say('doing:' + d.id + ' lists no places');
  }
  for (const s of scenes || []) {
    const tag = 'scene ' + s.id;
    const who = tileOf(data, 'who', s.who), doing = tileOf(data, 'doing', s.doing);
    const what = s.what ? tileOf(data, 'what', s.what) : null;
    const where = s.where ? tileOf(data, 'where', s.where) : null;
    const describe = s.describe ? tileOf(data, 'describe', s.describe) : null;
    if (!who || !doing) { say(tag + ': unknown who or doing'); continue; }
    if (s.what && !what) say(tag + ': unknown what ' + s.what);
    if (s.where && !where) say(tag + ': unknown where ' + s.where);
    if (s.describe && !describe) say(tag + ': unknown describe ' + s.describe);
    const stage = STAGES.find((st) => st.id === s.stage);
    if (!stage) { say(tag + ': bad stage'); continue; }
    const slots = SLOT_ORDER.filter((k) => s[k]);
    const frame = stage.frames.find((f) => f.slots.join() === slots.join());
    if (!frame) say(tag + ': slots [' + slots + '] do not match any stage ' + s.stage + ' frame');
    if (!who.kind || !doing.actors.includes(who.kind)) say(tag + ': ' + who.id + ' cannot be ' + doing.id);
    if (what && !what.tags.some((x) => doing.takes.includes(x))) say(tag + ': ' + doing.id + ' does not take ' + what.id);
    if (where && !where.tags.some((x) => doing.wheres.includes(x))) say(tag + ': ' + doing.id + ' does not happen ' + where.phrase);
    if (describe && who.named) say(tag + ': ' + who.id + ' cannot be described');
    if (!s.picture) say(tag + ': no picture recipe');
    if (frame) {
      for (const k of slots) {
        const right = tileOf(data, k, s[k]);
        if (right && distractorsOf(data, frame, k, right, distractorsFor(s.stage), () => 0.5).length < Math.min(distractorsFor(s.stage), k === 'describe' ? 1 : 99)) say(tag + ': not enough wrong tiles for ' + k);
      }
    }
    try {
      if (who && doing && (isTransitive(doing) === !!what)) composeSentence({ who, doing, what, where, describe });
    } catch (e) { say(tag + ': ' + e.message); }
  }
  const ids = (scenes || []).map((s) => s.id);
  if (new Set(ids).size !== ids.length) say('scenes: duplicate ids');
  return problems;
}

// ---------- rounds ----------
const shuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickN = (a, n, rnd) => shuffle(a, rnd).slice(0, n);
// What a tile looks like in the tray: plural people are drawn twice, so "dog" and "dogs" look different but two "dog"s do not.
export const lookOf = (t) => t.pic + (t.plural ? '*2' : '');
// n tiles that all look different from each other (and from anything in `avoid`).
function pickDistinct(a, n, avoid, rnd) {
  const seen = new Set(avoid.map(lookOf)), out = [];
  for (const t of shuffle(a, rnd)) {
    if (out.length === n) break;
    if (seen.has(lookOf(t))) continue;
    seen.add(lookOf(t)); out.push(t);
  }
  return out;
}

export const stageById = (id) => STAGES.find((s) => s.id === id) || STAGES[0];

// Tiles that may stand in a slot for a frame. The doing pool matches the frame's transitivity; a describing frame has no named people.
export function poolFor(data, frame, slot) {
  let pool = data[slot];
  if (slot === 'doing') pool = pool.filter((d) => isTransitive(d) === frame.transitive);
  if (slot === 'who' && frame.slots.includes('describe')) pool = pool.filter((w) => !w.named);
  return pool;
}

// How many wrong tiles sit beside the right one, per slot.
export const distractorsFor = (stageId) => (stageId >= 3 ? 1 : 2);

// Wrong tiles for one slot. They must be clearly wrong for the picture, so:
//  - a describing word is only ever offered against its opposite (a "big" dog is not also "happy" or "tired");
//  - tiles in the same `group` look alike (park / garden / field), so a group-mate of the right tile is never offered.
export function distractorsOf(data, frame, slot, right, n, rnd = Math.random) {
  if (slot === 'describe') { const o = tileOf(data, 'describe', right.opposite); return o ? [o] : []; }
  const pool = poolFor(data, frame, slot).filter((t) => !(right.group && t.group === right.group));
  return pickDistinct(pool, n, [right], rnd);
}

// "Describe the picture": one scene, the right tile per slot plus wrong ones from the same slot.
export function buildSceneRound(data, scene, rnd = Math.random) {
  const stage = stageById(scene.stage);
  const slots = SLOT_ORDER.filter((k) => scene[k]);
  const frame = stage.frames.find((f) => f.slots.join() === slots.join());
  if (!frame) throw new Error('Scene ' + scene.id + ' does not fit a frame');
  const n = distractorsFor(scene.stage);
  const tray = [];
  for (const slot of slots) {
    const right = tileOf(data, slot, scene[slot]);
    tray.push({ slot, id: right.id }, ...distractorsOf(data, frame, slot, right, n, rnd).map((t) => ({ slot, id: t.id })));
  }
  return { mode: 'scene', stage: scene.stage, slots, scene, answer: Object.fromEntries(slots.map((k) => [k, scene[k]])), tray: shuffle(tray, rnd), placed: {}, misses: {}, complete: false };
}

// "Silly sentences": the game picks a frame, the child picks any tile for each slot.
export const SILLY_CHOICES = 3;
export function buildSillyRound(data, stageId, rnd = Math.random) {
  const stage = stageById(stageId);
  const frame = stage.frames[Math.floor(rnd() * stage.frames.length)];
  const tray = [];
  for (const slot of frame.slots) for (const t of pickN(poolFor(data, frame, slot), SILLY_CHOICES, rnd)) tray.push({ slot, id: t.id });
  return { mode: 'silly', stage: stageId, slots: frame.slots.slice(), frame, answer: null, tray: shuffle(tray, rnd), placed: {}, misses: {}, complete: false };
}

// Try a tile in a slot. Returns 'ok' | 'wrong-slot' | 'wrong-tile'. A wrong tile never stays.
export function tryPlace(round, tile, slot) {
  if (!round.slots.includes(slot)) return 'wrong-slot';
  if (tile.slot !== slot) return 'wrong-slot';
  if (round.mode === 'scene' && round.answer[slot] !== tile.id) {
    round.misses[slot] = (round.misses[slot] || 0) + 1;
    return 'wrong-tile';
  }
  round.placed[slot] = tile.id;
  round.complete = round.slots.every((k) => round.placed[k]);
  return 'ok';
}

// After this many wrong tiles on one slot, the right tile gets a gentle outline.
export const HELP_AFTER = 3;
export const helpTile = (round, slot) => (round.mode === 'scene' && (round.misses[slot] || 0) >= HELP_AFTER && !round.placed[slot] ? round.answer[slot] : null);

export function roundSentence(data, round) {
  if (!round.complete) return null;
  const p = {};
  for (const k of round.slots) p[k] = tileOf(data, k, round.placed[k]);
  return composeSentence(p);
}

// Scenes for a session: this stage only, newest-first avoidance of the ones just played.
export function pickScenes(scenes, stageId, n, recentIds = [], rnd = Math.random) {
  const all = scenes.filter((s) => s.stage === stageId);
  const fresh = all.filter((s) => !recentIds.includes(s.id));
  const pool = fresh.length >= n ? fresh : all;
  const out = pickN(pool, Math.min(n, pool.length), rnd);
  // fewer scenes than the target: repeat from the start rather than end the session early
  while (out.length < n && all.length) out.push(all[out.length % all.length]);
  return out;
}

// ---------- saved data ----------
export function normaliseSave(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const count = (v) => (Number.isInteger(v) && v >= 0 ? Math.min(v, 9999) : 0);
  const done = r.done && typeof r.done === 'object' ? r.done : {};
  return {
    v: SAVE_VERSION,
    mode: r.mode === 'silly' ? 'silly' : 'scene',
    stage: [1, 2, 3].includes(r.stage) ? r.stage : 1,
    done: { 1: count(done[1]), 2: count(done[2]), 3: count(done[3]) },
    recent: Array.isArray(r.recent) ? r.recent.filter((x) => typeof x === 'string').slice(-RECENT_KEEP) : [],
  };
}
export function unlockedStage(save) {
  let s = 1;
  if (save.done[1] >= UNLOCK_AT) s = 2;
  if (s === 2 && save.done[2] >= UNLOCK_AT) s = 3;
  return s;
}
// A finished describe-the-picture sentence: counts toward the stage it was played on.
export function recordSentence(save, round) {
  if (round.mode !== 'scene') return save;
  const next = { ...save, done: { ...save.done } };
  next.done[round.stage] += 1;
  next.recent = [...save.recent, round.scene.id].slice(-RECENT_KEEP);
  return next;
}
// The stage to offer first: never a locked one.
export const clampStage = (save) => Math.min(save.stage, unlockedStage(save));
