// A seeded audit of the question generator: 20,000 questions per style, operation and preset, plus a spread of custom
// settings. It checks what a child could be cheated by, not only whether the sum is right:
//   - the maths, the blank, exact division, four distinct choices, the answer exactly once;
//   - exactly ONE choice makes the printed equation true;
//   - no negative choice (negatives off), no float artefacts, no choice the equation itself rules out;
//   - the answer's place among the four sorted values is spread evenly, so "pick a middle one" or "pick the smallest"
//     is not a way to win; the answer is never the only odd or only even choice.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion, generateDistractors, formatQuestion, PRESETS, STYLES } from '../js/questions.js';

const N = Number(process.env.AUDIT_N || 20000);
const N_CUSTOM = Math.min(N, 4000);

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seeded(seed, fn) { const real = Math.random; Math.random = mulberry32(seed); try { return fn(); } finally { Math.random = real; } }

const OPS = ['+', '-', '*', '/', 'mixed'];
const clean = (v) => /^-?\d+(\.\d)?$/.test(String(v));
const evalOp = (op, a, b) => (op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a / b);

// Does substituting x for the blank make the printed equation true?
function satisfies(q, x) {
  const a = q.blank === 'left' ? x : q.left, b = q.blank === 'right' ? x : q.right;
  if (q.op === '/' && b === 0) return false;
  const lhs = evalOp(q.op, a, b);
  const rhs = q.blank === 'result' ? x : q.result;
  return Math.abs(lhs - rhs) < 1e-9;
}

// A choice the printed equation rules out by size alone (a part bigger than the whole...). One or two below an addend
// is allowed: it is a real slip (15 + 1 = 14).
function ruledOut(q, x) {
  const { left, right, result, op, blank } = q;
  if (blank === 'result') {
    if (op === '+') return x < Math.max(left, right) - 2;
    if (op === '-') return x > left;
    if (op === '*') return x < Math.max(left, right);
    return false;
  }
  if (op === '+') return x > result;
  if (op === '-') return blank === 'left' ? x < Math.max(right, result) : x > left;
  if (op === '*') return x > result;
  if (op === '/') return blank === 'left' ? x < Math.max(right, result) : x > left;
  return false;
}

function audit(style, cfg, op, n, { strictSize }) {
  const t = { n: 0, ranks: [0, 0, 0, 0], onlyParity: 0, centroid: 0, ruledOut: 0, problems: [] };
  const bad = (m) => { if (t.problems.length < 5) t.problems.push(m); };
  for (let i = 0; i < n; i++) {
    const q = generateQuestion(op, cfg, style);
    const d = generateDistractors(q, cfg);
    const choices = [q.answer, ...d];
    const text = formatQuestion(q).text;
    const ctx = `${style} ${op} ${text} answer=${q.answer} choices=[${choices}]`;
    t.n++;
    const exp = evalOp(q.op, q.left, q.right);
    if (Math.abs(exp - q.result) > 1e-9) bad('wrong sum: ' + ctx);
    if (q.op === '/' && (q.right === 0 || !Number.isInteger(q.left / q.right))) bad('inexact division: ' + ctx);
    if (style === 'answer' ? q.blank !== 'result' : !['left', 'right'].includes(q.blank)) bad('blank: ' + ctx);
    if (q.answer !== q[q.blank]) bad('answer is not the blank: ' + ctx);
    if (choices.length !== 4 || new Set(choices).size !== 4) bad('choices not four distinct: ' + ctx);
    if (choices.filter((c) => c === q.answer).length !== 1) bad('answer not exactly once: ' + ctx);
    const sat = choices.filter((c) => satisfies(q, c));
    if (sat.length !== 1 || sat[0] !== q.answer) bad(`${sat.length} choices satisfy the equation: ` + ctx);
    for (const v of [q.left, q.right, q.result, ...choices]) {
      if (!clean(v)) { bad('not cleanly printable (' + v + '): ' + ctx); break; }
      if (Object.is(v, -0)) { bad('negative zero: ' + ctx); break; }
    }
    if (!cfg.negatives && choices.some((c) => c < 0)) bad('negative choice: ' + ctx);
    if (strictSize && d.some((x) => ruledOut(q, x))) {
      // only a failure when four sensible values existed to choose from (1 − 1 = ? has just 0 and 1)
      let room = 0;
      for (let x = 0; x <= 400 && room < 4; x++) if (!ruledOut(q, x) && (q.op !== '*' && q.op !== '/' || x >= 2 || q.blank === 'result' && x === 0)) room++;
      if (room >= 4) { t.ruledOut++; bad('choice ruled out by the equation: ' + ctx); }
    }

    const sorted = [...choices].sort((a, b) => a - b);
    t.ranks[sorted.indexOf(q.answer)]++;
    if (!cfg.decimals) {
      const par = (x) => ((x % 2) + 2) % 2;
      if (choices.filter((c) => par(c) === par(q.answer)).length === 1) t.onlyParity++;
    }
    // the "centroid" guess: pick the choice closest to all the others
    let best = [], bs = Infinity;
    for (const c of choices) {
      const sc = choices.reduce((s, o) => s + Math.abs(o - c), 0);
      if (sc < bs - 1e-9) { bs = sc; best = [c]; } else if (Math.abs(sc - bs) < 1e-9) best.push(c);
    }
    if (best.includes(q.answer)) t.centroid += 1 / best.length;
  }
  return t;
}

