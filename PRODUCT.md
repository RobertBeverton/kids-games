# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Young children aged roughly 4-8 (the author's twins aged 5 and nieces aged 8), playing at home with a parent nearby. Parents choose and set up games; kids play on a tablet or laptop, by touch or keyboard. Many of the youngest are pre-readers.

## Product Purpose

A hub of small, free educational games: typing (Type Trainer), word opposites, maths (work out the answer, or find the missing number) and memory match. Built so the author's family has good, safe games to play. Success is kids choosing to play and learning along the way, with no friction for the parent.

## Positioning

Free, ad-free and tracking-free, and made personally for specific kids. Games adapt difficulty to age or skill and keep per-player profiles locally. Commercial kids' apps cannot truthfully claim any of this.

## Operating Context

Hosted on GitHub Pages (`docs/`), built from `games/<name>/index.html` and `hub.html` by `build.sh`. A release zip can be produced with `build.sh --release`. Games share `shared/` (tokens.css, shell.css/js/html, storage.js). Plans and design notes live in `design/` and `docs/plans/`.

## Capabilities and Constraints

- Vanilla HTML/CSS/JS with no dependencies and no framework; self-contained single-file games.
- Touch and keyboard input must both work.
- Pre-readers must be able to use the hub and games with minimal reading.
- Web Audio API for synthesised sound effects; Canvas 2D in Type Trainer.
- Live games: Type Trainer, Opposites, Maths (two styles: work it out, find the missing number), Memory Match, Sentence Blocks (build sentences from colour-coded blocks, for a picture or for fun; ages 4 to 8).
- Not confirmed as hard constraints: offline play and local-only storage (both are current behaviour, but the user did not mark them binding).

## Brand Commitments

Product name "Kids Games". Author credit: Robert Beverton. Hub greeting is "Pick a game!". No other voice or identity rules confirmed.

## Evidence on Hand

Five working games and a shared design system (`shared/tokens.css`). No testimonials, analytics or usage data exist; do not fabricate any.

## Product Principles

- Safe by default: no ads, tracking, accounts or outbound distractions.
- Usable by a 5-year-old alone: big targets, little text, instant feedback.
- Adapt to the child, not the other way round: difficulty and profiles per player.
- Each game stays self-contained and dependency-free so it can be downloaded and played anywhere.
- Parents stay in control of setup; kids own the play.

## Accessibility & Inclusion

Pre-reader friendliness and touch support are required. No formal standard (e.g. WCAG level) was specified.
