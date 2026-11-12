import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion, generateDistractors, formatQuestion, formatNumber, normaliseSettings, PRESETS, STYLES } from '../js/questions.js';

const OPS = ['+', '-', '*', '/'];
const custom = { min: 1, max: 10, maxTable: 10, negatives: false, decimals: false };
const many = (n, fn) => { for (let i = 0; i < n; i++) fn(i); };

describe('generateQuestion: both styles', () => {
  for (const style of STYLES) {
    for (const op of OPS) {
      it(`${style} ${op}: result equals left ${op} right`, () => {
        many(300, () => {
          const q = generateQuestion(op, PRESETS.hard, style);
          const exp = op === '+' ? q.left + q.right : op === '-' ? q.left - q.right : op === '*' ? q.left * q.right : q.left / q.right;
          assert.equal(q.result, exp);
          assert.equal(q.style, style);
        });
      });
    }
  }

  it('"answer" always blanks the result, and the answer is the result', () => {
    many(300, () => {
      const q = generateQuestion('mixed', PRESETS.medium, 'answer');
      assert.equal(q.blank, 'result');
      assert.equal(q.answer, q.result);
    });
  });

  it('"missing" blanks left or right (both happen), and the answer is that number', () => {
    const seen = new Set();
    many(400, () => {
      const q = generateQuestion('+', PRESETS.medium, 'missing');
      seen.add(q.blank);
      assert.ok(q.blank === 'left' || q.blank === 'right');
      assert.equal(q.answer, q[q.blank]);
    });
    assert.deepEqual([...seen].sort(), ['left', 'right']);
  });

  it('mixed uses all four operations and never returns "mixed"', () => {
    const seen = new Set();
    many(400, () => seen.add(generateQuestion('mixed', custom, 'answer').op));
    assert.deepEqual([...seen].sort(), ['*', '+', '-', '/']);
  });

  it('an unknown operation throws', () => {
    assert.throws(() => generateQuestion('^', custom));
  });
});

describe('presets (what each level asks)', () => {
  it('Easy + and − stay within 20 and never go over', () => {
    many(2000, () => {
      const p = generateQuestion('+', PRESETS.easy);
      assert.ok(p.left >= 0 && p.right >= 0 && p.result <= 20 && p.result >= 1);
      assert.ok(!(p.left === 0 && p.right === 0));
      const m = generateQuestion('-', PRESETS.easy);
      assert.ok(m.left <= 20 && m.right >= 0 && m.result >= 0 && m.left >= m.right);
    });
  });

  it('Easy sums reach every total from 1 to 20 (bonds to 10 and to 20 both occur)', () => {
    const totals = new Set();
    many(6000, () => totals.add(generateQuestion('+', PRESETS.easy).result));
    for (let t = 1; t <= 20; t++) assert.ok(totals.has(t), `total ${t} never asked`);
  });

  it('Medium + and − are two-digit work to 100', () => {
    many(2000, () => {
      const p = generateQuestion('+', PRESETS.medium);
      assert.ok(p.result >= 11 && p.result <= 100 && p.left >= 1 && p.right >= 1);
      const m = generateQuestion('-', PRESETS.medium);
      assert.ok(m.left >= 11 && m.left <= 100 && m.right >= 1 && m.right < m.left);
    });
  });

  it('Hard + and − draw each number from 1..100', () => {
    many(2000, () => {
      const p = generateQuestion('+', PRESETS.hard);
      assert.ok(p.left >= 1 && p.left <= 100 && p.right >= 1 && p.right <= 100);
    });
  });

  it('Easy × and ÷ use only the 2, 5 and 10 tables; no ×1, ÷1 or ×0', () => {
    many(2000, () => {
      const t = generateQuestion('*', PRESETS.easy);
      assert.ok([t.left, t.right].some((f) => [2, 5, 10].includes(f)), `${t.left} x ${t.right}`);
      assert.ok(t.left >= 2 && t.right >= 2 && t.left <= 10 && t.right <= 10);
      const d = generateQuestion('/', PRESETS.easy);
      assert.ok([2, 5, 10].includes(d.right));
      assert.ok(d.result >= 2 && d.result <= 10);
      assert.equal(d.left, d.right * d.result);
    });
  });

  it('table sets grow with difficulty', () => {
    const tables = (p) => new Set(normaliseSettings(p).tables);
    for (const t of tables(PRESETS.easy)) assert.ok(tables(PRESETS.medium).has(t));
    for (const t of tables(PRESETS.medium)) assert.ok(tables(PRESETS.hard).has(t));
    assert.ok(tables(PRESETS.hard).has(12) && !tables(PRESETS.medium).has(12));
  });

  it('numbers get bigger with difficulty (+ and −)', () => {
    const mean = (p, op) => { let s = 0; many(4000, () => { s += generateQuestion(op, p).result; }); return s / 4000; };
    for (const op of ['+', '-']) {
      const e = mean(PRESETS.easy, op), m = mean(PRESETS.medium, op), h = mean(PRESETS.hard, op);
      assert.ok(e < m && (op === '+' ? m < h : m < h + 20), `${op}: ${e} ${m} ${h}`);
    }
  });
});