describe(`20,000-question audit of the presets (N=${N} per style x operation x level)`, () => {
  for (const style of STYLES) {
    for (const level of ['easy', 'medium', 'hard']) {
      for (const op of OPS) {
        it(`${style} / ${level} / ${op}`, () => {
          const t = seeded(1000 + STYLES.indexOf(style) * 100 + ['easy', 'medium', 'hard'].indexOf(level) * 10 + OPS.indexOf(op), () =>
            audit(style, PRESETS[level], op, N, { strictSize: true }));
          assert.deepEqual(t.problems, []);
          const share = t.ranks.map((r) => r / t.n);
          const worst = Math.max(...share);
          assert.ok(worst <= 0.42, `answer sits in one position ${Math.round(worst * 100)}% of the time: ${share.map((s) => Math.round(s * 100))}`);
          assert.ok(share[1] + share[2] <= 0.58, `answer is a middle value ${Math.round((share[1] + share[2]) * 100)}% of the time`);
          assert.ok(t.centroid / t.n <= 0.31, `"pick the one closest to the rest" wins ${Math.round(100 * t.centroid / t.n)}%`);
          assert.equal(t.onlyParity, 0, 'answer is the only odd/even choice');
        });
      }
    }
  }
});

describe(`audit of custom settings (N=${N_CUSTOM} each)`, () => {
  const customs = {
    'negatives -20..20': { min: -20, max: 20, maxTable: 12, negatives: true, decimals: false },
    'decimals 1..20': { min: 1, max: 20, maxTable: 12, negatives: false, decimals: true },
    'negatives + decimals -50..50': { min: -50, max: 50, maxTable: 12, negatives: true, decimals: true },
    'big 100..1000': { min: 100, max: 1000, maxTable: 12, negatives: false, decimals: false },
    'default 1..100': { min: 1, max: 100, maxTable: 12, negatives: false, decimals: false },
    'min greater than max': { min: 50, max: 10, maxTable: 12, negatives: false, decimals: false },
    'from zero 0..5': { min: 0, max: 5, maxTable: 6, negatives: false, decimals: false },
    'min equals max': { min: 5, max: 5, maxTable: 12, negatives: false, decimals: false },
    'tables to 2': { min: 1, max: 10, maxTable: 2, negatives: false, decimals: false },
    'table typed as 1': { min: 1, max: 10, maxTable: 1, negatives: false, decimals: false },
    'table typed as 0': { min: 1, max: 10, maxTable: 0, negatives: false, decimals: false },
    'table typed as -3': { min: 1, max: 10, maxTable: -3, negatives: false, decimals: false },
    'tables to 99': { min: 1, max: 100, maxTable: 99, negatives: false, decimals: false },
    'all negative range -30..-5': { min: -30, max: -5, maxTable: 12, negatives: false, decimals: false },
  };
  let seed = 5000;
  for (const [name, cfg] of Object.entries(customs)) {
    for (const style of STYLES) {
      it(`${name} / ${style}`, () => {
        for (const op of OPS) {
          const t = seeded(seed++, () => audit(style, cfg, op, N_CUSTOM, { strictSize: false }));
          // a custom range with nothing but negative numbers and negatives off can print negative operands: not a failure
          const problems = cfg.min < 0 && cfg.max < 0 && !cfg.negatives ? t.problems.filter((p) => !p.includes('negative choice')) : t.problems;
          assert.deepEqual(problems, [], `${style} ${op}`);
        }
      });
    }
  }
});
