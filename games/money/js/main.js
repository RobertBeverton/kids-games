// main.js: Money screens, input, saved data and sound. State lives in top-level bindings on purpose: the built page is one
// classic script, and the Playwright test reads (and, for the 3,000-square check, sets) them.
import { AS_OF, ITEMS } from './items.js';
import { ACTIVITIES, LEVEL_IDS, ROUND_LENGTH, defaultsFor, normaliseSave, recordMisses, buildSession, wallFor, wallLayout, priceTagText, formatPrice, gradeSortTap, sortMissesFor, gradeBuy } from './engine.js';
import { pictureSvg } from './pictures.js';

const GAME_ID = 'money';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Short tile names. `pic` is the chrome picture id looked up in pictures.js (absent until those are drawn: the tile then shows its name only).
const ACTIVITY_TEXT = {
  guess: { name: 'Which costs more?', pic: 'activity-guess' },
  sort: { name: 'Put in order', pic: 'activity-sort' },
  buy: { name: 'Can you buy it?', pic: 'activity-buy' },
  howmany: { name: 'How many coins?', pic: 'activity-howmany' },
  price: { name: "What's the price?", pic: 'activity-price' },
};
const LEVEL_TEXT = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
// Activities that have a screen. Tapping a tile for one that is not here still chooses it (and saves the choice), but Play is
// disabled with a short note instead of starting something unbuilt. Later tasks add their ids here.
const IMPLEMENTED = new Set(['guess', 'sort', 'buy', 'howmany']);
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
function showScreen(id) { for (const s of ['mo-settings', 'mo-game', 'mo-results']) $(s).hidden = s !== id; }

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

// ===== SHARED GAME PARTS (all activities) =====
const ICON_TICK = '<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>';
const ICON_CROSS = '<svg class="ic" aria-hidden="true"><use href="#i-close"/></svg>';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let mode = 'guess';   // the activity being played: guess, sort, buy, howmany or price
let session = null;   // { questions, index }: guess { left, right, dearId }, sort { items, order }, buy { budget, shelf, buyIds }, howmany { item, options, correctCount }
let phase = 'ask';    // 'ask' (nothing tapped), 'find' (tapped wrong: the right one must be tapped), 'done' (Next shows)
let shown = null;     // the Money Wall maths of the question on screen once it is revealed: { unit, items: [{ squares, dot }] }

function startSession() {
  try {
    mode = save.activity;
    session = { questions: buildSession(mode, save.level, ITEMS, Math.random, save), index: 0 };
  } catch (e) {
    console.error(e);
    say('Sorry, that did not start. Try another level.');
    return;
  }
  showScreen('mo-game');
  showQuestion();
}

function renderProgress() {
  $('mo-progress').innerHTML = squaresHtml(session.index, ROUND_LENGTH);
  $('mo-progress').setAttribute('aria-label', 'Question ' + (session.index + 1) + ' of ' + ROUND_LENGTH);
}
function setPrompt(word, sub, glyph) {
  $('mo-prompt').innerHTML = (glyph || '') + '<span class="mo-prompt__word">' + esc(word) + '</span>' + (sub ? '<small>' + esc(sub) + '</small>' : '');
}
// ----- Which costs more? -----
// An item with no drawing yet is a plain tile with its name. The aria-label is the name only: no price before the answer.
function itemHtml(item) {
  const pic = pictureSvg(item.id);
  return '<div class="mo-card" data-id="' + item.id + '"><button type="button" class="kg-tile mo-item" data-id="' + item.id + '" aria-label="' + esc(item.name) + '">' +
    (pic ? '<span class="mo-item__pic">' + pic + '</span>' : '') + '<span class="mo-item__name">' + esc(item.name) + '</span></button>' +
    '<div class="mo-reveal" hidden><div class="mo-slot" aria-hidden="true"></div><p class="mo-tag"></p></div></div>';
}
const PANES = { guess: 'mo-cards', sort: 'mo-sort', buy: 'mo-buy', howmany: 'mo-howmany' };
function showQuestion() {
  const q = session.questions[session.index];
  phase = 'ask';
  shown = null;
  $('mo-game').dataset.mode = mode;
  renderProgress();
  for (const m of Object.keys(PANES)) { $(PANES[m]).hidden = m !== mode; if (m !== mode) $(PANES[m]).innerHTML = ''; }
  $('mo-caption').classList.add('is-off');
  $('mo-next').hidden = true;
  $('mo-done').hidden = true;
  if (mode === 'sort') showSort(q);
  else if (mode === 'buy') showBuy(q);
  else if (mode === 'howmany') showHowMany(q);
  else {
    setPrompt('Which costs more?');
    $('mo-cards').innerHTML = itemHtml(q.left) + itemHtml(q.right);
  }
}

