// main.js — Sentence Blocks entry point: screens, input, saved data and sound.
// State lives in top-level bindings on purpose: the built page is one classic script, and the Playwright test reads them.
import { SLOT_ORDER, TARGET_SENTENCES, UNLOCK_AT, STAGES, normaliseSave, unlockedStage, clampStage, recordSentence, pickScenes,
  buildSceneRound, buildSillyRound, tryPlace, helpTile, roundSentence, sentenceParts, tileOf, tileText } from './engine.js';
import { DATA } from './words.js';
import { SCENES } from './scenes.js';
import { pictureSvg, sceneSvg } from './pictures.js';

const GAME_ID = 'sentence-blocks';
const SLOT_LABEL = { describe: 'Describe', who: 'Who?', doing: 'What doing?', what: 'What?', where: 'Where?' };
const $ = (id) => document.getElementById(id);
const sfx = (n) => { if (window.KidsGames) window.KidsGames.sfx(n); };
const say = (t) => { if (window.KidsGames) window.KidsGames.say(t); };

const ICON_TICK = '<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>';
const ICON_CROSS = '<svg class="ic" aria-hidden="true"><use href="#i-close"/></svg>';
const ICON_LOCK = '<svg class="ic sb-lock" viewBox="0 0 96 96" aria-hidden="true"><path d="M30 44V32a18 18 0 0 1 36 0v12M20 44h56v42H20ZM48 58v14"/></svg>';

let save = normaliseSave(null);   // this player's saved data
let session = null;               // { mode, stage, scenes, index, done, startUnlocked }
let round = null;                 // the sentence being built (see engine.js)
let held = null;                  // the tray tile the child has picked up: { slot, id }
let shownScene = null;            // the scene id whose picture is on screen

// ===== SAVED DATA (per player, via the shell) =====
function loadSaved() {
  save = normaliseSave(window.KidsGames && window.KidsGames.loadGameData(GAME_ID));
  save.stage = clampStage(save);
  renderSettings();
}
function persist() { if (window.KidsGames) window.KidsGames.saveGameData(GAME_ID, save); }
function showScreen(id) { for (const s of ['sb-settings', 'sb-board', 'sb-done']) $(s).hidden = s !== id; }

