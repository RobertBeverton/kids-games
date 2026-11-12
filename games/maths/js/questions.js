// questions.js — Maths: question generation, answer choices and display format.
//
// Two styles share one engine and differ only in where the blank sits:
//   'answer'  "Work it out"            7 + 5 = ?
//   'missing' "Find the missing number" 7 + ? = 12   or   ? + 5 = 12
//
// Pure functions, no DOM: everything here is unit-tested (games/maths/tests).

export const STYLES = ['answer', 'missing'];

// Difficulty presets. `cap` (+ and −) draws the total / starting number uniformly from capLo..cap, so the numbers are
// spread across the whole range. Without `cap` the two numbers are drawn independently from min..max (Hard, Custom).
// `tables` lists the times tables used by × and ÷ (default 2..maxTable); the other factor runs 2..otherMax.
export const PRESETS = {
  easy:   { min: 0, max: 20, cap: 20, capLo: 1, maxTable: 10, tables: [2, 5, 10], otherMax: 10, negatives: false, decimals: false,
            hint: 'Add and take away to 20. 2, 5 and 10 times tables' },
  medium: { min: 1, max: 100, cap: 100, capLo: 11, maxTable: 10, negatives: false, decimals: false,
            hint: 'Add and take away to 100. Tables 2 to 10' },
  hard:   { min: 1, max: 100, maxTable: 12, negatives: false, decimals: false,
            hint: 'Numbers to 100 each. Tables 2 to 12' },
};

/** Make any settings object safe to generate from (typed custom values can be 0, 1, empty, negative…). */
export function normaliseSettings(s) {
  const int = (v, d) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Math.trunc(Number(v)) : d);
  let min = int(s.min, 1), max = int(s.max, 100);
  min = Math.max(-9999, Math.min(9999, min));
  max = Math.max(-9999, Math.min(9999, max));
  if (min > max) [min, max] = [max, min];
  const maxTable = Math.max(2, Math.min(99, int(s.maxTable, 12)));
  const tables = Array.isArray(s.tables) && s.tables.length ? s.tables : range(2, maxTable);
  const otherMax = s.otherMax ? s.otherMax : maxTable;
  const out = { ...s, min, max, maxTable, tables, otherMax, negatives: !!s.negatives, decimals: !!s.decimals };
  if (s.cap) { out.cap = s.cap; out.capLo = s.capLo || 1; }
  return out;
}

/**
 * Generate one question.
 * @param {string} op  '+' | '-' | '*' | '/' | 'mixed'
 * @param {object} settings
 * @param {string} style  'answer' | 'missing'
 * @returns {{ left, op, right, result, blank: 'result'|'left'|'right', answer, style }}
 */
export function generateQuestion(op, settings, style = 'answer') {
  const s = normaliseSettings(settings);
  const resolvedOp = op === 'mixed' ? ['+', '-', '*', '/'][randInt(0, 3)] : op;
  let left, right, result;

  switch (resolvedOp) {
    case '+': {
      if (s.cap && !s.decimals) {
        result = randInt(s.capLo, s.cap);
        left = randInt(s.min, result - s.min);
        right = result - left;
        if (left === 0 && right === 0) { left = 1; right = result - 1; }
      } else {
        left = randInt(s.min, s.max);
        right = randInt(s.min, s.max);
        if (s.decimals) { left = r1(left + randInt(0, 9) / 10); right = r1(right + randInt(0, 9) / 10); }
        result = r1(left + right);
      }
      break;
    }
    case '-': {
      if (s.cap && !s.decimals) {
        left = randInt(s.capLo, s.cap);
        right = randInt(s.min === 0 ? 0 : 1, s.min === 0 ? left : left - 1);
        result = left - right;
      } else {
        if (s.negatives) { left = randInt(s.min, s.max); right = randInt(s.min, s.max); }
        else { const a = randInt(s.min, s.max), b = randInt(s.min, s.max); left = Math.max(a, b); right = Math.min(a, b); }
        if (s.decimals) {
          left = r1(left + randInt(0, 9) / 10); right = r1(right + randInt(0, 9) / 10);
          if (!s.negatives && left < right) [left, right] = [right, left];
        }
        result = r1(left - right);
      }
      break;
    }
    case '*': {
      const a = pick(s.tables), b = randInt(2, s.otherMax);
      [left, right] = Math.random() < 0.5 ? [a, b] : [b, a];
      result = left * right;
      break;
    }
    case '/': {
      right = pick(s.tables);                 // the divisor is always from the chosen tables
      result = randInt(2, s.otherMax);        // the quotient
      left = right * result;                  // always exact
      break;
    }
    default:
      throw new Error(`Unknown op: ${resolvedOp}`);
  }

  let blank = 'result';
  if (style === 'missing') blank = Math.random() < 0.5 ? 'left' : 'right';
  const answer = blank === 'result' ? result : blank === 'left' ? left : right;
  return { left, op: resolvedOp, right, result, blank, answer, style };
}