// ---- the Money Wall: CSS only. One masked block (a tiled square with a gap) plus one short row for the remainder; no element per square. ----
const WALL_PAD = 3;       // room round the wall inside its slot, so the keyline is not clipped
const WALL_CELL_MAX = 28;
function maskUrl(cell, gap, inset) {
  const s = cell - gap - 2 * inset;
  return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + cell + '" height="' + cell + '"><rect x="' + inset + '" y="' + inset + '" width="' + s + '" height="' + s + '"/></svg>') + '")';
}
function wallPart(cols, rows, cell) {
  const el = document.createElement('div');
  el.className = 'mo-wall';
  el.style.width = cols * cell + 'px';
  el.style.height = rows * cell + 'px';
  if (cell < 3) { el.classList.add('mo-wall--solid'); return el; }          // too small for gaps: one gold block with a keyline
  const gap = cell >= 10 ? 2 : 1, inset = cell >= 14 ? 2 : cell >= 8 ? 1 : 0;   // ink keyline round each square from 8px up
  el.style.setProperty('--c', cell + 'px');
  el.style.setProperty('--m-ink', maskUrl(cell, gap, 0));
  el.style.setProperty('--m-gold', maskUrl(cell, gap, inset));
  return el;
}
function buildWall(item, cell) {
  const box = document.createElement('div');
  box.className = 'mo-wallbox';
  if (item.dot) {
    const dot = document.createElement('span');
    dot.className = 'mo-dot';
    box.appendChild(dot);
    return box;
  }
  const lay = wallLayout(item.squares);
  box.appendChild(wallPart(lay.cols, lay.fullRows, cell));
  if (lay.rest) box.appendChild(wallPart(lay.rest, 1, cell));
  return box;
}
// One cell size for both walls (same scale), as big as fits the smaller slot, at most WALL_CELL_MAX.
function layoutWalls() {
  if (!shown) return;
  const slots = [...$(PANES[mode]).querySelectorAll('.mo-slot')];
  let cols = 1, rows = 1;
  for (const it of shown.items) {
    if (it.dot) continue;
    const l = wallLayout(it.squares);
    cols = Math.max(cols, l.cols);
    rows = Math.max(rows, l.fullRows + (l.rest ? 1 : 0));
  }
  const w = Math.min(...slots.map((s) => s.clientWidth)) - 2 * WALL_PAD, h = Math.min(...slots.map((s) => s.clientHeight)) - 2 * WALL_PAD;
  const cell = Math.max(1, Math.min(WALL_CELL_MAX, Math.floor(Math.min(w / cols, h / rows))));
  slots.forEach((slot, i) => { slot.replaceChildren(buildWall(shown.items[i], cell)); });
}

