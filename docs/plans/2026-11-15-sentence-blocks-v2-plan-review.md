# Sentence Blocks v2: Persona and Adversarial Review of the Plan

**Date:** 2026-11-15
**Reviewed:** `2026-11-15-sentence-blocks-v2.md` and `2026-11-15-sentence-blocks-v2-design.md`
**Reviewer:** the plan's own author (Claude), working against the plan with a hostile brief and a set of personas. This is **not** an independent review. An independent pass (superpowers:code-reviewer) on the PR is still worth doing. Execution of the plan has **not** started.

## Method

1. Read the plan as seven personas (below) and as an adversary trying to make each task fail or mislead.
2. Copied `games/sentence-blocks/js` and `tests` to a scratch folder, extracted the plan's code blocks **from the plan file itself** and applied them (engine changes, the new `v2.test.js`, the edits to existing tests, and all three word batches), then ran `node --test`.
3. Mutation check: broke the engine seven ways and confirmed the tests fail each time.
4. Concatenated `engine.js`, `words.js`, `scenes.js` and `pictures.js` the way `build.sh` does (imports stripped, exports stripped) and ran `node --check` to look for duplicate top-level names.

**Executed results:** after the fixes below and the user's three answers (round 2), 57 tests, 57 pass, 0 fail (baseline 37). Every mutation tried was caught: Describe the picture offering undrawn words at the easy level, Story wrongly limited to drawn words, a `freeOnly` tile offered as a wrong tile, `lookOf` ignoring undrawn tiles, story sentences counting towards unlocks, an unvalidated Help value, a wrong last story heading, the drawn-opposite check dropped, "The end" offered too early, and "The end" offered on the last sentence. The engine-side bundle parsed on the first round; it was not re-checked after round 2.

**Not run, and so unproven:** everything in `main.js`, `index.html` and `style.css` (Tasks 4 to 7), and the new Playwright sections (Task 8). They need the real build and a browser. I read them against the current `main.js`, `play-test.mjs` and `style.css`, and checked each selector and global they use still exists, but that is reading, not running.

## Personas

| Persona | What they need | Result |
|---|---|---|
| **The child, 5y9m, reads words** | Story to feel like a game, not a worksheet; a finished story to show someone | Served, after findings 2 and 6 were fixed (an early "The end", and the book matching the screen). |
| **A less fluent reader (sibling)** | The easy level to stay easy | Served: Pictures + colours is the default, and Describe the picture there still offers drawn words only. Silly and Story now mix in plain word tiles at that level (finding 1), which a weaker reader may find harder; the Help level cannot make those go away. Worth watching in the play-test. |
| **The parent, who reviews every word** | Short lists to approve, no surprises in a sentence | Served by the STOP gates. Finding 7 (two words slip through unchecked) was fixed in the plan. |
| **A colour-blind child** | Slot identity that does not rely on colour | Served: every slot keeps a glyph and label at every level; tiles keep a badge glyph except at Words only (finding 4). |
| **Keyboard or switch user** | Every new control reachable and announced | Mostly served; story headings were not announced (fixed, Low). Settings rows use the same `aria-pressed` buttons as today. |
| **The engineer executing the plan** | Exact files, copy-pasteable code, expected output | Served, after four bugs the run found were fixed (findings 8 to 11). |
| **The maintainer / CI** | Nothing that breaks the build, no `docs/` conflicts | Served: no new JS files, so `build.sh` is untouched; the plan leaves `docs/` to the CI bot, which rebuilds and commits it. |

## Findings

Severity: **High** (would give a wrong or disappointing result), **Medium** (rework or silent failure), **Low** (friction). "Fixed" means the plan now reflects it. "Decision" means it needs the user.

