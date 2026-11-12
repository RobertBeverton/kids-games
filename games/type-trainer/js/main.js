// main.js — Entry point, game state machine
// Refactored: shell handles player selection, theme, navigation

import { initAudio, setupMuteButton } from './audio.js';
import { initKeyboard, toggleVisibilityMode } from './keyboard.js';
import { getStagesForBracket } from './stages.js';
import { startGame as startPlayGame, cleanupPlay, setSpeedPreference } from './play.js';
// Note: In concatenated build, startPlayGame alias is lost.
// play.js exports 'startGame', so the build will use that name directly.
// main.js's local function is 'enterPlayMode' to avoid collision.
import './adaptive.js';

// ---------------------------------------------------------------------------
// Play mode
// ---------------------------------------------------------------------------

function enterPlayMode(bracket, speed) {
  const stages = getStagesForBracket(bracket);
  const gameData = window.KidsGames ? window.KidsGames.loadGameData('typetrainer') : {};

  startPlayGame(bracket, stages, {
    previousHighScore: gameData.highScore || 0,
    totalGamesPlayed: gameData.totalGamesPlayed || 0,
    speedPreference: speed,
    onSpeedChange: (newSpeed) => {
      if (window.KidsGames) {
        const existing = window.KidsGames.loadGameData('typetrainer');
        window.KidsGames.saveGameData('typetrainer', { ...existing, speedPreference: newSpeed });
      }
    },
    onQuit: () => { window.location.href = 'index.html'; },
    getPlayerName: () => window.KidsGames?.player?.name || 'Player',
    onGameOver: (stats) => {
      if (!window.KidsGames) return;
      window.KidsGames.recordSession('type-trainer');
      const existing = window.KidsGames.loadGameData('typetrainer');

      // Rolling accuracy (70% historical, 30% this game)
      const prevAcc = existing.stats?.accuracy || 0;
      const totalGames = (existing.totalGamesPlayed || 0) + 1;
      const accuracy = totalGames === 1
        ? stats.accuracy
        : prevAcc * 0.7 + stats.accuracy * 0.3;

      // Fastest word (keep best)
      let fastestWord = existing.stats?.fastestWord || null;
      if (stats.fastestWord && (!fastestWord || stats.fastestWord.ms < fastestWord.ms)) {
        fastestWord = stats.fastestWord;
      }

      // Fastest word per length (merge, keeping the faster one)
      const fastestByLength = { ...(existing.stats?.fastestByLength || {}) };
      if (stats.fastestByLength) {
        for (const len of Object.keys(stats.fastestByLength)) {
          const incoming = stats.fastestByLength[len];
          const ex = fastestByLength[len];
          if (!ex || incoming.ms < ex.ms) fastestByLength[len] = incoming;
        }
      }

      window.KidsGames.saveGameData('typetrainer', {
        ...existing,
        highScore: Math.max(existing.highScore || 0, stats.score),
        highestStage: Math.max(existing.highestStage || 0, stats.stageReached),
        totalGamesPlayed: totalGames,
        stats: {
          ...existing.stats,
          accuracy,
          fastestWord,
          fastestByLength,
          longestStreak: Math.max(existing.stats?.longestStreak || 0, stats.longestStreak),
          weakKeys: stats.weakKeys.slice(0, 5),
          totalKeysPressed: (existing.stats?.totalKeysPressed || 0) + stats.totalKeysPressed,
          totalCorrect: (existing.stats?.totalCorrect || 0) + stats.totalCorrect,
        },
      });
    },
  });
}

const SPEEDS = [
  { label: 'Easy', value: 1.0 },
  { label: 'Normal', value: 1.8 },
  { label: 'Hard', value: 2.3 },
  { label: 'Extra Hard', value: 3.0 },
];

function getDefaultSpeed(bracket) {
  const defaults = { '4-5': 1.0, '6-8': 1.8, '9-12': 2.3, 'Adult': 3.0 };
  return defaults[bracket] || 1.8;
}

