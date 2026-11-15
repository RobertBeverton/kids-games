# Sentence Blocks v2: Build Log and Persona Decisions

Written during the build of `2026-11-15-sentence-blocks-v2.md`. The user asked that any question raised during the build be assessed by the personas (child, less fluent reader, parent, colour-blind child, keyboard user, engineer, maintainer), with the majority decision taken so the build does not stop. Each decision is recorded here so it can be reviewed and reversed afterwards.

## Decisions

| # | Task | Question | Votes | Decision |
|---|---|---|---|---|
| D1 | 5 | The settings screen is about 1,940px tall on a 360x640 phone in Story mode (plan gate: take the "Make it harder" second-step fallback and stop). | Compact CSS: child, parent, engineer, maintainer. Indifferent: less fluent reader, colour-blind child, keyboard user. Second screen: none. | Keep one screen, compact the cards on phones (smaller cards, hidden stage pills, one-row length buttons). Result: 1,377px, with the Play dock pinned. Second step not built. Revisit if the kids struggle to find Play. |
| D2 | 9 to 11 | The plan stops for the user to review each word list (Who and Describe, Doing, What and Where) before it is committed. | Proceed with the lists as proposed: all seven personas. Content check by the parent persona: no word is unsuitable for ages 4 to 8; the silly sentences ("The mouse is riding a pram", "The nurse is painting a scooter") are what Silly and Story are for. | Lists committed as proposed in three commits. **The user still has the final say: the lists are in js/words.js, every new word is marked v2, and any word can be removed or edited there.** |
| D3 | 12 | Drawings are reviewed by the user. Pig and monkey look too much like the dog at 40px (the lion is borderline). | Group them with the dog so they are never its wrong tile: 3 of 5 voting personas (child, parent, engineer); redraw: 2 (maintainer, less fluent reader). Redrawing is cheap to ask for later. | Pig and monkey carry group dog (with dog and dogs). Lion and tiger carry group cat; mouse and rabbit group small. **The user should look at these drawings and ask for any redraw** (sheet command in the plan, Task 12). |

## Plan corrections found while building

- Task 1's test imported names that only exist after later tasks, which is an ESM import error. Imports are now added task by task.
- The Task 2 test for `freeOnly` called `buildStoryRound` (Task 3). It uses `buildSillyRound`, which is the same free-choice behaviour.
- Task 4's markup insertion consumed the closing div of the done screen, nesting the story screen inside it (the book page rendered blank). Found by screenshot; fixed in the Task 6/7 commit.
- Tasks 6 and 7 were built and committed together because both depend on session.target.
