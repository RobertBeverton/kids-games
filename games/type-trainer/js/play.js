// play.js — Play mode (falling letters/words game engine)
// Tasks 16-19: Canvas rendering, input, scoring, HUD, overlays
//
// CRITICAL OVERRIDES applied:
//   Fix C2: Lazy DOM init — no DOM access at module top level
//   Fix C3: Event listeners attached ONCE in init, not on each show
//   Fix W4: cleanupPlay() exported for mode switching
//   Fix W6: Danger zone gradient cached, recreated only on resize
//   Fix W7: Micro-celebrations for 4-5 bracket
//   Fix W10: startGame accepts callbacks — no imports from main.js
//   O6: gameState.celebrating flag — ignore keys during transitions

import { getFingerZone, getZoneCSSVar, getBracketOverrides } from './stages.js';
import { playSound } from './audio.js';
import {
  highlightKey, clearHighlights, flashCorrect, flashWrong,
  setVisibilityMode, setSpotlightMode,
} from './keyboard.js';
import {
  recordInput, getSpeedMultiplier, getWeakKeys,
  biasPoolTowardWeakKeys, resetAdaptive,
} from './adaptive.js';
import { trapFocus, releaseFocus } from './utils.js';

let prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function refreshMotionPref() {
  prefersReducedMotion = window.KidsGames ? window.KidsGames.reducedMotion : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// roundRect polyfill for Safari < 16, older Firefox (#8)
if (typeof CanvasRenderingContext2D !== 'undefined' &&
    !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    const r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 0);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y,     x + w, y + h, r);
    this.arcTo(x + w, y + h, x,     y + h, r);
    this.arcTo(x,     y + h, x,     y,     r);
    this.arcTo(x,     y,     x + w, y,     r);
    this.closePath();
  };
}


// ═══════════════════════════════════════════════════════════════════
// DOM references — initialised lazily (Fix C2)
// ═══════════════════════════════════════════════════════════════════

let canvas, ctx, wrap;
let playArea;

// Cached HUD elements (Fix W6 from review 2 — cache references)
let hudEls = {};

let playDOMReady = false;
let resizeObserver = null;
let themeObserver = null;

let _ariaTimer = null;
let _ariaLiveEl = null;

/** Initialise DOM references on first Play mode entry. */
function initPlayDOM() {
  if (playDOMReady) return;

  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  wrap = document.getElementById('play-canvas-wrap');
  playArea = document.getElementById('play-area');

  // Cache all HUD element references
  hudEls = {
    score:       document.getElementById('hud-score-value'),
    best:        document.getElementById('hud-best-value'),
    stageCur:    document.getElementById('hud-stage-current'),
    stageTotal:  document.getElementById('hud-stage-total'),
    lives:       document.getElementById('hud-lives-value'),
    livesWrap:   document.getElementById('hud-lives'),
    streak:      document.getElementById('hud-streak-value'),
    stageLabel:  document.getElementById('play-stage-label'),
    progFill:    document.getElementById('play-prog-fill'),
    progPct:     document.getElementById('play-prog-pct'),
    typedDisplay:document.getElementById('typed-display'),
    overlay:     document.getElementById('overlay'),
    hud:         document.getElementById('hud'),
    stageBar:    document.getElementById('stage-bar'),
    typedRow:    document.getElementById('typed-row'),
    pauseBtn:    document.getElementById('pause-btn'),
  };

  if (hudEls.pauseBtn) {
    hudEls.pauseBtn.addEventListener('click', () => {
      if (gameState.active && !gameState.paused && !gameState.countingDown) pauseGame();
    });
  }

  // Set up resize handling
  resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(wrap);

  // Attach overlay button listeners ONCE (Fix C3)
  initOverlayListeners();

  if (!themeObserver) {
    themeObserver = new MutationObserver(() => cacheThemeColours());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // Debounced aria-live region for screen reader updates (#3)
  if (!_ariaLiveEl) {
    _ariaLiveEl = document.createElement('div');
    _ariaLiveEl.setAttribute('aria-live', 'polite');
    _ariaLiveEl.setAttribute('aria-atomic', 'true');
    _ariaLiveEl.className = 'sr-only';
    document.getElementById('game-wrapper').appendChild(_ariaLiveEl);
  }

  playDOMReady = true;
}

function handleResize() {
  if (!canvas || !wrap) return;
  const r = wrap.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return;
  canvas.width = Math.floor(r.width);
  canvas.height = Math.floor(r.height);
  // Invalidate cached danger gradient (Fix W6)
  cachedDangerGrad = null;
}

const W = () => canvas ? canvas.width : 0;
const H = () => canvas ? canvas.height : 0;


// ═══════════════════════════════════════════════════════════════════
// Theme colour cache
// ═══════════════════════════════════════════════════════════════════

let cachedColours = {};
let cachedZoneColours = {};  // zone name → resolved hex colour
let cachedZoneText = {};     // zone colour → label colour that passes contrast on it
let cachedDangerGrad = null;
let cachedDangerH = 0;

function cacheThemeColours() {
  const s = getComputedStyle(document.documentElement);
  cachedColours = {
    bgGame:     s.getPropertyValue('--bg-game').trim()     || '#FFFFFF',
    grid:       s.getPropertyValue('--bg-grid').trim()      || 'rgba(240,240,236,0.5)',
    dangerZone: s.getPropertyValue('--danger-zone').trim()  || 'rgba(254,226,226,0.6)',
    textPrimary:s.getPropertyValue('--text-primary').trim() || '#1A1A2E',
    textMuted:  s.getPropertyValue('--text-muted').trim()   || '#8A8A9A',
    hudAccent:  s.getPropertyValue('--hud-accent').trim()   || '#2563EB',
    overlayBg:  s.getPropertyValue('--overlay-bg').trim()   || 'rgba(250,250,248,0.95)',
    fontMono:   s.getPropertyValue('--font-mono').trim()    || 'Andika, system-ui, sans-serif',
    line:       s.getPropertyValue('--line').trim()         || '#141922',
  };

  // Cache resolved zone colours for canvas drawing
  const zones = [
    'left-pinky', 'left-ring', 'left-middle', 'left-index',
    'right-index', 'right-middle', 'right-ring', 'right-pinky',
  ];
  for (const z of zones) {
    const cssVar = getZoneCSSVar(z);
    cachedZoneColours[z] = s.getPropertyValue(cssVar).trim() || '#666';
    cachedZoneText[cachedZoneColours[z]] = s.getPropertyValue(cssVar.replace('--zone-', '--on-zone-')).trim() || '#141922';
  }

  // Invalidate danger gradient
  cachedDangerGrad = null;

  // Derive confetti colours from zone palette
  confettiColours = Object.values(cachedZoneColours);
}

/** Get the resolved colour for a finger zone. */
function getResolvedZoneColour(zone) {
  return cachedZoneColours[zone] || '#666';
}


// ═══════════════════════════════════════════════════════════════════
// Game State
// ═══════════════════════════════════════════════════════════════════

const gameState = {
  items: [],          // falling items on screen
  particles: [],      // particle effects
  popTexts: [],       // floating text popups
  score: 0,
  lives: 3,
  stageIdx: 0,
  streak: 0,
  stageHits: 0,
  active: false,
  paused: false,
  celebrating: false, // O6: ignore keys during stage transitions
  typedBuffer: '',
  nextSpawn: 0,
  wrongFlash: 0,
  stages: [],         // resolved stages for current bracket
  bracket: '6-8',
  overrides: {},      // bracket overrides (lives, fonts, etc.)
  lastFrameTime: 0,
  callbacks: null,    // { onQuit, getPlayerName, onGameOver }
  allStagesCleared: false,
};

// ── Session stats (per game) ──
const sessionStats = {
  totalKeysPressed: 0,
  totalCorrect: 0,
  longestStreak: 0,
  fastestWord: null,       // { word, ms } — overall fastest (backwards compat)
  fastestByLength: {},     // { 3: {word:'LID', ms:180}, 5: {word:'SHIFT', ms:420}, ... }
  wordStartTime: null,
  keyMisses: {},           // { 'G': 3, 'V': 2, ... }
};

function resetSessionStats() {
  sessionStats.totalKeysPressed = 0;
  sessionStats.totalCorrect = 0;
  sessionStats.longestStreak = 0;
  sessionStats.fastestWord = null;
  sessionStats.fastestByLength = {};
  sessionStats.wordStartTime = null;
  sessionStats.keyMisses = {};
}

/** Get current stage data. */
function currentStage() {
  return gameState.stages[Math.min(gameState.stageIdx, gameState.stages.length - 1)];
}


// ═══════════════════════════════════════════════════════════════════
// Confetti colours — derived from theme's finger zone colours
// ═══════════════════════════════════════════════════════════════════

let confettiColours = [];


// ═══════════════════════════════════════════════════════════════════
// Background rendering
// ═══════════════════════════════════════════════════════════════════

function drawBackground(w, h) {
  // Solid background
  ctx.fillStyle = cachedColours.bgGame;
  ctx.fillRect(0, 0, w, h);

  // Subtle grid
  ctx.strokeStyle = cachedColours.grid;
  ctx.lineWidth = 0.5;
  for (let y = 40; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Danger zone: a flat painted band with a dashed line, like a marked-out court edge
  const dangerStart = h * 0.85;
  ctx.fillStyle = cachedColours.dangerZone;
  ctx.fillRect(0, dangerStart, w, h - dangerStart);
  ctx.strokeStyle = cachedColours.line;
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 12]);
  ctx.beginPath();
  ctx.moveTo(0, dangerStart);
  ctx.lineTo(w, dangerStart);
  ctx.stroke();
  ctx.setLineDash([]);
}


