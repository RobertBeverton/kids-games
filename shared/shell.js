// shared/shell.js — Shell bar, player sheets, grown-ups gate, shared sound.
// NOTE: The build script wraps storage.js + shell.js together in a single IIFE.
// Storage functions (getPlayer, savePlayer, etc.) are available here without import.

(function() {
  'use strict';

  const THEMES = ['colourful-light', 'colourful-dark'];
  const HOLD_MS = 1100;
  const AGES = [4, 5, 6, 7, 8, 9, 10, 11, 12];
  const AV_SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'plus', 'heart', 'hex'];
  const AV_PAINT = ['red', 'yellow', 'blue', 'green', 'orange', 'chalk', 'red', 'yellow'];

  const $ = (id) => document.getElementById(id);
  const _playerChangeListeners = [];
  const _muteListeners = [];

  // ---------------------------------------------------------------------
  // Sound: one shared, quiet engine. Games call KidsGames.sfx(name).
  // Soft sine/triangle only, master gain capped, mute is persisted.
  // ---------------------------------------------------------------------
  let muted = getPref('sound') === 'off';
  let actx = null, master = null;

  function audio() {
    if (!actx) {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        master = actx.createGain();
        master.gain.value = 0.5;
        master.connect(actx.destination);
      } catch (e) { actx = null; return null; }
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  function tone({ f = 440, type = 'sine', g = 0.16, d = 0.12, t = 0 }) {
    const c = audio();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const v = c.createGain();
      const t0 = c.currentTime + t;
      o.type = type;
      o.frequency.setValueAtTime(f, t0);
      v.gain.setValueAtTime(0.0001, t0);
      v.gain.exponentialRampToValueAtTime(g, t0 + 0.012);
      v.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(v); v.connect(master);
      o.start(t0); o.stop(t0 + d + 0.05);
    } catch (e) { /* audio unavailable */ }
  }

  const SFX = {
    tap:      [{ f: 520, d: 0.07, g: 0.1 }],
    start:    [{ f: 440, d: 0.1 }, { f: 660, d: 0.16, t: 0.09 }],
    right:    [{ f: 523, d: 0.12 }, { f: 784, d: 0.22, t: 0.1 }],
    wrong:    [{ f: 233, type: 'triangle', d: 0.26, g: 0.12 }],
    flip:     [{ f: 600, d: 0.08, g: 0.11 }],
    match:    [{ f: 523, d: 0.12 }, { f: 659, d: 0.12, t: 0.1 }, { f: 784, d: 0.22, t: 0.2 }],
    mismatch: [{ f: 233, type: 'triangle', d: 0.22, g: 0.1 }],
    win:      [{ f: 523, d: 0.18 }, { f: 659, d: 0.18, t: 0.16 }, { f: 784, d: 0.18, t: 0.32 }, { f: 1047, d: 0.42, t: 0.48 }],
    tick:     [{ f: 880, d: 0.05, g: 0.08 }],
  };

  function sfx(name) {
    if (muted) return;
    (SFX[name] || []).forEach(tone);
  }

  function setMuted(m) {
    muted = !!m;
    setPref('sound', muted ? 'off' : 'on');
    renderSound();
    _muteListeners.forEach(fn => { try { fn(muted); } catch (e) { console.error(e); } });
  }

  function renderSound() {
    const btn = $('kg-volume-btn');
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(muted));
    btn.setAttribute('aria-label', muted ? 'Sound is off. Turn sound on.' : 'Sound is on. Turn sound off.');
    $('kg-volume-use').setAttribute('href', muted ? '#i-sound-off' : '#i-sound-on');
    const gu = $('kg-gu-sound');
    if (gu) {
      gu.setAttribute('aria-pressed', String(muted));
      $('kg-gu-sound-use').setAttribute('href', muted ? '#i-sound-off' : '#i-sound-on');
      $('kg-gu-sound-label').textContent = muted ? 'Sound off' : 'Sound on';
    }
  }

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------
  window.KidsGames = {
    get player() {
      const p = getActivePlayer();
      if (!p) return null;
      return { name: p.name, ageBracket: getAgeBracket(p), theme: p.theme, avatar: getAvatarIndex(p) };
    },
    get muted() { return muted; },
    get progress() { const p = getActivePlayer(); return p ? getProgress(p.name) : {}; },
    get lastGame() { const p = getActivePlayer(); return p ? getLastGame(p.name) : null; },
    loadGameData: loadGameData,
    saveGameData: saveGameData,
    recordSession: recordSession,
    sfx: sfx,
    setMuted: setMuted,
    say(text) { const l = $('kg-live'); if (l) { l.textContent = ''; setTimeout(() => { l.textContent = text; }, 30); } },
    onPlayerChange(fn) { _playerChangeListeners.push(fn); },
    onMuteChange(fn) { _muteListeners.push(fn); },
  };

  function _notifyPlayerChange() {
    const ctx = window.KidsGames.player;
    _playerChangeListeners.forEach(fn => { try { fn(ctx); } catch (e) { console.error(e); } });
  }

  // ---------------------------------------------------------------------
  // Migration: old Type Trainer profiles
  // ---------------------------------------------------------------------
  function bracketToAge(bracket) {
    const map = { '4-5': 5, '6-8': 7, '9-12': 10, 'Adult': 18, '13+': 18 };
    return map[bracket] || 7;
  }

  function migrateTypeTrainerData() {
    if (localStorage.getItem('kidsgames_migrated_typetrainer')) return;
    let oldPlayers;
    try {
      oldPlayers = JSON.parse(localStorage.getItem('players') || 'null');
    } catch (e) {
      console.error('KidsGames: corrupt old player data, skipping migration', e);
      localStorage.setItem('kidsgames_migrated_typetrainer', 'true');
      return;
    }
    if (!oldPlayers || !oldPlayers.players) {
      localStorage.setItem('kidsgames_migrated_typetrainer', 'true');
      return;
    }
    Object.entries(oldPlayers.players).forEach(([name, data]) => {
      if (!getPlayer(name)) {
        const theme = data.settings && data.settings.theme ? data.settings.theme : 'colourful-light';
        const themeMap = { 'light': 'colourful-light', 'dark': 'colourful-dark', 'clean-light': 'colourful-light', 'clean-dark': 'colourful-dark', 'colourful-light': 'colourful-light', 'colourful-dark': 'colourful-dark' };
        createPlayer(name, { dob: null, manualAge: bracketToAge(data.ageBracket) });
        savePlayer(name, { theme: themeMap[theme] || theme });
      }
      const key = STORAGE_PREFIX + 'typetrainer_' + name;
      _write(key, {
        highScore: data.highScore || 0,
        highestStage: data.highestStage || 0,
        totalGamesPlayed: data.totalGamesPlayed || 0,
        stats: data.stats || {},
        speedPreference: (data.settings && data.settings.speedPreference) || 1.8,
      });
    });
    const lastPlayer = localStorage.getItem('typingGame_lastPlayer');
    if (lastPlayer && getPlayer(lastPlayer)) setActivePlayer(lastPlayer);
    const newPlayers = getAllPlayers();
    if (Object.keys(newPlayers).length > 0) {
      localStorage.removeItem('players');
      localStorage.removeItem('currentPlayer');
      localStorage.removeItem('typingGame_theme');
      localStorage.removeItem('typingGame_lastPlayer');
    } else {
      console.error('KidsGames: migration wrote no players — keeping old keys as backup');
    }
    localStorage.setItem('kidsgames_migrated_typetrainer', 'true');
  }

  // ---------------------------------------------------------------------
  // Theme, age flex, motion
  // ---------------------------------------------------------------------
  function osTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES[1] : THEMES[0];
  }

  function applyTheme(theme) {
    if (theme === 'clean-light' || !theme) theme = THEMES[0];
    else if (theme === 'clean-dark') theme = THEMES[1];
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('#kg-theme-seg .kg-seg__opt').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.theme === theme));
    });
    return theme;
  }

  function applyAge(player) {
    const young = player && getAgeBracket(player) === '4-5';
    document.documentElement.setAttribute('data-age', young ? 'young' : 'older');
  }

  function applyMotion() {
    const pref = getPref('motion'); // 'full' | 'reduced' | null (follow the device)
    const root = document.documentElement;
    if (pref === 'reduced') root.setAttribute('data-motion', 'reduced');
    else if (pref === 'full') root.setAttribute('data-motion', 'full');
    else root.removeAttribute('data-motion');
    const effective = pref || (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full');
    document.querySelectorAll('#kg-motion-seg .kg-seg__opt').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.motion === effective));
    });
  }

  // ---------------------------------------------------------------------
  // Overlays: open/close with focus return and a focus trap
  // ---------------------------------------------------------------------
  const _openers = new Map();

  function openOverlay(id, focusSel) {
    const el = $(id);
    if (!el.hidden) return;
    _openers.set(id, document.activeElement);
    el.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    const target = (focusSel && el.querySelector(focusSel)) || el.querySelector('button:not([disabled]), input');
    if (target) target.focus();
  }

  function closeOverlay(id, restore = true) {
    const el = $(id);
    if (el.hidden) return;
    el.hidden = true;
    if (!document.querySelector('.kg-overlay:not([hidden])')) document.documentElement.style.overflow = '';
    const back = _openers.get(id);
    _openers.delete(id);
    if (restore && back && document.contains(back) && !back.closest('[hidden]')) back.focus();
  }

  function topOverlay() {
    const open = [...document.querySelectorAll('.kg-overlay:not([hidden])')];
    return open.length ? open[open.length - 1] : null;
  }

  // ---------------------------------------------------------------------
  // Player picker
  // ---------------------------------------------------------------------
  function avatarSvg(index, cls) {
    return '<svg class="kg-avatar av-' + index + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#a-' + AV_SHAPES[index] + '"/></svg>';
  }

  function showPlayerSelect() {
    const players = Object.values(getAllPlayers());
    if (!players.length) { openNewPlayer('first'); return; }
    const active = getActivePlayer();
    const grid = $('kg-player-grid');
    let html = '';
    players.forEach(p => {
      const cur = active && active.name === p.name;
      html += '<button type="button" class="kg-player-card" data-player="' + escapeHtml(p.name) + '"' + (cur ? ' aria-current="true"' : '') + '>' +
        avatarSvg(getAvatarIndex(p)) +
        '<span class="kg-player-card__name">' + escapeHtml(p.name) + '</span></button>';
    });
    html += '<button type="button" class="kg-player-card kg-player-card--add" id="kg-add-player-btn" aria-label="Add a new player">' +
      '<svg class="ic" aria-hidden="true"><use href="#i-plus"/></svg>' +
      '<span class="kg-player-card__name">New</span></button>';
    grid.innerHTML = html;
    openOverlay('kg-player-overlay', '.kg-player-card[aria-current="true"], .kg-player-card');
  }

  function applyPlayer(player, silent) {
    setActivePlayer(player.name);
    const theme = applyTheme(player.theme);
    if (theme !== player.theme) savePlayer(player.name, { theme });
    applyAge(player);
    const idx = getAvatarIndex(player);
    $('kg-player-avatar').setAttribute('class', 'kg-avatar av-' + idx);
    $('kg-player-avatar-use').setAttribute('href', '#a-' + AV_SHAPES[idx]);
    $('kg-player-name').textContent = player.name;
    $('kg-player-btn').setAttribute('aria-label', 'Playing as ' + player.name + '. Change player.');
    const page = document.body.dataset.page;
    if (page && page !== 'hub') setLastGame(player.name, page);
    closeOverlay('kg-player-overlay', !silent);
    _notifyPlayerChange();
  }

  // ---------------------------------------------------------------------
  // New player / edit player sheet
  // ---------------------------------------------------------------------
  let _form = { mode: 'new', editName: null, avatar: 0, age: null, returnTo: null };

  function buildFormChoices() {
    $('kg-avatar-grid').innerHTML = AV_SHAPES.map((s, i) =>
      '<button type="button" class="kg-avatar-opt" role="radio" aria-checked="false" aria-label="' + s + '" data-av="' + i + '">' +
      avatarSvg(i) + '<svg class="ic kg-tick" aria-hidden="true"><use href="#i-check"/></svg></button>').join('');
    $('kg-age-grid').innerHTML = AGES.map(a =>
      '<button type="button" class="kg-age-opt" data-age="' + a + '" aria-pressed="false">' + a + '</button>').join('');
  }

  function renderFormChoices() {
    document.querySelectorAll('.kg-avatar-opt').forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.av) === _form.avatar)));
    document.querySelectorAll('.kg-age-opt').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.age) === _form.age)));
    $('kg-age-input').value = _form.age == null ? '' : String(_form.age);
  }

  function updateSubmit() {
    $('kg-addplayer-submit').disabled = !$('kg-name-input').value.trim();
  }

  function openNewPlayer(returnTo) {
    _form = { mode: 'new', editName: null, avatar: nextFreeAvatar(), age: null, returnTo: returnTo || 'picker' };
    $('kg-addplayer-heading').textContent = 'New player';
    const name = $('kg-name-input');
    name.value = ''; name.disabled = false;
    $('kg-name-error').hidden = true;
    $('kg-dob-input').value = '';
    $('kg-dob-field').hidden = true;
    $('kg-dob-toggle').hidden = false;
    $('kg-addplayer-cancel').hidden = returnTo === 'first';
    renderFormChoices(); updateSubmit();
    closeOverlay('kg-player-overlay', false);
    openOverlay('kg-addplayer-overlay', '#kg-name-input');
  }

  function openEditPlayer(name) {
    const p = getPlayer(name);
    if (!p) return;
    const age = getAge(p);
    _form = { mode: 'edit', editName: name, avatar: getAvatarIndex(p), age: AGES.includes(age) ? age : null, returnTo: 'grownups' };
    $('kg-addplayer-heading').textContent = 'Edit ' + p.name;
    const input = $('kg-name-input');
    input.value = p.name; input.disabled = true;
    $('kg-name-error').hidden = true;
    $('kg-dob-input').value = p.dob || '';
    const useDob = !!p.dob;
    $('kg-dob-field').hidden = !useDob;
    $('kg-dob-toggle').hidden = useDob;
    $('kg-addplayer-cancel').hidden = false;
    renderFormChoices(); updateSubmit();
    openOverlay('kg-addplayer-overlay', '.kg-avatar-opt[aria-checked="true"]');
  }

  function nextFreeAvatar() {
    const used = new Set(Object.values(getAllPlayers()).map(getAvatarIndex));
    for (let i = 0; i < AV_SHAPES.length; i++) if (!used.has(i)) return i;
    return 0;
  }

  function leaveForm() {
    closeOverlay('kg-addplayer-overlay', false);
    const to = _form.returnTo;
    if (to === 'grownups') { renderGrownups(); openOverlay('kg-grownups-overlay', '#kg-grownups-close'); }
    else if (to === 'picker') showPlayerSelect();
    // 'first' cannot be left: there is no one to play as yet
    else if (to === 'first') openOverlay('kg-addplayer-overlay', '#kg-name-input');
  }

  function submitForm(e) {
    e.preventDefault();
    const dobVisible = !$('kg-dob-field').hidden;
    const dob = dobVisible ? ($('kg-dob-input').value || null) : null;
    const manualAge = !dobVisible && _form.age != null ? _form.age : null;

    if (_form.mode === 'edit') {
      const p = getPlayer(_form.editName);
      savePlayer(_form.editName, {
        avatar: _form.avatar,
        dob: dobVisible ? dob : null,
        manualAge: dobVisible ? null : (manualAge != null ? manualAge : p.manualAge),
        lastAgeNudge: new Date().toISOString().slice(0, 10),
      });
      const active = getActivePlayer();
      if (active && active.name === _form.editName) applyPlayer(getPlayer(_form.editName), true);
      leaveForm();
      return;
    }

    const name = $('kg-name-input').value.trim();
    if (!name) return;
    const created = createPlayer(name, { dob, manualAge, avatar: _form.avatar });
    if (!created) { $('kg-name-error').hidden = false; $('kg-name-input').focus(); return; }
    closeOverlay('kg-addplayer-overlay', false);
    applyPlayer(getPlayer(created), true);
  }

  // ---------------------------------------------------------------------
  // Grown-ups
  // ---------------------------------------------------------------------
  function getPlayersDueForNudge(players) {
    const due = new Set();
    Object.values(players).forEach(p => {
      if (getAge(p) === null) return;
      const lastSeen = p.lastAgeNudgeSeen || '2000-01-01';
      if ((Date.now() - new Date(lastSeen).getTime()) / 86400000 < 7) return;
      const lastNudge = p.lastAgeNudge || p.createdAt;
      if ((Date.now() - new Date(lastNudge).getTime()) / 86400000 >= 365) due.add(p.name);
    });
    return due;
  }

  function renderGrownups() {
    const players = getAllPlayers();
    const due = getPlayersDueForNudge(players);
    const list = $('kg-gu-players');
    const rows = Object.values(players).map(p => {
      const age = getAge(p);
      return '<div class="kg-gu-row">' + avatarSvg(getAvatarIndex(p)) +
        '<div class="kg-gu-row__name">' + escapeHtml(p.name) +
        (age != null ? ' <span class="kg-gu-row__age">age ' + age + '</span>' : '') +
        (due.has(p.name) ? '<br><span class="kg-gu-row__age">A year has passed. Check their age.</span>' : '') + '</div>' +
        '<button type="button" class="kg-iconbtn" data-edit="' + escapeHtml(p.name) + '" aria-label="Edit ' + escapeHtml(p.name) + '"><svg class="ic"><use href="#i-pencil"/></svg></button>' +
        '<button type="button" class="kg-iconbtn" data-del="' + escapeHtml(p.name) + '" aria-label="Delete ' + escapeHtml(p.name) + '"><svg class="ic"><use href="#i-trash"/></svg></button>' +
        '</div>';
    });
    list.innerHTML = rows.length ? rows.join('') : '<p class="kg-gu-note">No players yet.</p>';
    applyTheme(document.documentElement.getAttribute('data-theme'));
    applyMotion();
    renderSound();
  }

  function openGrownups() {
    renderGrownups();
    closeOverlay('kg-player-overlay', false);
    openOverlay('kg-grownups-overlay', '#kg-grownups-close');
  }

  function askDelete(name) {
    $('kg-confirm-text').textContent = 'Delete ' + name + ' and everything they have saved?';
    $('kg-confirm-yes').dataset.name = name;
    openOverlay('kg-confirm-overlay', '#kg-confirm-no');
  }

  function doDelete(name) {
    const wasActive = getActivePlayer() && getActivePlayer().name === name;
    deletePlayer(name);
    closeOverlay('kg-confirm-overlay', false);
    if (wasActive) {
      try { localStorage.removeItem(STORAGE_PREFIX + 'activePlayer'); } catch (e) { /* ignore */ }
      closeOverlay('kg-grownups-overlay', false);
      const left = Object.keys(getAllPlayers());
      if (left.length) showPlayerSelect(); else openNewPlayer('first');
      return;
    }
    renderGrownups();
    const next = $('kg-gu-players').querySelector('[data-edit]') || $('kg-gu-add');
    if (next) next.focus();
  }

  // Press-and-hold gate: a child's tap does nothing, a deliberate hold opens it.
  function bindHoldGate() {
    const btn = $('kg-grownups-btn');
    let timer = null;
    const start = () => {
      if (timer) return;
      btn.classList.add('is-holding');
      timer = setTimeout(() => { timer = null; btn.classList.remove('is-holding'); openGrownups(); }, HOLD_MS);
    };
    const stop = () => {
      if (timer) { clearTimeout(timer); timer = null; }
      btn.classList.remove('is-holding');
    };
    btn.addEventListener('pointerdown', (e) => { if (e.button === 0 || e.pointerType !== 'mouse') start(); });
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(ev => btn.addEventListener(ev, stop));
    btn.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); start(); } });
    btn.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') stop(); });
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    btn.addEventListener('click', () => window.KidsGames.say('Grown-ups. Press and hold the button to open.'));
  }

  // ---------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------
  function bindEvents() {
    $('kg-player-btn').addEventListener('click', showPlayerSelect);
    $('kg-volume-btn').addEventListener('click', () => { setMuted(!muted); if (!muted) sfx('tap'); });
    bindHoldGate();

    $('kg-player-grid').addEventListener('click', (e) => {
      const card = e.target.closest('.kg-player-card');
      if (!card) return;
      if (card.id === 'kg-add-player-btn') { openNewPlayer('picker'); return; }
      const player = getPlayer(card.dataset.player);
      if (player) { sfx('tap'); applyPlayer(player); }
    });

    $('kg-avatar-grid').addEventListener('click', (e) => {
      const b = e.target.closest('.kg-avatar-opt'); if (!b) return;
      _form.avatar = Number(b.dataset.av); renderFormChoices();
    });
    $('kg-age-grid').addEventListener('click', (e) => {
      const b = e.target.closest('.kg-age-opt'); if (!b) return;
      const a = Number(b.dataset.age);
      _form.age = _form.age === a ? null : a; renderFormChoices();
    });
    $('kg-dob-toggle').addEventListener('click', () => {
      $('kg-dob-field').hidden = false; $('kg-dob-toggle').hidden = true;
      _form.age = null; renderFormChoices();
      $('kg-dob-input').focus();
    });
    const dobInput = $('kg-dob-input');
    dobInput.max = new Date().toISOString().slice(0, 10);
    $('kg-name-input').addEventListener('input', () => { $('kg-name-error').hidden = true; updateSubmit(); });
    $('kg-addplayer-form').addEventListener('submit', submitForm);
    $('kg-addplayer-cancel').addEventListener('click', leaveForm);

    $('kg-grownups-close').addEventListener('click', () => closeOverlay('kg-grownups-overlay'));
    $('kg-gu-add').addEventListener('click', () => { closeOverlay('kg-grownups-overlay', false); openNewPlayer('grownups'); });
    $('kg-gu-players').addEventListener('click', (e) => {
      const ed = e.target.closest('[data-edit]'); const del = e.target.closest('[data-del]');
      if (ed) { closeOverlay('kg-grownups-overlay', false); openEditPlayer(ed.dataset.edit); }
      if (del) askDelete(del.dataset.del);
    });
    $('kg-confirm-no').addEventListener('click', () => closeOverlay('kg-confirm-overlay'));
    $('kg-confirm-yes').addEventListener('click', (e) => doDelete(e.currentTarget.dataset.name));

    $('kg-theme-seg').addEventListener('click', (e) => {
      const b = e.target.closest('.kg-seg__opt'); if (!b) return;
      const theme = applyTheme(b.dataset.theme);
      const p = getActivePlayer(); if (p) savePlayer(p.name, { theme });
    });
    $('kg-motion-seg').addEventListener('click', (e) => {
      const b = e.target.closest('.kg-seg__opt'); if (!b) return;
      setPref('motion', b.dataset.motion); applyMotion();
    });
    $('kg-gu-sound').addEventListener('click', () => setMuted(!muted));

    document.addEventListener('keydown', (e) => {
      const top = topOverlay();
      if (e.key === 'Escape' && top) {
        e.preventDefault();
        if (top.id === 'kg-confirm-overlay') closeOverlay('kg-confirm-overlay');
        else if (top.id === 'kg-grownups-overlay') closeOverlay('kg-grownups-overlay');
        else if (top.id === 'kg-addplayer-overlay') { if (_form.returnTo !== 'first') leaveForm(); }
        else if (top.id === 'kg-player-overlay' && getActivePlayer()) closeOverlay('kg-player-overlay');
        return;
      }
      if (e.key === 'Tab' && top) {
        const f = [...top.querySelectorAll('button:not([disabled]), input:not([type=hidden]):not([disabled]), a[href]')].filter(x => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || !top.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Scrim tap closes the dismissible sheets (never the first-run form)
    document.querySelectorAll('.kg-overlay').forEach(o => o.addEventListener('pointerdown', (e) => {
      if (e.target !== o) return;
      if (o.id === 'kg-grownups-overlay') closeOverlay('kg-grownups-overlay');
      else if (o.id === 'kg-player-overlay' && getActivePlayer()) closeOverlay('kg-player-overlay');
      else if (o.id === 'kg-confirm-overlay') closeOverlay('kg-confirm-overlay');
    }));

    const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
    mqDark.addEventListener('change', () => { if (!getActivePlayer()) applyTheme(osTheme()); });
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', applyMotion);

    // Browsers keep audio suspended until a gesture: wake it on the first one.
    const wake = () => { if (!muted) audio(); document.removeEventListener('pointerdown', wake); document.removeEventListener('keydown', wake); };
    document.addEventListener('pointerdown', wake);
    document.addEventListener('keydown', wake);
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------
  let _initialized = false;
  function initShell() {
    if (_initialized) return;
    _initialized = true;

    if (document.body.dataset.page === 'type-trainer') migrateTypeTrainerData();

    applyTheme(osTheme());
    applyMotion();
    buildFormChoices();
    renderSound();
    if (document.body.dataset.page === 'hub') { $('kg-home').hidden = true; }
    bindEvents();

    const active = getActivePlayer();
    if (active) applyPlayer(active, true); else showPlayerSelect();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initShell);
  else initShell();
})();