function reveal(q) {
  shown = wallFor([q.left.pence, q.right.pence]);
  document.querySelectorAll('.mo-card').forEach((card, i) => {
    const item = i === 0 ? q.left : q.right;
    card.classList.add('is-revealed');
    card.querySelector('.mo-reveal').hidden = false;
    card.querySelector('.mo-tag').textContent = priceTagText(item.pence);
  });
  $('mo-caption').textContent = 'each square = ' + formatPrice(shown.unit);
  $('mo-caption').classList.remove('is-off');
  layoutWalls();
}
const tagsSpeech = (q) => q.left.name + ', ' + priceTagText(q.left.pence) + '. ' + q.right.name + ', ' + priceTagText(q.right.pence) + '.';
const say = (t) => { if (window.KidsGames) window.KidsGames.say(t); };
function setMark(id, cls) {
  const b = $('mo-cards').querySelector('.mo-item[data-id="' + id + '"]');
  b.classList.remove('is-hint');
  if (cls) b.classList.add(cls);
  return b;
}
function showNext() {
  phase = 'done';
  $('mo-next-label').textContent = session.index + 1 >= ROUND_LENGTH ? 'Finish' : 'Next';
  $('mo-done').hidden = true;
  $('mo-next').hidden = false;
  $('mo-next').focus();
}

function answer(id) {
  const q = session.questions[session.index];
  if (phase === 'ask') {
    if (id === q.dearId) {
      sfx('right');
      $('mo-cards').querySelectorAll('.mo-item').forEach((b) => { b.disabled = true; });
      setMark(id, 'is-right');
      setPrompt('Right', '', ICON_TICK);
      reveal(q);
      showNext();
      say('Right. ' + tagsSpeech(q));
    } else {
      sfx('wrong');
      // Both items of a missed pair come back later.
      save = recordMisses(save, [q.left.id, q.right.id]);
      persist();
      setMark(id, 'is-wrong').disabled = true;
      setPrompt('Not this one', 'Tap the one that costs more', ICON_CROSS);
      reveal(q);
      phase = 'find';
      setMark(q.dearId, 'is-hint').focus();
      say('Not this one. Tap the one that costs more. ' + tagsSpeech(q));
    }
  } else if (phase === 'find' && id === q.dearId) {
    sfx('right');
    $('mo-cards').querySelectorAll('.mo-item').forEach((b) => { b.disabled = true; });
    setMark(id, 'is-right');
    setPrompt('This one costs more', '', ICON_TICK);
    showNext();
  }
}
$('mo-cards').addEventListener('click', (e) => {
  const b = e.target.closest('.mo-item');
  if (b && !b.disabled) answer(b.dataset.id);
});
$('mo-next').addEventListener('click', () => {
  sfx('tap');
  session.index += 1;
  if (session.index >= ROUND_LENGTH) { showResults(); return; }
  showQuestion();
  const first = $(PANES[mode]).querySelector('button:not(:disabled)');
  if (first) first.focus();
});
$('mo-stop').addEventListener('click', () => { sfx('tap'); session = null; shown = null; showScreen('mo-settings'); });
$('mo-play-btn').addEventListener('click', () => { if (IMPLEMENTED.has(save.activity)) { sfx('start'); startSession(); } });
let relayoutQueued = false;
window.addEventListener('resize', () => {
  if (relayoutQueued || !shown) return;
  relayoutQueued = true;
  requestAnimationFrame(() => { relayoutQueued = false; layoutWalls(); });
});

