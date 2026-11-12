#!/usr/bin/env node
// Validates tools/opposites-words.txt. Exits 1 on any error.
//
//   node tools/validate-opposites.mjs [path/to/words.txt]
//
// Errors (fail the build): malformed lines, wrong distractor count, bad level, duplicate words,
// a distractor that is an accepted answer / the question word / a repeat, a distractor sharing a
// stem with the word or an answer, too few accepted answers for the level, and length bias
// (the right option being the shortest or longest more often than chance, which lets a child
// win without reading).
// The WordNet synonym/antonym check needs nltk, so it lives in tools/check_opposites_wordnet.py.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWords, sharesStem, editDistance } from './opposites-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || path.join(HERE, 'opposites-words.txt');
const MIN_ANSWERS = { 1: 1, 2: 2, 3: 2 };
const BIAS_MARGIN = 0.08;   // allowed excess over chance
const BIAS_MIN_ENTRIES = 20; // below this the measurement is too noisy to judge

const { entries, errors } = parseWords(fs.readFileSync(file, 'utf8'));
const warnings = [];

const seen = new Map();
for (const e of entries) {
  const at = `line ${e.line} (${e.word})`;
  const bad = (m) => errors.push(`${at}: ${m}`);
  for (const w of [e.word, ...e.answers, ...e.distractors]) {
    if (!/^[a-z]+$/.test(w)) bad(`"${w}" must be lowercase letters only`);
  }
  if (!e.word) bad('empty question word');
  if (seen.has(e.word)) bad(`duplicate question word (also line ${seen.get(e.word)})`);
  seen.set(e.word, e.line);
  if (![1, 2, 3].includes(e.level)) bad(`level must be 1, 2 or 3, got "${e.level}"`);
  if (e.answers.length === 0) bad('no accepted answers');
  if (new Set(e.answers).size !== e.answers.length) bad('repeated accepted answer');
  if (e.answers.every((a) => e.typedOnly.includes(a))) bad('every answer is typed-only (~), so choose mode has nothing to show');
  if (e.distractors.length !== 5) bad(`needs exactly 5 distractors, has ${e.distractors.length}`);
  if (new Set(e.distractors).size !== e.distractors.length) bad('repeated distractor');
  if (e.answers.includes(e.word)) bad('the question word is one of its own answers');
  const min = MIN_ANSWERS[e.level] || 1;
  if (e.answers.length < min && !e.single) {
    bad(`level ${e.level} needs ${min}+ accepted answers (has ${e.answers.length}); add answers or flag it "single"`);
  }
  for (const d of e.distractors) {
    if (e.answers.includes(d)) bad(`distractor "${d}" is an accepted answer`);
    if (d === e.word) bad(`distractor "${d}" is the question word`);
    if (sharesStem(d, e.word)) bad(`distractor "${d}" shares a stem with the question word`);
    for (const a of e.answers) {
      if (sharesStem(d, a)) bad(`distractor "${d}" shares a stem with answer "${a}"`);
    }
    for (const w of [e.word, ...e.answers]) {
      if (w.length >= 3 && d.length >= 3 && (editDistance(d, w) <= 1 || w.startsWith(d) || d.startsWith(w))) bad(`distractor "${d}" looks too much like "${w}" (one letter apart, or one begins with the other)`);
    }
  }
}

// Cross-entry checks, using the curated list itself as the dictionary:
//  - a distractor that is itself a question word whose answers include this word is really an opposite of it
//    (so it should be an accepted answer, not a distractor);
//  - a distractor that is an answer of an entry whose question word is one of this word's answers is the opposite of
//    that answer, i.e. a synonym of this word, which makes a confusing "wrong" option.
const byWord = new Map(entries.map((e) => [e.word, e]));
for (const e of entries) {
  for (const d of e.distractors) {
    const f = byWord.get(d);
    if (f && f.answers.includes(e.word) && !e.ok.includes(d)) {
      errors.push(`line ${e.line} (${e.word}): distractor "${d}" lists "${e.word}" as its own answer (line ${f.line}); add it to the answers or pick another distractor`);
    }
    for (const a of e.answers) {
      const g = byWord.get(a);
      if (g && g.answers.includes(d) && !e.ok.includes(d)) {
        errors.push(`line ${e.line} (${e.word}): distractor "${d}" is an answer to "${a}" (line ${g.line}), so it is a synonym of "${e.word}"`);
      }
    }
  }
}

// Reciprocal check: if B is an answer to A, then A must not be a distractor of B... and vice versa.
for (const e of entries) {
  for (const o of entries) {
    if (o === e) continue;
    if (e.answers.includes(o.word) && o.distractors.includes(e.word)) {
      errors.push(`line ${o.line} (${o.word}): distractor "${e.word}" is the question word of line ${e.line}, whose answer is "${o.word}"`);
    }
  }
}

