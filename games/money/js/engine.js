// engine.js: pure rules for Money. No DOM, no storage, no Math.random (every function takes an rng).
export const ROUND_LENGTH = 10;
export const LEVELS = {
  easy:   { maxTier: 1, ratio: 20 },
  medium: { maxTier: 2, ratio: 5 },
  hard:   { maxTier: 2, ratio: 2 },
};
export const LEVEL_IDS = Object.keys(LEVELS);
export const NOT_BIGGER_MIN = 4;     // of 10 guess questions, at least this many must not be answerable by "the bigger one"
export const MAX_ITEM_USES = 2;      // an item appears in at most this many questions of one round
export const MAX_COME_BACK = 3;      // missed items that return per round

// ---- prices ----
const group3 = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
// 50 -> "50p", 100 -> "£1", 150 -> "£1.50", 300000 -> "£3,000"
export function formatPrice(pence) {
  if (!Number.isInteger(pence) || pence < 1) throw new Error('formatPrice: whole pence of 1 or more, got ' + pence);
  if (pence < 100) return pence + 'p';
  const pounds = Math.floor(pence / 100), rest = pence % 100;
  return '£' + group3(pounds) + (rest ? '.' + String(rest).padStart(2, '0') : '');
}

// ---- items ----
const BANNED = /\b(rich|poor|cheap|posh|afford|expensive|beer|wine|vodka|cigarette|gamble|lottery|gun|knife)\b/i;
export function validateItems(items, pictureIds) {
  const errors = [], seen = new Set();
  for (const it of items) {
    const at = 'item ' + (it && it.id);
    if (!it || !/^[a-z]+(-[a-z]+)*$/.test(it.id)) { errors.push(at + ': id must be lower-case words joined by hyphens'); continue; }
    if (seen.has(it.id)) errors.push(at + ': duplicate id');
    seen.add(it.id);
    if (typeof it.name !== 'string' || !it.name || it.name.length > 20) errors.push(at + ': name must be 1 to 20 characters');
    else if (BANNED.test(it.name)) errors.push(at + ': name uses a banned word');
    for (const k of ['pence', 'lo', 'hi']) if (!Number.isInteger(it[k]) || it[k] < 1) errors.push(at + ': ' + k + ' must be whole pence of 1 or more');
    if (it.lo > it.pence || it.pence > it.hi) errors.push(at + ': need lo <= pence <= hi');
    if (it.pence < 100) errors.push(at + ': under £1 cannot be drawn on the Money Wall; leave it out');
    if (![1, 2, 3].includes(it.size)) errors.push(at + ': size must be 1, 2 or 3');
    if (![1, 2].includes(it.tier)) errors.push(at + ': tier must be 1 or 2');
    if (it.group !== undefined && !/^[a-z]+(-[a-z]+)*$/.test(it.group)) errors.push(at + ': group must be a lower-case word');
    if (pictureIds && !pictureIds.includes(it.id)) errors.push(at + ': no drawing');
  }
  return errors;
}

// ---- the fairness rules ----
// `dear` is clearly dearer than `cheap`: its lowest plausible price is above the other's highest, and it is at least `ratio` times as dear.
export const clearlyDearer = (dear, cheap, ratio) => dear.lo > cheap.hi && dear.pence >= cheap.pence * ratio;
// "Pick the bigger one" would not win this pair.
export const notBigger = (dear, cheap) => dear.size <= cheap.size;

// Every pair the level allows, as { dear, cheap }.
export function pairsFor(items, level) {
  const { maxTier, ratio } = LEVELS[level];
  const pool = items.filter((i) => i.tier <= maxTier), out = [];
  for (const a of pool) for (const b of pool) {
    if (a.id === b.id || (a.group && a.group === b.group)) continue;
    if (clearlyDearer(a, b, ratio)) out.push({ dear: a, cheap: b });
  }
  return out;
}

