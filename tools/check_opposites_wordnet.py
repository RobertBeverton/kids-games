#!/usr/bin/env python3
"""
tools/check_opposites_wordnet.py
Dictionary check for tools/opposites-words.txt. Needs nltk (the generator already does).

For every entry it flags any distractor that WordNet says is
  - a synonym of the question word or of an accepted answer (it could be argued right), or
  - a direct antonym of the question word or of an accepted answer.
A flagged distractor fails unless the entry lists it under `ok:` (a human has looked at it).

Also flags accepted answers that WordNet does not connect to the word at all (typo catcher), as
warnings only, because a curated answer WordNet has never heard of is usually fine.

Usage:  python tools/check_opposites_wordnet.py [path/to/words.txt]
Exit code 1 if there are unreviewed flags.
"""
import re
import sys
from pathlib import Path
from nltk.corpus import wordnet as wn

HERE = Path(__file__).parent
path = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'opposites-words.txt'

entries = []
for i, raw in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
    line = raw.split('#')[0].strip()
    if not line:
        continue
    c = [x.strip() for x in line.split('|')]
    if len(c) < 4:
        continue
    split = lambda s: [x.strip().lower().lstrip('~') for x in s.split(',') if x.strip()]
    flags = c[5] if len(c) > 5 else ''
    m = re.search(r'ok:\s*([a-z\s]*)', flags, re.I)
    entries.append(dict(line=i, word=c[0].lower(), answers=split(c[1]), distractors=split(c[2]),
                        ok=set(m.group(1).split()) if m else set()))

_syn, _ant = {}, {}
def synonyms(w):
    if w not in _syn:
        s = set()
        for ss in wn.synsets(w):
            for l in ss.lemmas():
                s.add(l.name().lower())
            for rel in ss.similar_tos() + ss.also_sees():
                for l in rel.lemmas():
                    s.add(l.name().lower())
        s.discard(w)
        _syn[w] = {x for x in s if '_' not in x}
    return _syn[w]
def antonyms(w):
    if w not in _ant:
        s = set()
        for ss in wn.synsets(w):
            for l in ss.lemmas():
                for a in l.antonyms():
                    s.add(a.name().lower())
        _ant[w] = {x for x in s if '_' not in x}
    return _ant[w]

problems, notes = [], []
for e in entries:
    related = [e['word']] + e['answers']
    for d in e['distractors']:
        if d in e['ok']:
            continue
        for r in related:
            if d in synonyms(r) or r in synonyms(d):
                problems.append(f"line {e['line']} ({e['word']}): distractor '{d}' is a WordNet synonym of '{r}'")
                break
            if d in antonyms(r) or r in antonyms(d):
                problems.append(f"line {e['line']} ({e['word']}): distractor '{d}' is a WordNet antonym of '{r}'")
                break
    # answers WordNet does not connect to the word: a typo catcher
    linked = antonyms(e['word']) | {x for a in antonyms(e['word']) for x in synonyms(a)} | synonyms(e['word'])
    for a in e['answers']:
        if a not in linked and not (antonyms(a) | synonyms(a)) & ({e['word']} | synonyms(e['word'])):
            notes.append(f"line {e['line']} ({e['word']}): answer '{a}' has no WordNet link to the word (fine if intended)")

miss = path.parent / 'opposites-misspellings.txt'
if miss.exists():
    from nltk.corpus import brown
    from collections import Counter
    real = {l.name().lower() for ss in wn.all_synsets() for l in ss.lemmas() if '_' not in l.name()}
    real |= {w for w, n in Counter(x.lower() for x in brown.words() if x.isalpha()).items() if n >= 1}
    for i, raw in enumerate(miss.read_text(encoding='utf-8').splitlines(), 1):
        line = raw.split('#')[0].strip()
        if ':' in line:
            _, slips = line.split(':', 1)
            for slip in slips.split():
                if slip in real:
                    problems.append(f"misspellings line {i}: '{slip}' is a real English word, so it must not be accepted as a slip")

print(f"{path.name}: {len(entries)} entries checked against WordNet")
for n in notes:
    print('  note:', n)
if problems:
    print(f'\n{len(problems)} unreviewed flag(s):')
    for p in problems:
        print('  ' + p)
    sys.exit(1)
print('OK')
