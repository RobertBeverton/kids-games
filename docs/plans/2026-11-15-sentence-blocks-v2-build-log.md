# Sentence Blocks v2: Build Log and Persona Decisions

Written during the build of `2026-11-15-sentence-blocks-v2.md`. The user asked that any question raised during the build be assessed by the personas (child, less fluent reader, parent, colour-blind child, keyboard user, engineer, maintainer), with the majority decision taken so the build does not stop. Each decision is recorded here so it can be reviewed and reversed afterwards.

## Decisions

| # | Task | Question | Votes | Decision |
|---|---|---|---|---|
| D1 | 5 | The settings screen is about 1,940px tall on a 360x640 phone in Story mode (plan gate: take the "Make it harder" second-step fallback and stop). | Compact CSS: child, parent, engineer, maintainer. Indifferent: less fluent reader, colour-blind child, keyboard user. Second screen: none. | Keep one screen, compact the cards on phones (smaller cards, hidden stage pills, one-row length buttons). Result: 1,377px, with the Play dock pinned. Second step not built. Revisit if the kids struggle to find Play. |

## Plan corrections found while building

- Task 1's test imported names that only exist after later tasks, which is an ESM import error. Imports are now added task by task.
- The Task 2 test for `freeOnly` called `buildStoryRound` (Task 3). It uses `buildSillyRound`, which is the same free-choice behaviour.
