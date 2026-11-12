#!/usr/bin/env python3
"""
tools/generate_words.py
Generate the wordPairs data for the Opposites game from WordNet.

Reads:  tools/whitelist.txt  — words to always include
        tools/blacklist.txt  — words to always exclude

Writes: games/opposites/index.html  — patches the // BEGIN_WORD_PAIRS block

Usage:
    python tools/generate_words.py
    python tools/generate_words.py --min-len 2 --max-len 8
    python tools/generate_words.py --dry-run   (print stats only, no file write)
"""
import argparse
import json
import random
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

TOOLS_DIR = Path(__file__).parent
ROOT_DIR  = TOOLS_DIR.parent
GAME_HTML = ROOT_DIR / 'games' / 'opposites' / 'index.html'

MARKER_BEGIN = '// BEGIN_WORD_PAIRS'
MARKER_END   = '// END_WORD_PAIRS'

# ---------------------------------------------------------------------------
# NLTK / WordNet bootstrap
# ---------------------------------------------------------------------------

def get_wordnet():
    try:
        from nltk.corpus import wordnet as wn
        wn.synsets('test')
        return wn
    except LookupError:
        import nltk
        print('Downloading WordNet data...')
        nltk.download('wordnet', quiet=False)
        nltk.download('omw-1.4', quiet=False)
        from nltk.corpus import wordnet as wn
        return wn
    except ImportError:
        import subprocess
        print('Installing nltk...')
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'nltk'])
        import nltk
        nltk.download('wordnet', quiet=False)
        nltk.download('omw-1.4', quiet=False)
        from nltk.corpus import wordnet as wn
        return wn

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_wordlist(path):
    if not path.exists():
        return set()
    words = set()
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip().lower().split('#')[0].strip()
        if line:
            words.add(line)
    return words

def load_overrides(path):
    """Returns dict: word -> {'mode': 'add'|'replace', 'antonyms': [...]}.

    Syntax in overrides.txt:
      word: ant1, ant2   — ADD these antonyms to whatever WordNet returns
      word = ant1, ant2  — REPLACE WordNet antonyms with exactly these
    """
    if not path.exists():
        return {}
    result = {}
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip().split('#')[0].strip()
        if '=' in line and ':' not in line.split('=')[0]:
            sep, mode = '=', 'replace'
        elif ':' in line:
            sep, mode = ':', 'add'
        else:
            continue
        word, _, rest = line.partition(sep)
        word = word.strip().lower()
        ants = [a.strip().lower() for a in rest.split(',') if a.strip()]
        if word and ants:
            result[word] = {'mode': mode, 'antonyms': ants}
    return result

def is_clean(word, min_len, max_len):
    """Only plain alphabetic words within the length bounds."""
    return word.isalpha() and min_len <= len(word) <= max_len

