# Sentence Blocks: Design

**Date:** 2026-11-12
**Status:** Design agreed in conversation; not built. Implementation plan: `2026-11-12-sentence-blocks.md`.
**Source idea:** the NHS Humber Colourful Semantics pack (Widgit symbols, copyrighted, not reusable). The method: a sentence is built from colour-coded question slots, Who (orange), What doing (yellow), What (green), Where (blue) and Describe (purple).

## Purpose, and an honest limit

A playful game that practises building a sentence from colour-coded parts, using drawings in place of reading.

It is **not** a therapy tool. The method works because the child *says* the sentence aloud and an adult responds, with the colours as scaffolding. A tap-the-tiles game removes that part, so it mostly practises word order and word categories. At 5y9m with strong story listening, the target children probably already build these sentences, so expect a modest benefit for them. The most useful stretch is stage 3 (describing words and places). The page makes no therapy claims. The source pack states it should be used under a Speech and Language Therapist's guidance.

## What the child does

**Screen:** coloured slots across the top (Who, Doing, What, Where, Describe), a tray of picture tiles below. Each tile carries a small drawing and its word. A tile placed in a slot of the same colour locks in. A tile placed in the wrong slot, or a wrong tile, bounces back with no penalty, no timer and no score.

**Two modes** (a switch on the settings screen):
1. **Describe the picture.** A drawn scene appears (a girl jumping). The tray holds the right tile for each slot plus wrong ones. The child builds the sentence. A finished sentence is shown in full, in the slot colours.
2. **Silly sentences.** No target. The child picks any tile for each slot, and the sentence assembles ("The cat is riding a bike"). It is always grammatical, and it may be silly.

**Three stages** that unlock:

| Stage | Slots | Example |
|---|---|---|
| 1 | Who + Doing | The dog is running. |
| 2 | + What | The boy is eating an apple. |
| 3 | + Where, and Describe | The big dog is running in the park. |

Stage 2 opens after 5 finished describe-the-picture sentences on stage 1, and stage 3 after 5 more on stage 2. A session is 5 sentences and paints one hopscotch square on the hub.

## Decisions carried in from the project

- No mascot, no read-aloud, no emoji. All pictures are our own drawn SVGs, in the existing line-art style, reviewed by the user in batches.
- Content and words are reviewed by the user (they said they want to review drawings and word lists themselves).
- Self-contained single built file, vanilla JS, no dependencies, per-player saved data via the shell, touch and keyboard both work.
- Opposites work is on its own branch and is not touched. This game gets its own branch from `master`.

## Refinements made while planning (differ from what was walked through in chat)

1. **Data is JS modules, not a plain text file.** The build already inlines JS modules for Maths and runs `node --test` over them. A text file would need an embed step like Opposites'. The tests act as the validator.
2. **Silly mode is free choice inside a valid frame.** "Which Whos fit which doing words" applies only to hand-written scenes (checked by the tests). In silly mode the game guarantees grammar (is/are, a/an, with or without a "what"), not sense.
3. **The describing slot belongs to the Who.** It sits before the noun ("The big dog"). Named people (Mum, Dad) are never described. Stage 3 has two frames, with and without a "what", chosen by whether the doing word takes one.
4. **Doing words are either transitive or not.** "Sleeping" never gets a "what", and "eating" always does. Stage 1 uses only the first kind and stage 2 only the second.
5. **A describing word is only ever offered against its opposite** (big against small, happy against sad), so a wrong tile is never also true of the picture. Look-alike tiles (park and garden) are grouped and never offered together.
6. **Only finished describe-the-picture sentences unlock stages.** Silly play does not, so a stage cannot be skipped.
7. **After 3 wrong tiles on one slot, the right tile gets a gentle outline.** Nothing else is given away.
8. **Wrong tiles show a cross shape as well as bouncing**, because state is never carried by colour alone in this design system.

## Open decisions for the user (the plan stops at each)

- **D1, colour.** The design system's One Paint Rule allows one game paint per screen, and only four game paints exist (red, blue, green, orange), with yellow owned by the system. This game needs five slot colours, plus a paint for its own hub tile. Recommended: add one new purple paint (also the Describe slot, matching the pack), and document a named "Slot Code" exception, where the five slot colours are the game's meaning and each also carries a glyph and a label. The alternative is to keep one paint and carry the slot identity by glyph, label and position only, which loses the method's colour cue.
- **D2, the scene pictures.** A scene must read as a picture of an action, not as a row of the tile icons. A spike (3 scenes) is shown for approval before the full set is drawn.
- **D3, the hub.** Five games need the hub grid reworked at every breakpoint.

## Architecture

```
games/sentence-blocks/
  index.html          shell page, three screens (settings, board, done)
  css/style.css
  js/engine.js        pure logic: grammar, validation, rounds, stages, saved data   (unit tested)
  js/words.js         the tiles, per slot                                           (validated by tests)
  js/scenes.js        describe-the-picture scenes                                   (validated by tests)
  js/pictures.js      drawn SVG data and rendering helpers                          (validated by tests)
  js/main.js          DOM, input, storage, sound
  tests/*.test.js     node --test, run by build.sh like Maths
  tests/play-test.mjs Playwright over the BUILT page
```

Data flow: tests validate words, scenes and pictures at build time; a session picks scenes (or builds a silly frame); each placement is checked by the engine; a finished sentence is composed from phrase strings; progress is saved per player in the browser with a versioned, defensively normalised format.

## Left out on purpose

Read-aloud, a mascot, timers, scores, hints beyond the one outline, drag-and-drop in the first release (tap-then-tap works on touch and keyboard; drag is an optional late task), and any therapy claim in the page copy.
