// audio.js — Web Audio API sound synthesis
// Tasks 9 & 10: Core audio engine + volume controls

// ── AudioContext (lazy-initialised) ────────────────────────────

/** @type {AudioContext|null} */
let audioCtx = null;

/** @type {GainNode|null} */
let masterGain = null;

// ── Volume State ───────────────────────────────────────────────

const AUDIO_SETTINGS_KEY = 'typingGame_audioSettings';

/** @type {number} Master volume level 0-1 */
let _volume = 0.8;

/** @type {boolean} Whether audio is currently muted */
let _muted = false;

// ── Initialisation ─────────────────────────────────────────────

/**
 * Initialise the AudioContext and master gain node.
 * Called lazily on first user interaction (click or keydown)
 * to satisfy browser autoplay policy. Idempotent — safe to call
 * multiple times.
 */
export function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);

  // Load saved volume/mute from localStorage (review O2: delegate to loadAudioSettings)
  loadAudioSettings();
}

/**
 * Ensure AudioContext exists and is not suspended (Safari).
 * Every sound function calls this as its first line.
 */
function ensureCtx() {
  initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// ── Sound Functions (Task 9) ───────────────────────────────────

/**
 * Soft pluck — sine wave with fast attack, quick decay.
 * Pitch varies by horizontal keyboard position.
 * @param {number} keyPosition — 0 (left of keyboard) to 1 (right)
 */
export function playCorrectKey(keyPosition = 0.5) {
  ensureCtx();
  const now = audioCtx.currentTime;

  // Map key position to frequency: E4 (330Hz) to E5 (660Hz)
  const freq = 330 + (keyPosition * 330);

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.01);        // 10ms attack
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);  // 140ms decay

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.16);
}

/**
 * Rising two-note chime — two sines a perfect fifth apart.
 * C5 (523 Hz) then G5 (784 Hz) staggered by 80ms.
 */
export function playWordComplete() {
  ensureCtx();
  const now = audioCtx.currentTime;

  // Note 1: C5 (523 Hz)
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, now);
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.25, now + 0.01);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + 0.35);

  // Note 2: G5 (784 Hz), starts 80ms later
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(783.99, now + 0.08);
  gain2.gain.setValueAtTime(0, now + 0.08);
  gain2.gain.linearRampToValueAtTime(0.25, now + 0.09);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.45);
}

/**
 * Gentle dull thud — low triangle wave, very short.
 * NOT alarming. Safe for young children.
 */
export function playWrongKey() {
  ensureCtx();
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(110, now);  // A2 — low, dull

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.01);        // Quiet peak
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);   // Very fast decay

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.1);
}

/**
 * Ascending 4-note major arpeggio — C major: C5, E5, G5, C6.
 * Each note 200ms apart, rings for 350ms.
 */
export function playStageClear() {
  ensureCtx();
  const now = audioCtx.currentTime;

  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  const noteSpacing = 0.2;   // 200ms between note starts
  const noteDuration = 0.35; // Each note rings for 350ms

  notes.forEach((freq, i) => {
    const t = now + (i * noteSpacing);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + noteDuration);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + noteDuration + 0.05);
  });
}

/**
 * Soft descending tone — gentle frequency glide downward.
 * E5 (659 Hz) glides to C4 (262 Hz) over 0.8s. "That was fun" energy.
 */
export function playGameOver() {
  ensureCtx();
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(659.25, now);                        // Start at E5
  osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.8);    // Glide to C4

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.4);  // Gentle sustain
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 1.05);
}

/**
 * Brief low tone — informational, not punishing.
 * A3 (220 Hz) with slight downward bend.
 */
export function playLifeLost() {
  ensureCtx();
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);                       // A3
  osc.frequency.linearRampToValueAtTime(180, now + 0.15);       // Slight downward bend

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.18);
}

/**
 * Warm bell — longer ring than play mode, more rewarding.
 * Two sine layers: fundamental D5 (587 Hz) + octave harmonic D6 (1174 Hz).
 */
