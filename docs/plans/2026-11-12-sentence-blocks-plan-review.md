# Sentence Blocks: Adversarial Review of the Plan

**Date:** 2026-11-12
**Reviewed:** `2026-11-12-sentence-blocks.md` and `2026-11-12-sentence-blocks-design.md`
**Reviewer:** the plan's own author (Claude), working against the plan with a hostile brief. This is **not** an independent review: no separate reviewer was run, because none was asked for. Where a finding could be tested, it was tested by running code; the evidence column says which. An independent pass (superpowers:code-reviewer) on the first PR is still worth doing.

## Method

1. Re-read the plan as a skeptical engineer: what breaks, what is assumed, what was promised and not delivered.
2. Extracted every code block from the finished plan file into a clean folder and ran it (`node --test`, five repeat runs, and the build's import/export stripping followed by `node --check`).
3. Mutation check: broke the engine five ways (accept wrong tiles, skip the a/an rule, unlock stage 3 early, offer any describing word, say "is" for a plural) and confirmed the tests fail each time, then confirmed green again when restored.

**Result of the executed checks:** 34 tests across the engine and pictures files, 32 pass, 2 are intentional `todo`s, 0 fail, stable over 5 re-runs; the bundle parses; all 5 mutations were caught.

## Findings

Severity: **High** (would have produced a wrong or unshippable result), **Medium** (rework or silent failure), **Low** (friction). "Fixed" means the plan, design or tested code now reflects it.

| # | Sev | Finding | Evidence | Disposition |
|---|---|---|---|---|
| 1 | High | **Composed scenes may teach nothing.** The design said scenes would be composed from tile art. If a scene is just the tile icons in a row, the child matches icons to icons and no language is involved. | Reasoning | **Task 6 spike**, with a STOP. The user judges whether a scene reads as an action. Fallback is to scale the game back, never to emoji. |
| 2 | High | **Conflicts with the design system.** The One Paint Rule allows one game paint per screen; four exist and yellow is the system's, so there is no free paint for this game or its five slot colours. State must not be carried by colour alone. | DESIGN.md read | **Decision gate D1** (Task 1) with a recommended purple paint, contrast figures computed, and a named "Slot Code" exception. Every slot and tile also carries a glyph, a word and a keyline; Task 13 includes a greyscale play-through. |
| 3 | High | **A wrong tile could also be true.** A "big" dog scene offering "happy" as a wrong answer is unfair (the dog is smiling). | Reasoning, then tested | **Fixed in code.** Describing words carry an `opposite` and are only ever offered against it. Validator checks opposites are mutual. Tested, and a mutation of this rule is caught. |
| 4 | High | **Two wrong tiles could look identical** ("dog" and "dogs" share a drawing; park and garden look alike). | **A test failed** on the first run | **Fixed in code.** `lookOf` (plural people are drawn twice, so they differ) and `group` (look-alikes are never offered together). Validator flags a scene left without enough wrong tiles. Plan now states plurals draw twice (Tasks 8, 10, 12). |
| 5 | High | **The art is the real cost, and one PR holds all of it.** About 60 tile drawings, 5 glyphs, a figure system and 36 scenes, each reviewed by the user. | Counted from the plan | **Release slicing recommended** in the plan header: PR 1 stages 1 and 2, PR 2 stage 3 (the riskiest art, and the most useful practice). Tasks are written per stage so slicing is free. |
| 6 | Medium | **The design promised more than the mechanic allows.** Section 2 said silly mode draws only compatible sets, but the tray is built before the child chooses. | Cross-read | **Resolved in the design file** ("Refinements"): compatibility applies to hand-written scenes; silly mode guarantees grammar only. |
| 7 | Medium | **The grammar model was missing.** Transitive against intransitive verbs ("sleeping a bed"), named people with describing words ("the big Mum"), mass nouns ("a milk"), a/an, is/are. | Reasoning, then tested | **Fixed in code** and covered by tests; stage 3 has two frames. Mutations of a/an and is/are are caught. |
| 8 | Medium | **Sessions would repeat scenes.** The recent-scenes list held 10 but a stage has about 12 scenes, leaving too few fresh ones. | Reasoning | **Fixed.** `RECENT_KEEP` equals the session size; a guard test requires at least 10 scenes per stage. It is a `todo` until Task 12 so it does not redden the build early. |
| 9 | Medium | **My own test was vacuous.** The "renders svg strings" check looped over an empty picture list and could never fail. | Running the extracted Task 4 code | **Fixed.** It now covers the slot glyphs and asserts a real path and no placeholder. |
| 10 | Medium | **Plan claimed Task 4 was verified when it had not been run.** | Honesty check | Ran it, then rewrote the header's verification statement to say exactly what was and was not run. |
| 11 | Medium | **Task order was wrong.** The page task said to run a build whose block was written in the next task. | Re-read | **Fixed.** Build integration with a stub page is now Task 7; the real page is Task 8. |
| 12 | Medium | **Randomised tests were unreproducible.** | Reasoning | **Fixed.** Seeded randomness; a failure names its seed. |
| 13 | Medium | **`docs/` is what GitHub Pages serves.** A rebuild on the wrong branch would publish half-drawn art; and the Opposites PR will conflict on generated files. | Repo conventions read | Rule 3 and Task 17 now say: no `docs/` before Task 17, and resolve `docs/` conflicts by rebuilding, never by hand. |
| 14 | Medium | **The hub grid is hard-coded for four games** (one lead plus three) at every breakpoint. | `hub.html` read | **New Task 9**, with a breakpoint table and screenshot checks. |
| 15 | Medium | **`build.sh` has at least seven places to change** (preflight, trap, build block, summary, zip array, zip command, header). A missed one fails silently in `--release`. | `build.sh` read | Itemised in Task 7, with a `--release` check. |
| 16 | Medium | **The bundler is dumb.** Duplicate top-level names, multi-line imports and unusual export forms break the built page. | `build.sh` read, then simulated | Rule 1 in the plan; the stripping was run against the real files. |
| 17 | Medium | **Deferred checks could be forgotten.** Two `todo` tests switch on in later tasks and nothing enforces it. | Reasoning | Task 17 now requires `grep -rn "todo:"` to print nothing. |
| 18 | Low | **Untracked plan files in the main checkout would block a later merge.** | Reasoning | Task 0 uses `mv`, not `cp`. |
| 19 | Low | **Missing UI details:** persisting the mode and stage choice, swapping a tile after a silly sentence is finished, a Finish label on the last sentence, a `baby` kind. | Re-read | Added to Tasks 8 and 10; `kind` is validated. |
| 20 | Low | **No definition of success.** | Reasoning | Task 17 adds a play-test with the children and asks for the success criteria to be agreed first. |

## Risks that remain (not resolved by this review)

- **The UI code is unrun** (Tasks 7, 8, 9, 13). Its proof is the Playwright test in Task 15, which does not exist yet.
- **The art may not work.** Nothing here can tell whether a stick-figure system will read well to a five-year-old. The Task 6 spike exists to find out cheaply, and it can fail.
- **No automated check that a scene picture is unambiguous.** The validator checks the data; only the user's review checks the drawing.
- **Colour-blind use is only partly covered.** Glyph, word, keyline and position back up colour, and Task 13 has a greyscale test, but it has not been tried with a colour-blind child.
- **Thresholds are guesses.** Five sentences to a session and five to unlock a stage have no data behind them; tune after the play-test.
- **The age label "Ages 4–8" is a proposal**, not a finding, and the learning benefit is still the open question the design file names.
- **Playwright runs only on this machine's setup** (Edge, `playwright-core` outside the repo), like the other games.
