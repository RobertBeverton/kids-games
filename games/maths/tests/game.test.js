import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { GameSession, ENDLESS_MIN_ANSWERS } from '../js/game.js';
import { PRESETS } from '../js/questions.js';

// Fake clock: no test ever waits for a real timer (the old Number Bonds suite hung for 60 s on a live sprint timer).
beforeEach(() => mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1_000_000 }));
afterEach(() => mock.timers.reset());

function make({ mode = 'round', difficulty = 'easy', style = 'answer', op = '+' } = {}) {
  const log = { questions: [], answers: [], ends: [], hints: 0, scores: [] };
  const range = { ...PRESETS[difficulty === 'custom' ? 'hard' : difficulty], _difficulty: difficulty };
  const s = new GameSession({
    op, mode, style, range,
    onQuestion: (q, choices) => log.questions.push({ q, choices }),
    onAnswer: (a) => log.answers.push(a),
    onScore: (h) => log.scores.push(h),
    onEnd: (e) => log.ends.push(e),
    onHint: () => { log.hints++; },
  });
  return { s, log };
}
const wrong = (s) => s._currentQuestion.answer + 1000;
const right = (s) => s._currentQuestion.answer;
const tick = (ms) => mock.timers.tick(ms);

describe('questions served by a session', () => {
  it('every question comes with four choices containing the answer exactly once', () => {
    const { s, log } = make({ mode: 'endless' });
    s.start();
    for (let i = 0; i < 40; i++) { s.answer(right(s)); tick(600); }
    assert.ok(log.questions.length >= 40);
    for (const { q, choices } of log.questions) {
      assert.equal(choices.length, 4);
      assert.equal(choices.filter((c) => c === q.answer).length, 1);
      assert.equal(new Set(choices).size, 4);
    }
  });

  it('the style reaches the question: answer blanks the result, missing blanks a number', () => {
    for (const style of ['answer', 'missing']) {
      const { s, log } = make({ mode: 'endless', style });
      s.start();
      for (let i = 0; i < 20; i++) { s.answer(right(s)); tick(600); }
      for (const { q } of log.questions) assert.equal(q.blank === 'result', style === 'answer');
    }
  });
});

describe('Sprint', () => {
  it('runs for 60 seconds on the clock, then ends by itself (not a quit)', () => {
    const { s, log } = make({ mode: 'sprint' });
    s.start();
    tick(59_000);
    assert.equal(log.ends.length, 0);
    assert.equal(s.timeLeft, 1);
    tick(1000);
    assert.equal(log.ends.length, 1);
    assert.equal(log.ends[0].quit, false);
    assert.equal(log.ends[0].mode, 'sprint');
    assert.equal(log.ends[0].timeTaken, 60);
  });

  it('a wrong answer moves on by itself (no confirmation)', () => {
    const { s, log } = make({ mode: 'sprint' });
    s.start();
    const n = log.questions.length;
    s.answer(wrong(s));
    assert.equal(s._awaitingConfirmation, false);
    tick(600);
    assert.equal(log.questions.length, n + 1);
  });

  it('nothing fires after it ends', () => {
    const { s, log } = make({ mode: 'sprint' });
    s.start();
    tick(60_000);
    const n = log.questions.length;
    tick(120_000);
    assert.equal(log.questions.length, n);
    assert.equal(log.ends.length, 1);
  });
});

describe('Round', () => {
  it('is exactly ten questions, then ends by itself', () => {
    const { s, log } = make({ mode: 'round' });
    s.start();
    for (let i = 0; i < 10; i++) { assert.equal(log.ends.length, 0, `ended early at ${i}`); s.answer(right(s)); tick(600); }
    assert.equal(log.questions.length, 10);
    assert.equal(log.ends.length, 1);
    assert.deepEqual([log.ends[0].quit, log.ends[0].answered, log.ends[0].accuracy], [false, 10, 100]);
  });

  it('a wrong answer waits for the right one; other taps do nothing', () => {
    const { s, log } = make({ mode: 'round' });
    s.start();
    const q = s._currentQuestion;
    s.answer(wrong(s));
    assert.equal(s._awaitingConfirmation, true);
    assert.equal(log.answers.at(-1).requiresConfirmation, true);
    const n = log.questions.length;
    s.answer(wrong(s)); s.answer(q.answer + 7); tick(5000);
    assert.equal(log.questions.length, n, 'moved on without the right answer');
    s.answer(q.answer);
    assert.equal(s._awaitingConfirmation, false);
    tick(600);
    assert.equal(log.questions.length, n + 1);
  });

  it('a corrected mistake counts once, as wrong', () => {
    const { s, log } = make({ mode: 'round' });
    s.start();
    s.answer(wrong(s)); s.answer(right(s)); tick(600);
    for (let i = 0; i < 9; i++) { s.answer(right(s)); tick(600); }
    assert.equal(log.ends[0].accuracy, 90);
    assert.equal(log.ends[0].answered, 10);
  });
});

