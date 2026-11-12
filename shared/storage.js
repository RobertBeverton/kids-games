// shared/storage.js — Player profiles and namespaced game data
// NOTE: This file is concatenated INSIDE the shell IIFE by the build script.
// Do NOT wrap in its own IIFE.

const STORAGE_PREFIX = 'kidsgames_';
const PLAYERS_KEY = STORAGE_PREFIX + 'players';
const ACTIVE_KEY = STORAGE_PREFIX + 'activePlayer';

function _read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch (e) {
    console.error('KidsGames: corrupt data for key', key, e);
    return null;
  }
}

function _write(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch (e) {
    console.error('KidsGames: storage write failed', key, e);
    return false;
  }
}

// Sanitise player names: letters/numbers/spaces/hyphens/apostrophes, max 20 chars
function sanitiseName(name) {
  return name.replace(/[^\p{L}\p{N} '\-]/gu, '').trim().slice(0, 20);
}

// Escape HTML to prevent injection when inserting into innerHTML
function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

function getAllPlayers() {
  return _read(PLAYERS_KEY) || {};
}

function getPlayer(name) {
  const players = getAllPlayers();
  return players[name] || null;
}

function createPlayer(name, { dob, manualAge, avatar }) {
  name = sanitiseName(name);
  if (!name) return false;
  const players = getAllPlayers();
  if (players[name]) return false; // already exists
  players[name] = {
    name: name,
    dob: dob || null,
    manualAge: dob ? null : (manualAge || null),
    theme: getDefaultTheme(),
    avatar: Number.isInteger(avatar) ? avatar : null,
    createdAt: new Date().toISOString().slice(0, 10)
  };
  // Return the sanitised name on success so callers can look up the right key
  return _write(PLAYERS_KEY, players) ? name : false;
}

function savePlayer(name, data) {
  const players = getAllPlayers();
  if (!players[name]) return;
  players[name] = { ...players[name], ...data };
  _write(PLAYERS_KEY, players);
}

function deletePlayer(name) {
  const players = getAllPlayers();
  delete players[name];
  _write(PLAYERS_KEY, players);
  // Clean up game-specific data — match exact suffix pattern
  const suffix = '_' + name;
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(STORAGE_PREFIX) && k.endsWith(suffix) && k !== PLAYERS_KEY && k !== ACTIVE_KEY) {
        localStorage.removeItem(k);
      }
    });
  } catch (e) {
    console.error('KidsGames: failed to clean up game data for player', name, e);
  }
}

function getActivePlayer() {
  const name = _read(ACTIVE_KEY);
  return name ? getPlayer(name) : null;
}

function setActivePlayer(name) {
  _write(ACTIVE_KEY, name);
}

function getAgeBracket(player) {
  const age = getAge(player);
  if (age === null) return '6-8'; // fallback
  if (age <= 5) return '4-5';
  if (age <= 8) return '6-8';
  if (age <= 12) return '9-12';
  return '13+';
}

function getAge(player) {
  if (player.dob) {
    const today = new Date();
    const birth = new Date(player.dob);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }
  return player.manualAge || null;
}

function getDefaultTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'colourful-dark' : 'colourful-light';
}

// Game-specific data
function loadGameData(gameId) {
  const player = getActivePlayer();
  if (!player) return {};
  return _read(STORAGE_PREFIX + gameId + '_' + player.name) || {};
}

function saveGameData(gameId, data) {
  const player = getActivePlayer();
  if (!player) return;
  _write(STORAGE_PREFIX + gameId + '_' + player.name, data);
}

// --- Player shape (avatar): 8 painted shapes. Older profiles get one from their name. ---
const AVATAR_COUNT = 8;
function getAvatarIndex(player) {
  if (player && Number.isInteger(player.avatar) && player.avatar >= 0 && player.avatar < AVATAR_COUNT) return player.avatar;
  let h = 0;
  const n = (player && player.name) || '';
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  return h % AVATAR_COUNT;
}

// --- Progress: finished sessions per game, one hopscotch square each ---
function getProgress(name) {
  return _read(STORAGE_PREFIX + 'progress_' + name) || {};
}
function recordSession(gameId) {
  const p = getActivePlayer();
  if (!p || !gameId) return;
  const prog = getProgress(p.name);
  prog[gameId] = (prog[gameId] || 0) + 1;
  _write(STORAGE_PREFIX + 'progress_' + p.name, prog);
}

// --- Last game played, so the hub can offer 'carry on' ---
function getLastGame(name) {
  return _read(STORAGE_PREFIX + 'last_' + name);
}
function setLastGame(name, gameId) {
  _write(STORAGE_PREFIX + 'last_' + name, gameId);
}

// --- Device preferences (not per player) ---
function getPref(key) { return _read(STORAGE_PREFIX + 'pref_' + key); }
function setPref(key, val) { _write(STORAGE_PREFIX + 'pref_' + key, val); }

// --- Maths merge: Number Bonds became a style ("Find the missing number") inside Maths ---
// Runs once per player (guarded by a flag), never deletes the old data. Moves, per player:
//   - settings and personal bests: kidsgames_maths_<name> / kidsgames_numberbonds_<name>  ->  kidsgames_maths_<name>
//     (personal-best keys gain the style: pb_<op>_<diff>_<mode>  ->  pb_<style>_<op>_<diff>_<mode>)
//   - progress squares: 'number-bonds' is added to 'maths'
//   - 'last game played': 'number-bonds' becomes 'maths'
function migrateMathsMerge() {
  let players;
  try { players = Object.keys(getAllPlayers()); } catch (e) { return; }
  players.forEach(function (name) {
    const flagKey = STORAGE_PREFIX + 'merged_maths_' + name;
    if (_read(flagKey)) return;
    try {
      const maths = _read(STORAGE_PREFIX + 'maths_' + name);
      const nb = _read(STORAGE_PREFIX + 'numberbonds_' + name);
      if (maths && maths.v === 2) { _write(flagKey, true); return; }
      if (maths || nb) {
        const last = _read(STORAGE_PREFIX + 'last_' + name);
        const fromNb = nb && nb.settings && (!maths || !maths.settings || last === 'number-bonds');
        const src = fromNb ? nb : (maths && maths.settings ? maths : nb);
        const merged = { v: 2 };
        if (src && src.settings) {
          merged.settings = Object.assign({}, src.settings, { style: src === nb ? 'missing' : 'answer' });
        }
        [[maths, 'answer'], [nb, 'missing']].forEach(function (pair) {
          const data = pair[0], style = pair[1];
          if (!data) return;
          Object.keys(data).forEach(function (k) {
            if (k.indexOf('pb_') !== 0 || k.indexOf('pb_answer_') === 0 || k.indexOf('pb_missing_') === 0) return;
            merged['pb_' + style + '_' + k.slice(3)] = data[k];
          });
        });
        _write(STORAGE_PREFIX + 'maths_' + name, merged);
      }
      const prog = _read(STORAGE_PREFIX + 'progress_' + name);
      if (prog && prog['number-bonds']) {
        prog.maths = (prog.maths || 0) + prog['number-bonds'];
        delete prog['number-bonds'];
        _write(STORAGE_PREFIX + 'progress_' + name, prog);
      }
      if (_read(STORAGE_PREFIX + 'last_' + name) === 'number-bonds') _write(STORAGE_PREFIX + 'last_' + name, 'maths');
      _write(flagKey, true);
    } catch (e) {
      console.error('KidsGames: Maths merge skipped for', name, e);
    }
  });
}
