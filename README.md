# Kids Games

Fun, free, ad-free educational games for kids — built for my twins (age 5) and nieces (age 8).

**[Play now](https://robertbeverton.github.io/kids-games/)** (works in any modern browser, no install needed)

## Games

### Type Trainer
Letters and words fall from the sky — type them before they land! Four age brackets (4-5, 6-8, 9-12, Adult) with adaptive difficulty, on-screen keyboard, and per-player profiles.

### Opposites
Find the opposite word! Choose from multiple choice or type your answer. 40 word pairs with sound effects and streak tracking.

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
