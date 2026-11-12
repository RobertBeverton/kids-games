// main.js — Entry point, wires settings + game together
import { GameSession } from './game.js';

// --- Settings state ---
let settings = {
  op: '+',
  difficulty: 'medium',
  mode: 'sprint',
  custom: { min: 1, max: 100, maxTable: 12, negatives: false, decimals: false }
};

const DIFFICULTY_PRESETS = {
  easy:   { min: 1, max: 10,  maxTable: 5,  negatives: false, decimals: false, hint: 'Numbers 1–10, tables to 5' },
  medium: { min: 1, max: 20,  maxTable: 10, negatives: false, decimals: false, hint: 'Numbers 1–20, tables to 10' },
  hard:   { min: 1, max: 100, maxTable: 12, negatives: false, decimals: false, hint: 'Numbers 1–100, tables to 12' },
  custom: { hint: 'Your own settings' },
};

// --- DOM refs ---
const screens = {
  settings: document.getElementById('maths-settings'),
  game:     document.getElementById('maths-game'),
  results:  document.getElementById('maths-results'),
};

// --- Boot ---
loadSettings();
initSettingsScreen();
showScreen('settings');

// --- Initialise settings screen ---
function initSettingsScreen() {
  // Operation toggles
  document.getElementById('maths-op-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-op]');
    if (!btn) return;
    settings.op = btn.dataset.op;
    updateToggles('maths-op-row', 'data-op', settings.op);
    if (settings.difficulty === 'custom') updateComplexityPreview();
  });

  // Difficulty toggles
  document.getElementById('maths-diff-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-diff]');
    if (!btn) return;
    settings.difficulty = btn.dataset.diff;
    updateToggles('maths-diff-row', 'data-diff', settings.difficulty);
    updateDifficultyHint();
    document.getElementById('maths-custom-opts').hidden = settings.difficulty !== 'custom';
    if (settings.difficulty === 'custom') updateComplexityPreview();
  });

  // Mode buttons
  document.getElementById('maths-mode-row').addEventListener('click', e => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    settings.mode = btn.dataset.mode;
    updateModeButtons();
  });

  // Custom inputs
  document.getElementById('maths-min').addEventListener('input', e => {
    settings.custom.min = Number(e.target.value);
    updateComplexityPreview();
  });
  document.getElementById('maths-max').addEventListener('input', e => {
    settings.custom.max = Number(e.target.value);
    updateComplexityPreview();
  });
  document.getElementById('maths-table').addEventListener('input', e => {
    settings.custom.maxTable = Number(e.target.value);
    updateComplexityPreview();
  });
  document.getElementById('maths-negatives').addEventListener('change', e => {
    settings.custom.negatives = e.target.checked;
    updateComplexityPreview();
  });
  document.getElementById('maths-decimals').addEventListener('change', e => {
    settings.custom.decimals = e.target.checked;
    updateComplexityPreview();
  });

  // Start button
  document.getElementById('maths-start-btn').addEventListener('click', startGame);

  // Restore saved settings into UI
  applySettingsToUI();
}