// ===== PUT IN ORDER =====
// The child taps the items from the one that costs least up. `placed` is the ids already in their slots; `tapsLog` is every tap
// ({ position, tappedId }) for sortMissesFor. Nothing here shows a price or an order number until the set is finished.
let placed = [], tapsLog = [];
const sortItemHtml = (item) => {
  const pic = pictureSvg(item.id);
  return '<button type="button" class="kg-tile mo-item mo-sitem" data-id="' + item.id + '" aria-label="' + esc(item.name) + '">' +
    (pic ? '<span class="mo-item__pic">' + pic + '</span>' : '') + '<span class="mo-item__name">' + esc(item.name) + '</span></button>';
};
function showSort(q) {
  placed = [];
  tapsLog = [];
  setPrompt('Tap the one that costs least.');
  $('mo-sort').classList.remove('is-revealed');
  const last = q.items.length - 1;
  // The end labels (a word and a glyph) sit in the first and last empty slots and give way to the item that lands there.
  const endLabel = (i) => i === 0 ? '<span class="mo-slabel">▲ costs least</span>' : i === last ? '<span class="mo-slabel">▼ costs most</span>' : '';
  $('mo-sort').innerHTML = '<div class="mo-slots">' +
    q.items.map((x, i) => '<div class="mo-srow"><span class="mo-snum" aria-hidden="true">' + (i + 1) + '</span><div class="mo-sbody">' + endLabel(i) + '</div><p class="mo-tag" hidden></p></div>').join('') +
    '</div>' +
    '<div class="mo-pool" id="mo-pool">' + q.items.map(sortItemHtml).join('') + '</div>' +
    '<div class="mo-walls" id="mo-walls" hidden></div>';
}
function sortTap(id) {
  const q = session.questions[session.index];
  const before = sortMissesFor(q, tapsLog).length;
  const pos = placed.length;
  tapsLog.push({ position: pos, tappedId: id });
  const fresh = sortMissesFor(q, tapsLog).slice(before);
  if (fresh.length) { save = recordMisses(save, fresh); persist(); }
  const btn = $('mo-sort').querySelector('.mo-sitem[data-id="' + id + '"]');
  $('mo-sort').querySelectorAll('.mo-sitem.is-wrong').forEach((b) => b.classList.remove('is-wrong'));
  if (!gradeSortTap(q, placed, id).correct) {
    sfx('wrong');
    void btn.offsetWidth;   // restart the nudge if the same item is tapped twice
    btn.classList.add('is-wrong');
    setPrompt('Not this one', 'Tap the one that costs least', ICON_CROSS);
    say('Not this one. Tap the one that costs least.');
    return;
  }
  sfx('right');
  placed.push(id);
  btn.classList.add('is-placed');
  btn.disabled = true;
  $('mo-sort').querySelector('.mo-slots').children[pos].querySelector('.mo-sbody').appendChild(btn);
  if (placed.length < q.items.length) {
    setPrompt('Right', 'Now the next one that costs least', ICON_TICK);
    const next = $('mo-pool').querySelector('.mo-sitem:not(:disabled)');
    if (next) next.focus();
    return;
  }
  revealSort(q);
}
function revealSort(q) {
  const ordered = q.order.map((id) => q.items.find((i) => i.id === id));
  const low = ordered[0], high = ordered[ordered.length - 1];
  shown = wallFor([low.pence, high.pence]);   // walls for the two ends only; the middle items get a tag
  setPrompt('Right', '', ICON_TICK);
  $('mo-pool').hidden = true;
  $('mo-sort').classList.add('is-revealed');
  $('mo-sort').querySelectorAll('.mo-srow').forEach((row, i) => {
    const tag = row.querySelector('.mo-tag');
    tag.textContent = priceTagText(ordered[i].pence);
    tag.hidden = false;
  });
  const walls = $('mo-walls');
  walls.innerHTML = [low, high].map((it) => '<div class="mo-wp"><span class="mo-wp__name">' + esc(it.name) + '</span><div class="mo-slot" aria-hidden="true"></div></div>').join('');
  walls.hidden = false;
  $('mo-caption').textContent = 'each square = ' + formatPrice(shown.unit);
  $('mo-caption').classList.remove('is-off');
  layoutWalls();
  showNext();
  say('Right. ' + ordered.map((it) => it.name + ', ' + priceTagText(it.pence) + '.').join(' '));
}
$('mo-sort').addEventListener('click', (e) => {
  const b = e.target.closest('.mo-sitem');
  if (b && !b.disabled && phase === 'ask') sortTap(b.dataset.id);
});