// ═══════════════════════════════════════════════════════════════════
// Falling item rendering
// ═══════════════════════════════════════════════════════════════════

function drawItem(item) {
  const { text, x, y, fontSize, zoneColour, typed } = item;
  const pad = 10;

  // Measure text width for pill dimensions
  ctx.font = `bold ${fontSize}px ${cachedColours.fontMono}`;
  item.tw = ctx.measureText(text).width;

  const bx = x - pad;
  const by = y - fontSize - 4;
  const bw = item.tw + pad * 2;
  const bh = fontSize + 16;
  const radius = 14;
  const label = cachedZoneText[zoneColour] || '#141922';

  // Pill: solid paint in the finger-zone colour with a keyline
  ctx.fillStyle = zoneColour;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, radius);
  ctx.fill();
  ctx.strokeStyle = cachedColours.line;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textBaseline = 'alphabetic';
  if (typed > 0) {
    // Typed part is struck out by a line and dimmed, so progress never relies on colour alone
    const done = text.slice(0, typed);
    const rest = text.slice(typed);
    const dw = ctx.measureText(done).width;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = label;
    ctx.fillText(done, x, y);
    ctx.fillRect(x, y - fontSize * 0.32, dw, 3);
    ctx.globalAlpha = 1;
    ctx.fillStyle = label;
    ctx.fillText(rest, x + dw, y);
  } else {
    ctx.fillStyle = label;
    ctx.fillText(text, x, y);
  }
}


// ═══════════════════════════════════════════════════════════════════
// Item position update with smooth easing
// ═══════════════════════════════════════════════════════════════════

function updateItemPosition(item, h, deltaMs) {
  const progress = item.y / h;
  let speedMult = 1.0;

  // Ease-in: items start slightly slower, accelerate
  if (progress < 0.3) {
    speedMult = 0.7 + progress; // 0.7 -> 1.0 over top 30%
  }
  // Grace slowdown near bottom — give a chance to type
  if (progress > 0.8) {
    speedMult *= 0.85;
  }

  // Delta-time-based movement (normalised to 60fps)
  // Adaptive difficulty: multiply by rolling-accuracy speed adjustment
  const dtFactor = deltaMs / 16.67;
  item.y += item.speed * speedMult * getSpeedMultiplier() * (gameState.speedPreference || 1.0) * dtFactor;
}


// ═══════════════════════════════════════════════════════════════════
// Spawn logic
// ═══════════════════════════════════════════════════════════════════

function spawnItem(now) {
  const stage = currentStage();
  if (gameState.items.length >= stage.maxItems) return;

  // Pick text — avoid duplicates on screen
  let text;
  const onScreen = new Set(gameState.items.map(i => i.text));
  let attempts = 0;

  if (stage.words) {
    // Bias word pool toward weak keys: duplicate words whose first letter
    // is a weak key so they appear more often in spawns
    const wordPool = stage.words.map(w => w.toUpperCase());
    const weakKeySet = new Set(getWeakKeys().map(w => w.key));
    const biasedWordPool = [...wordPool];
    if (weakKeySet.size > 0) {
      const extraCount = Math.max(1, Math.floor(wordPool.length * 0.20));
      const weakWords = wordPool.filter(w => weakKeySet.has(w[0]));
      for (let i = 0; i < extraCount && weakWords.length > 0; i++) {
        biasedWordPool.push(weakWords[i % weakWords.length]);
      }
    }
    do {
      text = biasedWordPool[Math.floor(Math.random() * biasedWordPool.length)];
      attempts++;
    } while (onScreen.has(text) && attempts < 20);
  } else {
    const pool = stage.letters.split('');
    const biasedPool = biasPoolTowardWeakKeys(pool);
    do {
      text = biasedPool[Math.floor(Math.random() * biasedPool.length)];
      attempts++;
    } while (onScreen.has(text) && attempts < 20);
  }

  // Determine font size from bracket overrides
  const ov = gameState.overrides;
  const fontSize = text.length === 1 ? ov.fontLetter : ov.fontWord;

  // Measure text width
  ctx.font = `bold ${fontSize}px ${cachedColours.fontMono}`;
  const tw = ctx.measureText(text).width;

  // X position — avoid overlap with existing items
  const w = W();
  const minPad = 20;
  let x = minPad + Math.random() * Math.max(0, w - tw - minPad * 2);

  // Check for x-overlap with existing items (min 60px gap)
  for (const existing of gameState.items) {
    const gap = Math.abs(x - existing.x);
    if (gap < 60) {
      x = Math.min(w - tw - minPad, Math.max(minPad, x + 80));
    }
  }

  // Determine finger-zone colour from first letter
  const zone = getFingerZone(text[0]);
  const zoneColour = getResolvedZoneColour(zone);

  const speed = stage.speed * (0.9 + Math.random() * 0.2);

  // Younger brackets: spawn items already visible (not above canvas edge)
  const startY = (gameState.bracket === '4-5') ? 15 : -10;

  gameState.items.push({
    text,
    x,
    y: startY,
    speed,
    fontSize,
    zoneColour,
    zone,
    typed: 0,
    tw,
    spawnTime: now,
  });

  // Next spawn with some randomness
  gameState.nextSpawn = now + stage.spawnMs * (0.85 + Math.random() * 0.3);
}