export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// A round of "Which costs more?": ROUND_LENGTH questions { left, right, dearId }.
// comeBack: ids the child missed lately; up to MAX_COME_BACK of them are used if a valid pair exists.
export function buildGuessSession(items, level, rng, comeBack = []) {
  const all = shuffle(pairsFor(items, level), rng);
  const uses = new Map(), usedPairs = new Set(), picked = [];
  const ok = (p) => !usedPairs.has(p.dear.id + '>' + p.cheap.id) &&
    (uses.get(p.dear.id) || 0) < MAX_ITEM_USES && (uses.get(p.cheap.id) || 0) < MAX_ITEM_USES;
  const take = (p) => {
    picked.push(p); usedPairs.add(p.dear.id + '>' + p.cheap.id);
    uses.set(p.dear.id, (uses.get(p.dear.id) || 0) + 1); uses.set(p.cheap.id, (uses.get(p.cheap.id) || 0) + 1);
  };
  // 1. missed items come back
  for (const id of comeBack.slice(0, MAX_COME_BACK)) {
    const p = all.find((q) => (q.dear.id === id || q.cheap.id === id) && ok(q));
    if (p) take(p);
  }
  // 2. enough pairs that "the bigger one" does not win
  for (const p of all) {
    if (picked.filter((q) => notBigger(q.dear, q.cheap)).length >= NOT_BIGGER_MIN) break;
    if (notBigger(p.dear, p.cheap) && ok(p)) take(p);
  }
  // 3. fill up
  for (const p of all) { if (picked.length >= ROUND_LENGTH) break; if (ok(p)) take(p); }
  if (picked.length < ROUND_LENGTH) throw new Error('buildGuessSession: only ' + picked.length + ' questions for ' + level);
  // Exactly half the dearer items on the left.
  const onLeft = shuffle(Array.from({ length: ROUND_LENGTH }, (_, i) => i < ROUND_LENGTH / 2), rng);
  return shuffle(picked.slice(0, ROUND_LENGTH), rng).map((p, i) => ({
    left: onLeft[i] ? p.dear : p.cheap, right: onLeft[i] ? p.cheap : p.dear, dearId: p.dear.id,
  }));
}

// ---- "What's the price?": six price tiles, points for being close ----
export const PRICE_TILES = 6;
export const PRICE_STEP = { easy: 3, medium: 2, hard: 1.5 };   // ratio between neighbouring tiles (at least; wide-range items use more)
export const PRICE_MIN_TILE = 20;                              // pence: no tile below 20p
export const PRICE_MAX_TILE = 200000000;                       // pence: no tile above £2,000,000
export const PRICE_MAX_FULL = 3;                               // at most this many of the six tiles earn full points
export const MAX_POINTS = 3;

