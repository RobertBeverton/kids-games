---
name: Kids Games
description: A school playground as an interface. Games are painted markings on tarmac, one paint per game, and nothing moves unless the child did something.
colors:
  tarmac-day: "#E4E8EE"
  tarmac-day-worn: "#D3D9E2"
  chalk: "#FBFBF7"
  ink: "#141922"
  ink-soft: "#3A4452"
  tarmac-dusk: "#1B2028"
  tarmac-dusk-worn: "#252B35"
  chalk-dusk-panel: "#2D3440"
  chalk-dusk-ink: "#F3F4EE"
  paint-yellow: "#FFC61A"
  paint-orange-day: "#FF8A2B"
  paint-orange-dusk: "#FF9B45"
  paint-red-day: "#C8242F"
  paint-red-dusk: "#FF6B70"
  paint-blue-day: "#2456D8"
  paint-blue-dusk: "#6E9BFF"
  paint-green-day: "#0E7C4A"
  paint-green-dusk: "#3FD28A"
  on-paint-light: "#FFFFFF"
  on-paint-dusk: "#10141B"
  right-wash-day: "#CDEBDB"
  wrong-wash-day: "#F6D3D5"
typography:
  display:
    fontFamily: "Andika, Atkinson Hyperlegible, Segoe UI, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1.05
  title:
    fontFamily: "Andika, Atkinson Hyperlegible, Segoe UI, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
  lead:
    fontFamily: "Andika, Atkinson Hyperlegible, Segoe UI, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Andika, Atkinson Hyperlegible, Segoe UI, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.4
  question:
    fontFamily: "Andika, Atkinson Hyperlegible, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 9vmin, 5rem)"
    fontWeight: 700
    lineHeight: 1.1
  key-label:
    fontFamily: "Andika, Atkinson Hyperlegible, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(0.75rem, 1.7vh, 1rem)"
    fontWeight: 700
    lineHeight: 1
  label:
    fontFamily: "Andika, Atkinson Hyperlegible, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.2
rounded:
  thumb: "3px"
  key: "8px"
  blank: "0.2em"
  square: "6px"
  tile: "12px"
  panel: "22px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.paint-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    height: "56px"
    padding: "0 24px"
  button-ghost:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    height: "56px"
    padding: "0 24px"
  answer-tile:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    height: "88px"
  hud-chip:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "48px"
---

# Design System: Kids Games

## Overview

**Creative North Star: "The Playground"**

The product is a school playground, not an app. The ground is tarmac. Each game is a coloured court with white line markings painted on it: hopscotch squares for Number Bonds, a quartered circle for Maths, opposing arrows for Opposites, a grid of painted rings for Memory Match, a keycap for Type Trainer. Every painted shape has a keyline, like a marked-out court. Nothing is raised, glowing or glossy: depth comes from layering flat paint and from outline weight.

The system is calm in structure, loud in colour and quiet in motion. Colour and shape are bold and saturated so a five-year-old can find their game by looking. Layout is simple and consistent so they can find it by feel. Nothing moves until the child has done something, and then one thing moves once.

It flexes by age rather than splitting into two products. Younger players (4–5) get bigger targets (72px), larger body text, pictures before words, and no clock by default. Older players (6+) get 56px targets, short labels, descriptions, counts and best scores. The shell sets this through `data-age` on the root.

**Key Characteristics:**
- Flat matte tarmac ground in two moods: Day (cool pale pavement) and Dusk (near-black slate). Never cream.
- Five playground paints, one owned by each game, plus chalk white.
- Every painted shape carries a 3px keyline. State is never carried by colour alone.
- Drawn SVG icons, one stroke weight. No emoji anywhere: Memory Match card pictures are drawn too (see Shapes).
- Self-hosted Andika, built for early readers. No third-party requests.
- Progress is cumulative hopscotch squares and never resets or shames.

## Colors

A restrained neutral ground, five committed paints, and two functional washes. Paints are held as two sets: a deep set for Day (white or ink text per paint) and a bright set for Dusk (ink text on every paint).