function startFromShell() {
  const ctx = window.KidsGames ? window.KidsGames.player : null;
  if (!ctx) return; // shell hasn't initialised yet

  // stages.js uses 'Adult' for the oldest bracket; map from hub's '13+' label
  const bracket = ctx.ageBracket === '13+' ? 'Adult' : ctx.ageBracket;
  const gameData = window.KidsGames ? window.KidsGames.loadGameData('typetrainer') : {};
  const speedPref = gameData.speedPreference || getDefaultSpeed(bracket);

  // Sync the HUD speed label with the loaded preference
  const speedLabel = document.getElementById('speed-label');
  if (speedLabel) {
    const match = SPEEDS.find(s => s.value === speedPref);
    speedLabel.textContent = match ? match.label : 'Normal';
  }

  enterPlayMode(bracket, speedPref);
}

// ---------------------------------------------------------------------------
// Keyboard check
// ---------------------------------------------------------------------------

function checkKeyboard() {
  if ('ontouchstart' in window && !matchMedia('(pointer: fine)').matches) {
    const warn = document.createElement('div');
    warn.className = 'keyboard-warning';
    warn.innerHTML = '<p>This game works best with a keyboard.</p>';
    document.getElementById('game-wrapper').prepend(warn);
  }
}

// ---------------------------------------------------------------------------
// Expose for cross-module access
// ---------------------------------------------------------------------------

// play.js needs to call back into main
// for screen transitions. Expose on window for now.
window._main = {
  getCurrentPlayer: () => window.KidsGames?.player
};

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Show soft keyboard warning on touch-only devices
  checkKeyboard();

  // Wire up audio mute button
  setupMuteButton();

  // Ensure AudioContext is created on first keydown (browser autoplay policy)
  document.addEventListener('keydown', () => { initAudio(); }, { once: true });

  // Keyboard initialisation
  const keyboardContainer = document.getElementById('keyboard');
  if (keyboardContainer) {
    initKeyboard(keyboardContainer);
  }

  // Keyboard toggle button
  const toggleBtn = document.getElementById('keyboard-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const newMode = toggleVisibilityMode();
      const label = toggleBtn.querySelector('.hud-btn__label');
      if (label) {
        switch (newMode) {
          case 'show': label.textContent = 'Keyboard'; break;
          case 'hide': label.textContent = 'Keyboard (off)'; break;
        }
      }
      toggleBtn.classList.toggle('hud-btn--active', newMode === 'show');
    });
  }

  // Speed picker dropdown
  const speedBtn      = document.getElementById('speed-btn');
  const speedLabel    = document.getElementById('speed-label');
  const speedDropdown = document.getElementById('speed-dropdown');

  function buildSpeedDropdown(currentLabel) {
    speedDropdown.innerHTML = '';
    SPEEDS.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'speed-option' + (s.label === currentLabel ? ' speed-option--active' : '');
      btn.innerHTML = `<span>${s.label}</span><svg class="ic speed-option__check" aria-hidden="true"><use href="#i-check"/></svg>`;
      btn.addEventListener('click', () => {
        setSpeedPreference(s.value);
        if (window.KidsGames) {
          const existing = window.KidsGames.loadGameData('typetrainer');
          window.KidsGames.saveGameData('typetrainer', { ...existing, speedPreference: s.value });
        }
        speedLabel.textContent = s.label;
        speedDropdown.hidden = true;
        speedBtn.setAttribute('aria-expanded', 'false');
      });
      speedDropdown.appendChild(btn);
    });
  }

  if (speedBtn && speedLabel && speedDropdown) {
    speedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !speedDropdown.hidden;
      speedDropdown.hidden = open;
      speedBtn.setAttribute('aria-expanded', String(!open));
      if (!open) buildSpeedDropdown(speedLabel.textContent);
    });

    document.addEventListener('click', () => {
      speedDropdown.hidden = true;
      speedBtn.setAttribute('aria-expanded', 'false');
    });
  }

  // Register for shell player changes, then start
  if (window.KidsGames) {
    window.KidsGames.onPlayerChange(() => {
      try { cleanupPlay(); } catch (_) { /* may not be active */ }
      startFromShell();
    });
    startFromShell();
  } else {
    // Fallback: no shell — start with default bracket
    enterPlayMode('6-8', 1.8);
  }
});
