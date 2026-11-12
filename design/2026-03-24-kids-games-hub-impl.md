# Kids Games Hub - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the type-trainer repo into a multi-game kids hub with a landing page and the opposites game as the second game.

**Architecture:** Move type-trainer source into `games/type-trainer/`, add opposites game under `games/opposites/`, create a landing page at `hub.html`, and rewrite `build.sh` to deploy all three to `docs/`.

**Tech Stack:** Vanilla HTML5/CSS3/JS, bash build script, GitHub Pages from `docs/`

---

### Task 1: Copy Opposites Game Into Repo

**Files:**
- Create: `games/opposites/index.html`

**Step 1: Create directory and copy file**

Run:
```bash
mkdir -p games/opposites
cp "C:/Users/bever/Downloads/opposites-game.html" games/opposites/index.html
```

**Step 2: Verify the file is in place**

Run: `head -5 games/opposites/index.html`
Expected: `<!DOCTYPE html>` and the start of the opposites game HTML.

**Step 3: Stage the new file**

Run: `git add games/opposites/index.html`

**Step 4: Commit**

```bash
git commit -m "add: opposites game source into games/opposites/"
```

---

### Task 2: Move Type Trainer Source Into games/type-trainer/

**Files:**
- Move: `css/` → `games/type-trainer/css/`
- Move: `js/` → `games/type-trainer/js/`
- Move: `index.html` → `games/type-trainer/index.html`

**Step 1: Create the target directory**

Run: `mkdir -p games/type-trainer`

**Step 2: Move source files using git mv**

Run:
```bash
git mv css games/type-trainer/css
git mv js games/type-trainer/js
git mv index.html games/type-trainer/index.html
```

**Step 3: Verify structure**

Run: `ls games/type-trainer/`
Expected: `css  index.html  js`

Run: `ls games/type-trainer/js/`
Expected: `adaptive.js  audio.js  keyboard.js  main.js  play.js  stages.js  storage.js  utils.js`

**Step 4: Verify dev entry point still has correct relative paths**

The dev `index.html` references `css/style.css` and `js/main.js` — these are relative and still correct within `games/type-trainer/`. No edits needed.

**Step 5: Commit**

```bash
git commit -m "restructure: move type-trainer source into games/type-trainer/"
```

---

### Task 3: Add "Back to Games" Nav to Type Trainer

**Files:**
- Modify: `games/type-trainer/index.html`
- Modify: `games/type-trainer/css/style.css`

**Step 1: Add back link as first element in the HUD bar**

In `games/type-trainer/index.html`, find:
```html
    <div id="hud" class="hud" aria-label="Game status">
      <div class="hud-item">Score:
```

Replace with:
```html
    <div id="hud" class="hud" aria-label="Game status">
      <a href="index.html" class="hud-btn hud-home-link" aria-label="Back to all games" title="All Games">
        <span class="hud-btn__icon">🏠</span>
        <span class="hud-btn__label">Games</span>
      </a>
      <div class="hud-item">Score:
```

Note: The `href="index.html"` is a relative path. In the built version deployed to `docs/`, this will be updated to `index.html` which points to the landing page since both files sit in `docs/`. During dev, this will point to the type-trainer's own index.html (not ideal, but dev mode isn't the primary use case — the built version is).

**Step 2: Add CSS for the home link**

In `games/type-trainer/css/style.css`, find the existing `.hud-btn` styles. Add after the `.hud-btn` block:

```css
/* Back-to-hub link in HUD */
.hud-home-link {
  text-decoration: none;
  color: inherit;
  margin-right: auto;  /* push all other HUD items to the right */
}
```

**Step 3: Verify by opening in browser**

Run: Open `games/type-trainer/index.html` in a browser. The "Games" link should appear as the leftmost HUD element.

**Step 4: Commit**

```bash
git add games/type-trainer/index.html games/type-trainer/css/style.css
git commit -m "feat: add 'Back to Games' nav link to type trainer HUD"
```

---

### Task 4: Add "Back to Games" Nav to Opposites Game

**Files:**
- Modify: `games/opposites/index.html`

**Step 1: Add floating back link and its styles**

In `games/opposites/index.html`, find:
```html
<div class="container">
  <div class="header">
```

Replace with:
```html
<a href="index.html" class="back-link" aria-label="Back to all games">🏠 Games</a>

<div class="container">
  <div class="header">
```

**Step 2: Add CSS for the back link**

In the `<style>` block of `games/opposites/index.html`, add before the closing `</style>`:

```css
  .back-link {
    position: fixed;
    top: 16px;
    left: 16px;
    z-index: 50;
    background: var(--card);
    border-radius: 14px;
    padding: 8px 16px;
    font-family: 'Nunito', sans-serif;
    font-weight: 800;
    font-size: 0.95rem;
    color: var(--text);
    text-decoration: none;
    box-shadow: var(--shadow);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .back-link:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
```

**Step 3: Verify by opening in browser**

Open `games/opposites/index.html`. The "Games" link should float in the top-left corner without overlapping the game content.

**Step 4: Commit**

```bash
git add games/opposites/index.html
git commit -m "feat: add 'Back to Games' nav link to opposites game"
```

---

### Task 5: Create Landing Page

**Files:**
- Create: `hub.html`

**Step 1: Write the landing page**

Create `hub.html` at the repo root with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kids Games</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎮</text></svg>">
<meta property="og:title" content="Kids Games">
<meta property="og:description" content="Fun, free, ad-free educational games for kids">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #FFF8E7;
    --card: #FFFFFF;
    --primary: #FF6B6B;
    --secondary: #4ECDC4;
    --accent: #FFE66D;
    --purple: #A78BFA;
    --text: #2D3436;
    --text-light: #636E72;
    --shadow: 0 8px 30px rgba(0,0,0,0.08);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.12);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Nunito', sans-serif;
    background: var(--bg);
    min-height: 100vh;
    overflow-x: hidden;
    position: relative;
  }

  /* Floating background shapes */
  body::before, body::after {
    content: '';
    position: fixed;
    border-radius: 50%;
    z-index: 0;
    opacity: 0.15;
    animation: floaty 8s ease-in-out infinite;
  }
  body::before {
    width: 300px; height: 300px;
    background: var(--primary);
    top: -80px; right: -80px;
  }
  body::after {
    width: 250px; height: 250px;
    background: var(--secondary);
    bottom: -60px; left: -60px;
    animation-delay: -4s;
  }

  @keyframes floaty {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(15px, 20px) scale(1.05); }
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
    position: relative;
    z-index: 1;
  }

  .header {
    text-align: center;
    margin-bottom: 40px;
  }

  .header h1 {
    font-weight: 900;
    font-size: 3rem;
    background: linear-gradient(135deg, var(--primary), var(--purple), var(--secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 1px;
    line-height: 1.1;
    margin-bottom: 8px;
  }

  .header p {
    font-size: 1.1rem;
    color: var(--text-light);
    font-weight: 600;
  }

  .games-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
  }

  .game-card {
    background: var(--card);
    border-radius: 24px;
    padding: 32px 24px;
    box-shadow: var(--shadow);
    text-align: center;
    text-decoration: none;
    color: var(--text);
    position: relative;
    overflow: hidden;
    transition: transform 0.25s, box-shadow 0.25s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .game-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 5px;
  }

  .game-card:hover {
    transform: translateY(-6px);
    box-shadow: var(--shadow-lg);
  }

  .game-card:active {
    transform: translateY(-2px) scale(0.98);
  }

  .game-card.type-trainer::before {
    background: linear-gradient(90deg, var(--primary), var(--accent), var(--secondary));
  }

  .game-card.opposites::before {
    background: linear-gradient(90deg, var(--purple), var(--primary), var(--accent));
  }

  .game-icon {
    font-size: 3.5rem;
    margin-bottom: 12px;
    display: block;
  }

  .game-title {
    font-weight: 900;
    font-size: 1.5rem;
    margin-bottom: 6px;
  }

  .game-desc {
    font-size: 0.95rem;
    color: var(--text-light);
    font-weight: 600;
    margin-bottom: 16px;
    line-height: 1.4;
  }

  .game-badge {
    display: inline-block;
    background: var(--bg);
    border-radius: 10px;
    padding: 4px 14px;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-light);
    margin-bottom: 6px;
  }

  .device-badge {
    display: inline-block;
    border-radius: 10px;
    padding: 4px 14px;
    font-size: 0.75rem;
    font-weight: 700;
    margin-bottom: 16px;
  }

  .device-badge.any-device {
    background: #D1FAE5;
    color: #065F46;
  }

  .device-badge.keyboard-required {
    background: #FEF3C7;
    color: #92400E;
  }

  /* On touch-only devices, dim keyboard-required games and reorder grid */
  .touch-device .game-card.needs-keyboard {
    opacity: 0.55;
    order: 1;
  }
  .touch-device .game-card.needs-keyboard:hover {
    opacity: 0.8;
  }
  .touch-device .game-card:not(.needs-keyboard) {
    order: 0;
  }

  .play-btn {
    display: inline-block;
    background: linear-gradient(135deg, var(--purple), #60A5FA);
    color: #fff;
    border-radius: 14px;
    padding: 12px 32px;
    font-family: 'Nunito', sans-serif;
    font-weight: 800;
    font-size: 1.05rem;
    transition: box-shadow 0.2s;
  }

  .game-card:hover .play-btn {
    box-shadow: 0 4px 15px rgba(167,139,250,0.3);
  }

  .footer {
    text-align: center;
    margin-top: 48px;
    font-size: 0.85rem;
    color: var(--text-light);
    font-weight: 600;
  }

  @media (max-width: 500px) {
    .header h1 { font-size: 2.2rem; }
    .games-grid { gap: 16px; }
    .game-card { padding: 24px 18px; }
  }
</style>
</head>
<body>

<div class="container">
  <div class="header">
    <h1>Kids Games</h1>
    <p>Fun, free, ad-free educational games</p>
  </div>

  <div class="games-grid">
    <a href="type-trainer.html" class="game-card type-trainer needs-keyboard">
      <span class="game-icon">⌨️</span>
      <div class="game-title">Type Trainer</div>
      <div class="game-desc">Letters and words fall from the sky — type them before they land!</div>
      <div class="game-badge">Ages 4–12+</div>
      <div class="device-badge keyboard-required">⌨️ Needs a keyboard</div>
      <span class="play-btn">Play</span>
    </a>

    <a href="opposites.html" class="game-card opposites">
      <span class="game-icon">🔄</span>
      <div class="game-title">Opposites</div>
      <div class="game-desc">Find the opposite word — choose or type your answer!</div>
      <div class="game-badge">Ages 4–8</div>
      <div class="device-badge any-device">📱 Works on any device</div>
      <span class="play-btn">Play</span>
    </a>
  </div>

  <div class="footer">
    Made with ❤️ by Robert Beverton
  </div>
</div>

<script>
  // Detect touch-only devices and add class to body for CSS-driven reordering.
  // Games still remain clickable (user might have a bluetooth keyboard), just dimmed.
  if ('ontouchstart' in window && !matchMedia('(pointer: fine)').matches) {
    document.body.classList.add('touch-device');
  }
</script>

</body>
</html>
```

**Step 2: Open in browser to verify layout**

Open `hub.html` in a browser. Should show two game cards in a responsive grid with the warm playful style.

**Step 3: Commit**

```bash
git add hub.html
git commit -m "feat: add landing page for kids games hub"
```

---

### Task 6: Rewrite build.sh

**Files:**
- Modify: `build.sh`

**Step 1: Replace build.sh with multi-game version**

The new script keeps the same type-trainer inline build logic but updates paths, adds opposites copy, and adds landing page copy. Replace the entire contents of `build.sh`:

```bash
#!/bin/bash
# build.sh — Builds all games into docs/ for GitHub Pages deployment.
#
# Usage: bash build.sh
# Output: docs/index.html (hub), docs/type-trainer.html, docs/opposites.html

set -euo pipefail

GAME_DIR="games/type-trainer"
DOCS_DIR="docs"

# JS files in dependency order (relative to GAME_DIR)
JS_FILES=(
  "js/utils.js"
  "js/audio.js"
  "js/storage.js"
  "js/stages.js"
  "js/adaptive.js"
  "js/keyboard.js"
  "js/play.js"
  "js/main.js"
)

echo "=== Kids Games Build ==="
echo ""

# --- Preflight checks ---
if [ ! -f "hub.html" ]; then
  echo "Error: hub.html not found. Run this script from the project root." >&2
  exit 1
fi

if [ ! -f "$GAME_DIR/index.html" ]; then
  echo "Error: $GAME_DIR/index.html not found." >&2
  exit 1
fi

if [ ! -f "$GAME_DIR/css/style.css" ]; then
  echo "Error: $GAME_DIR/css/style.css not found." >&2
  exit 1
fi

for f in "${JS_FILES[@]}"; do
  if [ ! -f "$GAME_DIR/$f" ]; then
    echo "Error: $GAME_DIR/$f not found." >&2
    exit 1
  fi
done

if [ ! -f "games/opposites/index.html" ]; then
  echo "Error: games/opposites/index.html not found." >&2
  exit 1
fi

echo "All source files found."
echo ""

# --- Create docs directory ---
mkdir -p "$DOCS_DIR"

# ==========================================================================
# BUILD 1: Type Trainer (inline CSS + JS into single HTML)
# ==========================================================================
echo "--- Building Type Trainer ---"

JS_TEMP=$(mktemp)
trap "rm -f '$JS_TEMP'" EXIT

for f in "${JS_FILES[@]}"; do
  echo "  Inlining $GAME_DIR/$f"
  echo "// --- $(basename "$f") ---" >> "$JS_TEMP"

  awk '
    /^import / || /^import\{/ {
      if ($0 ~ /;/) { next }
      while ((getline line) > 0) {
        if (line ~ /;/) break
      }
      next
    }
    /^export\s*\{\s*\}\s*;?\s*$/ { next }
    /^export default / {
      sub(/^export default /, "")
      print
      next
    }
    /^export / {
      sub(/^export /, "")
      print
      next
    }
    { print }
  ' "$GAME_DIR/$f" >> "$JS_TEMP"

  echo "" >> "$JS_TEMP"
done

echo ""
echo "Fixing import aliases..."

sed -i.bak \
  -e 's/startPlayGame(/startGame(/g' \
  "$JS_TEMP" && rm -f "$JS_TEMP.bak"

if grep -v '^\s*//' "$JS_TEMP" | grep -q 'startPlayGame('; then
  echo "  [WARN] 'startPlayGame(' call site still present after replacement"
else
  echo "  [ok] startPlayGame -> startGame"
fi

CSS_FILE="$GAME_DIR/css/style.css"

echo ""
echo "Assembling type-trainer HTML..."

awk -v css_file="$CSS_FILE" -v js_file="$JS_TEMP" '
  /<link[^>]*style\.css[^>]*>/ {
    print "  <style>"
    while ((getline line < css_file) > 0) {
      print line
    }
    close(css_file)
    print "  </style>"
    next
  }
  /<script[^>]*type="module"[^>]*src=.*main\.js/ || /<script[^>]*src=.*main\.js[^>]*type="module"/ {
    print "  <script>"
    while ((getline line < js_file) > 0) {
      print line
    }
    close(js_file)
    print "  </script>"
    next
  }
  { print }
' "$GAME_DIR/index.html" > "$DOCS_DIR/type-trainer.html"

# --- Sanity checks ---
TT_OUTPUT="$DOCS_DIR/type-trainer.html"
echo ""

if [ ! -f "$TT_OUTPUT" ]; then
  echo "Error: Type Trainer build failed — output file not created." >&2
  exit 1
fi

TT_SIZE=$(wc -c < "$TT_OUTPUT" | tr -d ' ')
echo "Type Trainer built: $TT_OUTPUT ($TT_SIZE bytes)"

CHECKS_PASSED=0
CHECKS_TOTAL=4

if grep -q '<style>' "$TT_OUTPUT"; then
  echo "  [ok] CSS inlined"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "  [FAIL] CSS not inlined"
fi

if grep -q '// --- audio.js ---' "$TT_OUTPUT"; then
  echo "  [ok] JS inlined"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "  [FAIL] JS not inlined"
fi

IMPORT_COUNT=$(grep -c '^import ' "$TT_OUTPUT" 2>/dev/null || true)
if [ "$IMPORT_COUNT" = "0" ] || [ -z "$IMPORT_COUNT" ]; then
  echo "  [ok] No residual import statements"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "  [WARN] Found $IMPORT_COUNT residual 'import' statement(s)"
  grep -n '^import ' "$TT_OUTPUT" | head -5
fi

EXPORT_COUNT=$(grep -c '^export ' "$TT_OUTPUT" 2>/dev/null || true)
if [ "$EXPORT_COUNT" = "0" ] || [ -z "$EXPORT_COUNT" ]; then
  echo "  [ok] No residual export statements"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo "  [WARN] Found $EXPORT_COUNT residual 'export' statement(s)"
  grep -n '^export ' "$TT_OUTPUT" | head -5
fi

echo "Sanity checks: $CHECKS_PASSED/$CHECKS_TOTAL passed"

if grep -q 'href="css/style.css"' "$TT_OUTPUT"; then
  echo "  [WARN] Original <link> to style.css still present"
fi
if grep -q 'type="module"' "$TT_OUTPUT"; then
  echo "  [WARN] Original <script type=\"module\"> still present"
fi

# ==========================================================================
# BUILD 2: Opposites Game (simple copy)
# ==========================================================================
echo ""
echo "--- Building Opposites Game ---"
cp games/opposites/index.html "$DOCS_DIR/opposites.html"
OPP_SIZE=$(wc -c < "$DOCS_DIR/opposites.html" | tr -d ' ')
echo "Opposites copied: $DOCS_DIR/opposites.html ($OPP_SIZE bytes)"

# ==========================================================================
# BUILD 3: Landing Page (simple copy)
# ==========================================================================
echo ""
echo "--- Building Landing Page ---"
cp hub.html "$DOCS_DIR/index.html"
HUB_SIZE=$(wc -c < "$DOCS_DIR/index.html" | tr -d ' ')
echo "Landing page copied: $DOCS_DIR/index.html ($HUB_SIZE bytes)"

# ==========================================================================
# Summary
# ==========================================================================
echo ""
echo "=== Build Complete ==="
echo "  $DOCS_DIR/index.html          — Landing page"
echo "  $DOCS_DIR/type-trainer.html   — Type Trainer"
echo "  $DOCS_DIR/opposites.html      — Opposites Game"
echo ""
echo "Test by opening docs/index.html in a browser."
```

**Step 2: Verify it's executable**

Run: `chmod +x build.sh`

**Step 3: Commit**

```bash
git add build.sh
git commit -m "build: rewrite build.sh for multi-game hub output"
```

---

### Task 7: Test the Build

**Step 1: Run the build**

Run: `bash build.sh`

Expected output: All sanity checks pass, three files produced in `docs/`.

**Step 2: Verify output files exist**

Run: `ls -la docs/*.html`

Expected:
- `docs/index.html` (landing page, small file)
- `docs/type-trainer.html` (type trainer, ~200KB)
- `docs/opposites.html` (opposites game, small file)

**Step 3: Verify landing page links**

Open `docs/index.html` in a browser. Click "Type Trainer" card → should open `docs/type-trainer.html`. Click browser back, then click "Opposites" card → should open `docs/opposites.html`.

**Step 4: Verify back navigation**

From each game, click the "Games" back link → should return to the landing page.

**Step 5: Verify type trainer functionality**

Play a few rounds in `docs/type-trainer.html` to confirm the inline build works correctly (canvas renders, sounds play, scoring works).

**Step 6: Commit the built files**

```bash
git add docs/index.html docs/type-trainer.html docs/opposites.html
git commit -m "build: regenerate docs/ with hub landing page and both games"
```

---

### Task 8: Clean Up Old Files

**Files:**
- Remove: `docs/AI_AGENT_WORKFLOW.md` (orphaned doc, publicly served via Pages)
- Remove: `dist/` directory (no longer used, was gitignored)
- Modify: `.gitignore` (remove `dist/` entry)

**Step 1: Remove orphaned docs and dist/**

Run:
```bash
rm -f docs/AI_AGENT_WORKFLOW.md
rm -rf dist/
```

**Step 2: Update .gitignore**

In `.gitignore`, remove the build output section entirely:
```
# Build output
dist/
```

(The `dist/` line is no longer needed since we write directly to `docs/`.)

**Step 3: Commit**

```bash
git add .gitignore
git rm --cached docs/AI_AGENT_WORKFLOW.md 2>/dev/null || true
git commit -m "chore: remove orphaned docs and unused dist/ references"
```

---

### Task 9: Update README

**Files:**
- Modify: `README.md`

**Step 1: Replace README content**

```markdown
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

### Adding a new game

1. Create `games/<name>/index.html`
2. Add a build/copy step to `build.sh`
3. Add a game card to `hub.html`
4. Run `bash build.sh` and test

## Author

Created by **Robert Beverton**.
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for multi-game kids hub"
```

---

### Task 10: Push and Rename Repo

**Step 1: Push all changes**

Run: `git push origin master`

**Step 2: Rename repo on GitHub (manual)**

Go to https://github.com/RobertBeverton/type-trainer/settings → Repository name → change to `kids-games` → click Rename.

**Step 3: Update local git remote**

Run: `git remote set-url origin https://github.com/RobertBeverton/kids-games.git`

**Step 4: Verify remote**

Run: `git remote -v`
Expected: `origin  https://github.com/RobertBeverton/kids-games.git (fetch)` and `(push)`

**Step 5: Verify GitHub Pages**

Open `https://robertbeverton.github.io/kids-games/` — should show the landing page with both game cards working.