export function playLearnCorrect() {
  ensureCtx();
  const now = audioCtx.currentTime;

  // Fundamental: D5 (587 Hz)
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(587.33, now);
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.25, now + 0.01);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + 0.55);

  // Harmonic: D6 (1174 Hz) — quieter, adds bell shimmer
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1174.66, now);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.08, now + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.start(now);
  osc2.stop(now + 0.4);
}

/**
 * Soft double-tap — two quiet triangle pulses, "not quite" without negativity.
 * Two pulses at 280 Hz, 80ms apart.
 */
export function playLearnNudge() {
  ensureCtx();
  const now = audioCtx.currentTime;

  for (let i = 0; i < 2; i++) {
    const t = now + (i * 0.08); // 80ms apart
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }
}

/**
 * Quick sparkle — high-frequency shimmer, layered sines.
 * Three tones: C7 (2093 Hz), E7 (2637 Hz), G7 (3136 Hz) staggered by 40ms.
 */
export function playStreakMilestone() {
  ensureCtx();
  const now = audioCtx.currentTime;

  const sparkleFreqs = [2093.00, 2637.02, 3135.96]; // C7, E7, G7
  const stagger = 0.04; // 40ms between each tone

  sparkleFreqs.forEach((freq, i) => {
    const t = now + (i * stagger);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  });
}

// ── Countdown Sounds (Task T5) ──────────────────────────────────

/**
 * Short gentle "boop" — sine wave, 440 Hz, 100ms.
 * Soft attack/release envelope for countdown ticks (3, 2, 1).
 */
export function playCountdownTick() {
  ensureCtx();
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.01);        // 10ms attack to 0.3
  gain.gain.linearRampToValueAtTime(0, now + 0.1);           // fade to 0 over 90ms

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.1);
}

/**
 * Brighter, slightly higher "go" tone — sine wave, 660 Hz, 150ms.
 * More energetic than the tick for the final "Go!" moment.
 */
export function playCountdownGo() {
  ensureCtx();
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(660, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.4, now + 0.01);        // 10ms attack to 0.4
  gain.gain.linearRampToValueAtTime(0, now + 0.15);           // fade to 0 over 140ms

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.15);
}

// ── playSound Dispatcher (Addendum 2 Fix W9) ──────────────────

/** @type {Object<string, Function>} Module-level sound lookup table */
const soundMap = {
  correctKey:      playCorrectKey,
  wordComplete:    playWordComplete,
  wrongKey:        playWrongKey,
  stageClear:      playStageClear,
  gameOver:        playGameOver,
  lifeLost:        playLifeLost,
  learnCorrect:    playLearnCorrect,
  learnNudge:      playLearnNudge,
  streakMilestone: playStreakMilestone,
  countdownTick:   playCountdownTick,
  countdownGo:     playCountdownGo,
};

/**
 * Dispatch a sound by name. Allows consumers to call either
 * `playCorrectKey(0.5)` directly OR `playSound('correctKey', 0.5)`.
 *
 * @param {string} name — Sound name (e.g. 'correctKey', 'wordComplete')
 * @param {...*} args — Arguments forwarded to the sound function
 * @returns {void}
 */
export function playSound(name, ...args) {
  const fn = soundMap[name];
  if (fn) {
    fn(...args);
  } else {
    console.warn(`[audio] Unknown sound: "${name}"`);
  }
}

// ── Volume Control (Task 10) ───────────────────────────────────

/**
 * Load audio settings from localStorage.
 * Called during initAudio() and can be called standalone.
 */
export function loadAudioSettings() {
  try {
    const saved = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (saved) {
      const settings = JSON.parse(saved);
      _volume = typeof settings.volume === 'number'
        ? Math.max(0, Math.min(1, settings.volume))
        : 0.8;
      _muted = !!settings.muted;
    }
  } catch (e) {
    _volume = 0.8;
    _muted = false;
  }
  applyVolume();
}

