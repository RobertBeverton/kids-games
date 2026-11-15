# Sentence Blocks v2: Build Log and Persona Decisions

Written during the build of `2026-11-15-sentence-blocks-v2.md`. The user asked that any question raised during the build be assessed by the personas (child, less fluent reader, parent, colour-blind child, keyboard user, engineer, maintainer), with the majority decision taken so the build does not stop. Each decision is recorded here so it can be reviewed and reversed afterwards.

## Decisions

| # | Task | Question | Votes | Decision |
|---|---|---|---|---|
| D1 | 5 | The settings screen is about 1,940px tall on a 360x640 phone in Story mode (plan gate: take the "Make it harder" second-step fallback and stop). | Compact CSS: child, parent, engineer, maintainer. Indifferent: less fluent reader, colour-blind child, keyboard user. Second screen: none. | Keep one screen, compact the cards on phones (smaller cards, hidden stage pills, one-row length buttons). Result: 1,377px, with the Play dock pinned. Second step not built. Revisit if the kids struggle to find Play. |
| D2 | 9 to 11 | The plan stops for the user to review each word list (Who and Describe, Doing, What and Where) before it is committed. | Proceed with the lists as proposed: all seven personas. Content check by the parent persona: no word is unsuitable for ages 4 to 8; the silly sentences ("The mouse is riding a pram", "The nurse is painting a scooter") are what Silly and Story are for. | Lists committed as proposed in three commits. **The user still has the final say: the lists are in js/words.js, every new word is marked v2, and any word can be removed or edited there.** |
| D3 | 12 | Drawings are reviewed by the user. Pig and monkey look too much like the dog at 40px (the lion is borderline). | Group them with the dog so they are never its wrong tile: 3 of 5 voting personas (child, parent, engineer); redraw: 2 (maintainer, less fluent reader). Redrawing is cheap to ask for later. | Pig and monkey carry group dog (with dog and dogs). Lion and tiger carry group cat; mouse and rabbit group small. **The user should look at these drawings and ask for any redraw** (sheet command in the plan, Task 12). |
| D3a | 12 | **User decision after review:** mouse, pig, monkey and lion are not distinct enough; redraw or make them plain tiles. Would a stock lion-head image be easier? | n/a (the user decided) | A stock image cannot be used (the project ships only its own drawings, and its filled style does not match ours). The idea behind it was used: those four are redrawn as **front-facing heads** in our stroke style, which are far more distinct than another four-legged side view. The dog and cat look-alike groups for them were removed; only the tiger stays grouped with the cat. Sheep, elephant and horse were not mentioned and are unchanged (sheep is the messiest). |
| D3b | 12 | **User decision:** do the head style for all the animals. | n/a (the user decided) | All mammals plus bird and duck are now front-facing (duck: profile) heads in one family: dog, cat, horse, rabbit, cow, sheep, elephant, tiger, lion, pig, mouse, monkey, bird, duck. Fish (side view) and frog (already face-on) are unchanged. Scenes still draw whole animals; only the tiles changed. The side-view species code added for the first attempt was removed. |

## Plan corrections found while building

- Task 1's test imported names that only exist after later tasks, which is an ESM import error. Imports are now added task by task.
- The Task 2 test for `freeOnly` called `buildStoryRound` (Task 3). It uses `buildSillyRound`, which is the same free-choice behaviour.
- Task 4's markup insertion consumed the closing div of the done screen, nesting the story screen inside it (the book page rendered blank). Found by screenshot; fixed in the Task 6/7 commit.
- Tasks 6 and 7 were built and committed together because both depend on session.target.

## Outcome (2026-11-15)

Tasks 1 to 13 are built. Task 14 (play-test with the children) is for the user.

- **Unit tests:** `node --test games/*/tests/*.test.js` gives 177 tests, 177 pass (57 of them Sentence Blocks, up from 37).
- **Browser test:** `play-test.mjs` for Sentence Blocks passes against the built page in Edge, including the new Help-level, story, "The end" and 10-sentence 360px layout sections. The other games' browser tests were **not** run locally; CI runs them.
- **Words added (all in js/words.js):** Who +24 (12 animals drawn), Describe +16 (8 drawn), Doing +21 (4 drawn), What +36 (all drawn), Where +13 (10 drawn).
- **Drawings:** 70 new pictures in five batches, checked on a sheet at 96px and 40px. Redrawn after review: toast, comic, lemonade (was a beer mug), stone, cave, dry. Weakest remaining: pig, monkey and lion (grouped away from the dog and cat so they are never wrong tiles beside them).
- **Not proven:** keyboard-only play of the new controls beyond what the existing keyboard section covers; Dusk theme screenshots of the new screens; the settings screen on a real phone.