// 2 significant figures: 1234 -> 1200, 275000 -> 280000, 33.3 -> 33
export function niceRound(n) {
  const mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.max(1, Math.round(n / mag) * mag);
}
// 3 points anywhere in the plausible range; otherwise by how far outside it (as a ratio to the nearest edge).
export function pointsFor(item, pence) {
  if (pence >= item.lo && pence <= item.hi) return MAX_POINTS;
  const d = pence < item.lo ? item.lo / pence : pence / item.hi;
  return d <= 1.5 ? 2 : d <= 2.5 ? 1 : 0;
}
export function tileStep(item, level) { return Math.max(PRICE_STEP[level], Math.sqrt(item.hi / item.lo)); }
// Six rising prices. The typical price is one of them, at a random place that keeps every tile in bounds.
export function priceTiles(item, level, rng) {
  const r = tileStep(item, level), base = niceRound(item.pence), spots = [];
  for (let pos = 0; pos < PRICE_TILES; pos++) {
    const lowest = niceRound(base / Math.pow(r, pos)), highest = niceRound(base * Math.pow(r, PRICE_TILES - 1 - pos));
    if (lowest >= PRICE_MIN_TILE && highest <= PRICE_MAX_TILE) spots.push(pos);
  }
  if (!spots.length) throw new Error('priceTiles: no room for ' + item.id);
  const pos = spots[Math.floor(rng() * spots.length)];
  const tiles = Array.from({ length: PRICE_TILES }, (_, k) => niceRound(base * Math.pow(r, k - pos)));
  if (new Set(tiles).size !== PRICE_TILES) throw new Error('priceTiles: tiles collide for ' + item.id);
  return { tiles, bestIndex: pos, points: tiles.map((t) => pointsFor(item, t)) };
}
// Ten different items; missed ones first.
export function buildPriceSession(items, level, rng, comeBack = []) {
  const pool = items.filter((i) => i.tier <= LEVELS[level].maxTier);
  const picked = [];
  for (const id of comeBack.slice(0, MAX_COME_BACK)) { const it = pool.find((i) => i.id === id); if (it && !picked.includes(it)) picked.push(it); }
  for (const it of shuffle(pool, rng)) { if (picked.length >= ROUND_LENGTH) break; if (!picked.includes(it)) picked.push(it); }
  if (picked.length < ROUND_LENGTH) throw new Error('buildPriceSession: not enough items for ' + level);
  return shuffle(picked, rng).map((item) => ({ item, ...priceTiles(item, level, rng) }));
}

// ---- "Cheapest to dearest": put a set in order of price ----
export const SORT = {
  easy:   { n: 3, ratio: 10, maxTier: 1 },
  medium: { n: 4, ratio: 3,  maxTier: 2 },
  hard:   { n: 5, ratio: 2,  maxTier: 2 },
};
export const SORT_NOT_SIZE_MIN = 5;    // of 10 sets, at least this many cannot be put in order by size alone
export const SORT_MAX_ITEM_USES = 3;

// Size-sortable: size never decreases as price rises (so "smallest first" would win).
const sizeSortable = (order) => order.every((it, i) => i === 0 || it.size >= order[i - 1].size);
// Every valid chain of n items for a level, cheapest first: each neighbour clearly dearer (so every pair is), no shared group.
// Cached per item list, so a round is just random picks from it.
const chainCache = new WeakMap();
export function sortChains(items, level) {
  let byLevel = chainCache.get(items);
  if (!byLevel) chainCache.set(items, (byLevel = {}));
  if (byLevel[level]) return byLevel[level];
  const { n, ratio, maxTier } = SORT[level];
  const pool = items.filter((i) => i.tier <= maxTier), out = [];
  const extend = (chain) => {
    if (chain.length === n) { out.push(chain); return; }
    const top = chain[chain.length - 1];
    for (const c of pool) {
      if (chain.some((x) => x.id === c.id || (c.group && c.group === x.group))) continue;
      if (clearlyDearer(c, top, ratio)) extend([...chain, c]);
    }
  };
  for (const p of pool) extend([p]);
  return (byLevel[level] = out);
}

// A round of ROUND_LENGTH sets: { items: [shown order], order: [ids, cheapest first] }.
export function buildSortSession(items, level, rng, comeBack = []) {
  const chains = sortChains(items, level), keyOf = (chain) => chain.map((i) => i.id).sort().join('|');
  // Greedy picking can paint itself into a corner (items used up); if so, start again with a fresh shuffle.
  for (let attempt = 0; attempt < 60; attempt++) {
    const all = shuffle(chains, rng), uses = new Map(), keys = new Set(), picked = [];
    const ok = (chain) => !keys.has(keyOf(chain)) && chain.every((i) => (uses.get(i.id) || 0) < SORT_MAX_ITEM_USES);
    const take = (chain) => { picked.push(chain); keys.add(keyOf(chain)); for (const i of chain) uses.set(i.id, (uses.get(i.id) || 0) + 1); };
    // 1. missed items come back
    for (const id of comeBack.slice(0, MAX_COME_BACK)) {
      if (picked.some((c) => c.some((i) => i.id === id))) continue;
      const c = all.find((q) => q.some((i) => i.id === id) && ok(q));
      if (c) take(c);
    }
    // 2. enough sets that size alone does not put them in order
    for (const c of all) {
      if (picked.filter((q) => !sizeSortable(q)).length >= SORT_NOT_SIZE_MIN) break;
      if (picked.length < ROUND_LENGTH && !sizeSortable(c) && ok(c)) take(c);
    }
    // 3. fill up
    for (const c of all) { if (picked.length >= ROUND_LENGTH) break; if (ok(c)) take(c); }
    if (picked.length < ROUND_LENGTH) continue;
    return shuffle(picked, rng).map((chain) => {
      let shown = shuffle(chain, rng);
      while (shown.every((it, i) => it === chain[i])) shown = shuffle(chain, rng);
      return { items: shown, order: chain.map((i) => i.id) };
    });
  }
  throw new Error('buildSortSession: could not build ' + ROUND_LENGTH + ' sets for ' + level);
}

