// game.js — GameSession: manages one play session
import { generateQuestion, generateDistractors } from './questions.js';

const SPRINT_DURATION = 60;
const ROUND_QUESTIONS = 10;
export const ENDLESS_MIN_ANSWERS = 10; // an Endless game that is stopped after this many answers counts as played
const POINTS_CORRECT = 10;
const STREAK_BONUS = 2;
const ANSWER_PAUSE_MS = 600;

export class GameSession {
  constructor({ op, mode, style = 'answer', range, onQuestion, onAnswer, onScore, onEnd, onHint }) {
    this.op = op;
    this.mode = mode;
    this.style = style;
    this.range = range;
    this.onQuestion = onQuestion;
    this.onAnswer = onAnswer;
    this.onScore = onScore;
    this.onEnd = onEnd;
    this.onHint = onHint ?? null;

    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.correct = 0;
    this.total = 0;
    this.questionNum = 0;
    this.timeLeft = SPRINT_DURATION;
    this.startTime = null;
    this._timer = null;
    this._hintTimer = null;
    this._active = false;
    this._currentQuestion = null;
    this._answerLocked = false;
    this._awaitingConfirmation = false;
  }

  start() {
    this._active = true;
    this.startTime = Date.now();
    if (this.mode === 'sprint') {
      this._startTimer();
    }
    this._nextQuestion();
  }

  answer(value) {
    if (!this._active) return;

    // Confirmation state: correct button shown after wrong answer (Round/Endless only).
    // Only the correct answer advances; all other taps are ignored.
    if (this._awaitingConfirmation) {
      if (value === this._currentQuestion.answer) {
        this._awaitingConfirmation = false;
        this.onAnswer({ correct: true, correctAnswer: this._currentQuestion.answer, chosen: value });
        this.onScore(this._hudState());
        setTimeout(() => this._advance(), ANSWER_PAUSE_MS);
      }
      return;
    }

    if (this._answerLocked) return;
    this._answerLocked = true;

    const q = this._currentQuestion;
    const isCorrect = value === q.answer;
    this.total++;

    if (isCorrect) {
      this.correct++;
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
      this.score += POINTS_CORRECT + (this.streak - 1) * STREAK_BONUS;
      this.onAnswer({ correct: true, correctAnswer: q.answer, chosen: value });
      this.onScore(this._hudState());
      setTimeout(() => this._advance(), ANSWER_PAUSE_MS);
    } else {
      this.streak = 0;
      if (this.mode === 'sprint') {
        // Sprint: auto-advance after pause, no confirmation
        this.onAnswer({ correct: false, correctAnswer: q.answer, chosen: value });
        this.onScore(this._hudState());
        setTimeout(() => this._advance(), ANSWER_PAUSE_MS);
      } else {
        // Round/Endless: reveal correct answer, wait for player to tap it
        this._awaitingConfirmation = true;
        this._answerLocked = false;
        this._clearHintTimer();
        this.onAnswer({ correct: false, correctAnswer: q.answer, chosen: value, requiresConfirmation: true });
        this.onScore(this._hudState());
      }
    }
  }

  end({ quit = false } = {}) {
    if (!this._active) return;
    this._active = false;
    clearInterval(this._timer);
    this._clearHintTimer();
    const timeTaken = this.mode !== 'endless'
      ? Math.round((Date.now() - this.startTime) / 1000)
      : null;
    this.onEnd({
      score: this.score,
      accuracy: this.total > 0 ? Math.round((this.correct / this.total) * 100) : 0,
      answered: this.total,
      mode: this.mode,
      bestStreak: this.bestStreak,
      timeTaken,
      quit,
    });
  }

  _advance() {
    if (!this._active) return;
    this._answerLocked = false;
    this._clearHintTimer();
    if (this.mode === 'round' && this.questionNum >= ROUND_QUESTIONS) {
      this.end();
    } else {
      this._nextQuestion();
    }
  }

  _nextQuestion() {
    this.questionNum++;
    const q = generateQuestion(this.op, this.range, this.style);
    this._currentQuestion = q;
    const distractors = generateDistractors(q, this.range);
    const choices = shuffle([q.answer, ...distractors]);
    this.onQuestion(q, choices);
    this.onScore(this._hudState());
    this._startHintTimer();
  }

  _hintDelay() {
    if (this.mode === 'sprint') return null;
    const diff = this.range._difficulty;
    if (diff === 'easy') return 15;
    if (diff === 'medium') return 25;
    return null;
  }

  _startHintTimer() {
    this._clearHintTimer();
    const seconds = this._hintDelay();
    if (!seconds || !this.onHint) return;
    this._hintTimer = setTimeout(() => {
      if (this._active && !this._awaitingConfirmation) this.onHint();
    }, seconds * 1000);
  }

  _clearHintTimer() {
    clearTimeout(this._hintTimer);
    this._hintTimer = null;
  }

  _hudState() {
    return {
      score: this.score,
      mode: this.mode,
      timeLeft: this.timeLeft,
      questionNum: this.questionNum,
      totalQuestions: ROUND_QUESTIONS,
    };
  }

  _startTimer() {
    this._timer = setInterval(() => {
      this.timeLeft--;
      this.onScore(this._hudState());
      if (this.timeLeft <= 0) {
        clearInterval(this._timer);
        this.end();
      }
    }, 1000);
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
