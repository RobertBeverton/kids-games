// main.js — Entry point, wires settings + game together
import { GameSession, ENDLESS_MIN_ANSWERS } from './game.js';
import { PRESETS, STYLES, formatQuestion, formatNumber } from './questions.js';

const GAME_ID = 'maths';          // storage and progress id (Number Bonds was merged into this game)
const OPS = ['+', '-', '*', '/', 'mixed'];
const MODES = ['sprint', 'round', 'endless'];

// --- Settings state ---
let settings = defaultSettings(null);

const DIFFICULTIES = ['easy', 'medium', 'hard', 'custom'];
const CUSTOM_HINT = 'Your own settings';

// Age drives the first-time defaults. Saved choices always win.
const BRACKET_AGE = { '4-5': 5, '6-8': 7, '9-12': 10, '13+': 14 };
function defaultSettings(player) {
  let difficulty = 'medium', mode = 'sprint';
  if (player) {
    const age = player.age != null ? player.age : (BRACKET_AGE[player.ageBracket] || 7);
    if (age <= 7) { difficulty = 'easy'; mode = 'round'; }       // Reception to Year 2: sums to 20, no clock
    else if (age <= 9) { difficulty = 'medium'; mode = 'sprint'; }
    else { difficulty = 'hard'; mode = 'sprint'; }
  }
  return { op: '+', style: 'answer', difficulty, mode, custom: { min: 1, max: 100, maxTable: 12, negatives: false, decimals: false } };
}

// --- DOM refs ---
const screens = {
  settings: document.getElementById('maths-settings'),
  game:     document.getElementById('maths-game'),
  results:  document.getElementById('maths-results'),
};
const $ = (id) => document.getElementById(id);

// --- Boot ---
loadSettings();
applyStyleFromAddress();
initSettingsScreen();
showScreen('settings');

// --- Initialise settings screen ---
function initSettingsScreen() {
  $('maths-style-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-style]');
    if (!btn) return;
    settings.style = btn.dataset.style;
    updateToggles('maths-style-row', 'style', settings.style);
    if (settings.difficulty === 'custom') updateComplexityPreview();
  });

  $('maths-op-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-op]');
    if (!btn) return;
    settings.op = btn.dataset.op;
    updateToggles('maths-op-row', 'op', settings.op);
    if (settings.difficulty === 'custom') updateComplexityPreview();
  });

  $('maths-diff-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-diff]');
    if (!btn) return;
    settings.difficulty = btn.dataset.diff;
    updateToggles('maths-diff-row', 'diff', settings.difficulty);
    updateDifficultyHint();
    $('maths-custom-opts').hidden = settings.difficulty !== 'custom';
    if (settings.difficulty === 'custom') updateComplexityPreview();
  });

  $('maths-mode-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    settings.mode = btn.dataset.mode;
    updateToggles('maths-mode-row', 'mode', settings.mode);
  });

  $('maths-min').addEventListener('input', e => { settings.custom.min = Number(e.target.value); updateComplexityPreview(); });
  $('maths-max').addEventListener('input', e => { settings.custom.max = Number(e.target.value); updateComplexityPreview(); });
  $('maths-table').addEventListener('input', e => { settings.custom.maxTable = Number(e.target.value); updateComplexityPreview(); });
  // A typed table below 2 would leave nothing to ask: tidy the box when the grown-up leaves it.
  $('maths-table').addEventListener('change', e => {
    const t = Math.max(2, Math.min(99, Math.trunc(Number(e.target.value)) || 2));
    e.target.value = t; settings.custom.maxTable = t; updateComplexityPreview();
  });
  $('maths-negatives').addEventListener('change', e => { settings.custom.negatives = e.target.checked; updateComplexityPreview(); });
  $('maths-decimals').addEventListener('change', e => { settings.custom.decimals = e.target.checked; updateComplexityPreview(); });

  $('maths-start-btn').addEventListener('click', startGame);
  applySettingsToUI();
}

function updateToggles(rowId, key, activeVal) {
  $(rowId).querySelectorAll(`[data-${key}]`).forEach(btn => {
    btn.setAttribute('aria-pressed', btn.dataset[key] === activeVal ? 'true' : 'false');
  });
}