// The id to tap next, or null when the set is finished.
export const nextSortId = (question, placedIds) => question.order[placedIds.length] || null;
// Pure: a wrong tap changes nothing (the caller only adds tappedId to placedIds when correct).
export function gradeSortTap(question, placedIds, tappedId) {
  const expectedId = nextSortId(question, placedIds);
  return { correct: tappedId === expectedId, expectedId };
}
// tapsLog: array of { position, tappedId } in tap order, INCLUDING wrong taps (position = how many were already placed).
// For each position, only the FIRST tap there counts: if it was wrong, two ids are missed, once each for that position:
// the item that should have gone there and the item tapped by mistake. Later taps at that position change nothing.
export function sortMissesFor(question, tapsLog) {
  const seen = new Set(), misses = [];
  for (const { position, tappedId } of tapsLog) {
    if (seen.has(position)) continue;
    seen.add(position);
    const expected = question.order[position];
    if (tappedId !== expected) misses.push(expected, tappedId);
  }
  return misses;
}

// ---- "Can you buy it?": a budget and a shelf; tap everything you could buy ----
// budgets are in pence (£5, £10 / £20, £50, £100, £200 / £200, £500, £1,000, £5,000)
export const BUY = {
  easy:   { budgets: [500, 1000],                 shelf: 3, aff: 2, un: 3,   maxTier: 1 },
  medium: { budgets: [2000, 5000, 10000, 20000],  shelf: 4, aff: 1, un: 1.5, maxTier: 2 },
  hard:   { budgets: [20000, 50000, 100000, 500000], shelf: 5, aff: 1, un: 1.1, maxTier: 2 },
};
export const BUY_SIZE_DEFEAT_MIN = 4;   // of 10 questions, at least this many where "skip the biggest, buy the rest" is wrong
// Buyable: even its highest plausible price, times the level's margin, fits. Too dear: even its lowest plausible price is well over.
// Anything in between is arguable and is never shown with that budget.
export const buyable = (item, level, budget) => item.hi * BUY[level].aff <= budget;
export const tooDear = (item, level, budget) => item.lo >= budget * BUY[level].un;