// ═══════════════════════════════════════════════════════════════════
// Particle system
// ═══════════════════════════════════════════════════════════════════

function spawnParticles(cx, cy, colour, count) {
  if (prefersReducedMotion) return;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const vel = 1.5 + Math.random() * 3;
    gameState.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * vel,
      vy: Math.sin(angle) * vel,
      life: 1,
      colour,
      size: 3 + Math.random() * 3,
    });
  }
}

function spawnConfetti(count) {
  if (prefersReducedMotion) return;
  const w = W();
  for (let i = 0; i < count; i++) {
    gameState.particles.push({
      x: Math.random() * w,
      y: -10 - Math.random() * 50,
      vx: (Math.random() - 0.5) * 4,
      vy: 1 + Math.random() * 3,
      life: 1.5,
      colour: confettiColours[i % confettiColours.length] || '#FF6B6B',
      size: 4 + Math.random() * 4,
    });
  }
}

function updateParticles(deltaMs) {
  const dtFactor = deltaMs / 16.67;
  for (let i = 0; i < gameState.particles.length; i++) {
    const p = gameState.particles[i];
    p.x += p.vx * dtFactor;
    p.y += p.vy * dtFactor;
    p.vy += 0.12 * dtFactor;  // gravity
    p.life -= 0.04 * dtFactor;
  }
  gameState.particles = gameState.particles.filter(p => p.life > 0);
}

function drawParticles() {
  for (const p of gameState.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.colour;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * Math.max(0, p.life), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}


// ═══════════════════════════════════════════════════════════════════
// Pop text system (floating messages — "Almost!", "Nice!", etc.)
// ═══════════════════════════════════════════════════════════════════

function addPopText(msg, x, y, colour) {
  gameState.popTexts.push({
    msg, x, y, startY: y, life: 1, colour: colour || '#FFFFFF',
  });
}

function updatePopTexts(deltaMs) {
  const dtFactor = deltaMs / 16.67;
  for (let i = 0; i < gameState.popTexts.length; i++) {
    const pt = gameState.popTexts[i];
    pt.y -= 1.2 * dtFactor;
    pt.life -= 0.025 * dtFactor;
  }
  gameState.popTexts = gameState.popTexts.filter(p => p.life > 0);
}

function drawPopTexts() {
  for (const pt of gameState.popTexts) {
    ctx.globalAlpha = Math.max(0, pt.life);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = pt.colour;
    ctx.textAlign = 'center';
    ctx.fillText(pt.msg, pt.x, pt.y);
    ctx.textAlign = 'start';
  }
  ctx.globalAlpha = 1;
}


// ═══════════════════════════════════════════════════════════════════
// Wrong-key canvas flash
// ═══════════════════════════════════════════════════════════════════

function drawWrongFlash(w, h) {
  if (prefersReducedMotion) return;
  if (gameState.wrongFlash > 0) {
    ctx.fillStyle = `rgba(255, 50, 50, ${gameState.wrongFlash * 0.02})`;
    ctx.fillRect(0, 0, w, h);
    gameState.wrongFlash--;
  }
}


// ═══════════════════════════════════════════════════════════════════
// Matching logic (ported from v3, refined)
// ═══════════════════════════════════════════════════════════════════

/**
 * Attempt to match the buffer against on-screen items.
 * @param {string} buf - Current typed buffer (uppercase)
 * @returns {string|null} '' = full match cleared, string = valid prefix, null = no match
 */
function tryMatch(buf) {
  const items = gameState.items;
  const bufUpper = buf.toUpperCase();

  // Single letter match
  if (bufUpper.length === 1) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].text.length === 1 && items[i].text === bufUpper) {
        removeItem(i, true);
        return '';
      }
    }
  }

  // Full word match
  for (let i = 0; i < items.length; i++) {
    if (items[i].text === bufUpper) {
      removeItem(i, true);
      return '';
    }
  }

  // Partial prefix match — update typed highlight on matching items
  let anyPrefix = false;
  for (let i = 0; i < items.length; i++) {
    if (items[i].text.startsWith(bufUpper)) {
      items[i].typed = bufUpper.length;
      anyPrefix = true;
    } else {
      items[i].typed = 0;
    }
  }

  if (anyPrefix) return bufUpper;

  // No match at all
  return null;
}

/** Find the next expected character for the first partially matched item. */
function findNextExpectedChar() {
  for (const item of gameState.items) {
    if (item.typed > 0 && item.typed < item.text.length) {
      return item.text[item.typed];
    }
  }
  return null;
}

/**
 * Find the key the player should have pressed.
 * Returns the first character of the lowest (closest to danger zone) item,
 * or the next expected char if a partial match is in progress.
 * Used by the adaptive engine to track weak keys on misses.
 */
function findExpectedKey() {
  // If there's a partial match in progress, the expected key is the next char
  const nextChar = findNextExpectedChar();
  if (nextChar) return nextChar;

  // Otherwise, it's the first char of the lowest item on screen
  let lowest = null;
  for (const item of gameState.items) {
    if (!lowest || item.y > lowest.y) {
      lowest = item;
    }
  }
  return lowest ? lowest.text[0] : null;
}


// ═══════════════════════════════════════════════════════════════════
// Remove item (success or miss)
// ═══════════════════════════════════════════════════════════════════