// ---------------------------------------------------------------------------------------------------------------------
// Answer choices
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Three wrong answers for a question. Rules (all checked by the 20,000-question audit in the tests):
 *  - never the answer, never a duplicate, never negative unless negatives are on, always three;
 *  - none that the equation itself rules out (a part bigger than the whole, a factor beyond the table…);
 *  - the answer's place among the four sorted values is spread evenly (no "pick a middle one" shortcut);
 *  - the answer is never the only odd or only even choice;
 *  - for × and ÷, wrong answers are neighbouring table facts (a × (b±1)), so they look like real slips.
 * @param {object} q  a question from generateQuestion
 * @returns {number[]}
 */
export function generateDistractors(q, settings, count = 3) {
  const s = normaliseSettings(settings);
  const { answer } = q;
  const grid = s.decimals ? 10 : 1;
  const dec = (x) => (s.decimals ? r1(x) : Math.round(x));

  const valid = validity(q, s);
  const near = nearMisses(q, s, dec);        // preferred: slips a child might really make
  const wide = widePool(q, s, dec);          // fallback: anything sensible near the answer
  const tiers = [
    near.filter((x) => valid(x)),
    uniq([...near, ...wide]).filter((x) => valid(x)),
    uniq([...near, ...wide, ...stretch(answer, dec, grid)]).filter((x) => x >= 0 || s.negatives),
  ];

  for (let t = 0; t < tiers.length; t++) {
    const pool = uniq(tiers[t].filter((x) => x !== answer));
    if (pool.length < count) continue;
    const chosen = balancedPick(pool, answer, count, s.decimals);
    if (chosen) return chosen;
  }
  // Last resort (tiny custom ranges): walk outwards from the answer until there are enough.
  const out = new Set();
  for (let k = 1; out.size < count; k++) {
    for (const x of [dec(answer + k), dec(answer - k)]) {
      if (x !== answer && (x >= 0 || s.negatives)) out.add(x);
      if (out.size >= count) break;
    }
    if (k > 200) break;
  }
  return [...out];
}

// What the displayed equation itself allows for the blank (a part can't be bigger than the whole, and so on).
function validity(q, s) {
  const { left, right, result, op, blank } = q;
  const nonneg = (x) => s.negatives || x >= 0;
  if (s.negatives) return () => true; // no part-whole rules once negatives are allowed
  if (blank === 'result') {
    if (op === '+') return (x) => x >= Math.max(0, Math.max(left, right) - 2); // a slip of one or two below an addend is a real mistake
    if (op === '-') return (x) => x >= 0 && x <= left;
    if (op === '*') { const P = productSet(s); return (x) => P.has(x) && x >= Math.max(left, right); }
    if (op === '/') return (x) => x >= 2 && x <= s.otherMax;
  }
  if (op === '+') return (x) => x >= 0 && x <= result;
  if (op === '-') return blank === 'left' ? (x) => x >= Math.max(right, result) : (x) => x >= 0 && x <= left;
  if (op === '*') return (x) => x >= 2 && x <= Math.min(result, factorMax(s));
  if (op === '/') {
    if (blank === 'left') { const P = productSet(s); return (x) => P.has(x) && x >= Math.max(right, result); }
    return (x) => x >= 2 && x <= Math.min(left, factorMax(s)) && nonneg(x);
  }
  return nonneg;
}

// Natural slips: off by one in the sum, or the neighbouring fact in a times table.
function nearMisses(q, s, dec) {
  const { answer, left, right, result, op, blank } = q;
  const out = [];
  const timesLike = op === '*' || op === '/';
  if (!timesLike) {
    const offs = [1, 2, 3, 4, 5];
    if (Math.abs(answer) >= 20) offs.push(10);
    if (s.decimals) for (let i = 1; i <= 9; i++) offs.push(i / 10);
    for (const d of offs) { out.push(dec(answer + d), dec(answer - d)); }
    return out;
  }
  // × and ÷: answers are either a table product, or a factor / quotient.
  const isProduct = (op === '*' && blank === 'result') || (op === '/' && blank === 'left');
  if (isProduct) {
    const f1 = op === '*' ? left : right;           // the two factors that made the product
    const f2 = op === '*' ? right : result;
    for (const d of [-3, -2, -1, 1, 2, 3]) { out.push(f1 * (f2 + d), (f1 + d) * f2); }
    return out;
  }
  // A factor or quotient is wanted. When the product is on screen, prefer other numbers that also divide it, so
  // "the only one that divides evenly" is not a way to spot the answer.
  const product = op === '*' ? result : (blank === 'right' ? left : null);
  for (let x = 2; x <= factorMax(s); x++) if (product === null || product % x === 0) out.push(x);
  return out;
}

