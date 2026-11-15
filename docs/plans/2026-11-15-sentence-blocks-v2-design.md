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
| Pictures + colours | drawing (if the word has one), word, slot colour | Describe the picture: only words that have a drawing (today's game). Silly and Story: the whole bank, so a word with no drawing shows as a plain coloured word tile |
| Colours only | word, slot colour | the whole bank |
| Words only | word; slots carry their text label and glyph, no colour | the whole bank |

Why Describe the picture is the one exception: the right tile is always drawn, so an undrawn wrong tile would give the answer away.

- Describe the picture always shows the scene drawing, whatever the Help level. The scene is the target; Help changes only the tiles.
- State is never carried by colour alone: slots keep their glyph and label, and wrong tiles keep the cross shape.

## Story mode

- Each sentence is built on the usual board with free choice (as Silly). The engine guarantees grammar (is/are, a/an, with or without a "what"), not sense.
- A heading above the slots gives the shape, as decoration only. Length 3: *Once upon a time… / Then… / In the end…*. Length 5 and 10: *Once upon a time…* first, *The end* last, *Then…* and *Suddenly…* between.
- Every sentence gets a fresh random draw of tiles from the bank, with enough in every slot. A row of dots fills as sentences finish; no number, timer or score.
- Next after each sentence. Stop (the X) works at any point and discards the story; nothing is saved from it.
- **The end:** from the third finished sentence until the last, a second button beside Next ends the story there and shows the book page with the sentences built so far. It paints one hub square, like a story that ran its full length. A 3-sentence story never shows it.
- Stage sets the sentence length inside the story.
- **Reveal:** a book-page view with the sentences stacked, in slot colours at the chosen Help level. Buttons: New story, Same settings, Choose again.

## Word bank

- Each tile has a word and an **optional drawing**.
- **Rule for new words: if a word can be shown as one simple picture, it gets a drawing (reviewed by the user, in batches); if not, it stays a plain word tile.** Plain word tiles appear in Silly and Story at every level, and in Describe the picture at the harder levels. Proposed split: objects, places, animals, contrast pairs (hot/cold, wet/dry, loud/quiet, tall/short) and four new poses are drawn; roles and costumes (teacher, king, wizard), fantasy creatures, most action words and abstract describing words are plain. The user can move any word either way.
- Drawings can still be added to a plain word later; it then also appears in Describe the picture at the easy level.
- Describe the picture keeps its safety rules. A word that could be true of a picture by accident (a princess for a girl, Grandma for Mum, *dancing* for a girl jumping) is either marked `freeOnly` (Silly and Story only, never a wrong tile) or put in a `group` with the word it overlaps, so it is never offered beside it. The user's word review is the real check on these marks.
- Word lists are reviewed by the user, proposed in batches per slot: Who and Describe, Doing, then What and Where. Drawings follow in their own reviewed batches.
- Trying slots until a tile fits is fine: this is a learning game, so a wrong slot costs nothing and the child still learns where each word goes.

## Architecture and testing

- `words.js`: drawing becomes optional; tests check every drawn word has a valid drawing and every slot has enough words at every Stage and Help level.
- `engine.js`: add story rounds (length, fresh draw, heading per position) and a Help filter on the tray draw. Unit tested.
- Saved data: add `help`, `mode: story` and `storyLength` to the per-player record. Keep the versioned, defensively normalised format, with old saves defaulting to Pictures + colours.
- `main.js` and `css/style.css`: settings cards, conditional Story length row, story dots and the reveal page.
- Playwright play-test over the built page gains a Story run and one run per Help level.

## Decisions carried in unchanged

No mascot, no read-aloud, no emoji, own drawn SVGs, vanilla JS, single built file, touch and keyboard, no therapy claims, no timers or scores.
