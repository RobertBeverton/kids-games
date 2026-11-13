# Kids Games — Roadmap

**Last updated:** 2026-03-24

A prioritised list of all games: shipped, in-progress, and planned. Scored to surface the highest educational benefit relative to build effort.

---

## Audience

**Primary:** Own kids, KS1 (ages 5–7, Years 1–2). Word lists, difficulty defaults, and UI must work here first.
**Secondary:** Nieces, KS2 (~8–10). Games should scale up where possible but KS1 drives decisions.

KS1 curriculum anchors:
- Literacy: phonics, CVC words, common sight words, simple spelling
- Numeracy: number bonds to 10/20, counting, simple +/−, 2×/5×/10× times tables (Year 2)

---

## Scoring

| Dimension | Scale | Meaning |
|-----------|-------|---------|
| **Edu** | 1–5 | Curriculum importance / educational depth |
| **Breadth** | 1–3 | Age coverage: 1 = one group, 2 = KS1+KS2, 3 = KS1+KS2 + content flexible across areas |
| **KS1 Fit** | 1–5 | How directly it maps to KS1 curriculum (primary audience) |
| **Replay** | 1–5 | Will kids come back? Randomisation, progression, challenge |
| **Effort** | S / M / L | Build complexity (S = days, M = week, L = multi-week) |
| **Score** | — | (Edu + Breadth + KS1 Fit + Replay) minus effort penalty (S=0, M=1, L=2) |

Higher score = more benefit for less effort.

---

## Shipped

| Game | Area | Edu | Breadth | KS1 Fit | Replay | Effort | Score | Notes |
|------|------|:---:|:-------:|:-------:|:------:|:------:|:-----:|-------|
| Type Trainer | Literacy | 4 | 2 | 2 | 4 | — | — | Keyboard/typing; KS1 kids can use but it's more KS2 |
| Opposites | Literacy | 3 | 2 | 3 | 3 | — | — | Vocabulary/antonyms; works at KS1 level |

---

## Literacy Games

| Game | Edu | Breadth | KS1 Fit | Replay | Effort | Score | Notes |
|------|:---:|:-------:|:-------:|:------:|:------:|:-----:|-------|
| Word Search | 3 | 3 | 4 | 3 | M | **12** | Word recognition; visual scanning suits KS1 well |
| Hangman | 4 | 2 | 2 | 3 | M | **10** | Needs spelling confidence; better for KS2 |
| Anagram / Word Scramble | 4 | 2 | 2 | 3 | M | **10** | Needs spelling confidence; better for KS2 |
| Word Finder (Boggle-style) | 5 | 2 | 2 | 5 | L | **12** | Needs vocabulary to be fun; KS2 strength; highest replay |

---

## Numeracy Games

| Game | Edu | Breadth | KS1 Fit | Replay | Effort | Score | Notes |
|------|:---:|:-------:|:-------:|:------:|:------:|:-----:|-------|
| Maths (±×÷) | 4 | 3 | 3 | 4 | S | **14** | +/− core KS1; ×/÷ extend to KS2 |
| Times Tables Drill | 5 | 2 | 3 | 3 | S | **13** | 2×/5×/10× in Year 2; rest is KS2 |
| Number Bonds | 5 | 3 | 5 | 4 | S | **17** | Literally the KS1 maths curriculum; foundational |

---

## Cross-Area

| Game | Area | Edu | Breadth | KS1 Fit | Replay | Effort | Score | Notes |
|------|------|:---:|:-------:|:-------:|:------:|:------:|:-----:|-------|
| Memory Match | Flexible | 3 | 3 | 4 | 4 | S | **14** | Visual, forgiving, no reading needed; card content drives area |

---

## Priority Order

Sorted by score:

| # | Game | Score | Area | Rationale |
|---|------|:-----:|------|-----------|
| 1 | **Number Bonds** | 17 | Numeracy | Top KS1 curriculum fit; wide age range; quick build |
| 2 | **Maths (±×÷)** | 14 | Numeracy | +/− for KS1, scales to KS2 with ×/÷; quick build |
| 2 | **Memory Match** | 14 | Flexible | Visual, KS1 accessible, reusable engine; content determines area |
| 4 | **Times Tables Drill** | 13 | Numeracy | Year 2 curriculum; complements Maths game |
| 5 | **Word Search** | 12 | Literacy | Already planned; visual scanning suits KS1 |
| 5 | **Word Finder (Boggle-style)** | 12 | Literacy | Highest replay but KS2 strength; worth the effort later |
| 7 | **Hangman** | 10 | Literacy | Good vocabulary builder; KS2 focus |
| 7 | **Anagram / Scramble** | 10 | Literacy | Solid spelling game; slight overlap with Word Finder |

---

## Notes

- **Number Bonds** and **Memory Match** are the strongest KS1 games — prioritise these early.
- **Sentence Blocks** (built, 2026-11): a language game after the Colourful Semantics idea (who, doing, what, where, describe). Two modes (describe a picture, silly sentences), three stages that unlock, 36 drawn scenes. Next: more scenes and words after play-testing; optional drag-and-drop.
- **Memory Match** engine can be themed per area (maths pairs, word-picture, opposites, times tables answers) — one build, multiple uses.
- **Word Finder** drops relative to previous scoring once KS1 fit is weighted — still worth building but after the numeracy games.
- **Times Tables Drill** and **Number Bonds** are both quick builds — natural pair to ship together as a numeracy section.
- **Anagram** and **Word Finder** overlap heavily — if Word Finder is built, Anagram is probably redundant.
