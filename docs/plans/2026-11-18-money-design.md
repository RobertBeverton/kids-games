# Money: Design

**Date:** 2026-11-18
**Status:** Draft for Rob's review. Persona-voted; nothing built.
**Related:** `2026-11-18-money-plan-review.md` (adversarial review), `2026-11-18-money.md` (implementation plan).

## 1. Why

Rob's twins (5y9m) do not feel the difference between a £1 bag of sweets and a £3,000 motorbike: "it's just numbers without reference". Bitesize-style resources teach coins and change. Nothing teaches **scale**: what things cost, roughly, and how far apart they are. That is the gap. Coins and change come second.

**What success looks like** (no analytics exist, so this is for Rob to watch, not to measure): the twins stop treating all big numbers as the same, and say things like "that's a lot of sweets" unprompted. In the game, the miss rate on far-apart pairs should fall over a few weeks; the saved per-item miss counts will show it.

## 2. Round 1: personas brainstorm

Nine personas, each asked "what must this game do, and what would you hate?". This is the author's own brainstorm, not an independent review.

| Persona | Wants | Fears |
|---|---|---|
| **P1 Twin, 5y9m.** Reads simple words, strong story listener, cannot read £3,000 | Pictures, big targets, to feel clever; a reveal that shows the gap without reading it | Numbers it cannot read; a long list of text; getting stuck after a wrong answer |
| **P2 Niece, 8.** Numerate, bored by baby stuff | Something with real numbers and a bit of challenge; to be able to skip the easy stuff | Being locked out of anything; questions that are obviously guessable |
| **P3 Rob (parent, author).** Reviews every list, wants control | Editable data file, a validator that stops bad items, the kids' weak spots to come back | Hand-checking prices forever; stock art; scope that never ends |
| **P4 Parent on a tight budget.** Cares how money is framed | Neutral wording; nothing that says dear = good or cheap = bad | "You can't afford it" shaming; luxury as aspiration; a child leaving upset because they asked for the £20,000 car |
| **P5 Primary teacher.** Knows the National Curriculum | Estimation and comparing amounts (Y1 to Y3), coins and change | A game that only teaches big-number reading; prices that are plainly wrong |
| **P6 Illustrator.** Own-drawn line art only | A small, buildable set of drawings, each recognisable at 56px | 40 near-identical drawings; "is that a bike or a motorbike?" |
| **P7 Engineer.** Bundler joins files into one scope | Pure engine under `node --test`, no new build machinery, no per-square DOM | A sixth hub tile that breaks the grid; a play-test that only checks layout |
| **P8 Accessibility.** Pre-readers, colour-blind, touch | No colour-only feedback, no drag-only input, targets 48px+ | Right answer revealed only by colour; tiny price text |
| **P9 The adversary** | (used in the review doc) | |

Ideas that came out: a **Money Wall** reveal (every square is £1, so a £3,000 motorbike is a wall and a bag of sweets is one square); sorting by price; a budget game; "how many £1 coins buy this?"; a log-scale price ruler (P5); a shop simulator (rejected); coins and change (deferred); pocket-money saving ("how many weeks?", parked).

## 3. Approaches

| | Approach | Verdict |
|---|---|---|
| A | **One game, "Money", five activities** chosen on the first screen by picture tiles, like Maths | **Chosen.** One hub tile, one paint, one save, one content list shared by all four activities |
| B | Four small games, one per activity | Rejected: four hub tiles, four saves, content list duplicated |
| C | A shop simulator: browse a shop, fill a basket, pay | Rejected for v1: open-ended, hard to steer, a lot of art, and nothing forces the scale lesson |

## 4. The design

### 4.1 Five activities

All use the same item list. A round is 10 questions (one hub square per finished round). No timers and no "rich", "poor" or "afford" wording (P4). **Only What's the price? has points** (Rob asked for them; see 4.1b).

| Activity | The question | Prices shown before answering? | Answer by |
|---|---|---|---|
| **Which costs more?** | Two pictures | **No** (it is a guess; that is the point) | Tap one |
| **Cheapest to dearest** | 3 / 4 / 5 pictures by level | **No** | Tap them in order, cheapest first; a wrong tap nudges and can be retried |
| **Can you buy it?** | A budget shown as a wallet picture and the amount in big numerals, and 3 to 5 items with price tags | **Yes** (a budget skill) | Tap every item the budget covers, then Done |
| **How many £1 coins?** | One picture, three counts 10 times apart (whole-pound items of £3 or more only) | **No** | Tap a count. Needs numbers into the thousands, so it is never an age default |
| **What's the price?** (Rob's "Price is Right" idea) | One picture and six price tiles | **No** (the six tiles are the guess) | Tap a tile. Points for being close |

