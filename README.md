# Lakshyam 🏡

A financial-literacy **life-sim** for Class 11–12 students. Live ages 17–32 on one illustrated
Cheriyal-style scroll: fill four clay pots, spend three action points a year, face event cards,
dodge phone scams, reach crossroads, and hear your ending as a folk tale. Then rewind one choice
in a **Parallel Life** and run **100 lives** to see what was luck and what was you.

Mobile-first (360 px), works offline after the first visit, saves to `localStorage`. English,
हिन्दी and తెలుగు; Telangana or North region pack — both switch live.

## Run

Node.js 22.12+ (or 24 LTS).

```bash
npm ci
npm run dev            # Vite dev server
npm test               # engine tests + card validator
npm run validate:cards # card rules only (fails on a dominant option)
npm run build          # static site in dist/
npm run test:e2e       # Playwright at 360×740 (needs Chromium, see below)
```

Browser tests: `npx playwright install chromium` once, or point at an existing Chromium with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome`.

Deploy as a static Vite site (`dist/`). On Vercel, `api/mentor.js` becomes the mentor's server
function; set `ANTHROPIC_API_KEY` there (see `.env.example`). Without it — or offline — Ammamma
answers from `src/data/mentor.json`.

## How a year plays

1. **Income coin** drops into the year's panel.
2. **Four clay pots** — Needs / Wants / Savings / Goal. Drag coins (5% each) or use sliders. Asked
   only when the life stage or income source changes; otherwise the plan auto-splits. EMIs due
   this year come off the top first.
3. **3 action points** (ages 17–25): bank account, learn (Gyaan lessons), FD, RD, chitti auction,
   gold, SIP in the fictional *Banyan 50* index, health insurance, loan, repay. Tools unlock by
   age: bank 18 · FD/RD/chitti 20 · SIP 22 (after the risk lesson) · insurance 23.
4. **1–2 event cards.** Every option shows its effect on money and at least one other meter before
   the tap; `?` means something may follow later. Loans always show the EMI small and
   **TOTAL YOU WILL PAY** large in red, with "₹2 per ₹100 per month = 24% a year".
5. **Phone inbox** buzzes mid-year: swipe left to flag 🚩, right to reply. Tenali Rama hints.
   Correct flags give Gyaan and a real fact (1930, cybercrime.gov.in, RBI Sachet).
6. **Year-end stamp** with "Why?" for the mentor.

Ages 26–32 fast-forward: the plan runs itself and only events and crossroads stop you.

Risky choices plant a 🌱 on that year's panel; when the consequence fires, a thread is drawn from
the seed to the panel. Crossroads at 19, 24, 27 and 30. At 21, the dream **Instant Loan Pvt Ltd —
Day 1** makes you the lender; your most-picked offer becomes your next real loan offer.

The ending: storyteller, tale title, Life Review (Luck vs Your Choices, Threads), Parallel Life
(same seed, one choice changed, synced scrolls, divergence in yellow), 100 Lives (same 100 seeds
for both strategies), a two-line letter to your 17-year-old self, a mock teacher summary, and the
tales collection. No money leaderboard.

## Design rules (kept by code and tests)

- Engine = pure functions over one state object (`src/engine/`). Luck is a hash of
  (seed, age, tag), so a parallel life meets the same luck.
- All text lives in JSON with `en`/`hi`/`te`: `src/data/*.json`.
- `scripts/validate-cards.js` fails if a card has a dominant option, misses a meter preview or a
  translation.
- No spin-wheels, loot boxes or tickers; companies and the index are fictional; wrong paths give a
  small gain now, a hidden seed, a bigger loss later, and always a recovery option.
- Every number is a teaching assumption (book icon in the HUD); projections are ranges with
  Sheikh Chilli's pot 🏺 — "not a promise".

## Files

| Path | What |
|---|---|
| `src/engine/engine.js` | state, year flow, money, loans, chitti, role-flip, endings |
| `src/engine/simulate.js` | replay, strategy from command log, parallel life, 100 lives |
| `src/engine/rng.js`, `finance.js`, `data.js` | seeded luck, EMI maths, data loading |
| `src/data/` | cards, messages, crossroads, endings, lessons, mentor, regions, strings, finance assumptions |
| `src/ui/` | HUD + wheel + house, scroll panels & threads, pots, actions, chitti, events, crossroads, role-flip, phone, mentor, panels, ending |
| `api/mentor.js` | Vercel server function (game state only → Claude) |
| `public/sw.js` | offline cache |
| `scripts/` | card validator and shared balance rules |
| `tests/life.spec.js` | Playwright checks at 360 px |

## Team workflow

Use the assigned cloud branch or a personal `<name>/<task>` branch. Do not push to `main`.
Team rules are in [CLAUDE.md](CLAUDE.md).
