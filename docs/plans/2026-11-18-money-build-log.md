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