describe('Endless', () => {
  it('never ends by itself, only when stopped, and reports how many were answered', () => {
    const { s, log } = make({ mode: 'endless' });
    s.start();
    for (let i = 0; i < 25; i++) { s.answer(right(s)); tick(600); }
    tick(300_000);
    assert.equal(log.ends.length, 0);
    s.end({ quit: true });
    assert.equal(log.ends.length, 1);
    assert.equal(log.ends[0].answered, 25);
    assert.equal(log.ends[0].mode, 'endless');
    assert.equal(log.ends[0].timeTaken, null);
    assert.ok(25 >= ENDLESS_MIN_ANSWERS);
  });
});

describe('hints', () => {
  const hintAt = (difficulty, mode, seconds) => {
    const { s, log } = make({ difficulty, mode });
    s.start();
    tick(seconds * 1000 - 1);
    const before = log.hints;
    tick(1);
    return [before, log.hints];
  };
  it('Easy: after 15 seconds', () => assert.deepEqual(hintAt('easy', 'round', 15), [0, 1]));
  it('Easy in Endless: after 15 seconds', () => assert.deepEqual(hintAt('easy', 'endless', 15), [0, 1]));
  it('Medium: after 25 seconds', () => assert.deepEqual(hintAt('medium', 'round', 25), [0, 1]));
  it('Hard and Custom: never', () => {
    for (const d of ['hard', 'custom']) {
      const { s, log } = make({ difficulty: d, mode: 'round' });
      s.start(); tick(120_000);
      assert.equal(log.hints, 0);
    }
  });
  it('Sprint: never', () => {
    const { s, log } = make({ difficulty: 'easy', mode: 'sprint' });
    s.start(); tick(30_000);
    assert.equal(log.hints, 0);
  });
  it('each new question restarts the timer', () => {
    const { s, log } = make({ difficulty: 'easy', mode: 'endless' });
    s.start();
    tick(10_000); s.answer(right(s)); tick(600);
    tick(14_000);
    assert.equal(log.hints, 0);
    tick(1000);
    assert.equal(log.hints, 1);
  });
  it('a wrong answer cancels the hint for that question', () => {
    const { s, log } = make({ difficulty: 'easy', mode: 'round' });
    s.start();
    tick(10_000); s.answer(wrong(s)); tick(60_000);
    assert.equal(log.hints, 0);
  });
});

describe('quit and play again', () => {
  it('quit reports quit: true, stops everything, and ends once', () => {
    for (const mode of ['sprint', 'round', 'endless']) {
      const { s, log } = make({ mode });
      s.start();
      s.answer(right(s));
      s.end({ quit: true });
      const n = log.questions.length;
      tick(200_000);
      assert.equal(log.questions.length, n, `${mode}: a question appeared after quitting`);
      assert.equal(log.ends.length, 1);
      assert.equal(log.ends[0].quit, true);
      s.end({ quit: true });
      assert.equal(log.ends.length, 1);
    }
  });

  it('a new session after quitting starts clean and the old one stays silent', () => {
    const a = make({ mode: 'sprint' });
    a.s.start(); a.s.answer(right(a.s));
    a.s.end({ quit: true });
    const b = make({ mode: 'sprint' });
    b.s.start();
    tick(61_000);
    assert.equal(b.log.ends.length, 1);
    assert.equal(b.log.ends[0].score, 0);
    assert.equal(a.log.ends.length, 1);
  });
});

describe('scoring', () => {
  it('10 points plus 2 per streak step; a wrong answer resets the streak', () => {
    const { s, log } = make({ mode: 'endless' });
    s.start();
    s.answer(right(s)); tick(600);
    s.answer(right(s)); tick(600);
    assert.equal(s.score, 10 + 12);
    s.answer(wrong(s)); s.answer(right(s)); tick(600);
    assert.equal(s.streak, 0);
    s.answer(right(s)); tick(600);
    assert.equal(s.score, 10 + 12 + 10);
    assert.equal(s.bestStreak, 2);
    assert.ok(log.scores.length > 0);
  });
});
