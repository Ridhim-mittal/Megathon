# Lakshyam engine

A pure JavaScript life engine (no React, no DOM). It runs one life from age 11 to 36, one year per
turn, following `docs/GAME_SPEC.md`. Every number is in [`assumptions.js`](assumptions.js) and is
illustrative.

```js
import { createLife, step, replay, select, checkBudget, quoteLoan, ASSUMPTIONS } from "./engine/index.js";

let life = createLife({ storylineId: "village", goalId: "house", seed: 1234, playerName: "Sravani" });
life = step(life, { type: "ADVANCE" });   // pure: returns a new state, never changes `life`
select.hud(life);                         // { age, cash, savings, debt, netWorth, meters, dream, … }
```

- **Pure and serializable.** A state is plain JSON: save it to `localStorage` and load it back as
  it is. `step(state, action)` returns a new state and never mutates the old one.
- **Errors don't throw.** An invalid action returns the *same* state with
  `error: { type, message }` (English). The next valid action clears it. Read it with
  `select.error(state)`.
- **Seeded.** The same `seed` (number or string, e.g. `"demo"`) and the same actions always give
  the same life. Market returns and inflation are drawn from the seed only, so a Parallel Life meets
  the same luck.
- **The UI never computes money.** Everything shown comes from a selector.
- **Content:** `index.js` binds the engine to `src/content/index.js`. Until that file exists,
  Vite (see `vite.config.js`) uses `src/engine/__fixtures__/content.js` instead and warns once.
  For tests or tools, `createEngine(content)` returns the same API bound to any content.

## Phases

```
intro → budget → shop → card ⇄ outcome → [minigame] → yearEnd → (next year: budget …) → ending
```

`state.phase` says which screen to show. `minigame` appears once (Sahukar's chair, at a seeded age
17–22) after that year's cards. After the year-end of age 36, `ADVANCE` goes to `ending`.

## Actions

| Action | Phase | Example |
|---|---|---|
| `ADVANCE` | any but `card` and `ending` | `step(s, { type: "ADVANCE" })` — intro → first year; budget → keep the suggested split; shop → cards; outcome → next card; minigame → skip it; yearEnd → next year or the ending |
| `SET_BUDGET { jars, investIn? }` | `budget` | `step(s, { type: "SET_BUDGET", jars: { needs: 60, wants: 80, emergency: 20, goal: 40 } })` — sets the monthly split and moves to the shop |
| `BUY_WANT { itemId }` | `shop` | `step(s, { type: "BUY_WANT", itemId: "want.cricket_bat" })` — paid from the wants jar only |
| `SKIP_SHOP` | `shop` | `step(s, { type: "SKIP_SHOP" })` |
| `CHOOSE { choiceId }` | `card` | `step(s, { type: "CHOOSE", choiceId: "save" })` — applies effects, moves to `outcome` |
| `USE_GLASSES` | `card` | `step(s, { type: "USE_GLASSES" })` — spends a charge, reveals every clarity phrase on the card |
| `OPEN_DOCUMENT { docId }` | `card` | `step(s, { type: "OPEN_DOCUMENT", docId: "doc.plot_sale" })` — +1 gyaan the first time |
| `FLAG_LINE { docId, lineId }` | `card` | `step(s, { type: "FLAG_LINE", docId: "doc.plot_sale", lineId: "l2" })` — toggles a flag on a line |
| `VERIFY_DOCUMENT { docId }` | `card` | `step(s, { type: "VERIFY_DOCUMENT", docId: "doc.plot_sale" })` — pays `verify.cost`, reveals every line |
| `MINIGAME_RESULT { id, score, lesson? }` | `minigame` | `step(s, { type: "MINIGAME_RESULT", id: "sahukar", score: 4200 })` — +3 gyaan, L14 at least `seen` (or pass `lesson: "applied"`), then year end |
| `ASKED_MENTOR` | any | `step(s, { type: "ASKED_MENTOR" })` — +1 gyaan (with the glossary, at most 3 a year) |
| `USED_GLOSSARY { termId }` | any | `step(s, { type: "USED_GLOSSARY", termId: "emi" })` — +1 gyaan (shared yearly cap) |

### Budget rules

`select.budgetRules(s)` in the `budget` phase:

```js
{ monthlyIncome: 9300,   // take-home to split: gross minus EMIs and premiums (per month)
  grossMonthly: 11000, autoPaidMonthly: 1700,
  step: 100,             // every jar must be a multiple of this
  minNeeds: 5500,        // needs must be at least this
  needsFloor: 5500, squeezed: false,   // squeezed: EMIs left less than the needs floor
  jarsUnlocked: ["needs", "wants", "emergency", "goal"],   // + "invest" once L17 is seen
  required: true,        // stage start, income change or new jar: show the budget screen
  suggested: { needs: 5600, wants: 1300, emergency: 900, goal: 1500 },   // valid as is
  investIn: "rd", investOptions: ["fd", "rd", "ppf", "sip_index", "gold", "chit", "pension"] }
```

The jars must add up to `monthlyIncome` exactly. `checkBudget(s, jars)` returns
`{ ok, errors: [string] }` for live validation of sliders. `required: false` years can be skipped
with `ADVANCE` (the suggested split is the previous one scaled to this year's income).

What happens to each jar for the year (×12): `needs` is spent on living; `wants` fills the wallet
for the shop, and whatever the shop does not take is spent on small treats at year end (a little
joy); `emergency` and `goal` are saved (earning bank interest once a bank account is open, nothing
in the tin box); `invest` goes into `investIn` (default: the last investment a card opened, else
`rd`).

## Selectors (`select.*`)

| Selector | Example | Returns |
|---|---|---|
| `hud` | `select.hud(s)` | `{ age, stage, phase, playerName, cash, wallet, jars: {emergency, goal}, savings, investments, assets, debt, netWorth, meters: {joy, health, family, gyaan}, dream: {goalId, saved, target, pct, reached, reachedAge}, glasses, income: {monthly, source}, priceIndex, products: {id: value}, insurance: [...], loans: [{id, source, balance, emi, monthsLeft, rateYearly, forced}] }` |
| `budgetRules` | `select.budgetRules(s)` | see above; `null` outside a year |
| `checkBudget` | `select.checkBudget(s, jars)` | `{ ok, errors }` |
| `shopItems` | `select.shopItems(s)` | `[{ id, title, basePrice, price, joy, echo, bought, affordable }]` for the current stage; `price` includes inflation |
| `currentCard` | `select.currentCard(s)` | `{ id, kind, lesson, lessonTitle, speaker, title, text, choices: [{id, label, echo, default}], clarity: [{phrase, truth, lesson, revealed, free}], glasses: {charges, worn, hidden, canUse}, document, echoFrom, crisis, chosen }` or `null` |
| `lastOutcome` | `select.lastOutcome(s)` | `{ cardId, choiceId, kind, quality, outcome, why, lesson: {lesson, from, to}, echo, document, money: {movements, netWorthChange, cashChange, debtChange}, gyaanChange }` |
| `yearSummary` | `select.yearSummary(s)` | `{ age, stage, netWorth, netWorthChange, cash, savings, investments, debt, debtChange, dream, meters, meterChanges, flows, events, headline, habitEcho, lessons, decisions, priceIndex, inflation }` |
| `timeline` | `select.timeline(s)` | `[{ index, age, cardId, kind, lesson, quality, title, chosen: {id, label}, alternatives: [{id, label}] }]` — pick one for Parallel Life |
| `lessonReport` | `select.lessonReport(s)` | `{ lessons: [{id, pillar, ages, title, status, cardId, age}], pillars: {PLAN: {applied, seen, missed, unseen, total}, …}, totals, gyaanCards, gyaan }` |
| `ending` | `select.ending(s)` | `{ id, modifiers, goalId, reached, saved, target, pct, netWorth, debt, highInterestDebt, emiMonthly, emiShare, emergencyMonths, insured, secure, manageable, text, modifierTexts: {modifier: text}, storyteller }` or `null` |
| `echoes` | `select.echoes(s)` | `{ choices: [{age, cardId, choiceId, level, hint, firedAge, fired}], habits: [{age, id, level, values, text}] }` |
| `minigame` | `select.minigame(s)` | `{ id: "sahukar", age, active, done, result, config }` (`config` is `minigames/sahukar.json`) |
| `world` | `select.world(s)` | this life's luck: `{ inflation: {age: rate}, returns: {sip_index, gold, land, chit: {age: rate}}, crashAges, priceIndex }` |
| `compare` | `select.compare(original, parallel)` | `{ changed, original: {netWorth, debt, savings, investments, assets, dream, meters, ending, years}, parallel: {…}, lessonsDiffer: [{id, title, original, parallel}], firstDifferentDecision }` |
| `lesson` | `select.lesson("L14")` | `{ id, ages, pillar, name, title }` |
| `error` | `select.error(s)` | `{ type, message }` or `null` |

Text fields (`title`, `text`, `label`, `outcome`, `why`, `hint`, `truth`, `phrase`) are the content's
`{ en, hi, te }` objects, untouched: the UI picks the language and resolves `{player}`,
`{cast:…}` and `[[term]]`.

### Details the UI needs

- **Money breakdown.** `lastOutcome.money.movements` lists what happened, in order. Types:
  `cash` (`amount`, `paidFrom: [{from, amount}]`, `borrowed`), `jar`, `loan` (`source, principal,
  months, emi, rateYearly, fee, totalPayable, totalInterest, effectiveYearly, disburse`), `repay`,
  `open` (`product, requested, paid, spread, shortfall`), `close` (`value, penalty, received`),
  `insurance` (`product, cover, premium, opened`), `shock` (`kind, cost, insurance, insurancePaid,
  paidFrom, borrowed`), `income`, `scheduled`. `from` is one of `cash`, `wallet`, `emergency`,
  `goal`, `bank`, `fd`, `rd`, `chit`, `gold`, `sip_index`. `borrowed` is
  `{ source, amount, loanId, rateYearly, emi, months }` when savings ran out.
- **Shocks** are paid by insurance, then the emergency jar, then other savings (cash, wants
  wallet, bank, goal jar, FD, RD, chit, gold, index fund — breaking deposits early costs a
  penalty), then a forced loan from the most expensive lender the player can reach.
- **Documents.** `currentCard.document` = `{ id, type, title, verify, opened, verified, flagged,
  lines: [{id, text, flagged, revealed, isRedFlag, explain}], problem }`. `isRedFlag`, `explain`
  and `problem` stay `null` until the line is flagged, the document is verified, or the player
  chooses. After `CHOOSE`, `lastOutcome.document` = `{ problem, caught, wentAhead, consequence }`.
- **Glasses.** A clarity item's `truth` is `null` until revealed. `free: true` means the lesson is
  already applied ("you can see this yourself now").
- **Echoes.** `currentCard.choices[].echo` is the subtle pre-choice hint. `currentCard.echoFrom` =
  `{ age, cardId, choiceId, hint, level, doc }` when this card is the delayed consequence of an
  earlier choice ("an echo from age 15"). `yearSummary.habitEcho` is at most one pattern warning a
  year: `{ id, level, values, text: { en } }` with ids `wants_high`, `emi_heavy`, `no_emergency`,
  `tin_box`, `start_early` (localize by id + values).
- **Headline.** `yearSummary.headline` is the year's biggest event: `{ type, … }` with `type` one
  of `shock`, `chitCollapsed`, `marketCrash`, `borrowedForEmi`, `crossroads`, `loanCleared`,
  `dreamMilestone`, `income`, `policyLapsed`, `squeezed`, `lessonApplied`, or `quiet`.
  `yearSummary.events` has all of them (plus `loanTaken`, `treats`).
- **Crisis.** `currentCard.crisis` is `joy_low`, `joy_high`, `family_low` or `family_high` on a
  crisis card.
- **Endings.** `id` is one of `dream_on_time`, `dream_with_debt`, `dream_close`,
  `secure_no_dream`, `debt_trap`. `modifiers` may hold `wrong_path` (mule or fraud flags) and
  `no_safety_net` (no dream, no emergency fund or insurance, but no high-interest debt either).

## Chapter mode (the map game)

`createLife({ …, mode: "chapters", avatar: "girl" })` plays the same 26 years in five chapters
(`CHAPTERS` in `locations.js`): `child` 11–14 School life, `teen` 15–18 College life, `young`
19–24 First job, `adult` 25–30 Marriage & family, `settle` 31–36 The dream. A life is about 35–45
decisions instead of ~70.

```
intro → [chapter] budget → map ⇄ card/outcome/minigame → chapterEnd → (next chapter: budget …) → ending
```

- Each chapter's events (lesson cards, crises, echoes, scheduled cards and a few optional fillers)
  wait at a **location**: `home, school, bank, hospital, shop, sahukar, post, work, panchayat,
  square, field, phone` (`locationOf(card)`). Required events must be lived; optional ones may be skipped.
- The money clock moves with progress: living required events passes the chapter's years one by one
  (`yearEnd` is folded into the chapter summary). `END_CHAPTER` settles any years left.
- The phone arrives as a gift in the `young` chapter (flag `owns_phone`), or when a want whose id
  contains `phone` is bought. Phone events need it; without one they move home.

| Action | Phase | Example |
|---|---|---|
| `VISIT { location }` | `map` | `step(s, { type: "VISIT", location: "bank" })` — plays the next event waiting there (error if none) |
| `END_CHAPTER` | `map` | `step(s, { type: "END_CHAPTER" })` — needs every required event done; goes to `chapterEnd` |
| `BUY_WANT { itemId }` | `map` | the shop, open any time on the map |
| `TRADE { product, amount }` | `map` | `step(s, { type: "TRADE", product: "stock_chai", amount: 2000 })` — buy (+) or sell (−) a fund, share or deposit (`fd`, `rd`, `ppf`, `gold`, `bank`) from cash; needs the phone, and age ≥ 18 for funds and shares; brokerage on shares |
| `MOVE_MONEY { from, to, amount }` | `map` | between `cash`, the `emergency` and `goal` jars and the `bank` account |
| `REPAY { loanId, amount? }` | `map` | prepay a loan from cash (all of it when `amount` is left out) |

Selectors: `select.chapter(s)` (slots with title, kind, location, required, done; `requiredLeft`,
`optionalLeft`, `canEnd`, `progress`, `phoneGift`, and `summary` in `chapterEnd`),
`select.locations(s)` (`{ id, unlocked, pending, required, special }`), `select.market(s)` (funds,
stocks, deposits with yearly price history from 100, value, invested, risk, fee, bad-news years;
`unlocked`/`reason`, `concentration`, `lastTrade`) and `select.phone(s)` (`unlocked`,
`notifications`, `loans`, `accounts`). `select.hud(s)` adds `mode`, `chapter`, `hasPhone`, `avatar`.

Markets: three fictional mutual funds (`sip_index` Top-50 Index Fund, `mf_debt`, `mf_active` with a
1.8% fee) and four fictional shares (`stock_kisan`, `stock_chai`, `stock_spark`, `stock_power`) move
once a year on their own seeded stream, so the same seed gives the same market. Shares can get
"bad news" years. Numbers are in `assumptions.js` (`products`, `market`, `chapters`).

## Parallel Life

```js
const parallel = replay(finalState, { decisionIndex: 12, choiceId: "save" });
select.compare(finalState, parallel);
```

Everything before decision 12 is replayed exactly; after it, cards that still appear keep the
player's original choice (or the card's default), and budgets, purchases and document actions are
repeated where they still fit. The world's luck is identical. Throws if the decision or choice does
not exist.