// ===== SETTINGS =====
function squaresHtml(on, total) {
  let h = '';
  for (let i = 0; i < total; i++) h += '<i' + (i < on ? ' class="on"' : '') + '></i>';
  return h;
}
function renderSettings() {
  const unlocked = unlockedStage(save);
  for (const b of document.querySelectorAll('#sb-mode-row [data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === save.mode));
  $('sb-stage-row').innerHTML = STAGES.map((st) => {
    const locked = st.id > unlocked;
    const slots = new Set(st.frames.flatMap((f) => f.slots));
    const pills = SLOT_ORDER.filter((k) => slots.has(k)).map((k) => '<span class="sb-pill sb-pill--' + k + '">' + SLOT_LABEL[k] + '</span>').join('');
    const prog = st.id < STAGES.length && !locked
      ? '<span class="kg-squares sb-prog" role="img" aria-label="' + Math.min(save.done[st.id], UNLOCK_AT) + ' of ' + UNLOCK_AT + ' sentences to open the next stage">' + squaresHtml(Math.min(save.done[st.id], UNLOCK_AT), UNLOCK_AT) + '</span>' : '';
    return '<button type="button" class="kg-seg__opt sb-opt sb-stage" data-stage="' + st.id + '" aria-pressed="' + String(!locked && st.id === save.stage) + '"' +
      (locked ? ' aria-disabled="true"' : '') + '><span class="sb-opt__name">Stage ' + st.id + (locked ? ICON_LOCK : '') + '</span>' +
      '<small>' + st.name + '</small><span class="sb-pills">' + pills + '</span>' + prog + '</button>';
  }).join('');
}

// ===== A SESSION: five sentences =====
function startSession() {
  save.stage = clampStage(save);
  const scenes = save.mode === 'scene' ? pickScenes(SCENES, save.stage, TARGET_SENTENCES, save.recent) : [];
  if (save.mode === 'scene' && !scenes.length) { say('There are no pictures for this stage yet.'); return; }
  session = { mode: save.mode, stage: save.stage, scenes, index: 0, done: 0, startUnlocked: unlockedStage(save) };
  showScreen('sb-board');
  nextRound();
}
function nextRound() {
  round = session.mode === 'scene' ? buildSceneRound(DATA, session.scenes[session.index]) : buildSillyRound(DATA, session.stage);
  held = null;
  shownScene = null;
  renderBoard();
  const first = $('sb-tray').querySelector('.sb-tile');
  if (first) first.focus();
}
function finishSession() {
  if (window.KidsGames) window.KidsGames.recordSession(GAME_ID);
  $('sb-done-title').textContent = 'You built ' + session.done + ' sentences!';
  $('sb-done-squares').innerHTML = squaresHtml(session.done, session.done);
  $('sb-done-squares').setAttribute('aria-label', session.done + ' sentences built');
  const now = unlockedStage(save);
  const note = $('sb-unlock');
  note.hidden = now <= session.startUnlocked;
  if (!note.hidden) note.innerHTML = ICON_TICK + '<span>Stage ' + now + ' is open now!</span>';
  showScreen('sb-done');
  $('sb-again').focus();
}

// ===== THE BOARD =====
const picsOf = (tile) => pictureSvg(tile.pic) + (tile.plural ? pictureSvg(tile.pic) : '');
const slotButton = (k) => $('sb-slots').querySelector('[data-slot="' + k + '"]');
const picks = () => Object.fromEntries(round.slots.map((k) => [k, tileOf(DATA, k, round.placed[k])]));

function slotHtml(k) {
  return '<li><button type="button" class="sb-slot sb-slot--' + k + '" data-slot="' + k + '" aria-label="' + SLOT_LABEL[k] + ', empty">' +
    '<span class="sb-slot__glyph">' + pictureSvg(k) + '</span><span class="sb-slot__label">' + SLOT_LABEL[k] + '</span>' +
    '<span class="sb-slot__fill"></span><span class="sb-slot__tick" aria-hidden="true">' + ICON_TICK + '</span></button></li>';
}
function tileHtml(t) {
  const tile = tileOf(DATA, t.slot, t.id);
  return '<button type="button" class="sb-tile sb-tile--' + t.slot + '" data-slot="' + t.slot + '" data-id="' + t.id + '" aria-pressed="false">' +
    '<span class="sb-tile__badge">' + pictureSvg(t.slot) + '</span><span class="sb-tile__pic">' + picsOf(tile) + '</span>' +
    '<span class="sb-tile__word">' + tileText(t.slot, tile) + '</span><span class="sb-tile__cross" aria-hidden="true">' + ICON_CROSS + '</span></button>';
}
function renderBoard() {
  $('sb-progress').innerHTML = squaresHtml(session.done, TARGET_SENTENCES);
  $('sb-progress').setAttribute('aria-label', session.done + ' of ' + TARGET_SENTENCES + ' sentences built');
  $('sb-slots').style.setProperty('--n', round.slots.length);
  $('sb-slots').innerHTML = round.slots.map(slotHtml).join('');
  $('sb-tray').innerHTML = round.tray.map(tileHtml).join('');
  $('sb-sentence').hidden = true;
  $('sb-sentence').innerHTML = '';
  $('sb-next').hidden = true;
  syncBoard();
}
function renderPicture() {
  const el = $('sb-picture');
  if (round.mode === 'scene') {
    if (shownScene !== round.scene.id) {
      el.innerHTML = sceneSvg(round.scene);
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', 'A picture to describe');
      shownScene = round.scene.id;
    }
    return;
  }
  shownScene = null;
  el.removeAttribute('role');
  el.removeAttribute('aria-label');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = round.slots.map((k) => round.placed[k]
    ? '<span class="sb-scene__pic">' + picsOf(tileOf(DATA, k, round.placed[k])) + '</span>' : '<span class="sb-scene__gap"></span>').join('');
}
// Redraw everything that depends on what is placed or held.
function syncBoard() {
  for (const k of round.slots) {
    const el = slotButton(k), id = round.placed[k];
    if (id) {
      const tile = tileOf(DATA, k, id);
      el.querySelector('.sb-slot__fill').innerHTML = '<span class="sb-slot__pic">' + picsOf(tile) + '</span><span class="sb-slot__word">' + tileText(k, tile) + '</span>';
      el.setAttribute('aria-label', SLOT_LABEL[k] + ': ' + tileText(k, tile));
    } else {
      el.querySelector('.sb-slot__fill').innerHTML = '';
      el.setAttribute('aria-label', SLOT_LABEL[k] + ', empty');
    }
    el.classList.toggle('is-filled', !!id);
  }
  const help = {};
  for (const k of round.slots) help[k] = helpTile(round, k);
  for (const b of $('sb-tray').querySelectorAll('.sb-tile')) {
    const k = b.dataset.slot, id = b.dataset.id;
    const used = round.placed[k] === id;
    const isHeld = !!held && held.slot === k && held.id === id;
    b.disabled = used;
    b.classList.toggle('is-used', used);
    b.classList.toggle('is-held', isHeld);
    b.classList.toggle('is-help', help[k] === id);
    b.setAttribute('aria-pressed', String(isHeld));
  }
  renderPicture();
}

// ===== INPUT: pick a tile up, then choose a slot =====
function pickUp(tile) {
  if (held && held.slot === tile.slot && held.id === tile.id) { held = null; say('Put down.'); syncBoard(); return; }
  held = tile;
  sfx('tap');
  say('Picked up ' + tileText(tile.slot, tileOf(DATA, tile.slot, tile.id)) + '. Choose a slot.');
  syncBoard();
  const target = round.slots.map(slotButton).find((b) => !b.classList.contains('is-filled')) || slotButton(round.slots[0]);
  if (target) target.focus();
}
function bounce(tile) {
  const b = $('sb-tray').querySelector('[data-slot="' + tile.slot + '"][data-id="' + tile.id + '"]');
  if (!b) return;
  b.classList.add('is-bounce');
  setTimeout(() => b.classList.remove('is-bounce'), 450);
}
function drop(slot) {
  const tile = held;
  const result = tryPlace(round, tile, slot);
  held = null;
  if (result === 'ok') {
    sfx('match');
    syncBoard();
    say(tileText(slot, tileOf(DATA, slot, tile.id)) + ' placed.');
    afterPlace();
    return;
  }
  sfx('mismatch');
  bounce(tile);
  syncBoard();
  say(result === 'wrong-slot' ? 'That one goes in a different colour.' : 'Not that one. Try another.');
  const back = $('sb-tray').querySelector('[data-slot="' + tile.slot + '"][data-id="' + tile.id + '"]');
  if (back && !back.disabled) back.focus();
}
// A finished sentence: show it in the slot colours, count it once, offer Next. Nothing advances by itself.
function afterPlace() {
  if (!round.complete) return;
  const parts = sentenceParts(picks());
  $('sb-sentence').hidden = false;
  $('sb-sentence').innerHTML = parts.map((p) => '<span class="sb-w sb-w--' + (p.slot || 'join') + '">' + p.text + '</span>').join(' ');
  say(roundSentence(DATA, round));
  if (!round.counted) {
    round.counted = true;
    save = recordSentence(save, round);
    session.done++;
    persist();
    $('sb-progress').innerHTML = squaresHtml(session.done, TARGET_SENTENCES);
    $('sb-progress').setAttribute('aria-label', session.done + ' of ' + TARGET_SENTENCES + ' sentences built');
  }
  $('sb-next').hidden = false;
  $('sb-next-label').textContent = session.done >= TARGET_SENTENCES ? 'Finish' : 'Next';
  if (document.activeElement === document.body || !document.activeElement.closest('#sb-tray')) $('sb-next').focus();
}

// ===== WIRING =====
$('sb-tray').addEventListener('click', (e) => {
  const b = e.target.closest('.sb-tile');
  if (!b || b.disabled) return;
  pickUp({ slot: b.dataset.slot, id: b.dataset.id });
});
$('sb-slots').addEventListener('click', (e) => {
  const b = e.target.closest('.sb-slot');
  if (!b) return;
  if (!held) { say('Pick a tile first.'); return; }
  drop(b.dataset.slot);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && held && !$('sb-board').hidden) { held = null; say('Put down.'); syncBoard(); }
});
$('sb-next').addEventListener('click', () => {
  if (session.done >= TARGET_SENTENCES) { finishSession(); return; }
  session.index++;
  nextRound();
});
$('sb-stop').addEventListener('click', () => { renderSettings(); showScreen('sb-settings'); $('sb-play-btn').focus(); });
$('sb-play-btn').addEventListener('click', startSession);
$('sb-again').addEventListener('click', startSession);
$('sb-choose').addEventListener('click', () => { renderSettings(); showScreen('sb-settings'); $('sb-play-btn').focus(); });
$('sb-mode-row').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]');
  if (!b) return;
  save.mode = b.dataset.mode;
  persist();
  sfx('tap');
  renderSettings();
  $('sb-mode-row').querySelector('[data-mode="' + save.mode + '"]').focus();
});
$('sb-stage-row').addEventListener('click', (e) => {
  const b = e.target.closest('[data-stage]');
  if (!b) return;
  if (b.getAttribute('aria-disabled') === 'true') { say('Finish the stage before this one first.'); return; }
  save.stage = Number(b.dataset.stage);
  persist();
  sfx('tap');
  renderSettings();
  $('sb-stage-row').querySelector('[data-stage="' + save.stage + '"]').focus();
});

// ===== START =====
loadSaved();
if (window.KidsGames) {
  // The player can change after the page loads (first visit, switching player): load their choices.
  window.KidsGames.onPlayerChange(function () {
    if (!$('sb-settings').hidden) loadSaved();
  });
}