/**
 * Save current audio settings to localStorage.
 */
function saveAudioSettings() {
  try {
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify({
      volume: _volume,
      muted: _muted,
    }));
  } catch (e) {
    // localStorage full or unavailable — silently ignore
  }
}

/**
 * Apply current volume/mute state to the master gain node.
 */
function applyVolume() {
  if (!masterGain) return;
  const shellMuted = !!(window.KidsGames && window.KidsGames.muted);
  masterGain.gain.setValueAtTime((_muted || shellMuted) ? 0 : _volume, audioCtx.currentTime);
}

/**
 * Set master volume (0 to 1). Persists to localStorage.
 * @param {number} level — 0.0 (silent) to 1.0 (full volume)
 */
export function setVolume(level) {
  _volume = Math.max(0, Math.min(1, level));
  applyVolume();
  saveAudioSettings();
}

/**
 * Mute all audio. Persists to localStorage.
 */
export function mute() {
  _muted = true;
  applyVolume();
  saveAudioSettings();
  updateMuteButtonUI();
}

/**
 * Unmute audio (restores previous volume). Persists to localStorage.
 */
export function unmute() {
  _muted = false;
  applyVolume();
  saveAudioSettings();
  updateMuteButtonUI();
}

/**
 * Toggle mute state.
 */
export function toggleMute() {
  if (_muted) {
    unmute();
  } else {
    mute();
  }
}

/**
 * @returns {boolean} Whether audio is currently muted.
 */
export function isMuted() {
  return _muted;
}

/**
 * @returns {number} Current volume level (0-1), regardless of mute state.
 */
export function getVolume() {
  return _volume;
}

/**
 * Update the mute button icon in the HUD to reflect current state.
 */
function updateMuteButtonUI() {
  const btn = document.getElementById('mute-btn');
  if (!btn) return;
  const icon = btn.querySelector('.mute-icon');
  if (icon) {
    icon.textContent = _muted ? '\u{1F507}' : '\u{1F50A}'; // muted or speaker icon
  }
  btn.setAttribute('aria-label', _muted ? 'Unmute audio' : 'Mute audio');
  btn.setAttribute('aria-pressed', String(_muted));
}

/**
 * Attach click handler to the mute button in the HUD.
 * Call this once from main.js after DOM is ready.
 */
export function setupMuteButton() {
  // The shell's sound button is the one mute control: follow it.
  if (window.KidsGames && window.KidsGames.onMuteChange) {
    window.KidsGames.onMuteChange(() => applyVolume());
  }
  const btn = document.getElementById('mute-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    initAudio(); // Ensure AudioContext exists (first interaction)
    toggleMute();
  });

  // Set initial UI state from saved settings
  loadAudioSettings();
  updateMuteButtonUI();
}

/**
 * Apply a player's saved audio settings.
 * Called when a player profile is loaded.
 * @param {{ volume?: number, muted?: boolean }} settings
 */
export function applyPlayerAudioSettings(settings) {
  if (settings) {
    if (typeof settings.volume === 'number') {
      _volume = Math.max(0, Math.min(1, settings.volume));
    }
    if (typeof settings.muted === 'boolean') {
      _muted = settings.muted;
    }
    applyVolume();
    updateMuteButtonUI();
  }
}

/**
 * Get current audio settings for saving into a player profile.
 * @returns {{ volume: number, muted: boolean }}
 */
export function getAudioSettings() {
  return { volume: _volume, muted: _muted };
}

// ── Context Accessors (debugging & integration) ────────────────

/**
 * Expose the AudioContext for volume controls and debugging.
 * @returns {AudioContext|null}
 */
export function getAudioContext() {
  return audioCtx;
}

/**
 * Expose the master GainNode for advanced usage.
 * @returns {GainNode|null}
 */
export function getMasterGain() {
  return masterGain;
}