### Primary
- **Playground Yellow** (#FFC61A): Number Bonds, the default primary action, selected-by-current-player highlight. Ink text only (11.2:1).

### Secondary
- **Court Red** (#C8242F day / #FF6B70 dusk): Maths, and the wrong-answer cue. White text on the Day red (5.6:1), ink on the Dusk red.
- **Line Blue** (#2456D8 day / #6E9BFF dusk): Opposites, focus ring in Day. White text on Day blue (6.2:1), ink on Dusk blue.
- **Pitch Green** (#0E7C4A day / #3FD28A dusk): Memory Match, and the right-answer cue. White text on Day green (5.3:1), ink on Dusk green.
- **Cone Orange** (#FF8A2B day / #FF9B45 dusk): Type Trainer. Ink text (7.5:1).

### Neutral
- **Tarmac** (#E4E8EE day / #1B2028 dusk): the page ground. Worn tarmac (#D3D9E2 / #252B35) is for inset wells and hover.
- **Chalk** (#FBFBF7 day / #2D3440 dusk): raised panels, sheets, answer tiles.
- **Ink** (#141922 / #F3F4EE): text and keylines. Soft ink (#3A4452 / #B7BFCB) for secondary text, 8:1 or better.
- **Right wash / Wrong wash** (#CDEBDB / #F6D3D5 day, deep tints at dusk): the fill behind a right or wrong answer, always with a tick or cross shape.

### Named Rules
**The One Paint Rule.** A screen belongs to one game, so it uses that game's paint as its accent and nothing else coloured. Right and wrong are the only other colours allowed, and they always arrive with a shape.
**The Keyline Rule.** Any filled shape that matters has a 3px line in `--line` (ink at Day, chalk at Dusk). Yellow on pale grey is 1.3:1, so the line is what makes the shape findable.
**The No Cream Rule.** No warm off-white page grounds. The ground is cool tarmac.

## Typography

**Display, Body and Label Font:** Andika (SIL Open Font License, with Atkinson Hyperlegible and system fallbacks), self-hosted and inlined as WOFF2 in every build. About 16KB per weight.

**Character:** Andika was designed for children learning to read: single-storey `a` and `g`, distinct `b d p q`, open apertures. It is plain on purpose. The personality of the system lives in the painted marks, not in the lettering.

### Hierarchy
- **Display** (700, 3.5rem, 1.05): game titles, result headlines. 2.5rem on phones.
- **Title** (700, 2.25rem, 1.1): sheet titles, the hub greeting, question words.
- **Lead** (700, 1.5rem, 1.2): button labels, tile names.
- **Body** (400, 1.25rem, 1.4): sentences. 1.5rem for young players.
- **Label** (700, 1rem): chips, field labels. 16px is the floor anywhere a child must read.
- **Numeral** (700, clamp(4rem, 14vmin, 8rem)): sums, scores. Tabular numerals.
- **Question** (700, clamp(2.5rem, 9vmin, 5rem)): long sums and long words, which would overflow at Numeral size.
- **Key label** (700, clamp(0.75rem, 1.7vh, 1rem)): letters on the on-screen keyboard.

### Named Rules
**The Sixteen Rule.** Nothing a child reads is below 16px. Meta text for grown-ups only is allowed to be quiet, not small. One honest exception: the letters on the on-screen keyboard shrink with their keys (12–16px) because it is a reference diagram of fourteen keys across, and the falling letters the child actually reads are large.
**The Painted Figure Rule.** Big numbers and words are set like painted figures: heavy, tight, unadorned. No gradient text, ever.

## Layout

The page is a ground plan. The hub is one dominant marking (carry on where you were) plus four others, in a 2×2 beside it on landscape and below it on portrait. Games move through three fixed stations in the same order: settings, play, result. Each has one dominant region and one primary action in thumb reach.

Spacing runs on a 4px base (4, 8, 12, 16, 24, 32, 48, 64). Hit sizes are 56px for older players and 72px for young ones; answer tiles are at least 88px. The shell bar is 72px tall and fixed. Settings screens put the one big action in a sticky dock at the bottom. Memory Match sizes its board in CSS from the space left, turns it on its side on wide screens, and always fits.

### Named Rules
**The One Dominant Region Rule.** Every screen has one thing that is plainly the point. If two regions compete, one is too big.
**The Thumb Zone Rule.** Answers and the primary action sit in the lower half.

## Elevation & Depth

Flat by default and flat in every state. There are no shadows, glows, blurs or gradients. Depth is conveyed by layering paint (a coloured court on tarmac, chalk on top of both) and by keyline weight. A pressed control scales to 0.97 and fills with yellow. A raised panel is chalk with a keyline.

### Named Rules
**The Flat Paint Rule.** If it would not exist as a coat of paint, it does not exist. No drop shadows, no glow, no gradient.

## Shapes

Painted squares stay nearly square (6px). Tiles and buttons round gently (12px). Panels and game tiles round more (22px). Chips, avatars and track ends are pills. Line ends are round. Drawn icons use one 5-in-48 stroke with round caps and joins; markings use 6-in-96. The eight player shapes (circle, square, triangle, diamond, star, plus, heart, hexagon) are filled paint with a keyline. Memory Match card pictures are line drawings in the style of the Stories icons: a bold main shape (5 in 96) with thinner detail lines (3) and small filled dots, in the keyline colour on a chalk card. They are data in the game file, chosen so every pair of pictures has a clearly different silhouette, with no themes.

## Components

### Buttons
- **Shape:** 12px radius, 3px keyline, 56px minimum height (72px young), icon plus label.
- **Primary:** the game's paint with its on-paint text colour. Yellow if no game owns the screen.
- **Ghost:** chalk with ink text and the same keyline.
- **Press:** scales to 0.97 in 120ms. No colour sweep.
- **Focus:** a 4px ring (blue at Day, yellow at Dusk) offset 3px.

### Answer tiles
Chalk, 22px radius, 88px or more tall, large type. Right gets a green wash, 5px green keyline and a tick in the corner. Wrong gets a red wash, 5px red keyline and a cross. A revealed right answer after a miss is the same wash with a dashed keyline. The tick and cross are masks, so they never depend on the child seeing the colour.

### Hopscotch progress (signature)
Ten keylined squares; one is painted per finished game. In a round, one is painted per question. Round counts and laps (×2) only ever go up.

### HUD chips
Pill, keyline, chalk, icon plus a tabular number. The score chip takes the game's paint.

### Segmented options
The settings control for operation, difficulty, length, picture theme, theme and motion. Selected is inverted (ink fill, ground text) so it reads without colour.

### Sheets and the grown-ups gate
Chalk sheet, keyline, 22px radius, on an ink scrim. Grown-ups settings sit behind a press-and-hold (1.1s, pointer or Enter key) so a tap does nothing. It holds players (edit, delete with confirm), theme, movement, sound, a games guide and the feedback link.

### Player shapes
Eight painted shapes replace initials, so a child who cannot read can find themselves.

## Motion and Sound

**One curve, three durations.** `cubic-bezier(0.22, 1, 0.36, 1)` at 120ms (press), 240ms (state change) and 420ms (a painted line landing). Nothing runs on its own. The signature motion is paint rolling across a marking.

**Reduced motion** (device setting or the grown-ups Calm switch) sets all three durations to 0.01ms. State changes still show; confetti is skipped; nothing is removed.

**Sound** is one shared engine in the shell: soft sine and triangle tones, a quiet master level, no sudden loud sounds, wrong answers low and short. One mute control in the bar, persisted, and every game obeys it. There is no music.

## Voice

Short, warm, plain. Controls name their action ("Play", "Play again", "All games"). Right: "Amazing!", "You got it!". Wrong: "Not quite!", "So close!" — never a verdict on the child. Errors name the problem and the way out ("That name is taken. Try another."). Pre-readers are served by pictures, shapes and sound first; text is the second channel.

## Do's and Don'ts

### Do:
- **Do** give each screen one paint and one dominant region.
- **Do** pair every colour state with a shape (tick, cross, dashed line, inverted fill).
- **Do** keep the 3px keyline on any filled shape that matters.
- **Do** size touch targets to 56px (72px young) and answer tiles to 88px or more.
- **Do** keep every game's three stations in the same order and place.
- **Do** read the age bracket from the profile and flex size and text density with it.

### Don't:
- **Don't** use emoji for controls, status or icons.
- **Don't** add gradients, glows, blur, drop shadows, bounce easing or gradient text.
- **Don't** let anything animate at rest, loop, or pulse for attention.
- **Don't** use cream or beige grounds, or a second accent colour on a screen.
- **Don't** add streak-loss, daily-return or loot mechanics, and don't make a clock the default for young players (Sprint's 60 seconds stays an opt-in choice). Progress only goes up.
- **Don't** put a link a child can follow off the product anywhere outside the grown-ups sheet.
- **Don't** load fonts, scripts or images from another host.