// ===== CAN YOU BUY IT? =====
// The budget and the price tags are shown on purpose: this one is about a budget. Items toggle; Done grades them.
let picked = new Set();
const BUY_FLAG = { chosen: 'You tapped it', missed: 'You missed it' };
function showBuy(q) {
  picked = new Set();
  setPrompt('Tap everything you can buy.');
  const wallet = pictureSvg('wallet');   // '' until the wallet is drawn: the box and the numerals carry it alone
  $('mo-buy').innerHTML = '<div class="mo-wallet" role="group" aria-label="You have ' + esc(formatPrice(q.budget)) + '">' +
    (wallet ? '<span class="mo-wallet__pic">' + wallet + '</span>' : '') +
    '<span class="mo-wallet__label" aria-hidden="true">You have</span><span class="mo-wallet__sum" aria-hidden="true">' + esc(formatPrice(q.budget)) + '</span></div>' +
    '<div class="mo-shelf" id="mo-shelf">' + q.shelf.map((it) => {
      const pic = pictureSvg(it.id), price = 'about ' + formatPrice(it.pence);
      return '<button type="button" class="kg-tile mo-bitem" data-id="' + it.id + '" aria-pressed="false" aria-label="' + esc(it.name + ', ' + price) + '">' +
        (pic ? '<span class="mo-bitem__pic">' + pic + '</span>' : '') +
        '<span class="mo-bitem__text"><span class="mo-bitem__name">' + esc(it.name) + '</span><span class="mo-bitem__price">' + esc(price) + '</span>' +
        '</span><span class="mo-bitem__status" hidden></span>' +
        '<span class="mo-bmark" aria-hidden="true">' + ICON_TICK + '</span></button>';
    }).join('') + '</div>';
  $('mo-done').disabled = true;
  $('mo-done').hidden = false;
}
function buyToggle(b) {
  const id = b.dataset.id, on = !picked.has(id);
  if (on) picked.add(id); else picked.delete(id);
  b.setAttribute('aria-pressed', String(on));
  $('mo-done').disabled = picked.size === 0;
  sfx('tap');
}
function buyDone() {
  const q = session.questions[session.index];
  if (picked.size === 0 || phase !== 'ask') return;
  const g = gradeBuy(q, [...picked]);
  const flagged = new Set([...g.wronglyChosen, ...g.missed]);
  $('mo-shelf').querySelectorAll('.mo-bitem').forEach((b) => {
    const id = b.dataset.id, can = q.buyIds.includes(id), st = b.querySelector('.mo-bitem__status');
    b.disabled = true;
    b.classList.add(can ? 'is-can' : 'is-not');
    if (flagged.has(id)) b.classList.add('is-flag');
    st.hidden = false;
    st.innerHTML = (can ? ICON_TICK : ICON_CROSS) + '<span>' + (can ? 'Can buy' : 'Not enough') + '</span>' +
      (flagged.has(id) ? '<small>' + (can ? BUY_FLAG.missed : BUY_FLAG.chosen) + '</small>' : '');
  });
  const miss = [...g.wronglyChosen, ...g.missed];
  if (miss.length) { save = recordMisses(save, miss); persist(); }
  sfx(g.correct ? 'right' : 'wrong');
  if (g.correct) setPrompt('Right', '', ICON_TICK); else setPrompt('Not quite', '', ICON_CROSS);
  showNext();
  say((g.correct ? 'Right. ' : 'Not quite. ') + q.shelf.map((it) => it.name + ', about ' + formatPrice(it.pence) + ', ' + (q.buyIds.includes(it.id) ? 'can buy.' : 'not enough.')).join(' '));
}
$('mo-buy').addEventListener('click', (e) => {
  const b = e.target.closest('.mo-bitem');
  if (b && !b.disabled && phase === 'ask') buyToggle(b);
});
$('mo-done').addEventListener('click', () => { sfx('tap'); buyDone(); });

// ===== SHARED: the thing being asked about =====
// Its drawing and name; a plain name tile when there is no drawing yet. Nothing here carries a price.
function subjectHtml(item) {
  const pic = pictureSvg(item.id);
  return '<div class="mo-subject' + (pic ? '' : ' mo-subject--plain') + '">' + (pic ? '<span class="mo-subject__pic">' + pic + '</span>' : '') +
    '<span class="mo-subject__name">' + esc(item.name) + '</span></div>';
}
const wallsHtml = (labels) => labels.map((t) => '<div class="mo-wp"><span class="mo-wp__name">' + esc(t) + '</span><div class="mo-slot" aria-hidden="true"></div></div>').join('');
function setCaption(unit) {
  $('mo-caption').textContent = 'each square = ' + formatPrice(unit);
  $('mo-caption').classList.remove('is-off');
}

