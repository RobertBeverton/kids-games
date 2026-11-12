---
version: 1
slug: "hub-html"
primary_target: "hub.html"
related_targets: ["shared/shell.html","shared/tokens.css","games/type-trainer/index.html","games/opposites/index.html","games/number-bonds/index.html","games/maths/index.html","games/memory-match/index.html"]
---

# Surface brief: Kids Games (hub, shell, five games)

Mode: Experience (games) / hub is a launcher. Audience: ages 5-8 on a shared tablet, parent nearby. Constraints: PRODUCT.md. No mascot (user decision). No read-aloud (user decision). GitHub feedback link only behind the grown-ups gate. Game content (e.g. Opposites word lists) is out of scope for the UI work.

## Direction contract

THESIS: The product is a school playground, not an app. Games are painted markings on tarmac; nothing moves unless the child acted. Refuses the category default: a grid of identical rounded white cards on a cream ground, emoji icons, floating blobs.

OWN-WORLD: Flat matte tarmac ground (Day cool light grey, Dusk near-black slate), never cream. Thermoplastic playground paint: five flat paint colours, one owned by each game, plus chalk white. Thick round-capped painted lines, hopscotch squares, painted arrows and numerals, drawn SVG only. No gradients, no glows, no gradient text, no shadows except a hard flat paint-offset. Type: Andika (self-hosted, single-storey a and g, unambiguous b/d/p/q) for everything read; drawn SVG numerals for big painted figures.

STORY: A child sees their own painted shape, one big marking to continue, four others, and taps. Parents find profiles, sound, theme, motion and feedback behind a press-and-hold grown-ups gate. Progress is cumulative painted squares per player; it never resets or shames.

FIRST VIEWPORT: Tablet landscape: slim tarmac bar (home, player shape, sound, grown-ups) then one dominant painted marking, the continue game, filling 2x2 grid cells at left, four smaller markings in a 2x2 at right, each with its name and a strip of ten hopscotch squares. Phone: dominant marking on top, 2x2 below, no scroll. The primary action is tapping the dominant marking.

FORM: Playground markings (candidate 5 of 7 grounded list), assigned by the roll. seed:65580f3872cd7c46. Raises: one dominant region per screen (zoo map); one easing and a paint-settle motion (papercut); exactly one active step marked at a time (orizuru); fixed settings, play, result stations (darkroom).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