function removeItem(idx, success) {
  const item = gameState.items[idx];

  if (success) {
    // ── Particles ──
    const cx = item.x + item.tw / 2;
    const cy = item.y;
    const count = gameState.bracket === '4-5' ? 24 : 18;
    spawnParticles(cx, cy, item.zoneColour, count);

    // ── Sound + keyboard feedback ──
    if (item.text.length === 1) {
      playSound('correctKey', 0.5);
      flashCorrect(item.text);
    } else {
      playSound('wordComplete');
      // Staggered keyboard flash for each letter
      item.text.split('').forEach((ch, i) => {
        setTimeout(() => flashCorrect(ch), i * 50);
      });
    }

    // ── Scoring ──
    const streakMult = 1 + Math.min(gameState.streak, 10) * 0.05;
    const stageMult = Math.max(1, gameState.stageIdx * 0.5 + 1);
    const pts = Math.round(item.text.length * streakMult * stageMult);
    gameState.score += pts;
    gameState.streak++;
    gameState.stageHits++;

    // ── Stat tracking ──
    sessionStats.totalCorrect += item.text.length;
    sessionStats.longestStreak = Math.max(sessionStats.longestStreak, gameState.streak);

    // Track fastest word (overall + per word length)
    if (item.text.length > 1 && sessionStats.wordStartTime) {
      const ms = performance.now() - sessionStats.wordStartTime;
      const roundedMs = Math.round(ms);
      // Overall fastest (backwards compat)
      if (!sessionStats.fastestWord || ms < sessionStats.fastestWord.ms) {
        sessionStats.fastestWord = { word: item.text, ms: roundedMs };
      }
      // Per-length fastest
      const len = item.text.length;
      if (!sessionStats.fastestByLength[len] || roundedMs < sessionStats.fastestByLength[len].ms) {
        sessionStats.fastestByLength[len] = { word: item.text, ms: roundedMs };
      }
      sessionStats.wordStartTime = null;
    }

    // ── Streak milestones ──
    if (gameState.streak > 0 && gameState.streak % 5 === 0) {
      playSound('streakMilestone');
    }

    // ── Micro-celebrations for 4-5 bracket (Fix W7) ──
    if (gameState.bracket === '4-5') {
      if (gameState.streak === 3) {
        addPopText('Nice!', cx, cy - 20, '#4ECDC4');
      } else if (gameState.streak === 5) {
        addPopText('Brilliant!', cx, cy - 20, '#F7DC6F');
        spawnParticles(cx, cy - 30, '#F7DC6F', 12);
      }
    }

    // ── Stage progression check ──
    const stage = currentStage();
    if (gameState.stageHits >= stage.needed) {
      if (gameState.stageIdx < gameState.stages.length - 1) {
        advanceStage();
      } else {
        // All stages cleared — victory!
        gameState.allStagesCleared = true;
        endGame();
        return; // Don't splice — endGame handles it
      }
    }

    // ── Update HUD ──
    updateHUD();

  } else {
    // ── Item hit bottom — lose life ──
    gameState.streak = 0;
    gameState.lives--;
    gameState.wrongFlash = 8;
    playSound('lifeLost');

    // "Almost!" / "So close!" feedback if 50%+ was typed (M9)
    if (item.typed > 0 && item.typed / item.text.length >= 0.5) {
      const almostMsg = gameState.bracket === '4-5' ? 'So close!' : 'Almost!';
      addPopText(almostMsg, item.x + item.tw / 2, item.y - 20, '#F59E0B');
    }

    updateHUD();

    if (gameState.lives <= 0) {
      endGame();
      return;
    }
  }

  gameState.items.splice(idx, 1);
}


// ═══════════════════════════════════════════════════════════════════
// Stage progression
// ═══════════════════════════════════════════════════════════════════

function advanceStage() {
  gameState.celebrating = true; // O6: block input during transition
  gameState.stageIdx++;
  gameState.stageHits = 0;
  gameState.items = [];

  // Confetti + sound
  spawnConfetti(50);
  playSound('stageClear');

  // Show stage popup text on canvas
  const stage = currentStage();
  const cx = W() / 2;
  const cy = H() / 2;
  addPopText(`Stage ${stage.stageNumber} of ${stage.totalStages}`, cx, cy - 15, cachedColours.hudAccent);
  addPopText(stage.label, cx, cy + 20, '#FFFFFF');

  // Pause spawning for 2.5 seconds
  gameState.nextSpawn = performance.now() + 2500;

  // Clear celebrating flag after transition
  setTimeout(() => {
    gameState.celebrating = false;
  }, 1500);

  updateHUD();
}


// ═══════════════════════════════════════════════════════════════════
// Keyboard input handling
// ═══════════════════════════════════════════════════════════════════

/** Bound keydown handler reference (for cleanup) */
let boundHandleKey = null;

function handleKey(e) {
  if (!gameState.active) return;

  // O6: Ignore keys during stage celebrations
  if (gameState.celebrating) return;

  // Block input during countdown
  if (gameState.countingDown) return;

  // Escape toggles pause
  if (e.key === 'Escape') {
    e.preventDefault();
    if (gameState.paused) {
      resumeGame();
    } else {
      pauseGame();
    }
    return;
  }

  // Ignore input while paused
  if (gameState.paused) return;

  // Backspace: delete last character from buffer
  if (e.key === 'Backspace') {
    e.preventDefault();
    gameState.typedBuffer = gameState.typedBuffer.slice(0, -1);
    gameState.items.forEach(i => { i.typed = 0; });
    if (gameState.typedBuffer) {
      tryMatch(gameState.typedBuffer);
    }
    updateTypedDisplay();
    return;
  }

  // Only handle single-character keys
  if (e.key.length !== 1) return;
  e.preventDefault();

  const ku = e.key.toUpperCase();

  // Track keypress for stats
  sessionStats.totalKeysPressed++;

  // Track word start time for fastest-word stat
  if (gameState.typedBuffer.length === 0) {
    sessionStats.wordStartTime = performance.now();
  }

  const attempt = gameState.typedBuffer + ku;
  const result = tryMatch(attempt);

  if (result === '') {
    // Full match — cleared
    gameState.typedBuffer = '';
    clearHighlights();
    recordInput(true);
  } else if (result !== null) {
    // Valid prefix — keep building
    gameState.typedBuffer = result;
    const nextChar = findNextExpectedChar();
    if (nextChar) {
      clearHighlights();
      highlightKey(nextChar);
    }
    // Track as correct keypress
    playSound('correctKey', 0.5);
    flashCorrect(ku);
    recordInput(true);
  } else {
    // No match for accumulated buffer — try just this key alone
    gameState.items.forEach(i => { i.typed = 0; });
    const single = tryMatch(ku);
    if (single === '') {
      gameState.typedBuffer = '';
      clearHighlights();
      recordInput(true);
    } else if (single !== null) {
      gameState.typedBuffer = single;
      const nextChar = findNextExpectedChar();
      if (nextChar) {
        clearHighlights();
        highlightKey(nextChar);
      }
      playSound('correctKey', 0.5);
      flashCorrect(ku);
      recordInput(true);
    } else {
      // Truly wrong key
      gameState.typedBuffer = '';
      gameState.wrongFlash = 5;
      playSound('wrongKey');
      // Track miss for weak-key stats — determine what they should have pressed
      const expectedKey = findExpectedKey();
      sessionStats.keyMisses[ku] = (sessionStats.keyMisses[ku] || 0) + 1;
      recordInput(false, expectedKey);
      // Flash wrong on keyboard — no correct key to show in this context
      const nextChar = findNextExpectedChar();
      if (nextChar) {
        flashWrong(ku, nextChar);
      }
    }
  }

  updateTypedDisplay();
}