// ===== HOW MANY £1 COINS? =====
// Three counts as large buttons. The label is the number alone (no hint of which is right); a wrong tap shows the right one, which must be tapped.
const countText = (n) => n.toLocaleString('en-GB');
function showHowMany(q) {
  setPrompt('About how many £1 coins is this?');
  $('mo-howmany').classList.remove('is-revealed');
  $('mo-howmany').innerHTML = subjectHtml(q.item) +
    '<div class="mo-counts">' + q.options.map((n, i) => '<button type="button" class="kg-tile mo-count" data-i="' + i + '" aria-label="' + countText(n) + '">' + countText(n) + '</button>').join('') + '</div>' +
    '<div class="mo-reveal" hidden><div class="mo-slot" aria-hidden="true"></div><p class="mo-tag"></p></div>';
}
function revealHowMany(q) {
  shown = wallFor([q.item.pence]);
  $('mo-howmany').classList.add('is-revealed');
  $('mo-howmany').querySelector('.mo-reveal').hidden = false;
  $('mo-howmany').querySelector('.mo-tag').textContent = priceTagText(q.item.pence);
  setCaption(shown.unit);
  layoutWalls();
}
function howManyTap(b) {
  const q = session.questions[session.index], btns = [...$('mo-howmany').querySelectorAll('.mo-count')];
  const rightBtn = btns[q.options.indexOf(q.correctCount)], isRight = b === rightBtn;
  const finish = () => { btns.forEach((x) => { x.disabled = true; }); rightBtn.classList.remove('is-hint'); rightBtn.classList.add('is-right'); };
  if (phase === 'ask' && isRight) {
    sfx('right');
    finish();
    setPrompt('Right', '', ICON_TICK);
    revealHowMany(q);
    showNext();
    say('Right. ' + q.item.name + ', ' + priceTagText(q.item.pence) + '.');
  } else if (phase === 'ask') {
    sfx('wrong');
    save = recordMisses(save, [q.item.id]);
    persist();
    b.classList.add('is-wrong');
    b.disabled = true;
    setPrompt('Not this one', 'Tap the right number', ICON_CROSS);
    revealHowMany(q);
    phase = 'find';
    rightBtn.classList.add('is-hint');
    rightBtn.focus();
    say('Not this one. Tap the right number. ' + q.item.name + ', ' + priceTagText(q.item.pence) + '.');
  } else if (phase === 'find' && isRight) {
    sfx('right');
    finish();
    setPrompt('This is the one', '', ICON_TICK);
    showNext();
  } else if (phase === 'find') {
    sfx('wrong');   // another wrong number: nudge it, no second miss for the same question
    b.classList.add('is-wrong');
    b.disabled = true;
  }
}
$('mo-howmany').addEventListener('click', (e) => {
  const b = e.target.closest('.mo-count');
  if (b && !b.disabled) howManyTap(b);
});

// ---- results (kept simple until the full results task) ----
function showResults() {
  shown = null;
  $('mo-done-squares').innerHTML = squaresHtml(ROUND_LENGTH, ROUND_LENGTH);
  showScreen('mo-results');
  sfx('win');
  $('mo-again').focus();
}
$('mo-again').addEventListener('click', () => { sfx('start'); startSession(); });
$('mo-change').addEventListener('click', () => { sfx('tap'); session = null; showScreen('mo-settings'); });

// ===== START =====
loadSaved();
if (window.KidsGames) {
  // The player can change after the page loads (first visit, switching player): load their choices.
  window.KidsGames.onPlayerChange(function () {
    if (!$('mo-settings').hidden) loadSaved();
  });
}
