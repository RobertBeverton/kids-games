// Parser for tools/opposites-words.txt (the hand-curated Opposites list).
//
// One entry per line, columns separated by "|":
//   word | accepted answers (comma list, first = primary) | 5 distractors | level | part of speech | flags
//
//   happy | sad, unhappy, upset | red, tall, round, quick, loud | 1 | adj
//   open  | shut, closed, ~close | ...  (~ = accepted when typed, never offered as a tap choice)
//   push  | pull                | ...                           | 2 | verb | single
//   hot   | cold, cool          | ...                           | 1 | adj  | ok: cool
//
// Lines starting with # and blank lines are ignored. Flags (last column, optional, space separated):
//   single       the word genuinely has only one right answer (waives the "2 answers at level 2" rule)
//   ok: w1 w2    distractors a human has reviewed and accepted although a dictionary check flags them

export function parseWords(text) {
  const entries = [];
  const errors = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) return;
    const cols = line.split('|').map((c) => c.trim());
    const at = `line ${i + 1}`;
    if (cols.length < 4) {
      errors.push(`${at}: needs at least 4 columns (word | answers | distractors | level), got ${cols.length}`);
      return;
    }
    const list = (s) => s.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    const flagText = cols[5] || '';
    const okMatch = flagText.match(/ok:\s*([a-z\s]*)/i);
    entries.push({
      line: i + 1,
      word: cols[0].toLowerCase(),
      answers: list(cols[1]).map((a) => a.replace(/^~/, '')),
      typedOnly: list(cols[1]).filter((a) => a.startsWith('~')).map((a) => a.slice(1)),
      distractors: list(cols[2]),
      level: Number(cols[3]),
      pos: (cols[4] || '').toLowerCase(),
      single: /\bsingle\b/i.test(flagText),
      ok: okMatch ? okMatch[1].trim().split(/\s+/).filter(Boolean) : [],
    });
  });
  return { entries, errors };
}

// Crude stem used to catch "hopeless / hopelessly" style repeats between a distractor and the question.
const PREFIXES = ['un', 'dis', 'in', 'im', 'non'];
const SUFFIXES = ['ness', 'less', 'ful', 'ing', 'ed', 'ly', 'er', 'est', 'es', 's', 'y'];
export function stems(word) {
  const out = new Set([word]);
  for (const p of PREFIXES) if (word.startsWith(p) && word.length - p.length >= 3) out.add(word.slice(p.length));
  for (const s of [...out]) {
    for (const x of SUFFIXES) if (s.endsWith(x) && s.length - x.length >= 3) out.add(s.slice(0, -x.length));
  }
  return out;
}
export function sharesStem(a, b) {
  if (a === b) return true;
  const sb = stems(b);
  for (const s of stems(a)) if (sb.has(s)) return true;
  return a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a));
}

// Levenshtein distance, used to reject look-alike distractors (hug / huge, pat / pet) that a new reader could confuse.
export function editDistance(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