function updateDifficultyHint() {
  const preset = PRESETS[settings.difficulty];
  $('maths-diff-hint').textContent = preset ? preset.hint : CUSTOM_HINT;
}

function applySettingsToUI() {
  updateToggles('maths-style-row', 'style', settings.style);
  updateToggles('maths-op-row', 'op', settings.op);
  updateToggles('maths-diff-row', 'diff', settings.difficulty);
  updateToggles('maths-mode-row', 'mode', settings.mode);
  updateDifficultyHint();
  $('maths-custom-opts').hidden = settings.difficulty !== 'custom';
  $('maths-min').value = settings.custom.min;
  $('maths-max').value = settings.custom.max;
  $('maths-table').value = settings.custom.maxTable;
  $('maths-negatives').checked = settings.custom.negatives;
  $('maths-decimals').checked = settings.custom.decimals;
  if (settings.difficulty === 'custom') updateComplexityPreview();
}

function getActiveRange() {
  if (settings.difficulty === 'custom') return { ...settings.custom, _difficulty: 'custom' };
  return { ...PRESETS[settings.difficulty], _difficulty: settings.difficulty };
}

// --- Complexity indicator (custom only), set against the English curriculum ---
const COMPLEXITY_LEVELS = [
  { label: 'Reception',  ages: 'Ages 4–5' },
  { label: 'Years 1–2', ages: 'Ages 5–7' },
  { label: 'Years 3–4', ages: 'Ages 7–9' },
  { label: 'Years 5–6', ages: 'Ages 9–11' },
  { label: 'Beyond',     ages: 'Ages 11+' },
];

function computeComplexity(op, custom) {
  const max = Math.max(Math.abs(Number(custom.min)) || 0, Math.abs(Number(custom.max)) || 0);
  const table = Math.max(2, Number(custom.maxTable) || 2);
  const addSub = max <= 10 ? 0 : max <= 20 ? 1 : max <= 100 ? 2 : max <= 1000 ? 3 : 4;
  const mulDiv = table <= 5 ? 1 : table <= 12 ? 2 : table <= 20 ? 3 : 4;
  let level;
  if (op === '+' || op === '-') level = addSub;
  else if (op === '*' || op === '/') level = mulDiv;
  else level = Math.max(addSub, mulDiv);
  if (custom.negatives || custom.decimals) level = Math.max(level, 3);   // negatives and decimals are Years 5–6
  return level;
}

function exampleQuestion(op, custom, style) {
  const max = Math.max(Math.abs(Number(custom.max)) || 10, 2);
  const table = Math.max(2, Number(custom.maxTable) || 2);
  const times = op === '*' || op === '/';
  const left = times ? Math.max(2, table - 1) : Math.round(max * 0.6);
  const right = times ? table : Math.round(max * 0.35);
  const q = { left, op: times ? '*' : '+', right, result: times ? left * right : left + right, blank: style === 'answer' ? 'result' : 'right' };
  return formatQuestion(q).text;
}

function updateComplexityPreview() {
  const info = COMPLEXITY_LEVELS[computeComplexity(settings.op, settings.custom)];
  $('maths-complexity-badge').textContent = info.label;
  $('maths-complexity-ages').textContent = info.ages;
  $('maths-complexity-example').textContent = 'e.g. ' + exampleQuestion(settings.op, settings.custom, settings.style);
}

// --- Screen management ---
function showScreen(name) {
  Object.keys(screens).forEach(k => screens[k].hidden = k !== name);
  window.scrollTo(0, 0);
}

// --- Persistence (per player, under the one 'maths' id) ---
function saveSettings() {
  try {
    const d = window.KidsGames.loadGameData(GAME_ID) || {};
    window.KidsGames.saveGameData(GAME_ID, { ...d, v: 2, settings });
  } catch (e) { /* ignore */ }
}

