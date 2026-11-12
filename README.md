# Kids Games

Fun, free, ad-free educational games for kids — built for my twins (age 5) and nieces (age 8).

**[Play now](https://robertbeverton.github.io/kids-games/)** (works in any modern browser, no install needed)

## Games

### Type Trainer
Letters and words fall from the sky — type them before they land! Four age brackets (4-5, 6-8, 9-12, Adult) with adaptive difficulty, on-screen keyboard, and per-player profiles.

### Opposites
Find the opposite word! Choose from multiple choice or type your answer. A hand-curated list of about 330 words in UK English: simple pairs for age 5, story words for ages 6 to 7. Every sensible answer counts (happy: sad, unhappy, upset...), common misspellings and word forms (smaller, pulled, went) are accepted when typed, and words a child missed come back in later games.

The word list lives in `tools/opposites-words.txt`, with `tools/opposites-misspellings.txt` and `tools/opposites-forms.txt` for the extra typed answers. After editing them:

```
node tools/validate-opposites.mjs              # structure, distractors, bias checks
python tools/check_opposites_wordnet.py        # dictionary check (needs nltk)
node tools/build_opposites_data.mjs            # embeds the list in games/opposites/index.html
bash build.sh                                  # fails if the list is invalid or not embedded
```

`games/opposites/tests/play-test.mjs` plays the built page in a real browser and checks that nothing wrong is accepted and nothing right is rejected (see its header for how to run it).

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
# Produces docs/index.html (hub), docs/type-trainer.html, docs/opposites.html
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