def get_antonyms(word, wn):
    """All antonym lemma names for `word` across every synset."""
    result = set()
    for synset in wn.synsets(word):
        for lemma in synset.lemmas():
            for ant in lemma.antonyms():
                name = ant.name().replace('_', ' ').lower()
                if ' ' not in name:
                    result.add(name)
    return result

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--min-len', type=int, default=2)
    parser.add_argument('--max-len', type=int, default=10)
    parser.add_argument('--min-freq', type=int, default=5,
                        help='Min Brown corpus frequency (0 = no filter)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Print stats only; do not write files')
    parser.add_argument('--write-legacy-format', action='store_true',
                        help='Overwrite the game data in the OLD format (breaks the current game; see docstring)')
    parser.add_argument('--seed', type=int, default=42,
                        help='Random seed for reproducible distractor selection')
    args = parser.parse_args()

    whitelist = load_wordlist(TOOLS_DIR / 'whitelist.txt')
    blacklist = load_wordlist(TOOLS_DIR / 'blacklist.txt')
    overrides = load_overrides(TOOLS_DIR / 'overrides.txt')
    wn = get_wordnet()

    # Build frequency set from Brown corpus (if filtering enabled)
    common_words = None
    if args.min_freq > 0:
        import nltk
        nltk.download('brown', quiet=True)
        from nltk.corpus import brown
        from nltk.probability import FreqDist
        fd = FreqDist(w.lower() for w in brown.words() if w.isalpha())
        common_words = {w for w, c in fd.items() if c >= args.min_freq}
        # Whitelist words are always common regardless of corpus frequency
        common_words |= whitelist
        print(f'  Frequency filter: {len(common_words)} words with freq>={args.min_freq}')

    MIN, MAX = args.min_len, args.max_len

    def freq_ok(w):
        return common_words is None or w in common_words

    def valid_general(w):
        """Word passes all filters including frequency."""
        return is_clean(w, MIN, MAX) and w not in blacklist and freq_ok(w)

    def valid_whitelist_ant(w):
        """Antonym for a whitelisted word — skip frequency filter."""
        return is_clean(w, MIN, MAX) and w not in blacklist

    # -----------------------------------------------------------------------
    # Build pairs dict:  question_word -> [accepted_opposites]
    # -----------------------------------------------------------------------
    pairs = {}   # word -> sorted list of opposites
    used  = set()  # words already assigned as a question word

    def record(word, antonyms, ant_validator):
        word = word.lower()
        if word in used or word in blacklist:
            return
        good_ants = sorted(a for a in antonyms if ant_validator(a))
        if good_ants:
            pairs[word] = good_ants
            used.add(word)

    def apply_override(base_ants, word):
        """Merge or replace base_ants according to overrides entry for word."""
        ov = overrides.get(word)
        if not ov:
            return base_ants
        if ov['mode'] == 'replace':
            return set(ov['antonyms'])
        return base_ants | set(ov['antonyms'])

    # 1. Whitelist words — always included, freq filter bypassed for antonyms too
    for word in sorted(whitelist):
        ants = apply_override(get_antonyms(word, wn), word)
        record(word, ants, valid_whitelist_ant)

    # 2. Sweep every WordNet lemma that has direct antonyms
    print('Scanning WordNet (this takes a few seconds)...')
    for synset in wn.all_synsets():
        for lemma in synset.lemmas():
            if not lemma.antonyms():
                continue
            word = lemma.name().lower()
            if '_' in word or not valid_general(word) or word in used:
                continue
            ants = {a.name().lower() for a in lemma.antonyms()
                    if '_' not in a.name()}
            ants = apply_override(ants, word)
            record(word, ants, valid_general)

    # 3. Apply overrides for any word not yet in pairs (adds missing entries)
    for word, ov in overrides.items():
        if word not in used:
            record(word, set(ov['antonyms']), valid_whitelist_ant)

    print(f'  {len(pairs)} word pairs collected')

    # -----------------------------------------------------------------------
    # Generate distractors
    # -----------------------------------------------------------------------
    rng = random.Random(args.seed)
    all_q_words = list(pairs.keys())

    # Load difficulty tiers from fry_words.txt (generated by fetch_fry.py).
    # Falls back to 'hard' for any word not listed.
    fry_file = TOOLS_DIR / 'fry_words.txt'
    fry_easy, fry_medium = set(), set()
    if fry_file.exists():
        current_section = None
        for line in fry_file.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line == '[easy]':
                current_section = 'easy'
            elif line == '[medium]':
                current_section = 'medium'
            elif line and not line.startswith('#'):
                if current_section == 'easy':
                    fry_easy.add(line)
                elif current_section == 'medium':
                    fry_medium.add(line)
        print(f'  Loaded {len(fry_easy)} easy, {len(fry_medium)} medium words from {fry_file.name}')
    else:
        print(f'  WARNING: {fry_file.name} not found — run tools/fetch_fry.py first. All words marked hard.')

    def difficulty_for(word):
        if word in whitelist:
            return 'easy'
        if word in fry_easy:
            return 'easy'
        if word in fry_medium:
            return 'medium'
        return 'hard'

    word_pairs = []
    for word in all_q_words:
        opposites = pairs[word]
        # Distractors: random words from the pool that aren't the answer
        pool = [w for w in all_q_words if w != word and w not in opposites]
        distractors = rng.sample(pool, min(5, len(pool)))
        word_pairs.append({
            'word':        word.capitalize(),
            'opposites':   opposites,
            'distractors': distractors,
            'difficulty':  difficulty_for(word),
        })

    # Stats
    from collections import Counter
    diff_counts = Counter(p['difficulty'] for p in word_pairs)
    print(f'  Difficulty breakdown: easy={diff_counts["easy"]}, medium={diff_counts["medium"]}, hard={diff_counts["hard"]}')

    print(f'  {len(word_pairs)} pairs with distractors')

    if args.dry_run:
        print('Dry run — not writing files.')
        # Show a sample
        sample = rng.sample(word_pairs, min(10, len(word_pairs)))
        for p in sorted(sample, key=lambda x: x['word']):
            print(f"  {p['word']:12s} → {', '.join(p['opposites'])}")
        return

    # -----------------------------------------------------------------------
    # Patch games/opposites/index.html
    # -----------------------------------------------------------------------
    # The game now reads the curated list (tools/opposites-words.txt, built by
    # tools/build_opposites_data.mjs) in a different data format. This legacy WordNet
    # output uses the OLD format ({word, opposites, distractors, difficulty}) and would
    # break the game, so it refuses to write unless you really mean it.
    if not args.write_legacy_format:
        print('Refusing to write: the game uses the curated list now (see tools/build_opposites_data.mjs).')
        print('This generator is kept for its WordNet data only. Use --dry-run to inspect, or --write-legacy-format to overwrite anyway.')
        return
    html = GAME_HTML.read_text(encoding='utf-8')

    new_block = (
        f'{MARKER_BEGIN}\n'
        f'const wordPairs = {json.dumps(word_pairs, indent=2, ensure_ascii=False)};\n'
        f'{MARKER_END}'
    )

    pattern = re.compile(
        rf'{re.escape(MARKER_BEGIN)}.*?{re.escape(MARKER_END)}',
        re.DOTALL,
    )

    if pattern.search(html):
        html = pattern.sub(new_block, html)
    else:
        # First run: replace the bare wordPairs array
        html = re.sub(
            r'// ---- WORD DATA ----\nconst wordPairs = \[[\s\S]*?\];',
            f'// ---- WORD DATA ----\n{new_block}',
            html,
        )

    GAME_HTML.write_text(html, encoding='utf-8')
    print(f'Updated {GAME_HTML}')
    print("Run 'bash build.sh' to rebuild.")

if __name__ == '__main__':
    main()