function loadSettings() {
  const fresh = defaultSettings(window.KidsGames && window.KidsGames.player);
  try {
    const d = window.KidsGames.loadGameData(GAME_ID);
    const saved = d && d.settings;
    if (saved) {
      settings = { ...fresh, ...saved, custom: { ...fresh.custom, ...(saved.custom || {}) } };
    } else {
      settings = fresh;   // a player who has never played starts from their own age, not the last player's choices
    }
  } catch (e) { settings = fresh; }
  if (!OPS.includes(settings.op)) settings.op = '+';
  if (!STYLES.includes(settings.style)) settings.style = 'answer';
  if (!DIFFICULTIES.includes(settings.difficulty)) settings.difficulty = fresh.difficulty;
  if (!MODES.includes(settings.mode)) settings.mode = fresh.mode;
}

// Old Number Bonds links point here as maths.html?style=missing
function applyStyleFromAddress() {
  try {
    const wanted = new URLSearchParams(window.location.search).get('style');
    if (STYLES.includes(wanted)) {
      settings.style = wanted;
      window.history.replaceState(null, '', window.location.pathname);
    }
  } catch (e) { /* ignore */ }
}

// --- Game start ---
let activeSession = null;
let activeConfig = null;

function startGame() {
  saveSettings();
  if (window.KidsGames) window.KidsGames.sfx('start');
  activeConfig = { style: settings.style, op: settings.op, difficulty: settings.difficulty, mode: settings.mode };
  activeSession = new GameSession({
    op: settings.op,
    mode: settings.mode,
    style: settings.style,
    range: getActiveRange(),
    onQuestion: renderQuestion,
    onAnswer: renderAnswerFeedback,
    onScore: renderHud,
    onEnd: showResults,
    onHint: () => {
      const answer = activeSession._currentQuestion.answer;
      $('maths-choices').querySelectorAll('.maths-choice').forEach(btn => {
        if (btn._value === answer) btn.classList.add('is-hint');
      });
    },
  });
  showScreen('game');
  initGameScreen();
  activeSession.start();
}

function initGameScreen() {
  const quitBtn = $('maths-quit-btn');
  quitBtn.hidden = false;
  quitBtn.onclick = () => { activeSession?.end({ quit: true }); };
}

// --- Question rendering ---
function renderQuestion(question, choiceNums) {
  const { parts } = formatQuestion(question);
  const qEl = $('maths-question');
  qEl.innerHTML = parts.map(p => p.blank ? '<span class="maths-blank">?</span>' : p.text).join(' ');
  // Shrink the font if any number has 3+ digits (custom large ranges)
  const hasLargeNum = [question.left, question.right, question.result].some(n => Math.abs(Number(n)) >= 100);
  qEl.classList.toggle('maths-question--long', hasLargeNum);

  const choicesEl = $('maths-choices');
  document.activeElement?.blur();
  choicesEl.innerHTML = '';
  choiceNums.forEach(num => {
    const btn = document.createElement('button');
    btn.className = 'kg-tile maths-choice';
    btn.textContent = formatNumber(num);
    btn._value = num;   // kept off the page: nothing in the markup tells the buttons apart
    btn.setAttribute('aria-label', `Answer: ${btn.textContent}`);
    btn.addEventListener('click', () => activeSession?.answer(num));
    choicesEl.appendChild(btn);
  });
}

function renderAnswerFeedback({ correct, correctAnswer, chosen, requiresConfirmation }) {
  if (window.KidsGames && chosen !== undefined) window.KidsGames.sfx(correct ? 'right' : 'wrong');
  $('maths-choices')?.querySelectorAll('.maths-choice').forEach(btn => {
    btn.classList.remove('is-hint');
    const num = btn._value;
    if (num === correctAnswer) {
      btn.classList.add('is-reveal');
      if (!requiresConfirmation) btn.disabled = true;
    } else {
      btn.disabled = true;
      if (num === chosen && !correct) btn.classList.add('is-wrong');
    }
    if (num === chosen && correct) { btn.classList.remove('is-reveal'); btn.classList.add('is-right'); }
  });
  if (window.KidsGames) window.KidsGames.say(correct ? 'Right!' : 'Not that one. Tap the right answer.');
}

