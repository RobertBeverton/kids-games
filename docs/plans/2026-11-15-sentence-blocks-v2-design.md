# Sentence Blocks v2: Design

**Date:** 2026-11-15
**Status:** Design agreed in conversation; not built. Builds on `2026-11-12-sentence-blocks-design.md`.
**Why:** The kids loved Sentence Blocks and asked for more choices and more difficulty. They read the words themselves, including sentences built from the words, so word-only play is viable.

## Scope

One game, three new things, no new hub tile (no hub rework):

1. **Help ladder**: how much scaffolding the tiles carry.
2. **Story mode**: build N sentences, then see them together as a story.
3. **Bigger word bank**: more words per slot, many of them without a drawing.

**Out of this release (decided):** new slots (How, When), joiner tiles (and, because), a saved "my stories" shelf, printing. Revisit once the kids' progress is seen.

## Settings screen

| Dial | Choices | Shown when |
|---|---|---|
| How to play | Describe the picture, Silly sentences, **Story** | always |
| Stage | 1, 2, 3 (unchanged; unlock rule unchanged) | always |
| **Help** | Pictures + colours, Colours only, Words only | always, **free to pick** |
| **Story length** | 3, 5, 10 | Story only |

- How to play becomes three large cards; Stage and Help are smaller rows under it. Story length slides in under them when Story is chosen.
- Help options show a tiny tile preview (drawn tile, coloured word, plain word) so the ladder reads without labels.
- Length 3 is labelled "Beginning, middle, end"; 5 and 10 are numbers.
- Choices are remembered per player. End screen keeps "Choose again".
- Fallback if the screen is too tall on a small tablet: three cards plus Play first, then a "Make it harder" step holding Stage and Help.
- Only finished Describe-the-picture sentences count towards Stage unlocks. Story and Silly do not. Help never unlocks anything.

## Help ladder

| Level | Tile shows | Tray draws from |
|---|---|---|
| Pictures + colours | drawing, word, slot colour | words that have a drawing (today's game) |
| Colours only | word, slot colour | the whole bank |
| Words only | word; slots carry their text label and glyph, no colour | the whole bank |

- Describe the picture always shows the scene drawing, whatever the Help level. The scene is the target; Help changes only the tiles.
- State is never carried by colour alone: slots keep their glyph and label, and wrong tiles keep the cross shape.

## Story mode

- Each sentence is built on the usual board with free choice (as Silly). The engine guarantees grammar (is/are, a/an, with or without a "what"), not sense.
- A heading above the slots gives the shape, as decoration only. Length 3: *Once upon a time… / Then… / In the end…*. Length 5 and 10: *Once upon a time…* first, *The end* last, *Then…* and *Suddenly…* between.
- Every sentence gets a fresh random draw of tiles from the bank, with enough in every slot. A row of dots fills as sentences finish; no number, timer or score.
- Next after each sentence. Stop works at any point; nothing is saved from an unfinished story.
- Stage sets the sentence length inside the story.
- **Reveal:** a book-page view with the sentences stacked, in slot colours at the chosen Help level. Buttons: New story, Same settings, Choose again.

## Word bank

- Each tile has a word and an **optional drawing**. Drawings can be added to a word later; it then becomes available at the easy level.
- Describe the picture keeps its safety rules. A new word enters scene rounds only if the tests show it is never true of the scene by accident (opposite pairing and look-alike groups, as before). Undrawn words may be wrong tiles only where clearly wrong.
- Word lists are reviewed by the user, proposed in batches per slot: Who, Doing, What, Where, then Describe.

## Architecture and testing

- `words.js`: drawing becomes optional; tests check every drawn word has a valid drawing and every slot has enough words at every Stage and Help level.
- `engine.js`: add story rounds (length, fresh draw, heading per position) and a Help filter on the tray draw. Unit tested.
- Saved data: add `help`, `mode: story` and `storyLength` to the per-player record. Keep the versioned, defensively normalised format, with old saves defaulting to Pictures + colours.
- `main.js` and `css/style.css`: settings cards, conditional Story length row, story dots and the reveal page.
- Playwright play-test over the built page gains a Story run and one run per Help level.

## Decisions carried in unchanged

No mascot, no read-aloud, no emoji, own drawn SVGs, vanilla JS, single built file, touch and keyboard, no therapy claims, no timers or scores.