| # | Sev | Finding | Evidence | Disposition |
|---|---|---|---|---|
| 1 | High | **At the default level, nothing changes.** All new words were undrawn, and the easy level only offered drawn words. The kids asked for "more choices". On Pictures + colours (what they play now) they would have got exactly today's tiles, in Story as well. | Counted by running the scratch copy (Who 14 of 38 drawn, Doing 19 of 39, What 19 of 55, Where 9 of 22, Describe 4 of 20) | **Fixed, by the user's decision (round 2):** draw the words that can be one simple picture (new Task 12, five reviewed batches: objects, places, describing pairs, animals, four poses); words too complex to draw stay plain word tiles. Plain tiles appear in Silly and Story at every level: `bankFor(data, help, mode)` is drawn-only only for Describe the picture at the easy level, where an undrawn wrong tile would give the right one away. |
| 2 | High | **Stop loses a long story.** A child on sentence 8 of 10 who wants to stop loses all eight. | Reasoning, design read | **Fixed, by the user's decision (round 2):** from the third finished sentence a "The end" button ends the story there and shows the book page. The pure rule `canEndEarly` is unit tested, Task 7 wires it, and the Playwright run covers it. A 3-sentence story never shows it. Stop (the X) still discards. |
| 3 | High | **A wrong tile could also be true, now at scale.** With the whole bank offered as wrong tiles in Describe the picture at the harder levels, a *princess* could be a wrong tile for a picture of a girl, *dancing* for a girl jumping, *Grandma* for Mum, *cooking* beside *baking*, a *comic* for a book. | Reasoning, then tested | **Fixed in the plan.** New `freeOnly` flag (Silly and Story only, never a wrong tile; validator rejects it as a scene answer), and `group` marks on the new and the matching existing words (jump, laugh, sleep, swim, throw, cook, clean, draw, move, reading, juice, pushchair). Tested, and the mutation that removes the filter is caught. **The lists are my judgement of what could be true of a picture; the user's word review is the real check.** |
| 4 | Medium | **Words only can be solved by trying every slot.** A wrong-slot tap has no penalty. (Placing is two taps, tile then slot, so it is not free, but it is cheap.) | Reasoning | **Closed, by the user's decision (round 2):** not a problem in a learning game. A child who tries slots still learns where each word goes; it only takes longer. Nothing is added. Task 14 now only asks how long Words only takes them. |
| 5 | Medium | **The settings screen may be too tall.** It goes from two rows to three (four in Story) on a phone, and the Play button sits in a dock. | Reasoning, `index.html` and `style.css` read | Task 5 checks at 360 by 640 and has a gate: if it scrolls, take the design's "Make it harder" fallback and stop to tell the user. Not proven. |
| 6 | Medium | **A swapped tile after finishing would make the book disagree with the screen.** Silly mode lets a child swap after the sentence is complete; storing the sentence when the last slot filled would keep the old one. | Read `afterPlace` against `tryPlace` | **Fixed.** The sentence is stored when Next is pressed. Engine test and a Playwright check (swap, then Next, the book keeps the swapped sentence). |
| 7 | Medium | **Words without a drawing had three hidden traps.** `lookOf` would give every undrawn tile the same look (so one could never sit beside another); the validator and `pictures.test.js` both demanded a drawing; and a drawn describing word with an undrawn opposite would lose its only wrong tile at the easy level. | Reasoning, then tested | **Fixed** (Task 2) with tests for each, and a validator check per Help level for enough tiles and enough wrong tiles. |
| 8 | Medium | **`princess` fails the plural check** (it ends in s). | Ran the plan's code: `who:princess looks plural but is not marked plural` | **Fixed:** `irregularS: true`. |
| 9 | Medium | **The old sentence pattern rejects "an ice cream".** `engine.test.js` runs silly rounds over the shipped data, so it would fail the moment word batch C landed, a task that has no reason to touch that test. | Ran it: `The boy is reading an ice cream.` failed | **Fixed:** Task 2 widens the pattern in `engine.test.js` (and Task 8 in `play-test.mjs`, which has its own copy). |
| 10 | Medium | **My test fixtures collided with the shipped words** (`frog` and `pig` are in batch A, so the validator reported duplicate ids). | Ran it | **Fixed:** fixtures use `newt` and `hamster`. |
| 11 | Low | **A wrong count in my own test** (`DATA.who.length` after batch A includes undrawn words). | Ran it | **Fixed:** compares against the drawn count. |
| 12 | Low | **Design listed "New story" and "Same settings" as two buttons.** They do the same thing. | Design read | The plan has one button, "New story". Say if you wanted something different. |
| 13 | Low | **Story headings were not announced to screen readers.** | Reasoning | **Fixed:** `say(round.heading)` in Task 7. |
| 14 | Low | **`bus` was marked `irregularS` and the plan hedged about it.** That flag is only read for Who tiles. | Ran it | **Fixed:** removed, and the hedge sentence removed. |
| 15 | Low | **A 3-sentence story earns the same hub square as a 10-sentence one**, and so does one ended early. | Reasoning | Left as is (one square per finished session, as everywhere else). Tell me if you want it scaled. |
| 16 | Medium | **My own Help-level browser test would have failed.** It asked for an SVG in the picture strip in Silly mode before anything was placed, when the strip holds only empty gaps. | Re-read the Task 8 test against `renderPicture` (round 2) | **Fixed:** it now checks the strip is shown or hidden (easy level or not), and checks for the scene drawing only in Describe mode. |
| 17 | Low | **A placed word with no drawing needs something to show in the picture strip** (Silly and Story at the easy level). | Reasoning, from decision 1 | **Fixed:** Task 6 renders the word in a small chip in place of the drawing. |
| 18 | Low | **A drawn word can now be a wrong tile at the easy level in Describe the picture**, so the new drawings need the same look-alike check as the old ones. | Reasoning, from decision 1 | Task 12 re-runs the scenes contact sheet after every batch and adds `group` marks (cat, lion, tiger; rabbit, mouse) where two look alike. |

## Risks that remain

- **The UI is unrun** (Tasks 4 to 7) and its proof is the new Playwright sections, which are also unrun. The first real build may need fixes; expect a round of them in Task 5 to 8.
- **The drawings are the largest cost and the least certain.** Task 12 is five batches of new art (about 35 objects, 10 places, 8 describing words, 12 animals, 4 poses), every one reviewed by the user. Nothing can check that a drawing reads well to a five-year-old at 40 px; only the contact sheet and the user can. The plan lets any word be moved back to a plain word tile if a drawing does not work, so the art can be cut without cutting the words.
- **Word lists are proposals.** Every list was written by me, and sample sentences read well ("The slow lion is jumping in space.", "The mouse is cooking a magazine."), but the user decides what stays. `freeOnly` and `group` are only as good as that review.
- **Difficulty is a guess.** Scene rounds still offer 2 wrong tiles per slot (1 at stage 3) even at Words only. If Words only is too easy for them, one more wrong tile per slot at that level is a one-line change (`distractorsFor`); it is left out to keep the change small.
- **Thresholds have no data:** 3, 5 and 10 sentences, 3 tiles per slot in Silly and Story. Tune after the play-test with the kids.
- **Playwright runs only on this machine's setup** (Edge, `playwright-core` outside the repo) and in CI (Chrome), like the other games.
- **The shipped hub stays at five tiles** and is not touched; its existing play-test section still runs.