// Misspellings file: tools/opposites-misspellings.txt  ("answer: slip slip"). Slips are accepted as correct, so each must
// be a non-word that cannot be mistaken for anything else in the game.
const missFile = path.join(path.dirname(file), 'opposites-misspellings.txt');
if (fs.existsSync(missFile)) {
  const accepted = new Set(entries.flatMap((e) => [e.word, ...e.answers, ...e.distractors, ...e.typedOnly]));
  const answerSet = new Set(entries.flatMap((e) => e.answers));
  const seenSlip = new Map();
  fs.readFileSync(missFile, 'utf8').split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) return;
    const m = line.match(/^([a-z]+):\s*([a-z ]+)$/);
    if (!m) { errors.push(`misspellings line ${i + 1}: expected "answer: slip slip", got "${line}"`); return; }
    if (!answerSet.has(m[1])) errors.push(`misspellings line ${i + 1}: "${m[1]}" is not an accepted answer of any entry`);
    for (const slip of m[2].trim().split(/\s+/)) {
      if (accepted.has(slip)) errors.push(`misspellings line ${i + 1}: "${slip}" is a real word in this game`);
      if (editDistance(slip, m[1]) > 2) errors.push(`misspellings line ${i + 1}: "${slip}" is too far from "${m[1]}"`);
      if (seenSlip.has(slip) && seenSlip.get(slip) !== m[1]) errors.push(`misspellings line ${i + 1}: "${slip}" is a slip of both "${seenSlip.get(slip)}" and "${m[1]}"`);
      seenSlip.set(slip, m[1]);
    }
  });
  console.log(`  misspellings: ${seenSlip.size} accepted slips`);
}

// Distractor variety: a word that is wrong in too many questions becomes a giveaway ("apple is never the answer").
const DISTRACTOR_CAP = 0.10; // a distractor may appear in at most 10% of entries
if (entries.length >= 40) {
  const uses = new Map();
  for (const e of entries) for (const d of e.distractors) uses.set(d, (uses.get(d) || 0) + 1);
  for (const [d, n] of uses) {
    if (n / entries.length > DISTRACTOR_CAP) {
      errors.push(`distractor "${d}" appears in ${n} of ${entries.length} entries (${Math.round(100 * n / entries.length)}%, cap ${DISTRACTOR_CAP * 100}%)`);
    }
  }
  console.log(`  distractor variety: ${uses.size} distinct words, busiest "${[...uses].sort((a, b) => b[1] - a[1])[0].join('" x')}`);
}

// Length bias: simulate the game's choose mode and see how often length gives the answer away.
function biasCheck(distractorCount, label) {
  let s = 20240601;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pick = (arr, n) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  let shortest = 0, longest = 0, total = 0;
  for (const e of entries) {
    for (let r = 0; r < 200; r++) {
      const right = e.answers[Math.floor(rnd() * e.answers.length)];
      const wrong = pick(e.distractors, distractorCount);
      const lens = wrong.map((w) => w.length);
      total++;
      if (right.length < Math.min(...lens)) shortest++;
      if (right.length > Math.max(...lens)) longest++;
    }
  }
  const chance = 1 / (distractorCount + 1);
  const rs = shortest / total, rl = longest / total;
  console.log(`  length bias, ${label}: right option strictly shortest ${(rs * 100).toFixed(0)}%, strictly longest ${(rl * 100).toFixed(0)}% (chance ${(chance * 100).toFixed(0)}% each, ties excluded)`);
  if (entries.length >= BIAS_MIN_ENTRIES) {
    if (rs > chance + BIAS_MARGIN) errors.push(`length bias (${label}): the right answer is the shortest option ${(rs * 100).toFixed(0)}% of the time`);
    if (rl > chance + BIAS_MARGIN) errors.push(`length bias (${label}): the right answer is the longest option ${(rl * 100).toFixed(0)}% of the time`);
  }
}

const byLevel = {};
for (const e of entries) byLevel[e.level] = (byLevel[e.level] || 0) + 1;
console.log(`${path.relative(process.cwd(), file)}: ${entries.length} entries, by level ${JSON.stringify(byLevel)}`);
if (entries.length) { biasCheck(2, '3 options (age 4-5)'); biasCheck(3, '4 options (age 6+)'); }
if (warnings.length) { console.log(`\n${warnings.length} warning(s):`); warnings.forEach((w) => console.log('  ' + w)); }
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  errors.forEach((e) => console.error('  ' + e));
  process.exit(1);
}
console.log('OK');