// ═══════════════════════════════════════════════════════════════════
// HUD updates (cached element references)
// ═══════════════════════════════════════════════════════════════════

function updateHUD() {
  const stage = currentStage();
  const ov = gameState.overrides;

  // Score
  if (hudEls.score) {
    hudEls.score.textContent = gameState.score.toLocaleString();
  }

  // Best (running max of stored high score and current score)
  if (hudEls.best) {
    const prevHigh = (gameState.callbacks && gameState.callbacks.previousHighScore) || 0;
    hudEls.best.textContent = Math.max(prevHigh, gameState.score).toLocaleString();
  }

  // Stage counter
  if (hudEls.stageCur) {
    hudEls.stageCur.textContent = gameState.stageIdx + 1;
  }
  if (hudEls.stageTotal) {
    hudEls.stageTotal.textContent = gameState.stages.length;
  }

  // Lives (hearts)
  if (hudEls.lives) {
    let hearts = '';
    for (let i = 0; i < ov.livesOverride; i++) {
      hearts += '<svg class="ic' + (i < gameState.lives ? '' : ' lost') + '" viewBox="0 0 48 48" aria-hidden="true"><use href="#i-heart"/></svg>';
    }
    hudEls.lives.innerHTML = hearts;
  }
  if (hudEls.livesWrap) {
    hudEls.livesWrap.setAttribute('aria-label', `${gameState.lives} lives remaining`);
  }

  // Streak (with glow tiers via data attribute)
  if (hudEls.streak) {
    hudEls.streak.textContent = gameState.streak;
    if (gameState.streak >= 10) {
      hudEls.streak.dataset.streak = 'max';
    } else if (gameState.streak >= 3) {
      hudEls.streak.dataset.streak = 'high';
    } else {
      hudEls.streak.dataset.streak = '';
    }
  }

  // Stage label + progress bar
  if (hudEls.stageLabel) {
    hudEls.stageLabel.textContent = stage.label;
  }
  if (hudEls.progFill) {
    const pct = Math.min(gameState.stageHits / stage.needed, 1);
    hudEls.progFill.style.width = (pct * 100) + '%';
  }
  if (hudEls.progPct) {
    hudEls.progPct.textContent = `${gameState.stageHits}/${stage.needed}`;
  }
}

function updateTypedDisplay() {
  if (hudEls.typedDisplay) {
    hudEls.typedDisplay.textContent = gameState.typedBuffer;
  }
}


// ═══════════════════════════════════════════════════════════════════
// Overlay system (Fix C3 — listeners attached ONCE)
// ═══════════════════════════════════════════════════════════════════

// Callback holders — set when overlays are shown, invoked by persistent listeners
let onResumeClick = null;
let onQuitClick = null;
let onPlayAgainClick = null;
let onBackMenuClick = null;

function initOverlayListeners() {
  // These will be wired up when the overlay buttons exist
  // Since we reuse the main overlay, we create buttons once and keep references
  // The overlay content is rebuilt each time, but listeners call the current callbacks
}


// ── Pause overlay ──

function showPauseOverlay() {
  const overlay = hudEls.overlay;
  if (!overlay) return;

  overlay.innerHTML = '';
  overlay.hidden = false;
  overlay.style.display = 'flex';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Game paused');

  const h2 = document.createElement('h2');
  h2.textContent = 'Paused';
  overlay.appendChild(h2);

  const isYoung = gameState.bracket === '4-5';

  if (gameState.bracket !== '4-5') {
    const p = document.createElement('p');
    p.textContent = 'Press Esc or tap Resume to continue';
    overlay.appendChild(p);
  }

  const resumeBtn = document.createElement('button');
  resumeBtn.className = 'kg-btn';
  resumeBtn.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-play"/></svg><span>' + (isYoung ? 'Play' : 'Resume') + '</span>';
  resumeBtn.id = 'pause-resume-btn';
  resumeBtn.addEventListener('click', () => resumeGame(), { once: true });
  overlay.appendChild(resumeBtn);

  const quitBtn = document.createElement('button');
  quitBtn.className = 'kg-btn kg-btn--ghost';
  quitBtn.textContent = isYoung ? 'Stop playing' : 'Back to Menu';
  quitBtn.addEventListener('click', () => quitToMenu(), { once: true });
  overlay.appendChild(quitBtn);

  // Focus management (Fix C2 from review 1)
  requestAnimationFrame(() => {
    resumeBtn.focus();
  });

  // Trap focus within pause overlay
  trapFocus(overlay);
}

function hidePauseOverlay() {
  const overlay = hudEls.overlay;
  if (!overlay) return;
  overlay.hidden = true;
  overlay.style.display = 'none';
  overlay.removeAttribute('role');
  overlay.removeAttribute('aria-modal');
}


// ── Game over overlay ──

/**
 * Get age-appropriate game-over title (Fix W4 from review 1).
 */
function getGameOverTitle() {
  const bracket = gameState.bracket;
  const cleared = gameState.allStagesCleared;

  if (bracket === '4-5') {
    return cleared ? 'You are a star!' : 'Amazing job!';
  } else if (bracket === '6-8') {
    return cleared ? 'Brilliant!' : 'Well done!';
  } else if (bracket === '9-12') {
    return cleared ? 'You did it!' : 'Good effort!';
  } else {
    return cleared ? 'Complete!' : 'Game Over';
  }
}