function updateToggles(rowId, attr, activeVal) {
  document.getElementById(rowId).querySelectorAll(`[${attr}]`).forEach(btn => {
    const active = btn.dataset[attr.replace('data-', '')] === activeVal;
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function updateModeButtons() {
  document.getElementById('maths-mode-row').querySelectorAll('[data-mode]').forEach(btn => {
    const active = btn.dataset.mode === settings.mode;
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function updateDifficultyHint() {
  const preset = DIFFICULTY_PRESETS[settings.difficulty];
  document.getElementById('maths-diff-hint').textContent = preset.hint;
}

function applySettingsToUI() {
  updateToggles('maths-op-row', 'data-op', settings.op);
  updateToggles('maths-diff-row', 'data-diff', settings.difficulty);
  updateModeButtons();
  updateDifficultyHint();
  document.getElementById('maths-custom-opts').hidden = settings.difficulty !== 'custom';
  document.getElementById('maths-min').value = settings.custom.min;
  document.getElementById('maths-max').value = settings.custom.max;
  document.getElementById('maths-table').value = settings.custom.maxTable;
  document.getElementById('maths-negatives').checked = settings.custom.negatives;
  document.getElementById('maths-decimals').checked = settings.custom.decimals;
  if (settings.difficulty === 'custom') updateComplexityPreview();
}

function getActiveRange() {
  if (settings.difficulty === 'custom') return { ...settings.custom, _difficulty: 'custom' };
  const p = DIFFICULTY_PRESETS[settings.difficulty];
  return { min: p.min, max: p.max, maxTable: p.maxTable, negatives: p.negatives, decimals: p.decimals, _difficulty: settings.difficulty };
}

// --- Complexity indicator (custom mode only) ---

const COMPLEXITY_LEVELS = {
  preschool: { label: 'Preschool', ages: 'Ages 3–5',   colour: '#4caf50' },
  ks1:       { label: 'KS1',       ages: 'Ages 5–7',   colour: '#3b9acd' },
  ks2:       { label: 'KS2',       ages: 'Ages 7–11',  colour: '#f5a623' },
  ks3:       { label: 'KS3',       ages: 'Ages 11–14', colour: '#e07a00' },
  challenge: { label: 'Challenge', ages: 'Advanced',   colour: '#e53935' },
};

function computeComplexity(op, custom) {
  const { max, maxTable, negatives, decimals } = custom;
  if (negatives || decimals) return 'challenge';
  const addSubLevel =
    max > 100 ? 'challenge' :
    max > 20  ? 'ks3'       :
    max > 10  ? 'ks2'       :
    max > 5   ? 'ks1'       : 'preschool';
  const mulDivLevel =
    maxTable > 12 ? 'challenge' :
    maxTable > 10 ? 'ks3'       :
    maxTable > 5  ? 'ks2'       :
    maxTable > 2  ? 'ks1'       : 'preschool';
  if (op === '+' || op === '-') return addSubLevel;
  if (op === '*' || op === '/') return mulDivLevel;
  const order = ['preschool', 'ks1', 'ks2', 'ks3', 'challenge'];
  return order[Math.max(order.indexOf(addSubLevel), order.indexOf(mulDivLevel))];
}

function buildMathsExampleQuestion(op, custom) {
  const { max, maxTable } = custom;
  const effectiveOp = (op === '*' || op === '/') ? '*' : '+';
  if (effectiveOp === '+') {
    const a = Math.round(max * 0.6);
    const b = Math.round(max * 0.35);
    return `${a} + ${b} = ?`;
  }
  const a = Math.max(2, maxTable - 1);
  return `${a} × ${maxTable} = ?`;
}

function updateComplexityPreview() {
  const level = computeComplexity(settings.op, settings.custom);
  const info = COMPLEXITY_LEVELS[level];
  const badge = document.getElementById('maths-complexity-badge');
  badge.textContent = info.label;
  document.getElementById('maths-complexity-ages').textContent = info.ages;
  document.getElementById('maths-complexity-example').textContent =
    'e.g. ' + buildMathsExampleQuestion(settings.op, settings.custom);
}

// --- Screen management ---
function showScreen(name) {
  Object.keys(screens).forEach(k => screens[k].hidden = k !== name);
  window.scrollTo(0, 0);
}

// --- Persistence ---
function saveSettings() {
  try {
    if (window.KidsGames) {
      const d = window.KidsGames.loadGameData('maths') || {};
      window.KidsGames.saveGameData('maths', { ...d, settings });
    } else {
      localStorage.setItem('maths_settings', JSON.stringify(settings));
    }
  } catch (e) { /* ignore */ }
}

function loadSettings() {
  try {
    let saved;
    if (window.KidsGames) {
      const d = window.KidsGames.loadGameData('maths');
      saved = d?.settings;
    } else {
      const raw = localStorage.getItem('maths_settings');
      saved = raw ? JSON.parse(raw) : null;
    }
    if (saved) {
      settings = { ...settings, ...saved };
    }
  } catch (e) { /* ignore */ }
  applyAgeBracketDefault();
}

function applyAgeBracketDefault() {
  // Only if no settings have been saved yet
  try {
    const existing = window.KidsGames?.loadGameData('maths');
    if (existing?.settings?.difficulty) return; // already set
    const bracket = window.KidsGames?.player?.ageBracket;
    if (bracket === '4-5') { settings.difficulty = 'easy'; settings.mode = 'round'; }
    else if (bracket === '9-12') settings.difficulty = 'hard';
    else settings.difficulty = 'medium';
  } catch (e) { /* ignore */ }
}

// --- Game start ---
let activeSession = null;

function startGame() {
  saveSettings();
  if (window.KidsGames) window.KidsGames.sfx('start');
  const range = getActiveRange();
  activeSession = new GameSession({
    op: settings.op,
    mode: settings.mode,
    range,
    onQuestion: renderQuestion,
    onAnswer: renderAnswerFeedback,
    onScore: renderHud,
    onEnd: showResults,
    onHint: () => {
      document.getElementById('maths-choices')
        ?.querySelectorAll('.maths-choice')
        .forEach(btn => {
          if (Number(btn.textContent) === activeSession._currentQuestion.answer) {
            btn.classList.add('is-hint');
          }
        });
    },
  });
  showScreen('game');
  initGameScreen();
  activeSession.start();
}

function initGameScreen() {
  const quitBtn = document.getElementById('maths-quit-btn');
  quitBtn.hidden = false;
  quitBtn.onclick = () => {
    activeSession?.end({ quit: true });
  };
}

// --- Question rendering ---
function renderQuestion(question, choiceNums) {
  const { left, op, right, result } = question;
  const opStr = { '+': '+', '-': '−', '*': '×', '/': '÷' }[op] ?? op;
  const safeLeft = Number(left);
  const safeRight = Number(right);
  const safeResult = Number(result);
  // Maths always blanks the RESULT: "9 + 8 = ?"
  const html = `${safeLeft} ${opStr} ${safeRight} = <span class="maths-blank">?</span>`;
  const hasLargeNum = [safeLeft, safeRight, safeResult].some(n => Math.abs(n) >= 100);
  const qEl = document.getElementById('maths-question');
  qEl.innerHTML = html;
  // Shrink font if any number has 3+ digits (custom large ranges)
  qEl.classList.toggle('maths-question--long', hasLargeNum);

  // Render choice buttons
  const choicesEl = document.getElementById('maths-choices');
  document.activeElement?.blur();
  choicesEl.innerHTML = '';
  choiceNums.forEach(num => {
    const btn = document.createElement('button');
    btn.className = 'kg-tile maths-choice';
    btn.textContent = num;
    btn.setAttribute('aria-label', `Answer: ${num}`);
    btn.addEventListener('click', () => activeSession?.answer(num));
    choicesEl.appendChild(btn);
  });
}

function renderAnswerFeedback({ correct, correctAnswer, chosen, requiresConfirmation }) {
  if (window.KidsGames && chosen !== undefined) window.KidsGames.sfx(correct ? 'right' : 'wrong');
  document.getElementById('maths-choices')?.querySelectorAll('.maths-choice').forEach(btn => {
    btn.classList.remove('is-hint');
    const num = Number(btn.textContent);
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
  document.getElementById('maths-score').textContent = hudState.score;
  const center = document.getElementById('maths-hud-center');
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
  // Accuracy % keeps thresholds consistent across modes and score ranges
  const stars = stats.accuracy >= 80 ? 3 : stats.accuracy >= 50 ? 2 : 1;
  const starsEl = document.getElementById('maths-results-icon');
  starsEl.innerHTML = [1, 2, 3].map(i =>
    '<svg class="maths-star' + (i > stars ? ' off' : '') + '" viewBox="0 0 48 48" aria-hidden="true"><use href="#a-star"/></svg>').join('');
  document.getElementById('maths-results-title').textContent =
    stats.accuracy >= 80 ? 'Amazing!' : stats.accuracy >= 50 ? 'Well done!' : 'Keep practising!';

  const isBest = savePersonalBest(stats);
  if (window.KidsGames) {
    if (!stats.quit) window.KidsGames.recordSession('maths');
    if (!stats.quit && stats.accuracy >= 50) window.KidsGames.sfx('win');
  }

  const best = isBest ? '<svg class="ic ic--sm" viewBox="0 0 48 48" role="img" aria-label="New best"><use href="#a-star"/></svg>' : '';
  const statsEl = document.getElementById('maths-stats');
  statsEl.innerHTML = `
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

  document.getElementById('maths-play-again-btn').onclick = startGame;
  document.getElementById('maths-change-settings-btn').onclick = () => showScreen('settings');
  document.getElementById('maths-play-again-btn').className =
    stats.quit ? 'kg-btn kg-btn--ghost' : 'kg-btn';
  document.getElementById('maths-change-settings-btn').className =
    stats.quit ? 'kg-btn' : 'kg-btn kg-btn--ghost';
  showScreen('results');
  document.getElementById(stats.quit ? 'maths-change-settings-btn' : 'maths-play-again-btn').focus({ preventScroll: true });
}

function savePersonalBest(stats) {
  const key = `pb_${settings.op}_${settings.difficulty}_${settings.mode}`;
  try {
    let current;
    if (window.KidsGames) {
      const store = window.KidsGames.loadGameData('maths') || {};
      current = store[key] || 0;
      if (stats.score > current) {
        window.KidsGames.saveGameData('maths', { ...store, [key]: stats.score });
        return true;
      }
    } else {
      current = Number(localStorage.getItem(`maths_${key}`)) || 0;
      if (stats.score > current) {
        localStorage.setItem(`maths_${key}`, stats.score);
        return true;
      }
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