After every answer, a **reveal** (see 4.2). A wrong answer in Which costs more, Cheapest to dearest and How many shows the right answer and the child taps it before moving on (the same rule as Maths).

### 4.1b What's the price?

Rob's idea: see an object, guess its price, get more points the closer you are, from six tiles without making it obvious which is right. Fits the data already collected (a typical price and a plausible range per item), so it costs one engine function and one screen, not a new content list.

- **Six tiles**, rising, the typical price rounded to **two significant figures** and five others on a geometric ladder around it, all rounded the same way so the right one is not the roundest number. Step 3x (easy), 2x (medium), 1.5x (hard), wider for items with a wide range (a sofa).
- **Points per question:** 3 anywhere inside the item's plausible range, 2 within 1.5x outside it, 1 within 2.5x, else 0. At most 3 of the 6 tiles earn full marks and at least one earns 0 or 1. A round is at most 30; the player's **best total per level** is remembered.
- **Reveal:** every tile shows its points; two walls, the child's tile and the real price, side by side.
- **Who it is for:** numbers up to six or seven digits, so it is for readers (about 7 and over); never an age default. The twins can try, but Which costs more? is theirs.
- **It reverses my "no scores" rule, for this activity only.** That rule came from Sentence Blocks and is not a standing decision; Rob asked for points here. Points only ever compare a child with their own earlier best, never with another child.

### 4.2 The reveal: the Money Wall

A grid of small gold squares, each one **£1**, drawn for each item at the same scale. The dearer item's wall is the first that fits (at most 3,000 squares): if the dearer item costs more than that, every square becomes £10, then £100 (always shown: "each square = £100"). The cheaper item is shown at the same scale, rounded to whole squares; **if it is worth less than half a square, it is drawn as a tiny dot, never as a full square** (a £1 bag of sweets beside a £50,000 tractor is a dot beside a wall, because at £100 a square it is 0.01 of one). A £1 bag of sweets beside a £3,000 motorbike is one square beside a wall. No reading is needed to see it (P1, P8). The price tag ("about £3,000") appears under each wall for those who can read.

The wall is **CSS only** (a gradient pattern, no node per square): P7.

### 4.3 Difficulty

One row, **Easy / Medium / Hard**, meaning how far apart things are:

| Level | Items used | Gap in Which costs more / Cheapest to dearest | Can you buy it? budgets | How many? |
|---|---|---|---|---|
| Easy | The 33 items a 5-year-old knows | At least 20x apart | £5, £10 | Items £3 to £600 |
| Medium | All 39 | At least 5x apart | £20, £50, £100, £200 | Items to £6,000 |
| Hard | All 39 | At least 2x apart | £200, £500, £1,000, £5,000 | All items (wall unit changes) |

A new player starts at the level for their age and on the activity for their age (Easy and Which costs more up to age 6; Medium and Cheapest to dearest at 7 to 8; Hard and Can you buy it at 9 and over). **Nothing is locked**; the choice is remembered per player (Help-ladder precedent, P2).

### 4.4 Fairness rules (what the engine must guarantee)

These come from feasibility runs on the draft item list (section 6). Each is a unit-tested rule, with a 20,000-round audit like Maths.

1. **Bands never overlap.** Every item has a typical price and a plausible range (`lo` to `hi`). A "which costs more" pair is only offered when the cheaper item's `hi` is below the dearer item's `lo`. This is what makes the answer defensible when a shop charges differently. A budget question is only offered for an item that is clearly inside (`hi` within budget) or clearly outside (`lo` above budget, by a margin that depends on level).
2. **Size is not the answer.** In the draft list, the dearer item is also the physically bigger one in 61 percent of easy pairs, and 72 percent of easy sort sets can be put in order just by size. So the sampler has quotas: at least 40 percent of pairs, and at least 50 percent of sort sets, must **not** be solvable by "pick the bigger thing". (Phone vs teddy, console vs paddling pool.)
3. **Position is not the answer.** The dearer item is on the left half the time. In How many, the correct count is the smallest, middle or largest about one third each.
4. **No repeats** inside a round; items the child missed in a recent round come back (at most 3 per round).
5. **Prices are integers in pence**, shown UK style: 50p, £1, £1.50, £3,000. "About" in front of every revealed price (P4, P5): prices are typical, not exact.

