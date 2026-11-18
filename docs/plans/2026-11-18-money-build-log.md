# Money: Build Log

Plan: `2026-11-18-money.md`. Design: `2026-11-18-money-design.md`. Review: `2026-11-18-money-plan-review.md`.

## Decisions before the build (Rob, 2026-11-18)

- Paint: magenta-pink (`#B3267A` Day, `#FF8AC8` Dusk).
- Item list and web-checked prices approved "for now".
- Drawings in five batches of 5, 5, 5, 6, 6 (plus a small chrome set), each reviewed by Rob before commit.
- Fifth activity added: What's the price? (points, best total per level).
- Pocket money: about £5 a week if all jobs are done; no code change.
- Build method: subagent per task with spec and code-quality review; Claude (controller) integrates and reports.

## Task 0: baseline

- Branch `feature/money` from `master` at `551890e` (PR #26 merged).
- `node --test games/*/tests/*.test.js`: 177 tests, 177 pass, 0 fail.

## Log

(Each task adds a line here: what was done, test counts, anything surprising, any persona votes on build questions.)

- **Task 1** (fdbdae6): Money wired into build.sh, ci.yml, README as an empty game. Also fixed TWO stray literal backslash-n sequences in the cleanup trap (the plan found one). A placeholder smoke test kept the Money test step green until real tests landed.
- **Tasks 2, 3, 6A** (2dcac01, e535b8d, 05ad45f): items.js (27 items, prices web-checked), engine, Which costs more? and What's the price? sessions. 24 Money tests; three mutation breakages each caught.
- **Tasks 4, 5** (59dd76c, 4d4347a): sort and buy sessions, 23 tests. Audit: not-size-sortable sets per round at least 5 of 10 at every level; every budget has at least 1 buyable and 2 too-dear items. **Plan exception (controller's call):** easy has only two budgets, so "no budget more than 4 times in a round" is impossible there; easy allows 5 (max(4, ceil(10/budgets))). No other rule was loosened.
- **Tasks 6, 7** (9131538, ed6c59f): How many sessions, Money Wall maths, saved data, age defaults, `buildSession` for the five activities. 36 tests. **Plan exception (controller's call, accepted):** the 15-55% answer-rank audit was infeasible with random distractors, because the largest number can only be the answer for counts divisible by 100; added `HOWMANY_TOP_MIN = 2` (each round has at least 2 such items with the right answer the largest). Ranks now 38-44% low, 34-35% mid, 21-28% high. Total 266 tests pass repo-wide.
- **Task 8 infrastructure and batch 1** (abde81a, 7f41860): picture infrastructure and contact sheet (work done in a separate git worktree, `D:\GitHub\kids-games-pictures`, branch `feature/money-pictures`, merged into `feature/money`). Batch 1 (sweets, ice lolly, ice cream, comic, balloon) approved by Rob ("they all look pretty good").
- **Batch 2** (dc0c3d9): approved by Rob with one change: the pizza is a single slice (a whole pizza read like a cake). **Batch 3** (c7f1547: paddling pool, Christmas tree, trainers, scooter, tent): approved as drawn ("perfect"). **Batch 4** (bike, tablet, trampoline, games console, phone, TV): drawn, shown to Rob, awaiting approval (not committed).
- A failed `isolation: worktree` agent call left a stale locked worktree and branch inside `.claude/worktrees`; removed.
- **Task 9** (3d57f51): pink paint (`#B3267A` Day / `#FF8AC8` Dusk; contrast 6.04 / 8.54 text, 4.91 / 5.83 / 7.57 against grounds). DESIGN.md paint count corrected to seven (six for games, yellow for the system).
- **Tasks 10, 11** (6382618, 07b1c2f): settings screen and Which costs more? with the CSS-only Money Wall. No scrolling at 360x640, 390x844, 768x1024, 1280x720, 844x390. Plan correction: the plan's "sweets vs motorbike is exactly 3,000 squares" is wrong (motorbike is 3,500); holiday is the exact case.
- **Copy decision (controller, plan rule 5):** "Cheapest first" breaks the plan's own no-"cheap" rule, so the activity is **"Put in order"**, prompt "Tap the one that costs least.", ends "costs least"/"costs most". The plan text and design doc still say "Cheapest to dearest" as the working name.
- **Tasks 12, 13** (2143eab, 68a78e0): Put in order and Can you buy it? screens. The last-question button reads "Finish" (not "Done", which clashes with the buy screen's Done).
- **Tasks 14, 14A, 15** (6cdfb65, 6204969, 1e0543b): How many coins, What's the price? and results/progress/saving. Round counts (`recordSession`, saving) happen when Finish is pressed after question 10, never on Stop. A round in progress is dropped on player switch. The shell logs a console error for corrupt saved data; the play-test ignores exactly that message for the money key.
- **Task 17** (4137e30): hub sixth tile (`--others: 5`, odd last tile spans the bottom row in the two-column layout, a 360x640 block that makes the hub exactly screen height), README, PRODUCT.md, DESIGN.md. Provisional `m-money` mark. **To check with Rob:** the agent added Money to the Grown-ups Games guide as "Ages 5-10" (invented). Maths and Sentence Blocks play-tests had tile-count assertions changed 5 to 6.
- **Not verified locally:** the Sentence Blocks play-test times out at startStage on this machine even on the baseline; the Maths play-test was only run with PER=1 past its hub section. CI is the real check.