// A round of ROUND_LENGTH questions { budget, shelf: [items], buyIds: [ids] }.
// With few budgets (easy has two) a budget is used ceil(ROUND_LENGTH / budgets) times, so "no budget more than 4 times" cannot hold there.
export function buildBuySession(items, level, rng, comeBack = []) {
  const cfg = BUY[level], pool = items.filter((i) => i.tier <= cfg.maxTier);
  const buyIds = (q) => q.shelf.filter((i) => buyable(i, level, q.budget)).map((i) => i.id);
  const sizeGuess = (shelf) => { const m = Math.max(...shelf.map((i) => i.size)); return shelf.filter((i) => i.size < m).map((i) => i.id).sort().join('|'); };
  for (let attempt = 0; attempt < 200; attempt++) {
    const budgets = shuffle(Array.from({ length: ROUND_LENGTH }, (_, i) => cfg.budgets[i % cfg.budgets.length]), rng);
    const uses = new Map(), forced = budgets.map(() => []);
    // missed items come back: put each on a shelf whose budget makes it clearly buyable or clearly too dear
    for (const id of comeBack.slice(0, MAX_COME_BACK)) {
      const it = pool.find((i) => i.id === id);
      if (!it) continue;
      const slot = budgets.findIndex((b, k) => forced[k].length === 0 && (buyable(it, level, b) || tooDear(it, level, b)));
      if (slot >= 0) forced[slot].push(it);
    }
    // Scarce budgets first (fewest items on their thinner side), so common items are not used up before they are needed.
    const scarcity = (b) => Math.min(pool.filter((i) => buyable(i, level, b)).length, pool.filter((i) => tooDear(i, level, b)).length);
    const order = budgets.map((b, k) => k).sort((x, y) => scarcity(budgets[x]) - scarcity(budgets[y]));
    const questions = new Array(ROUND_LENGTH);
    let failed = false;
    for (const k of order) {
      const budget = budgets[k];
      const later = ROUND_LENGTH - 1 - order.indexOf(k);   // questions still to come: each needs one of each side
      const free = (i) => (uses.get(i.id) || 0) < MAX_ITEM_USES && !forced[k].includes(i);
      const buy = shuffle(pool.filter((i) => buyable(i, level, budget) && free(i)), rng);
      const dear = shuffle(pool.filter((i) => tooDear(i, level, budget) && free(i)), rng);
      const shelf = forced[k].slice();
      const have = (f) => shelf.filter((i) => f(i, level, budget)).length;
      // pick how many to buy (1 .. shelf-1), then top up; the forced item counts on its own side
      // Keep room for the later questions: each needs at least one buyable and one too-dear item.
      const room = (list) => Math.max(1, list.reduce((n, i) => n + MAX_ITEM_USES - (uses.get(i.id) || 0), 0) - later);
      const lo = Math.max(1, cfg.shelf - 1 - room(dear) + 1), hi = Math.min(cfg.shelf - 1, room(buy));
      const want = lo >= hi ? Math.min(Math.max(lo, 1), cfg.shelf - 1) : lo + Math.floor(rng() * (hi - lo + 1));
      while (shelf.length < cfg.shelf) {
        const needBuy = Math.max(0, want - have(buyable)), needDear = Math.max(0, cfg.shelf - want - have(tooDear));
        const fromBuy = needBuy > 0 && (needDear === 0 || rng() < needBuy / (needBuy + needDear));
        const src = (fromBuy ? buy : dear).length ? (fromBuy ? buy : dear) : (fromBuy ? dear : buy);
        if (!src.length) { failed = true; break; }
        shelf.push(src.pop());
      }
      if (failed) break;
      if (!shelf.some((i) => buyable(i, level, budget)) || !shelf.some((i) => tooDear(i, level, budget))) { failed = true; break; }
      for (const i of shelf) uses.set(i.id, (uses.get(i.id) || 0) + 1);
      const shown = shuffle(shelf, rng);
      questions[k] = { budget, shelf: shown, buyIds: buyIds({ budget, shelf: shown }) };
    }
    if (failed) continue;
    if (questions.filter((q) => sizeGuess(q.shelf) !== q.buyIds.slice().sort().join('|')).length < BUY_SIZE_DEFEAT_MIN) continue;
    return questions;
  }
  throw new Error('buildBuySession: could not build ' + ROUND_LENGTH + ' questions for ' + level);
}

export function gradeBuy(question, selectedIds) {
  const wronglyChosen = selectedIds.filter((id) => !question.buyIds.includes(id));
  const missed = question.buyIds.filter((id) => !selectedIds.includes(id));
  return { correct: !wronglyChosen.length && !missed.length, wronglyChosen, missed };
}