### 4.5 Content rules

- Own-drawn SVG line art, the Memory Match / Sentence Blocks stroke style. No stock images. Each drawing is reviewed by Rob in batches.
- No brands, no alcohol, tobacco, gambling or weapons, no wealth-signalling beyond what children meet (car, house, holiday).
- Each item carries a short name (shown under the picture, for the 8-year-old and to tell bike from motorbike); no read-aloud (standing decision).
- Prices carry an `asOf` date (2026-11). The list is a plain data file with a validator, so Rob can correct or add items.
- v1 draws no coins or notes: a budget is a wallet and a number. When coins and change arrive (v1.1) they will be plain value tokens with no portrait, never copies of real currency.

### 4.6 Saved data

Per player, via `saveGameData('money', …)`: chosen activity and level, and a map of per-item **miss counts** and last-seen round, which feeds the "comes back" rule and is the base for a later "what they find tricky" view for grown-ups (not in v1). One hub square per finished round via `recordSession('money')`.

### 4.7 Hub

**A new paint.** Yellow looked free, but `DESIGN.md` makes it the system's own paint (default primary action, the selected-player highlight), owned by no game. All five other paints are taken, so Money needs a **sixth game paint**. Recommendation: a magenta-pink (about #B3267A on Day, #FF8AC8 on Dusk, both checked for 4.5:1 text contrast in the plan), which is far from every game paint on the hue wheel and, because paint is never the only cue, still readable for a colour-blind child by the game's name and mark. The wall's squares stay gold (`--paint-yellow`, ink keyline) as decoration. **Decided 2026-11-18: Rob chose this pink** from a swatch sheet (teal, copper and lime were the other candidates). The hub grid is hard-wired to one lead plus four others (`--others: 4`, `calc(var(--others)/2)`), so a sixth tile needs a layout change, not just a link. That is a task of its own.

## 5. Round 2: persona votes on the open build questions

Votes by P1 to P8 (P9 is the adversary and does not vote). A dash is an abstention. Settled by majority, as Rob asked for build questions.

| # | Question | Result | Why |
|---|---|---|---|
| 1 | Hide the prices until the child has answered in Which costs more? | **Hide** (6 to 0) | P1, P8: cannot read them anyway. P5: estimating is the skill. P3: otherwise it is number comparison. P2 moved from "show" once she saw the reveal |
| 2 | Reveal device: wall, price ruler, or tags only | **Wall** (5 to 1) | P5 wanted the ruler (number-line link). Parked for v1.1 once the twins can read bigger numbers |
| 3 | Lock harder activities by age | **No lock, age sets the default** (6 to 1) | P2, P1 (never be stuck). P5 would lock; outvoted |
| 4 | Coins and change in v1 | **No, v1.1 with its own design** (4 to 2) | P5, P2 want it. P3, P6, P7, P1 want v1 small. v1 shows a budget as a wallet and a number, so no coin or note art is needed yet |
| 5 | Cheapest to dearest: tap in order, or drag | **Tap in order** (5 to 1) | P8, P1, P7. P2 wanted drag |
| 6 | Can you buy it?: tap every affordable item, pick one, or yes/no | **Tap every affordable item** (5 to 1) | Yes/no is a coin flip; pick-one collapses to "cheapest". P1 wanted pick-one |
| 7 | Show the item's name under its picture | **Yes** (6 to 0) | Tells bike from motorbike; vocabulary |
| 8 | "About £X" and price ranges, not exact prices | **Yes** (7 to 0) | P4: families and shops differ. P3: fewer arguments about the list |
| 9 | Missed items come back | **Yes, at most 3 per round** (7 to 0) | Opposites precedent |
| 10 | Unit for How many | **£1 coins**, not "a £1 bag of sweets" (5 to 1) | Exact, no argument about sweet prices; the sweets still appear as the cheapest item |
| 11 | Add Rob's "Price is Right" idea as a fifth activity in v1 | **Yes** (7 to 1) | P2 (a real challenge), P1 (colourful tiles), P3, P5 (estimation), P6, P7 (one function, one screen), P8. P4 uneasy about a score; accepted because it is a personal best only |
| 12 | Points for What's the price? | **Per question 0 to 3, total out of 30, best per level** (6 to 1) | P4 wanted stars with no total |

## 6. Draft item list (my estimates, **unverified**: Rob checks every price)