## Other exports

- `quoteLoan({ source, principal, months?, rateYearly?, emi?, fee? })` → `{ emi, fee, totalInterest,
  totalPayable, rateYearly, perHundredPerMonth, effectiveYearly, … }` — for Sahukar's chair and
  "₹2 per ₹100 per month = 24% a year".
- `ASSUMPTIONS` — every number, with comments, for the "How this world works" panel.
- `createEngine(content)` — the same API bound to other content.
- `validateContent(content)` — `{ errors, warnings }`; see `npm run validate:content`.
- Constants: `CURRICULUM`, `STAGES`, `PRODUCTS`, `LOAN_SOURCES`, `EFFECT_KEYS`, `ENDINGS`, `GOALS`, …

## Files

| File | What |
|---|---|
| `index.js` | public entry, bound to `src/content` |
| `engine.js` | `createEngine`: createLife, the step reducer, the year loop, chapter mode, replay |
| `locations.js` | chapters, map locations and where each card happens |
| `effects.js` | the effects vocabulary and its order |
| `money.js` | ledger, payments, loans, products, insurance, shocks |
| `deck.js` | content index, lesson-coverage plan, yearly queue, card resolution |
| `world.js` | seeded inflation and market returns |
| `select.js` | selectors |
| `validate.js` | content checks used by `scripts/validate-content.js` |
| `assumptions.js`, `curriculum.js`, `rng.js` | numbers, spec tables, seeded RNG |
| `__fixtures__/` | test content and test players |

Tests: `npm test` (all `src/**/*.test.js`). Content checks: `npm run validate:content`
(`-- --fixture` checks the fixture, `-- --all` lists every warning).