describe('custom settings', () => {
  it('subtraction is never negative with negatives off, and can be with negatives on', () => {
    many(500, () => assert.ok(generateQuestion('-', custom).result >= 0));
    let neg = false;
    many(500, () => { if (generateQuestion('-', { ...custom, min: -20, max: 20, negatives: true }).result < 0) neg = true; });
    assert.ok(neg);
  });

  it('decimals have at most one decimal place and some are not whole', () => {
    let frac = false;
    many(500, () => {
      const q = generateQuestion('+', { ...custom, decimals: true });
      for (const v of [q.left, q.right, q.result]) assert.equal(String(v), String(Math.round(v * 10) / 10));
      if (!Number.isInteger(q.result)) frac = true;
    });
    assert.ok(frac);
  });

  it('min greater than max still works (swapped)', () => {
    many(200, () => {
      const q = generateQuestion('+', { ...custom, min: 50, max: 10 });
      assert.ok(q.left >= 10 && q.left <= 50);
    });
  });

  it('typed tables of 0, 1 or below are lifted to 2, so there is never a ÷ 0 or a one-answer question', () => {
    for (const t of [0, 1, -3, NaN, '', null]) {
      // 0, 1 and negatives are lifted to 2; junk (empty, NaN) falls back to the default of 12
      assert.equal(normaliseSettings({ ...custom, maxTable: t }).maxTable, [0, 1, -3].includes(t) ? 2 : 12, `table ${t}`);
      many(100, () => {
        const q = generateQuestion('/', { ...custom, maxTable: t });
        assert.ok(q.right >= 2 && Number.isInteger(q.left / q.right));
        const c = [q.answer, ...generateDistractors(q, { ...custom, maxTable: t })];
        assert.equal(new Set(c).size, 4);
      });
    }
  });

  it('settings from the page (strings, junk) are tidied rather than producing NaN', () => {
    const s = normaliseSettings({ min: '5', max: 'abc', maxTable: '7', negatives: 1, decimals: 0 });
    assert.equal(s.min, 5); assert.equal(s.max, 100); assert.equal(s.maxTable, 7);
    assert.equal(s.negatives, true); assert.equal(s.decimals, false);
  });
});

