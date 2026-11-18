// main.js: Money screens, input, saved data and sound. State lives in top-level bindings on purpose: the built page is one
// classic script, and the Playwright test reads (and, for the 3,000-square check, sets) them.
import { AS_OF, ITEMS } from './items.js';
import { ACTIVITIES, LEVEL_IDS, defaultsFor, normaliseSave } from './engine.js';
import { pictureSvg } from './pictures.js';

const GAME_ID = 'money';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Short tile names. `pic` is the chrome picture id looked up in pictures.js (absent until those are drawn: the tile then shows its name only).
const ACTIVITY_TEXT = {
  guess: { name: 'Which costs more?', pic: 'activity-guess' },
  sort: { name: 'Cheapest first', pic: 'activity-sort' },
  buy: { name: 'Can you buy it?', pic: 'activity-buy' },
  howmany: { name: 'How many coins?', pic: 'activity-howmany' },
  price: { name: "What's the price?", pic: 'activity-price' },
};
const LEVEL_TEXT = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
// Activities that have a screen. Tapping a tile for one that is not here still chooses it (and saves the choice), but Play is
// disabled with a short note instead of starting something unbuilt. Later tasks add their ids here.
const IMPLEMENTED = new Set(['guess']);
const ITEM_IDS = ITEMS.map((i) => i.id);

const $ = (id) => document.getElementById(id);
const sfx = (n) => { if (window.KidsGames) window.KidsGames.sfx(n); };

let save = normaliseSave(null, ITEM_IDS);   // this player's saved data: choices, misses, recent

// ===== SAVED DATA (per player, via the shell) =====
function loadSaved() {
  const KG = window.KidsGames;
  const raw = KG ? KG.loadGameData(GAME_ID) : null;
  save = normaliseSave(raw, ITEM_IDS);
  // A first-time player has no valid choices yet: start from the age defaults. Saved choices always win.
  const d = defaultsFor(KG ? KG.player : null), r = raw && typeof raw === 'object' ? raw : {};
  if (!ACTIVITIES.includes(r.activity)) save.activity = d.activity;
  if (!LEVEL_IDS.includes(r.level)) save.level = d.level;
  renderSettings();
}
function persist() { if (window.KidsGames) window.KidsGames.saveGameData(GAME_ID, save); }
function showScreen(id) { for (const s of ['mo-settings']) $(s).hidden = s !== id; }

// ===== SETTINGS =====
function asOfText() {
  const m = /^(\d{4})-(\d{2})$/.exec(AS_OF);
  return m && MONTHS[Number(m[2]) - 1] ? 'Typical UK prices, checked ' + MONTHS[Number(m[2]) - 1] + ' ' + m[1] + '.' : 'Typical UK prices.';
}
function squaresHtml(on, total) {
  let h = '';
  for (let i = 0; i < total; i++) h += '<i' + (i < on ? ' class="on"' : '') + '></i>';
  return h;
}
function renderSettings() {
  const mark = pictureSvg('m-money');
  $('mo-mark').innerHTML = mark;
  $('mo-mark').hidden = !mark;
  $('mo-act-row').innerHTML = ACTIVITIES.map((a) => {
    const pic = pictureSvg(ACTIVITY_TEXT[a].pic);
    return '<button type="button" class="kg-seg__opt mo-act" data-activity="' + a + '" aria-pressed="' + String(a === save.activity) + '">' +
      (pic ? '<span class="mo-act__pic">' + pic + '</span>' : '') + '<span class="mo-act__name">' + ACTIVITY_TEXT[a].name + '</span></button>';
  }).join('');
  $('mo-level-row').innerHTML = LEVEL_IDS.map((l, i) =>
    '<button type="button" class="kg-seg__opt mo-level" data-level="' + l + '" aria-pressed="' + String(l === save.level) + '">' +
    '<span class="kg-squares" aria-hidden="true">' + squaresHtml(i + 1, 3) + '</span><span>' + LEVEL_TEXT[l] + '</span></button>').join('');
  const ready = IMPLEMENTED.has(save.activity);
  $('mo-play-btn').disabled = !ready;
  $('mo-note').textContent = ready ? asOfText() : 'This one is not ready yet. Try Which costs more?';
}

$('mo-act-row').addEventListener('click', (e) => {
  const b = e.target.closest('[data-activity]');
  if (!b) return;
  save.activity = b.dataset.activity;
  persist();
  sfx('tap');
  renderSettings();
  $('mo-act-row').querySelector('[data-activity="' + save.activity + '"]').focus();
});
$('mo-level-row').addEventListener('click', (e) => {
  const b = e.target.closest('[data-level]');
  if (!b) return;
  save.level = b.dataset.level;
  persist();
  sfx('tap');
  renderSettings();
  $('mo-level-row').querySelector('[data-level="' + save.level + '"]').focus();
});

// ===== START =====
loadSaved();
if (window.KidsGames) {
  // The player can change after the page loads (first visit, switching player): load their choices.
  window.KidsGames.onPlayerChange(function () {
    if (!$('mo-settings').hidden) loadSaved();
  });
}