function showGameOverOverlay(stats) {
  const overlay = hudEls.overlay;
  if (!overlay) return;

  overlay.innerHTML = '';
  overlay.hidden = false;
  overlay.style.display = 'flex';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Game over');

  // Title
  const title = document.createElement('h2');
  title.textContent = getGameOverTitle();
  overlay.appendChild(title);

  // Score
  const scoreDiv = document.createElement('div');
  scoreDiv.className = 'gameover-score';
  scoreDiv.textContent = stats.score.toLocaleString();
  overlay.appendChild(scoreDiv);

  // New high score banner (shown when player beats their previous best)
  const prevHigh = (gameState.callbacks && gameState.callbacks.previousHighScore) || 0;
  if (stats.score > prevHigh && stats.score > 0) {
    const banner = document.createElement('div');
    banner.className = 'new-high-score-banner';
    banner.innerHTML = '<svg class="ic ic--sm" viewBox="0 0 48 48" aria-hidden="true"><use href="#a-star"/></svg><span>New high score!</span>';
    banner.setAttribute('aria-live', 'assertive');
    overlay.appendChild(banner);
  }

  // ── WPM calculation (AD6) ──
  const elapsedMs = performance.now() - gameState.startTime;
  const elapsedMin = elapsedMs / 60000;
  const wpm = elapsedMin > 0 ? Math.round((sessionStats.totalCorrect / 5) / elapsedMin) : 0;

  // ── Age-adapted stats (AD10) ──
  const bracket = gameState.bracket;
  const statsDiv = document.createElement('div');
  statsDiv.className = 'gameover-stats';
  statsDiv.setAttribute('aria-live', 'polite');

  const accuracy = stats.totalKeysPressed > 0
    ? stats.totalCorrect / stats.totalKeysPressed
    : 0;
  const accuracyPct = Math.round(accuracy * 100);
  const fastest = stats.fastestWord
    ? `${stats.fastestWord.word} (${(stats.fastestWord.ms / 1000).toFixed(1)}s)`
    : '--';
  const stageName = currentStage() ? currentStage().label : '';

  let lines = [];

  if (bracket === '4-5') {
    // 4-5: simplified, encouraging stats only
    const starRow = document.createElement('div');
    starRow.className = 'gameover-stat-row gameover-star';
    starRow.innerHTML = '<svg class="ic" viewBox="0 0 48 48" aria-hidden="true"><use href="#a-star"/></svg>';
    statsDiv.appendChild(starRow);

    lines = [
      { label: 'You got', value: `${stats.totalCorrect} letters right!` },
      { label: 'You reached', value: `Stage ${stats.stageReached} — ${stageName}` },
    ];
  } else if (bracket === '6-8') {
    // 6-8: friendly phrasing, no weak keys
    const outOfTen = Math.round(accuracy * 10);
    lines = [
      { label: 'Stage reached', value: `${stats.stageReached}/${gameState.stages.length}` },
      { label: 'Accuracy', value: `You got ${outOfTen} out of every 10 right!` },
      { label: 'Fastest word', value: fastest },
      { label: 'Speed', value: `${wpm} words per minute` },
    ];
  } else {
    // 9-12 / Adult: full stats
    lines = [
      { label: 'Stage reached', value: `${stats.stageReached}/${gameState.stages.length}` },
      { label: 'Accuracy', value: `${accuracyPct}%` },
      { label: 'Fastest word', value: fastest },
      { label: 'Longest streak', value: `${stats.longestStreak}` },
      { label: 'WPM', value: `${wpm}` },
    ];
  }

  // Use textContent for safety (Fix W1 from review 2)
  for (const line of lines) {
    const row = document.createElement('div');
    row.className = 'gameover-stat-row';
    const lbl = document.createElement('span');
    lbl.className = 'gameover-stat-label';
    lbl.textContent = line.label + ': ';
    const val = document.createElement('strong');
    val.textContent = line.value;
    row.appendChild(lbl);
    row.appendChild(val);
    statsDiv.appendChild(row);
  }

  overlay.appendChild(statsDiv);

  // Weak keys section — only for 9-12 and Adult brackets (Task 20 / AD10)
  if (bracket !== '4-5' && bracket !== '6-8' && stats.weakKeys.length > 0) {
    const weakSection = document.createElement('div');
    weakSection.className = 'stats-section weak-keys-section';
    const weakTitle = document.createElement('h3');
    weakTitle.textContent = 'Keys to practise';
    weakSection.appendChild(weakTitle);
    const badgeList = document.createElement('div');
    badgeList.className = 'weak-key-list';
    for (const key of stats.weakKeys) {
      const badge = document.createElement('span');
      badge.className = 'weak-key-badge';
      badge.textContent = key;
      badge.setAttribute('aria-label', `Weak key: ${key}`);
      badgeList.appendChild(badge);
    }
    weakSection.appendChild(badgeList);
    overlay.appendChild(weakSection);
  }

  // Difficulty suggestion — suggest stepping up/down based on performance
  const DIFFS = [
    { label: 'Easy', speed: 1.0 },
    { label: 'Normal', speed: 1.8 },
    { label: 'Hard', speed: 2.3 },
    { label: 'Extra Hard', speed: 3.0 },
  ];
  const currentSpeed = gameState.speedPreference || 1.0;
  const currentIdx = DIFFS.reduce((bestI, d, i) =>
    Math.abs(d.speed - currentSpeed) < Math.abs(DIFFS[bestI].speed - currentSpeed) ? i : bestI
  , 0);
  const avgReactionMs = stats.totalCorrect > 0 && elapsedMs > 0
    ? elapsedMs / stats.totalCorrect : 9999;

  let suggestedIdx = -1;
  if (accuracyPct >= 90 && avgReactionMs < 1500 && currentIdx < DIFFS.length - 1) {
    suggestedIdx = currentIdx + 1; // suggest harder
  } else if (accuracyPct < 50 && currentIdx > 0) {
    suggestedIdx = currentIdx - 1; // suggest easier
  }

  if (suggestedIdx >= 0) {
    const nextDiff = DIFFS[suggestedIdx];
    const suggestion = document.createElement('div');
    suggestion.className = 'game-suggestion';
    const isHarder = suggestedIdx > currentIdx;
    const suggText = document.createElement('span');
    suggText.textContent = isHarder
      ? `You're fast! Try ${nextDiff.label}? `
      : `Try ${nextDiff.label}? It might help! `;
    const suggBtn = document.createElement('button');
    suggBtn.className = 'kg-btn kg-btn--ghost';
    suggBtn.textContent = isHarder ? 'Yes!' : 'OK';
    suggBtn.addEventListener('click', () => {
      gameState.speedPreference = nextDiff.speed;
      if (gameState.callbacks && gameState.callbacks.onSpeedChange) {
        gameState.callbacks.onSpeedChange(nextDiff.speed);
      }
      suggestion.textContent = `Difficulty set to ${nextDiff.label}`;
    }, { once: true });
    suggestion.appendChild(suggText);
    suggestion.appendChild(suggBtn);
    overlay.appendChild(suggestion);
  }

  // Play Again button
  const playAgainBtn = document.createElement('button');
  playAgainBtn.className = 'kg-btn';
  playAgainBtn.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-replay"/></svg><span>Play again</span>';
  playAgainBtn.addEventListener('click', () => {
    releaseFocus();
    hideGameOverOverlay();
    startGame(gameState.bracket, gameState.stages, gameState.callbacks);
  }, { once: true });
  overlay.appendChild(playAgainBtn);

  // Back to Menu button
  const menuBtn = document.createElement('button');
  menuBtn.className = 'kg-btn kg-btn--ghost';
  menuBtn.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-home"/></svg><span>All games</span>';
  menuBtn.addEventListener('click', () => {
    releaseFocus();
    hideGameOverOverlay();
    quitToMenu();
  }, { once: true });
  overlay.appendChild(menuBtn);

  // Focus management (Fix C2)
  requestAnimationFrame(() => {
    playAgainBtn.focus();
  });

  // Trap focus within game-over overlay
  trapFocus(overlay);
}