Pence-level precision is not claimed. `size` is the physical size as drawn: 1 small, 2 medium, 3 large. `tier 1` means a 5-year-old knows it.

| Band | Items (typical price, tier). Prices web-checked 2026-11-18, generally, not exactly |
|---|---|
| Pocket money | sweets £1, chocolate bar £1.20, ice lolly £1.50, ice cream £3, comic £4, book £7, balloon £1, beach ball £4, cardboard box £1, bus ticket £2 *(none of these were found online; my estimates)* |
| Treats | pizza £14 (Domino's medium £12 on deal, more at full price), football £10 *(estimate)*, teddy £12 *(estimate)*, paddling pool £30 (£22 to £59), Christmas tree £60 (£40 to £120), Lego set £35, trainers £35 (£20 to £70), scooter £70 (£63 to £90), tent £120 (4-person £90 to £200, inflatable £350), T-shirt £8, kite £8 |
| Hundreds | bike £180 (budget 16-inch £90 to £150, good ones £275 to £450), tablet £150 (kids' Fire £70 to £150), trampoline £200 (10ft £115 to £230, branded £350+), games console £500 (PS5 £570), phone £600 (new budget models about £500+, flagships £1,300), TV £350 (43-inch £240 to £430), sofa £800 (basic £150 to £600, mid-range £600 to £1,500); tier 2: laptop £600, camera £400, drone £300, smartwatch £200, fridge £500 |
| Thousands and up | holiday £3,000 (family of four £2,400 to £3,900), motorbike £3,500 (125cc £1,100 to £5,800), car £17,000 (used average about £17,100; new small cars £19,000 to £27,000; one drawing: new and used cars look the same at 56px, so there is one "car" with a wide range), tractor £50,000 (compact £7,000 to £30,000, bigger ones far more), house £275,000 (HM Land Registry average about £273,000); tier 2: caravan £15,000 |

The full table with ranges is in `games/money/js/items.js` (plan Task 2). Sources for the checks are in the build log once the build starts: UK HPI, Autotrader, dealer listings for motorbikes, tractors, tents and scooters, NimbleFins for holidays, and 2026 retailer listings for the rest.

(The apple at 50p was dropped: nothing in the wall can show half a pound, and it is the only item under £1.)

**Ship in two art batches.** A run on a 27-item subset (the "core": sweets, ice lolly, ice cream, comic, balloon, beach ball, cardboard box, pizza, football, teddy, paddling pool, Christmas tree, trainers, scooter, tent, bike, tablet, trampoline, console, phone, TV, sofa, holiday, motorbike, car, tractor, house; 27 items) still gives 188 easy pairs, 44 percent of them with a dearer item that is not bigger, and every core item appears in such pairs. So v1 ships with the **27 core drawings**; the other 12 (chocolate bar, bus ticket, book, T-shirt, kite, Lego set, laptop, camera, drone, smartwatch, fridge, caravan) are a second, optional batch.

Feasibility run (scratch script, the earlier 40-item list with two cars; the 27-item core above was re-run separately): easy 293 pairs (115 where the dearer item is not bigger), medium 589, hard 645; 1,355 easy 3-item sort sets; "Can you buy it?" has at least one clearly affordable and two clearly too-dear items at every budget **except £2** (only one affordable item, so it is dropped) and the **£10,000 and £20,000** budgets (almost everything is affordable, so the answer is always "nearly everything"; dropped). Both changes are in the table in 4.3.

## 7. Out of scope for v1

Coins and change; a price ruler; a shop simulator; saving up ("how many weeks of pocket money?"); a grown-ups "what they find tricky" view; read-aloud; timers, scores, leaderboards; decimals beyond pence; pounds-and-pence arithmetic. The save already records what a later "tricky" view needs.

## 8. Questions for Rob: answered 2026-11-18

1. **Prices:** a general web check, not exact. Done (section 6). Rob still reviews the table at plan Task 2.
2. **Pocket money:** inconsistent, and Rob has no sense of what is reasonable with inflation. Suggested: **£5 a week if they do all their jobs**. The Can you buy it? budgets of £5 and £10 (easy) are already "a week" and "two weeks". *Parked idea:* "How many weeks of jobs?" (a house is 55,000 weeks, about 1,000 years) as a later activity.
3. **Paint:** Rob picks from a swatch sheet (provided with this update).
4. **Item list:** looks fine to Rob. Approved as in plan Task 2 Step 3.
5. **New idea added:** What's the price? (4.1b).