function widePool(q, s, dec) {
  const { answer, op, blank } = q;
  const timesLike = op === '*' || op === '/';
  if (!timesLike) {
    const out = [];
    for (let d = 1; d <= 12; d++) out.push(dec(answer + d), dec(answer - d));
    return out;
  }
  const isProduct = (op === '*' && blank === 'result') || (op === '/' && blank === 'left');
  if (isProduct) {
    return [...productSet(s)].sort((a, b) => Math.abs(a - answer) - Math.abs(b - answer)).slice(0, 14);
  }
  const out = [];
  for (let x = 2; x <= factorMax(s) + 2; x++) out.push(x);
  return out;
}

function stretch(answer, dec, grid) {
  const out = [];
  for (let d = 1; d <= 30; d++) out.push(dec(answer + d / grid), dec(answer - d / grid), dec(answer + d), dec(answer - d));
  return out;
}

// Pick `count` values so that the answer's rank among the sorted four is spread evenly, and the answer is never the
// only one of its parity. Returns null if that cannot be done from this pool.
function balancedPick(pool, answer, count, decimals) {
  const below = pool.filter((x) => x < answer);
  const above = pool.filter((x) => x > answer);
  for (let attempt = 0; attempt < 40; attempt++) {
    // desired number of distractors below the answer: uniform over 0..count
    let r = randInt(0, count);
    r = Math.min(r, below.length);
    let a = count - r;
    if (a > above.length) { a = above.length; r = Math.min(count - a, below.length); }
    if (r + a < count) return null;
    const chosen = [...takeNear(below, answer, r), ...takeNear(above, answer, a)];
    if (new Set(chosen).size !== count) continue;
    if (!decimals) {
      const par = (x) => ((x % 2) + 2) % 2;
      if (chosen.every((x) => par(x) !== par(answer))) continue;     // answer is the odd one out by parity
    }
    return chosen;
  }
  return null;
}

// Prefer closer values but keep it random: sort by distance plus jitter.
function takeNear(list, answer, n) {
  if (n <= 0) return [];
  const scored = list.map((x) => ({ x, k: Math.abs(x - answer) + Math.random() * 4 }));
  scored.sort((p, q) => p.k - q.k);
  return scored.slice(0, n).map((p) => p.x);
}

function factorMax(s) { return Math.max(s.otherMax, ...s.tables); }
function productSet(s) {
  const P = new Set();
  // every fact in the 2..12 grid counts as a believable slip (5 × 7 = 35 can be mistaken for 4 × 7 = 28)
  const top = Math.max(12, factorMax(s));
  for (let a = 2; a <= top; a++) for (let b = 2; b <= top; b++) P.add(a * b);
  return P;
}

// ---------------------------------------------------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------------------------------------------------

const OP_SYMBOL = { '+': '+', '-': '−', '*': '×', '/': '÷' };

/** One number as printed: a real minus sign, and no trailing ".0". */
export function formatNumber(n) {
  const v = Number(n);
  const t = String(Math.abs(v));
  return v < 0 ? '−' + t : t;
}

/**
 * The question as printed. `parts` is what the page renders (the blank is its own part so it can be painted);
 * `text` is the plain version used by tests. The blank is the ONLY place the answer would go, and it is always '?'.
 */
export function formatQuestion(q) {
  const num = (v, paren) => { const t = formatNumber(v); return paren && Number(v) < 0 ? '(' + t + ')' : t; };
  const slot = (which, v, paren) => (q.blank === which ? { blank: true, text: '?' } : { text: num(v, paren) });
  const parts = [
    slot('left', q.left, false),
    { op: true, text: OP_SYMBOL[q.op] },
    slot('right', q.right, true),
    { text: '=' },
    slot('result', q.result, false),
  ];
  return { parts, text: parts.map((p) => p.text).join(' ') };
}

// --- helpers ---

function range(a, b) { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; }
function uniq(a) { return [...new Set(a)]; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function randInt(min, max) {
  if (min > max) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function r1(n) { return Math.round(n * 10) / 10; }