function hideGameOverOverlay() {
  const overlay = hudEls.overlay;
  if (!overlay) return;
  overlay.hidden = true;
  overlay.style.display = 'none';
  overlay.removeAttribute('role');
  overlay.removeAttribute('aria-modal');
}


// ═══════════════════════════════════════════════════════════════════
// Game end and stats
// ═══════════════════════════════════════════════════════════════════

/** Get weak keys — renamed to avoid build collision (Fix C1 from review 2) */
function getSessionWeakKeys() {
  return Object.entries(sessionStats.keyMisses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key]) => key);
}

function endGame() {
  gameState.active = false;
  if (_ariaTimer) { clearInterval(_ariaTimer); _ariaTimer = null; }
  if (raf) {
    cancelAnimationFrame(raf);
    raf = null;
  }

  // Play appropriate sound
  if (gameState.allStagesCleared) {
    playSound('stageClear'); // Victory arpeggio
    spawnConfetti(80); // Extra confetti for victory
  } else {
    playSound('gameOver');
  }

  const stats = {
    score: gameState.score,
    stageReached: gameState.stageIdx + 1,
    accuracy: sessionStats.totalKeysPressed > 0
      ? sessionStats.totalCorrect / sessionStats.totalKeysPressed
      : 0,
    fastestWord: sessionStats.fastestWord,
    fastestByLength: { ...sessionStats.fastestByLength },
    longestStreak: sessionStats.longestStreak,
    weakKeys: getWeakKeys().map(w => w.key),
    weakKeysDetailed: getWeakKeys(),
    totalKeysPressed: sessionStats.totalKeysPressed,
    totalCorrect: sessionStats.totalCorrect,
  };

  // Save stats via callback (Fix W10)
  if (gameState.callbacks && gameState.callbacks.onGameOver) {
    gameState.callbacks.onGameOver(stats);
  }

  // Draw one final frame (with victory confetti if applicable)
  if (gameState.allStagesCleared && canvas) {
    // Quick draw loop for confetti
    let frames = 0;
    function victoryLoop(now) {
      const w = W(), h = H();
      drawBackground(w, h);
      updateParticles(16.67);
      drawParticles();
      drawPopTexts();
      frames++;
      if (frames < 90) { // ~1.5 seconds of confetti
        victoryRaf = requestAnimationFrame(victoryLoop);
      } else {
        victoryRaf = null;
        showGameOverOverlay(stats);
      }
    }
    victoryRaf = requestAnimationFrame(victoryLoop);
  } else {
    showGameOverOverlay(stats);
  }
}


// ═══════════════════════════════════════════════════════════════════
// Main game loop
// ═══════════════════════════════════════════════════════════════════

let raf = null;
let victoryRaf = null;

function loop(now) {
  if (!gameState.active) return;

  const deltaMs = Math.min(now - (gameState.lastFrameTime || now), 50); // Cap at 50ms
  gameState.lastFrameTime = now;
  const w = W(), h = H();

  // Draw background
  drawBackground(w, h);

  // Countdown phase — draw numerals, block spawning and input
  if (gameState.countingDown) {
    const elapsed = now - gameState.countdownStart;
    const bracket = gameState.bracket;

    // Bracket-specific timing (ms per step)
    let stepMs, steps;
    if (bracket === '4-5') {
      stepMs = 1500; // 1.5s intervals
      steps = ['3', '2', '1', '\u2605']; // star instead of GO
    } else if (bracket === '6-8') {
      stepMs = 1000;
      steps = ['3', '2', '1', 'GO!'];
    } else {
      stepMs = 750;
      steps = ['3', '2', '1', 'GO!'];
    }

    const totalDuration = stepMs * steps.length;
    const currentStepIdx = Math.min(Math.floor(elapsed / stepMs), steps.length - 1);

    // Play sound on step transitions
    if (currentStepIdx !== gameState._lastCountdownStep) {
      gameState._lastCountdownStep = currentStepIdx;
      if (currentStepIdx < steps.length - 1) {
        playSound('countdownTick');
      } else {
        playSound('countdownGo');
      }
    }

    // Draw the current countdown symbol
    if (elapsed < totalDuration + 500) { // show last symbol for 500ms extra
      const symbol = steps[currentStepIdx];
      const fontSize = bracket === '4-5' ? 96 : 72;
      ctx.save();
      ctx.font = `bold ${fontSize}px ${cachedColours.fontMono || 'Consolas, monospace'}`;
      ctx.fillStyle = cachedColours.textPrimary || '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 1.0;
      ctx.fillText(symbol, w / 2, h / 2);
      ctx.restore();
    }

    // End countdown
    if (elapsed >= totalDuration + 500) {
      gameState.countingDown = false;
      gameState.startTime = performance.now(); // for WPM
      gameState.nextSpawn = performance.now() + 1500; // buffer before first item
    }

    raf = requestAnimationFrame(loop);
    return; // skip all game logic during countdown
  }

  if (!gameState.paused) {
    // Spawn check — also spawn immediately if screen is empty
    if (!gameState.celebrating) {
      if (gameState.items.length === 0 || now >= gameState.nextSpawn) {
        spawnItem(now);
      }
    }

    // Update and draw items (reverse iterate for safe removal)
    for (let i = gameState.items.length - 1; i >= 0; i--) {
      const item = gameState.items[i];
      updateItemPosition(item, h, deltaMs);

      if (item.y > h + 20) {
        removeItem(i, false);
        continue;
      }
      drawItem(item);
    }

    // Keyboard hint: highlight the next expected key for young brackets
    if (gameState.bracket === '4-5' || gameState.bracket === '6-8') {
      const hintKey = findExpectedKey();
      if (hintKey && hintKey !== gameState._lastHintKey) {
        clearHighlights();
        highlightKey(hintKey);
        gameState._lastHintKey = hintKey;
      } else if (!hintKey && gameState._lastHintKey) {
        clearHighlights();
        gameState._lastHintKey = null;
      }
    }

    // Update animations
    updateParticles(deltaMs);
    updatePopTexts(deltaMs);
  } else {
    // Even when paused, draw existing items (frozen)
    for (const item of gameState.items) {
      drawItem(item);
    }
  }

  // Draw effects
  drawParticles();
  drawPopTexts();
  drawWrongFlash(w, h);

  raf = requestAnimationFrame(loop);
}


