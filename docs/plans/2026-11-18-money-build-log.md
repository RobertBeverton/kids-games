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

- **Task 1** (fdbdae6): Money wired into build.sh, ci.yml, README as an empty game. Also fixed TWO stray literal `
` in the cleanup trap (the plan found one). A placeholder smoke test kept the Money test step green until real tests landed.
- **Tasks 2, 3, 6A** (2dcac01, e535b8d, 05ad45f): items.js (27 items, prices web-checked), engine, Which costs more? and What's the price? sessions. 24 Money tests; three mutation breakages each caught.
- **Tasks 4, 5** (59dd76c, 4d4347a): sort and buy sessions, 23 tests. Audit: not-size-sortable sets per round at least 5 of 10 at every level; every budget has at least 1 buyable and 2 too-dear items. **Plan exception (controller's call):** easy has only two budgets, so "no budget more than 4 times in a round" is impossible there; easy allows 5 (max(4, ceil(10/budgets))). No other rule was loosened.
- **Tasks 6, 7** (9131538, ed6c59f): How many sessions, Money Wall maths, saved data, age defaults, `buildSession` for the five activities. 36 tests. **Plan exception (controller's call, accepted):** the 15-55% answer-rank audit was infeasible with random distractors, because the largest number can only be the answer for counts divisible by 100; added `HOWMANY_TOP_MIN = 2` (each round has at least 2 such items with the right answer the largest). Ranks now 38-44% low, 34-35% mid, 21-28% high. Total 266 tests pass repo-wide.
- **Task 8 infrastructure and batch 1** (abde81a, 7f41860): picture infrastructure and contact sheet (work done in a separate git worktree, `D:\GitHub\kids-games-pictures`, branch `feature/money-pictures`, merged into `feature/money`). Batch 1 (sweets, ice lolly, ice cream, comic, balloon) approved by Rob ("they all look pretty good").
- **Batch 2** (beach ball, cardboard box, pizza, football, teddy): drawn, shown to Rob, awaiting approval (not committed).
- A failed `isolation: worktree` agent call left a stale locked worktree and branch inside `.claude/worktrees`; removed.