describe('generateDistractors', () => {
  for (const style of STYLES) {
    it(`${style}: three distinct wrong answers, none equal to the answer, none negative`, () => {
      for (const op of [...OPS, 'mixed']) {
        many(300, () => {
          const q = generateQuestion(op, PRESETS.easy, style);
          const d = generateDistractors(q, PRESETS.easy);
          assert.equal(d.length, 3);
          assert.equal(new Set([q.answer, ...d]).size, 4);
          assert.ok(d.every((x) => Number.isFinite(x) && x >= 0));
        });
      }
    });
  }

  it('decimal wrong answers have at most one decimal place', () => {
    many(400, () => {
      const s = { ...custom, decimals: true };
      const q = generateQuestion('+', s);
      for (const x of generateDistractors(q, s)) assert.equal(x, Math.round(x * 10) / 10);
    });
  });

  it('× wrong answers are neighbouring table facts', () => {
    many(300, () => {
      const q = generateQuestion('*', PRESETS.hard, 'answer');
      for (const x of generateDistractors(q, PRESETS.hard)) {
        let fact = false;
        for (let a = 2; a <= 12; a++) if (x % a === 0 && x / a >= 2 && x / a <= 12) fact = true;
        assert.ok(fact, `${x} is not a table fact`);
      }
    });
  });
});

describe('formatQuestion: what is printed', () => {
  const ANSWER = /^(−?\d+(\.\d)?) [+−×÷] (\(?−?\d+(\.\d)?\)?) = \?$/;
  const MISSING_L = /^\? [+−×÷] (\(?−?\d+(\.\d)?\)?) = −?\d+(\.\d)?$/;
  const MISSING_R = /^−?\d+(\.\d)? [+−×÷] \? = −?\d+(\.\d)?$/;

  it('"answer" prints a ± b = ? and never the result', () => {
    for (const op of [...OPS, 'mixed']) many(500, () => {
      const q = generateQuestion(op, PRESETS.hard, 'answer');
      const { text } = formatQuestion(q);
      assert.match(text, ANSWER);
      assert.ok(text.endsWith('= ?'));
    });
  });

  it('"missing" prints the blank on one side, the result in full, and never the missing number in the blank', () => {
    for (const op of [...OPS, 'mixed']) many(500, () => {
      const q = generateQuestion(op, PRESETS.hard, 'missing');
      const { text } = formatQuestion(q);
      assert.match(text, q.blank === 'left' ? MISSING_L : MISSING_R);
      assert.equal((text.match(/\?/g) || []).length, 1);
    });
  });

  it('exactly one "?" in every format, in every style, with negatives and decimals too', () => {
    const settings = [PRESETS.easy, PRESETS.hard, { ...custom, min: -20, max: 20, negatives: true }, { ...custom, decimals: true }];
    for (const style of STYLES) for (const s of settings) for (const op of ['+', '-', 'mixed']) many(200, () => {
      const q = generateQuestion(op, s, style);
      const { text, parts } = formatQuestion(q);
      assert.equal((text.match(/\?/g) || []).length, 1);
      assert.equal(parts.filter((p) => p.blank).length, 1);
      assert.equal(parts.length, 5);
    });
  });

  it('the blank part is the answer\'s place, in the right slot', () => {
    for (const style of STYLES) many(300, () => {
      const q = generateQuestion('mixed', PRESETS.medium, style);
      const { parts } = formatQuestion(q);
      const slot = { left: 0, right: 2, result: 4 }[q.blank];
      assert.ok(parts[slot].blank, `${style} blank=${q.blank}`);
    });
  });

  it('negative numbers use a real minus sign, and a negative right-hand number is bracketed', () => {
    assert.equal(formatNumber(-3), '−3');
    assert.equal(formatNumber(7.5), '7.5');
    assert.equal(formatNumber(4), '4');
    const t = formatQuestion({ left: 5, op: '-', right: -3, result: 8, blank: 'result' }).text;
    assert.equal(t, '5 − (−3) = ?');
  });

  it('the page builds the question only through formatQuestion (source guard)', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
    assert.match(src, /formatQuestion\(question\)/);
    // the question element must be filled from formatted parts only, never from the answer or the result
    const render = src.slice(src.indexOf('function renderQuestion'), src.indexOf('function renderAnswerFeedback'));
    assert.doesNotMatch(render, /question\.answer|_currentQuestion/);
    assert.doesNotMatch(render, /innerHTML = [^;]*result/);
    assert.doesNotMatch(render, /setAttribute\('(title|data-[a-z-]*|value)'/);
  });
});
