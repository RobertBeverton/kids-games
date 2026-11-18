# Kids Games

Fun, free, ad-free educational games for kids — built for my twins (age 5) and nieces (age 8).

**[Play now](https://robertbeverton.github.io/kids-games/)** (works in any modern browser, no install needed)

## Games

### Type Trainer
Letters and words fall from the sky — type them before they land! Four age brackets (4-5, 6-8, 9-12, Adult) with adaptive difficulty, on-screen keyboard, and per-player profiles.

### Maths
Two styles in one game, chosen on the first screen by two big tiles that show the question: **Work it out** (`7 + 5 = ?`) and **Find the missing number** (`7 + ? = 12`). Add, take away, times, divide or a mix; Easy (sums to 20, the 2, 5 and 10 times tables), Medium (to 100, tables 2 to 10), Hard (numbers to 100, tables to 12) or Custom; a 60-second Sprint, a Round of 10 or Endless. A new player starts at the level for their age (Easy and a Round up to age 7); the choice is then remembered per player. After a wrong answer in a Round or Endless the right answer is shown and has to be tapped. The wrong answers on the buttons are neighbouring facts (off by one, the next row of the table), never impossible numbers, and the right one is not easier to spot by its position, size or odd/even.

Number Bonds used to be a separate game; it is now the "Find the missing number" style. Saved settings, personal bests and progress squares were carried over, and the old `number-bonds.html` address redirects to it.

Tests (`games/maths/tests`, run by `bash build.sh`; or `cd games/maths/tests && node --test ./*.test.js`): unit tests, a seeded 20,000-question audit of every style, operation and level, session tests on a fake clock, the saved-data migration, and a guard on the exact format of the printed question. `play-test.mjs` plays the built page in a real browser and checks every displayed question (see its header for how to run it).

### Opposites
Find the opposite word! Choose from multiple choice or type your answer. A hand-curated list of about 330 words in UK English: simple pairs for age 5, story words for ages 6 to 7. Three difficulties (Easy, Medium, Hard), starting from the player's age and remembered per player. Choose mode offers the simplest opposite; every sensible answer counts when typed (happy: sad, unhappy, upset...), common misspellings and word forms (smaller, pulled, went) are accepted when typed, and words a child missed come back in later games.

The word list lives in `tools/opposites-words.txt`, with `tools/opposites-misspellings.txt` and `tools/opposites-forms.txt` for the extra typed answers. After editing them:

```
node tools/validate-opposites.mjs              # structure, distractors, bias checks
python tools/check_opposites_wordnet.py        # dictionary check (needs nltk)
node tools/build_opposites_data.mjs            # embeds the list in games/opposites/index.html
bash build.sh                                  # fails if the list is invalid or not embedded
```

`games/opposites/tests/play-test.mjs` plays the built page in a real browser and checks that nothing wrong is accepted and nothing right is rejected (see its header for how to run it).

### Money
A game about how much things cost, for children who are starting to meet money. Every question shows drawings of everyday things (sweets, a bike, a car, a house), and every answer is followed by a "Money Wall": a wall of squares where each square is a £1 coin (or £10 or £100 for the big prices), so a child can see how much more a car is than a comic. There are five activities, chosen on the first screen by large picture tiles:

- **Which costs more?** Two things; tap the one that costs more.
- **Put in order** Three to five things; tap them from the one that costs least to the one that costs most.
- **Can you buy it?** A wallet with some money in it and a few things with prices; tap everything you can buy.
- **How many £1 coins?** About how many £1 coins is this thing? Pick from three counts.
- **What's the price?** Guess the price by tapping one of a row of price tags; the closer the guess the more points.

Easy, Medium and Hard are about how far apart the answers are (a bike against a sweet, or two things that cost nearly the same). A round is ten questions. There are no timers and no leaderboards. Points appear only in What's the price? (0 to 3 a question, a total out of 30 and a best total per level); the other four activities show none. After a wrong answer the right one is shown and has to be tapped. Choices, misses and bests are remembered per player, on this device only. A finished round paints one square on the hub tile.

Prices are typical UK prices, checked on the web and rounded: estimates, not quotes. The page says "about" before every price and shows the as-of date ("Typical UK prices, checked Nov 2026.").

A new player starts at the level and activity for their age (Easy and Which costs more up to age 6; Medium and Put in order at 7 and 8; Hard and Can you buy it from 9); nothing is locked.

Everything the game can ask about lives in `games/money/js/items.js`, as plain data a grown-up can read and edit. Each item has an `id`, a `name`, `pence` (a typical price in whole pence), `lo` and `hi` (the range you would plausibly pay), `size` (how big it is in real life: 1 small, 2 medium, 3 large; the game makes sure the dearer thing is not always the bigger one), `tier` (1 = a five-year-old knows it, 2 = older children) and an optional `group` (items in one group are never asked about together because they look or cost too alike). `AS_OF` is the month the prices were checked: change it when you re-check them. Every item needs a drawing in `games/money/js/pictures.js`; the item tests fail if the data is invalid (a price under £1, a range that does not contain the price, a duplicate, an item with no drawing). After editing, run the tests and `bash build.sh`.

Tests (`games/money/tests`, run by `bash build.sh`; or `cd games/money/tests && node --test ./*.test.js`): the item data, the question and wall engines, the saved data and the drawings. `play-test.mjs` plays the built page in a real browser, every activity and level, and checks the hub tile (see its header for how to run it).

## Tech

- Vanilla HTML5 / CSS3 / JavaScript — no dependencies, no framework
- Canvas 2D for the typing game loop
- Web Audio API for synthesised sounds
- Self-contained single-file games — download and play offline
- GitHub Pages deployment

## Development

```bash
git clone https://github.com/RobertBeverton/kids-games.git
cd kids-games
```

Games live under `games/<name>/`. Open any game's `index.html` in a browser for development.

### Build for deployment

```bash
bash build.sh
# Produces docs/index.html (hub), docs/type-trainer.html, docs/opposites.html, docs/maths.html, docs/memory-match.html, docs/sentence-blocks.html, docs/money.html
# (docs/number-bonds.html is only a redirect to Maths)
```

### Create a downloadable release package

```bash
bash build.sh --release
# Creates release/kids-games-YYYYMMDD.zip
```

### Adding a new game

1. Create `games/<name>/index.html`
2. Add a build/copy step to `build.sh`
3. Add a game card to `hub.html`
4. Run `bash build.sh` and test

## Author

Created by **Robert Beverton**.
