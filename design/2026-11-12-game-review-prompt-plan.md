# Game review: a prompt plan

Written for: you, pasting prompts into a fresh Claude Code session, one game at a time. The session reads this file for context, so the facts below are written for it too.

The redesign (PR #11) restyled every game and left rules and content alone. This plan is the follow-up: check each game's actual play, content and mechanics, and improve them. One game per branch, one PR per game.

**Before you start:** merge PR #12 (a bug I introduced in the redesign: Maths printed its own answer on screen). Opposites is finished in PR #13 (see section 1): merge it too, so its tools and test pattern are on `master` for the other sessions to reuse. Start every session from an up-to-date `master` (the main branch is `master`; PRs target it).

---

## Decisions already made (do not re-ask)

- **Opposites: DONE (PR #13).** Hand-curated list (333 entries, UK English, aimed at ages 5 to 8), exact typed answers plus listed misspellings and word forms, no stemmer, no fuzzy matching. The legacy WordNet entries are skipped for now, so 9 and over share the same pool until a level-3 set exists.
- **Read-aloud / audio:** I raised it for Opposites (tap-to-hear single words, ElevenLabs voice, files on Cloudflare R2; see `D:\GitHub\Stories\narrator\narrate.mjs` and `docs/audio-hosting.md` there). It is **parked, not approved**. It conflicts with the offline, self-contained and "no read-aloud" statements in PRODUCT.md, README.md and DESIGN.md, so do not build or promise it in any other session. Only pursue it if I ask again.
- **Type Trainer:** stays keyboard-only. Tablet/touch play would be a lot of work to do well, so it is parked and will be revisited later. Do not build tappable keys now.
- **Number Bonds and Maths:** I don't mind merging. I split them so children could choose the style they prefer; one screen with a mode switcher would serve that just as well. The session should recommend and design it (see section 4).
- **Memory Match:** happy to replace the emoji with a new picture set. My Stories project has good line-art icons to draw on (see section 2).

---

## How to run it

1. New session in `d:\GitHub\kids-games`. Paste the **Session preamble** first, then one **game prompt**.
2. Order: ~~Opposites~~ (done) → **Memory Match → Type Trainer → Number Bonds and Maths together**. Number Bonds and Maths are last because they are probably fine, and you want to check, not assume. (Opposites went first because it needed a real rework; its audit found a 62% length giveaway and a stemmer that accepted wrong words, which is the kind of thing to look for elsewhere.)
3. Each game prompt has the same shape: **audit → show me findings → I choose → build → prove it in the built page → PR**. Don't let a session skip the "show me" step.
4. Use `/clear` or a new session between games. The preamble reloads what matters.

---

## Session preamble (paste this first, every time)

```
Read these first, in order: PRODUCT.md, DESIGN.md, design/2026-11-12-game-review-prompt-plan.md
(this file: the "Ground rules" and "Lessons" sections matter most).

We are reviewing and improving ONE game at a time. The visual redesign is done and merged;
do not restyle. Work on the game's content, rules, difficulty and correctness.

Ground rules:
- New branch from an up-to-date master per game, e.g. review/opposites. One PR per game.
- Work in this thread. Do not spawn subagents.
- Audit first and show me the findings with evidence. Do not change rules, word lists,
  difficulty or published claims until I have chosen what to do. Ask me when a decision is mine.
- Vanilla HTML/CSS/JS, no dependencies, each game stays one self-contained file via build.sh.
  Touch and keyboard both work. Pre-readers can use it. Per-player profiles and adaptive
  difficulty keep working. Respect prefers-reduced-motion. Sound goes through KidsGames.sfx.
- Verify in the BUILT page (docs/*.html after `bash build.sh`), never only in source.
  Check that the content makes sense, not just that the layout fits.
- Read whole diffs. Never generate one game's files from another's without diffing every hunk.
- Report faithfully: if a check fails or you skipped something, say so.
- PRs target master. Commit the change, then `bash build.sh` and commit docs/ separately as
  "build: rebuild docs". Leave unrelated working-tree changes (.gitignore, this plan) alone.
- Reuse the proof pattern in games/opposites/tests/play-test.mjs (see Lessons) for any content check.
```

---

## Ground rules and lessons (the session should keep to these)

- **Content correctness is not layout.** The Maths regression passed every layout, overflow and contrast check and still printed the answer. For every game, write a check that plays the built page for many questions and asserts the *content* is right.
- **`bash build.sh` rewrites all of `docs/`.** That is expected. Commit it as its own "build: rebuild docs" commit.
- **Windows line endings.** The working copy is CRLF, the repo stores LF. `build.sh` must stay LF. If an exact-string edit "can't find" text that is plainly there, suspect CRLF. Do edits with a small script file rather than shell one-liners with nested quotes.
- **No browser tool is attached.** Install `playwright-core` into the session scratchpad (not the repo) and drive Edge with `channel: 'msedge'`. Seed a player with `localStorage` keys `kidsgames_players` and `kidsgames_activePlayer` (value is a JSON string, e.g. `"Mia"`), with `manualAge` 5 or 8.
- **Age brackets come from the profile:** `4-5`, `6-8`, `9-12`, `13+`. Each game reads `window.KidsGames.player.ageBracket`.
- **Design system is fixed.** Use the `kg-*` classes and tokens from `shared/`. If a game needs a new component, add it to `shared/shell.css` and `DESIGN.md`, don't invent a one-off.
- **Playing the built page in a test: copy the pattern in `games/opposites/tests/play-test.mjs`.** It needs `playwright-core` (not a repo dependency): install it in a scratch folder and run `PLAYWRIGHT_CORE=<file URL of its index.mjs> node games/opposites/tests/play-test.mjs`. What it taught:
  - Shorten the game's timers in an init script (`setTimeout` waits of 300 ms or more become 4 ms) so thousands of questions run in minutes.
  - Then reading the page after an answer races the game, which has already moved on. Wrap the game's own handlers (for Opposites `handleCorrect`, `handleWrong`, `checkChoice`, `checkTyped`) to record the verdict and which question was checked, and assert on that.
  - Take the expected answers from the source data files, not from the page, so the test also proves the data in the game is right.
  - Prove the test can fail: run it on a deliberately broken copy of the built page. Run it three times in a row before trusting a pass.
- **Look for answer-shape giveaways, not only wrong content.** Opposites had the right option be the shortest word 62% of the time (chance 33%) and one distractor word in 61% of questions, so a child could win without reading. Equivalents to check elsewhere: where the right answer sits in the options, how big or round it is, digits it ends in (Number Bonds, Maths), and whether Memory Match's hint ever points at a match.
- **Keep data as a source file plus a validator.** Opposites now has the list in `tools/`, a validator that fails on its rules, a build step that embeds it, and `build.sh` runs it with `--check` so a stale or invalid list fails the build. Other games with data (Type Trainer's word lists) can follow the same shape.
- **Automatic dictionary checks are noisy; read their output.** WordNet "synonym" flags, relatedness scores and word-form generation produced false alarms (518 hits that fell to 0 when stricter) and made-up words (`biger`). Use them to find candidates, then decide by eye.
- **Personas inside one thread are one reviewer playing roles.** That is acceptable under "no subagents" but say so, and finish with an adversarial pass (asymmetries, look-alike words, typo traps); that pass found real problems the per-batch reviews missed.
- **Shell habits on this machine.** Bash heredocs, `python -c` and `node -e` mangle backslashes and regex, and Git Bash's `/tmp` is not Python's `/tmp`. Write any script that contains a regex into the scratchpad with the Write tool and run it. Run Python with `-I`. `gh` works for push and PRs (the GitHub MCP server failed to authenticate); use `gh pr edit --body-file` to update a PR description.
- **Out of scope for every session:** restyling, new games, accounts, analytics, ads, outbound links outside the grown-ups sheet, and read-aloud/speech unless I ask again (parked, see Decisions).
- **Open items from the redesign** that these sessions may touch: Maths is a near-copy of Number Bonds; Memory Match pictures are emoji; there is no offline service worker; `.github/skills|agents|hooks` (Impeccable tooling) is deliberately not committed.

---

## 1. Opposites (DONE: PR #13, branch `review/opposites`)

Kept here as a record and as a template for the other sessions. The old audit prompt is gone.

### What the audit found (Phase A)

- 856 WordNet pairs, 95% with one accepted answer; random distractors (4-5 pool: 60 distractors over 8 letters, only 14 of 355 a common word); 392 pairs were each other's reverse.
- No "two correct options" bug (the generator excluded it), but the right answer was the shortest option 62% of the time at 4-5, and 53% of questions on days 2 to 7 had been seen that week.
- Typed mode (a hand-rolled stemmer) rejected 92 of 178 plausible child answers and accepted `lasting` for `first`; `closed` became `clos`.

### What shipped

- `tools/opposites-words.txt` (333 entries: 82 level 1 for about age 5, 251 level 2 for ages 6 to 7), `tools/opposites-misspellings.txt`, `tools/opposites-forms.txt`; `tools/validate-opposites.mjs`, `tools/check_opposites_wordnet.py`, `tools/build_opposites_data.mjs`; `build.sh` fails if the list is invalid or not embedded.
- Game: exact typed matching (answers, listed forms and misspellings; `~word` answers are typed-only), 10 questions at 4-5 and 20 above, level mix 1:3 at 6+, per-player memory (missed words return, recent words avoided), saved data reloaded per game.
- Proof: `games/opposites/tests/play-test.mjs` (1,600 questions across all brackets, 5,172 typed submissions, 3,996 choose screens; nothing wrong accepted, nothing right rejected, no screen with two correct options).
- Numbers: right-is-shortest 62% to 12-25%; probe answers accepted 86 of 178 to 136 of 180; seen earlier in the week 53% to 0% at 4-5 and 25% to 7% at 6-8 (7 games a week); game file 197 KB to 60 KB.

### Follow-up fix after play (branch `fix/opposites-difficulty-and-answers`)

Playing it showed two things the audit and tests had missed: choose mode offered a *random* accepted answer (so `cold` could offer `roasting`, `give` could offer `keep`), and there was no way to change difficulty (it had only ever followed the profile's age; there was never a picker). Fixed: choose mode offers the first, simplest answer (Hard may offer the first two), `cry`'s wrong answer `smile` was removed, and Easy / Medium / Hard is now a saved per-player picker that starts from age. Lesson: a passing test only proves what it asserts. Play the game as the child would, and for every game ask "what can the player choose or change, and what do they actually see first?"

### Still open for Opposites

- A human read of `tools/opposites-words.txt` (the batch reviews were one reviewer playing three roles).
- A level-3 set for ages 9 and over; the legacy WordNet entries are skipped for now.
- The 4-5 pool is 82 words: no repeats at 7 games a week, but 64% at 21 a week.
- Real-word slips (`quite` for `quiet`, `tried` for `tired`) are rejected by design; so are inflections not in the forms file.
- Audio: parked, see Decisions.

---

## 2. Memory Match

### What is known

- Everything is in `games/memory-match/index.html`. Sizes: 2×4, 3×4, 4×4, 4×5, rotated on wide screens. Peek at the start for 1.5s (on by default). Default is 3×4 for every age.
- Card pictures are emoji: 20 each for animals, food, vehicles, plus a "random" mix of all 60.
- The first tap shows a "hint" ring on a **random** other card, which is not the match. It is a nudge to tap again, not a real hint.
- Win screen shows only the flip count. No adaptation to age or skill.

### The new picture set (decided: replace the emoji)

I have a good line-art icon system in my **Stories** project at `D:\GitHub\Stories`. Read it before designing the set:

- **Source of truth:** `site/assets/js/icons.mjs` (120 lines, 23 icons). Each icon is plain data: a `viewBox="0 0 120 82"` pair of SVG paths, `main` (the bold shape) and `detail` (thinner accent lines), drawn with strokes of about 4 and 2. Pictures are drawn by code from path data, which suits a single-file game very well.
- **The pattern to borrow:** the module is tiny. A `ICONS` object keyed by name, `ICON_NAMES`, `isValidIcon(name)`, and `iconSvgPath` / `iconDetailSvgPath` accessors that throw on an unknown name. Do the same for the new set (`PICTURES = { cat: { main, detail, label }, ... }`) so a typo in a picture name fails loudly instead of showing a blank card. `scripts/icons.mjs` there is only a re-export of that module.
- **Rendered samples, with a warning:** `site/assets/generated/icons/*.png` is made by `scripts/generate-icon-art.mjs` (with `sharp`, for Media Session artwork in Stories). These PNGs are **not a reliable guide**: the `berry` PNG is a single arch, but the source module draws three berries with leaves, so the PNGs look out of date. Trust `icons.mjs`, not the PNGs. Kids Games does not need PNG generation (inline SVG is enough), so do not port `generate-icon-art.mjs` or its test.
- **One idea worth borrowing from the generator:** `buildIconSvg` turns an icon into a standalone SVG. A small script like it, run in Playwright, is the quickest way to make the contact sheets described below. The test file's one real lesson also applies here: stroke colour must be chosen for contrast against the background (Stories hit this with pastel backgrounds and white strokes).
- **Its limits for this job:** it is mostly mythology emblems plus a handful of objects, so there are **no animals, foods or vehicles** to reuse beyond maybe `boat`, `sun`, `cloud` and `berry`. Its aspect (120×82) and stroke weight differ from this project's drawn icons (48 box, stroke 5, round caps; see DESIGN.md "Shapes"). Treat Stories as the *method and style reference*, not a library to copy. Check it is my own work before reusing any path.

Constraints for the new set:
- Drawn as inline SVG path data in the game file, in the Playground style (keyline weight, round caps), recognisable at the smallest card (about 80px wide on a phone).
- Silhouette first. A 5-year-old must tell cat from dog and bus from train at a glance, so every pair of pictures in a theme must be clearly different shapes. Never depend on colour alone.
- Honest scope. Today there are 20 pictures per theme (60 in "random") but a board never needs more than 10 pairs. The session should propose a smaller, well-drawn set (for example 12–15 per theme) rather than 60 mediocre icons, and say what that does to variety.

### What I suspect

- The default 3×4 board with a 1.5s peek is a fair start for a 5-year-old but not tuned.
- The random "hint" may confuse children. It could be removed, or replaced with something that genuinely helps after repeated misses.
- (Emoji are being replaced, so the old worry about newer emoji rendering as empty boxes goes away. Check no emoji remain anywhere in the game.)

### Prompt

```
Game: MEMORY MATCH. Branch review/memory-match.

Phase A, audit only.
1. Read the game. List every mechanic and timing (peek, flip delay, mismatch delay, hint).
2. Read the Stories icon system at D:\GitHub\Stories (site/assets/js/icons.mjs, scripts/generate-icon-art.mjs,
   and look at the PNGs in site/assets/generated/icons). Describe its method and style in a few lines and
   say what fits the Kids Games Playground style (DESIGN.md) and what does not. Then propose the new
   picture set: which themes (animals, food, vehicles, random are the current ones), how many pictures per
   theme and why, and a list of candidate subjects chosen to have clearly different silhouettes.
   Do not draw all of them yet.
3. Play-test with Playwright in the built page: every size, every theme, with and without peek, at 5 and 8
   (use the profile ageBracket). Assert pairs are correct, no card is ever unmatchable, and the game can
   always be finished. Time how long a full game takes at each size.
4. Review the difficulty and the first-play experience for a 5-year-old (4-5 bracket): which size, peek
   length and mismatch delay would suit them, and what an 8-year-old needs to stay interested.
Then STOP. Show findings and recommendations; I decide.

Phase B, after I choose. Candidates to price and propose: age-aware defaults (size, peek time) that the
saved settings still override; a genuinely useful hint after repeated misses; a calm "find all pairs" mode
versus a flip-count challenge; a personal best per size; keyboard play with arrow keys between cards.
Keep rules recognisable.

Drawing the pictures: do it with me in batches of about 6. For each batch render a contact sheet with
Playwright (a screenshot of the pictures at the real card size on a phone, at tablet size, and at 80px,
in Day and Dusk) and show it to me. I will say which to keep, redraw or replace. Check each theme for
pairs that look too alike at small size, and fix them before moving on. Keep the paths as data in one
clearly marked block of the game file (like the word-data markers in Opposites) so pictures can be
added or changed later without touching game logic. Make the card faces accessible: each picture has a
short text name used as its accessible label (replacing the current emoji labels).

Prove each change in the built page and open a PR.
```

### Done when

- No emoji remain in the game, and every picture is drawn in the Playground style and reviewed by you.
- Every pair in a theme is distinguishable at the smallest card size.
- A 5-year-old's first game is sized and paced for them without a settings visit.
- Play tests pass in the built page.

---

## 3. Type Trainer

### What is known

- About two dozen stages in `games/type-trainer/js/stages.js`: home row, neighbours, left and right hand, all letters at three speeds, then word stages (2-letter, CVC, KS1 sight words, 4-letter, digraphs, 5, 6, 7-letter, a mixed marathon). Word lists are inline, with a 4-5 filter and replacements for inappropriate words.
- Bracket overrides (`lives`, font sizes, speed multiplier) per age. Adaptive speed from rolling accuracy in `adaptive.js`. Speed is also chosen by the player (Easy 1.0 / Normal 1.8 / Hard 2.3 / Extra Hard 3.0) and the game over screen suggests a step up or down.
- The on-screen keyboard is a **visual guide only**. On a tablet with no physical keyboard the game cannot be played (the hub marks it "needs a keyboard").
- Finger zones are now four paint colours mirrored across both hands, and eight key patterns tell all eight zones apart.
- Game over stats are adapted per age; the youngest get a star and encouragement, no accuracy.
- No tests exist.

### What I suspect

- A 5-year-old on a physical keyboard is the real use case. Check stage 1 (home row only, eight letters) is gentle enough and that early stages do not punish.
- Some word-stage lists may be too hard for their label, or contain words a 5-year-old would not know.
- Letters fall at a speed set by the profile and speed picker; the adaptive multiplier may fight the player's choice.
- Tablet play is parked (see "Decisions already made").

### Prompt

```
Game: TYPE TRAINER. Branch review/type-trainer.

Phase A, audit only.
1. Read stages.js, adaptive.js, play.js (game loop, scoring, lives, stage progression), keyboard.js.
   Summarise stage progression per age bracket in a table: stage, letters/words, items needed, speed,
   lives. Flag stages that look too hard or too easy for their bracket.
2. Review every word list for age fit, spelling and anything inappropriate for 4-5. Show me suspicious words.
3. Run the game in the built page with Playwright (physical keyboard events), as a perfect typist, a slow
   typist, and a random-key masher, per bracket. Report how far each gets, how lives and speed react,
   and whether a stage can be softlocked, skipped or can never be completed.
4. Check pause, resume, quit, game over, and 'play again' for state leaks (timers, aria-live interval,
   duplicate listeners). Check frame rate on a throttled CPU (6x slowdown) as an old-tablet proxy.
5. Touch: describe exactly what a child on a tablet sees and can do today (it stays keyboard-only for now,
   so only make sure the hub's "needs a keyboard" message and the in-game warning are clear and kind).
   Write up, in a short section at the end of your report, what real tablet support would involve, so I
   can revisit it later. Do not build it.
Then STOP. Show findings and recommendations; I decide.

Phase B, after I choose. Add unit tests for the pure logic (stage selection, adaptive speed, word
filtering) in a tests folder like the other games. Fix whatever the audit found. Prove in the built page.
Open a PR.
```

### Done when

- Every stage of every bracket can be completed; none softlocks.
- Word lists are age-appropriate and reviewed by you.
- Pure logic has tests, and a throttled run holds a usable frame rate.
- Touch play is written up for later and clearly signposted as keyboard-only today.

---

## 4. Number Bonds and Maths (check them, then probably merge)

### What is known

- They share most of their code. They differ in `questions.js`: **Number Bonds** blanks the *left or right* number (`7 + ? = 12`), **Maths** always blanks the *result* (`7 + 5 = ?`). Each has its own `game.js` (identical), `main.js`, CSS (generated from the same markup), and tests: `games/number-bonds/tests/{game,questions}.test.js`, `games/maths/tests/questions.test.js`. Find out how those tests are run (see their `package.json`) and run them first.
- Ranges (from `main.js`): easy 1–10 with tables to 5; medium 1–20, tables to 10; hard 1–100, tables to 12; custom with negatives and decimals (1 d.p.). A complexity label (preschool, KS1, KS2, KS3, challenge) is shown for custom settings.
- Modes: Sprint (60 s), Round (10 questions), Endless. Hints appear after 15 s (easy) or 25 s (medium) outside Sprint. After a wrong answer in Round or Endless the correct answer must be tapped to continue; in Sprint it moves on.
- Divisions are always whole numbers. Four answer choices.
- The redesign defaults new 4-5 profiles to Round (no clock). Saved choices win.
- **A real bug was found here during the redesign:** Maths briefly printed its answer on screen (fixed in PR #12). Treat this pair with suspicion, not trust.

### Why I split them, and what merging has to keep

I split them so a child could choose the style they prefer: "work out the answer" (Maths) versus "find the missing number" (Number Bonds). I don't mind them becoming one screen with a mode switcher, as long as that choice stays obvious and quick for a child who cannot read well (pictures and shapes first, for example big tiles showing `7 + 5 = ?` and `7 + ? = 12`).

Merging touches more than the two game folders. A session doing it must handle:

- **Saved data.** Players already have game data under `numberbonds` and `maths` (settings and personal bests such as `pb_+_easy_sprint`) and progress squares under `number-bonds` and `maths` (see `shared/storage.js`). Migrate or keep reading both, so nobody loses a personal best or their painted squares.
- **URLs.** `docs/number-bonds.html` and `docs/maths.html` exist today and may be bookmarked. Keep the old address working (for example a tiny page that sends the child to the merged game with the right mode selected).
- **The hub.** The hub layout was designed for five games: one big "carry on" marking plus four (`hub.html`, and the portrait and short-landscape variants). Four games needs a deliberate layout, not a hole. The hub also picks its lead tile and records the last game by game id.
- **Paint.** DESIGN.md's "One Paint Rule" gives each game one paint (Number Bonds yellow, Maths red). A merged game needs one paint, or a stated rule for the modes. Ask me.
- **Build.** `build.sh` has a separate build block for each game, and `DESIGN.md`, `README.md` and the hub mention five games.

### What I suspect

- "Number Bonds" in school means pairs that make 10 or 20. The game as built is "find the missing number", which is related but not the same. A true make-10 / make-20 mode could be a third style in the switcher. Ask me before adding it.
- Distractor quality: near-misses and duplicates, negative or absurd distractors at easy level, the answer appearing twice, decimals with floating-point artefacts (0.1 + 0.2).
- Easy range 1–10 is right for a 5-year-old, but what do 6-8 and 9-12 players get by default?

### Prompt

```
Games: NUMBER BONDS and MATHS. Branch review/maths-games.

Phase A, audit only.
1. Run the existing tests and tell me what they do and do not cover.
2. Read both questions.js files and game.js. Write a throwaway script that generates 20,000 questions per
   operation per difficulty (and a spread of custom settings, including negatives and decimals) and checks:
   the maths is correct; the answer is among the choices exactly once; no choice is negative or absurd at
   easy/medium; no duplicate choices; decimals have no floating-point artefacts; division is exact; the
   blank is where the game says; hard questions are actually harder. Report any failures with examples.
3. Check the age fit: what defaults a 5-year-old, an 8-year-old and a 10-year-old get, and whether the
   preset ranges match KS1/KS2 expectations (number bonds to 10 and 20, times tables 2/5/10 in Year 2).
4. Play both in the built page with Playwright in every mode: sprint timing, round completion, endless,
   wrong-answer confirmation flow, hint timers, quit, play again. Confirm the DISPLAYED question is correct
   for every question (the answer must never be printed on screen).
Then STOP. Show findings and recommendations.

Phase B, design before building. I am happy for the two games to become one with a mode switcher.
Recommend whether to merge, and if you recommend it, design it and show me before writing code:
  - the first screen: how a child who cannot read picks a style (and how the switcher looks);
  - the shared settings screen (operation, how tricky, how long) and which settings are per mode;
  - what the hub looks like with four games instead of five, at tablet landscape, portrait, phone, and
    short landscape;
  - the name, the paint, and the icon marking for the merged game;
  - migration of saved settings, personal bests and progress squares from both old games;
  - how the old URLs keep working;
  - the build and test changes.
Also ask me about a true make-10 / make-20 mode, number-key shortcuts (1-4) for keyboard play, and whether
easy should be split into 'to 10' and 'to 20'.
After I approve: build it, keep each mode's mechanics exactly as they are today, extend the tests
(including a test that guards the displayed question format for every mode), prove it in the built page
(at least 5,000 displayed questions per mode, every operation, checked for correctness), update DESIGN.md,
README.md and the hub, and open a PR.
```

### Done when

- 20,000-question audits pass and are kept as tests.
- The built-page play test confirms the question shown is correct in every mode.
- Age defaults are justified.
- If merged: nobody loses saved data, old links still work, the hub looks intentional with four games, and picking a style is easy for a child who cannot read.

---

## 5. Cross-game wrap-up (optional, last)

```
All five games have been reviewed. Run a final pass:
- Rebuild; run every game's tests and validation scripts (including `node tools/validate-opposites.mjs`, `node tools/build_opposites_data.mjs --check` and `games/opposites/tests/play-test.mjs`).
- Re-run the all-pages sweep (console errors, outbound requests, overflow, touch targets, fonts) at five
  viewport shapes, Day and Dusk, ages 5 and 8.
- Check progress squares record for each game and appear on the hub.
- Update DESIGN.md or PRODUCT.md only where behaviour changed, and tell me exactly what you changed.
- Give me a short list of anything still open, in priority order.
```

---

## Still open (ask in the relevant session)

- **Opposites:** a human read of the word list; a level-3 set for 9 and over; whether audio is ever worth it (see Decisions).
- **Number Bonds / Maths:** merge or not (recommendation needed), the merged game's paint and icon, and whether to add a make-10 / make-20 style.
- **Memory Match:** which themes and how many pictures per theme.
- **Parked for later:** tablet and touch play for Type Trainer.