// ═══════════════════════════════════════════════════════════════════
// Pause / Resume
// ═══════════════════════════════════════════════════════════════════

function pauseGame() {
  if (!gameState.active || gameState.paused) return;
  gameState.paused = true;
  showPauseOverlay();
}

function resumeGame() {
  if (!gameState.paused) return;
  gameState.paused = false;
  gameState.lastFrameTime = performance.now(); // Prevent delta spike
  releaseFocus();
  hidePauseOverlay();
}

function quitToMenu() {
  releaseFocus();
  cleanupPlay();
  if (gameState.callbacks && gameState.callbacks.onQuit) {
    gameState.callbacks.onQuit();
  }
}


// ═══════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════

/**
 * Start a new game.
 * @param {string} bracket - Age bracket ('4-5', '6-8', '9-12', 'Adult')
 * @param {Array} stageList - Resolved stage objects from getStagesForBracket()
 * @param {object} callbacks - { onQuit, getPlayerName, onGameOver }
 */
export function startGame(bracket, stageList, callbacks) {
  // Cancel any lingering victory confetti loop (Fix C2)
  if (victoryRaf) { cancelAnimationFrame(victoryRaf); victoryRaf = null; }

  // Lazy DOM init (Fix C2)
  initPlayDOM();

  // Cache theme colours
  cacheThemeColours();

  // Reset adaptive difficulty engine
  resetAdaptive();

  const overrides = getBracketOverrides(bracket);

  // Reset game state
  Object.assign(gameState, {
    items: [],
    particles: [],
    popTexts: [],
    score: 0,
    lives: overrides.livesOverride,
    stageIdx: 0,
    streak: 0,
    stageHits: 0,
    active: true,
    paused: false,
    celebrating: false,
    typedBuffer: '',
    wrongFlash: 0,
    stages: stageList,
    bracket,
    overrides,
    nextSpawn: 0, // set properly when countdown ends
    lastFrameTime: 0,
    callbacks: callbacks || null,
    allStagesCleared: false,
    _lastHintKey: null,
    speedPreference: (callbacks && callbacks.speedPreference) || 1.0,
    countingDown: true,
    countdownStart: 0, // set after loop starts
    _lastCountdownStep: -1,
    startTime: 0, // for WPM tracking, set when countdown ends
  });

  // Reset session stats
  resetSessionStats();

  // Show play area, hide overlay
  if (playArea) {
    playArea.hidden = false;
  }
  if (hudEls.overlay) {
    hudEls.overlay.hidden = true;
    hudEls.overlay.style.display = 'none';
  }

  // Show HUD elements
  if (hudEls.hud) hudEls.hud.style.display = 'flex';
  if (hudEls.stageBar) hudEls.stageBar.style.display = 'flex';
  if (hudEls.typedRow) hudEls.typedRow.style.display = 'flex';

  // Initial HUD update
  updateHUD();
  updateTypedDisplay();

  // Debounce aria-live: remove per-element live regions during gameplay
  if (hudEls.score) hudEls.score.removeAttribute('aria-live');
  if (hudEls.streak) hudEls.streak.removeAttribute('aria-live');

  // Announce combined summary every 5 seconds
  if (_ariaTimer) clearInterval(_ariaTimer);
  _ariaTimer = setInterval(() => {
    if (!gameState.active || gameState.paused) return;
    if (_ariaLiveEl) {
      _ariaLiveEl.textContent = `Score ${gameState.score}, Stage ${gameState.stageIdx + 1}, ${gameState.lives} lives`;
    }
  }, 5000);

  refreshMotionPref();
  if (window.KidsGames) window.KidsGames.sfx('start');

  // Set keyboard visible
  setVisibilityMode('show');

  // Spotlight mode for 4-5: dims all keys except the target
  setSpotlightMode(bracket === '4-5');

  // Show and style pause button per bracket
  if (hudEls.pauseBtn) {
    hudEls.pauseBtn.style.display = '';
    hudEls.pauseBtn.className = 'hud-btn'; // reset classes
    hudEls.pauseBtn.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-pause"/></svg>';
    if (bracket === '4-5') {
      hudEls.pauseBtn.classList.add('pause-btn--large');
    } else if (bracket === '6-8') {
      hudEls.pauseBtn.classList.add('pause-btn--labelled');
      hudEls.pauseBtn.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-pause"/></svg><span>Pause</span>';
    }
    // First-play pulse
    if (callbacks && callbacks.totalGamesPlayed === 0) {
      hudEls.pauseBtn.classList.add('pause-btn--pulse');
      setTimeout(() => hudEls.pauseBtn.classList.remove('pause-btn--pulse'), 2000);
    }
  }

  // Resize canvas to current dimensions
  handleResize();

  // Attach keydown handler
  if (boundHandleKey) {
    document.removeEventListener('keydown', boundHandleKey);
  }
  boundHandleKey = handleKey;
  document.addEventListener('keydown', boundHandleKey);

  // Start the game loop
  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
  gameState.countdownStart = performance.now();
}

/**
 * Clean up Play mode — remove listeners, cancel animations (Fix W4).
 * Called by main.js during mode switches.
 */
export function cleanupPlay() {
  if (victoryRaf) { cancelAnimationFrame(victoryRaf); victoryRaf = null; }

  gameState.active = false;
  gameState.paused = false;
  gameState.celebrating = false;

  if (raf) {
    cancelAnimationFrame(raf);
    raf = null;
  }

  if (boundHandleKey) {
    document.removeEventListener('keydown', boundHandleKey);
    boundHandleKey = null;
  }

  setSpotlightMode(false);
  clearHighlights();

  // Hide play area
  if (playArea) {
    playArea.hidden = true;
  }

  // Clear canvas
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Clear typed display
  if (hudEls.typedDisplay) {
    hudEls.typedDisplay.textContent = '';
  }

  // Hide pause button
  if (hudEls.pauseBtn) hudEls.pauseBtn.style.display = 'none';

  // Restore aria-live on HUD elements
  if (hudEls.score) hudEls.score.setAttribute('aria-live', 'polite');
  if (hudEls.streak) hudEls.streak.setAttribute('aria-live', 'polite');
  if (_ariaTimer) { clearInterval(_ariaTimer); _ariaTimer = null; }
  if (_ariaLiveEl) { _ariaLiveEl.textContent = ''; }

  if (themeObserver) { themeObserver.disconnect(); themeObserver = null; }
}

/**
 * Check if a game is currently active.
 * @returns {boolean}
 */
export function isGameActive() {
  return gameState.active;
}

/**
 * Check if game is paused.
 * @returns {boolean}
 */
export function isPaused() {
  return gameState.paused;
}

/**
 * Update the speed preference of the currently running game.
 * No-op if no game is active.
 * @param {number} value
 */
export function setSpeedPreference(value) {
  gameState.speedPreference = value;
}