function renderHud(hudState) {
  $('maths-score').textContent = hudState.score;
  const center = $('maths-hud-center');
  if (hudState.mode === 'sprint') {
    center.innerHTML = '<span class="kg-chip"><svg class="ic" aria-hidden="true"><use href="#i-timer"/></svg><span class="kg-sr">Seconds left</span><strong>' + hudState.timeLeft + '</strong></span>';
  } else if (hudState.mode === 'round') {
    let sq = '';
    for (let i = 1; i <= hudState.totalQuestions; i++) sq += '<i' + (i < hudState.questionNum ? ' class="on"' : '') + '></i>';
    center.innerHTML = '<span class="kg-squares" role="img" aria-label="Question ' + hudState.questionNum + ' of ' + hudState.totalQuestions + '">' + sq + '</span>';
  } else {
    center.textContent = '';
  }
}

// --- Results rendering ---
function showResults(stats) {
  // A game counts (progress square, personal best, "new best") when it was played through. Round and Sprint end by
  // themselves; Endless can only be stopped, so it counts once the child has answered enough questions.
  const finished = !stats.quit || (stats.mode === 'endless' && stats.answered >= ENDLESS_MIN_ANSWERS);

  const stars = stats.accuracy >= 80 ? 3 : stats.accuracy >= 50 ? 2 : 1;
  $('maths-results-icon').innerHTML = [1, 2, 3].map(i =>
    '<svg class="maths-star' + (i > stars ? ' off' : '') + '" viewBox="0 0 48 48" aria-hidden="true"><use href="#a-star"/></svg>').join('');
  $('maths-results-title').textContent =
    stats.accuracy >= 80 ? 'Amazing!' : stats.accuracy >= 50 ? 'Well done!' : 'Keep practising!';

  const isBest = finished ? savePersonalBest(stats) : false;
  if (window.KidsGames && finished) {
    window.KidsGames.recordSession(GAME_ID);
    if (stats.accuracy >= 50) window.KidsGames.sfx('win');
  }

  const best = isBest ? '<svg class="ic ic--sm" viewBox="0 0 48 48" role="img" aria-label="New best"><use href="#a-star"/></svg>' : '';
  $('maths-stats').innerHTML = `
    <div class="maths-stat-row">
      <dt class="maths-stat-label">Score</dt>
      <dd class="maths-stat-value">${stats.score}${best}</dd>
    </div>
    <div class="maths-stat-row">
      <dt class="maths-stat-label">Accuracy</dt>
      <dd class="maths-stat-value">${stats.accuracy}%</dd>
    </div>
    <div class="maths-stat-row">
      <dt class="maths-stat-label">Best streak</dt>
      <dd class="maths-stat-value">${stats.bestStreak}</dd>
    </div>
    ${stats.timeTaken ? `<div class="maths-stat-row">
      <dt class="maths-stat-label">Time</dt>
      <dd class="maths-stat-value">${stats.timeTaken}s</dd>
    </div>` : ''}
  `;

  $('maths-play-again-btn').onclick = startGame;
  $('maths-change-settings-btn').onclick = () => showScreen('settings');
  $('maths-play-again-btn').className = stats.quit ? 'kg-btn kg-btn--ghost' : 'kg-btn';
  $('maths-change-settings-btn').className = stats.quit ? 'kg-btn' : 'kg-btn kg-btn--ghost';
  showScreen('results');
  $(stats.quit ? 'maths-change-settings-btn' : 'maths-play-again-btn').focus({ preventScroll: true });
}

// Personal bests are kept per style, operation, difficulty and length.
function savePersonalBest(stats) {
  const c = activeConfig || settings;
  const key = `pb_${c.style}_${c.op}_${c.difficulty}_${c.mode}`;
  try {
    const store = window.KidsGames.loadGameData(GAME_ID) || {};
    if (stats.score > (store[key] || 0)) {
      window.KidsGames.saveGameData(GAME_ID, { ...store, v: 2, [key]: stats.score });
      return true;
    }
  } catch (e) { /* ignore */ }
  return false;
}

// --- Shell player change ---
if (window.KidsGames) {
  window.KidsGames.onPlayerChange(() => {
    loadSettings();
    applySettingsToUI();
  });
}
