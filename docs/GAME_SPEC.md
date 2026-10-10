# Lakshyam — Game Spec (the shared contract)

Three Claude Code sessions build this game at the same time: **Engine** (Claude A), **Content** (Claude B)
and **UI** (Claude C). This file is the contract between them. Read it fully before any task.

- **Interfaces here are fixed**: folders, file names, schemas, the effects vocabulary, the engine API,
  the curriculum. Changing them silently breaks the other two sessions.
- **Everything inside the interfaces is yours to invent**: story, characters, jokes, art, motion,
  balancing numbers, internal code design.
- Need something the spec doesn't have? Build the smallest sensible version, then write it in
  `docs/requests/from-<engine|content|ui>.md` (your own file only) and tell your human. The Engine
  session may update section 7 of this file; other sections change only through the humans.

---

## 1. What we're building

A story-driven life simulation (BitLife-style, with a story spine). The player picks a **storyline**
(an underprivileged persona), picks a **dream**, and lives from **age 11 to 36**, one year per turn.
Choices have immediate and delayed consequences. Every storyline teaches the **full curriculum**
(section 4).

- **Audience:** Class 11–12 students from underserved communities (Hyderabad first, all-India later),
  many new to money concepts. The *player* is 16–18; the *character* starts at 11.
- **Device:** laptop browser first (1024–1366 px wide). Don't break phones, but don't optimise for them.
- **Languages:** English, Hindi, Telugu, switchable at any time. Scheme and practice names change with
  language (chit fund / committee / chitti).
- **Brief guardrails:** *educate, do not recommend investments*; *simulations are assumptions, not
  promises* (show ranges, generic product names, no real company/stock/app/bank brands).
- **Brief success measures:** simple, relatable, persona-led (adapts by age and context),
  language-ready, game-based (tests learning), intuitive UI, NGO-integrated.

### Design pillars, in priority order
1. **Learning first.** Every card teaches a lesson id. Every life covers every lesson. Every
   consequence explains *why*, with a number.
2. **Cause and effect you can see.** Echoes (delayed consequences), Parallel Life replay, and luck kept
   separate from choices.
3. **Fun.** Story, characters, twists, humour, quick choices, collectible endings.
4. **Fair to the player.** Poverty isn't the player's fault. Shocks are real; preparation makes them
   smaller. Every bad path has a way back.

### Inspirations (what to borrow)
- **Shady Sam** (NGPF): the player sits on the *lender's* side, picking among three loan offers per
  borrower, and learns how loan terms hurt borrowers who only look at the monthly payment.
  → our *Sahukar's chair* mini-game.
- **Payback** (NGPF): ~20 minutes of quick choices through college; meters beyond money (focus,
  happiness, connections) and the debt you end with; made to be replayed and discussed.
  → our meters, pacing and replay.
- **BitLife** (anything can happen), **Reigns** (fast binary choices),
  **Detroit: Become Human** (big branching crossroads and a flowchart of paths taken and not taken).

---

## 2. Ownership

| Area | Owner | Files |
|---|---|---|
| Engine & systems | Claude A (Person 1) | `src/engine/**`, `scripts/**`, `src/game.js`, `src/game.test.js`, `api/**`, `vite.config.js`, the `scripts` block of `package.json`, section 7 of this file |
| Story & content | Claude B (Person 2) | `src/content/**` |
| Screens, art, motion, sound | Claude C (Person 3) | `src/main.jsx`, `src/World.jsx`, `src/screens/**`, `src/ui/**`, `src/i18n/**`, `src/*.css`, `public/**`, `tests/**`, `index.html`, dependencies in `package.json` |
| Spec, research, pitch | Person 4 | `docs/**` (except each session's own `docs/requests/from-*.md`), `README.md` |

Only Claude C adds npm dependencies (avoids lockfile conflicts). Ask C's human if you need one.

---

## 3. Structure of a life

### Stages

| Stage id | Ages | Name | Cards per year | Income examples | Wants examples |
|---|---|---|---|---|---|
| `child` | 11–14 | Pocket money | 1 | pocket money, festival money, small chores | chocolates, toys, cricket bat, stickers, game top-ups |
| `teen` | 15–18 | First choices | 1–2 | helping family work, odd jobs, tuition | clothes, phone, recharge, movies, bike rides |
| `young` | 19–24 | First income | 2 | first job, farm, small business | phone upgrade, bike, trips, eating out |
| `adult` | 25–30 | Storms | 2–3 | salary or business, family income | wedding and festival spending, vehicle, vacation, gadgets |
| `settle` | 31–36 | The dream | 2 | steadier income | home upgrades, family trips, children's needs |

Target play time: 20–25 minutes for a whole life; childhood at most ~4 minutes.

### One year (one turn)
1. **New year:** age +1. Income arrives. Premiums, EMIs and rent are paid automatically. Holdings grow
   (interest and returns, seeded). Prices rise with inflation. Consequence cards scheduled for this age
   are queued first.
2. **Budget:** at the start of each stage, whenever income changes, and optionally any other year.
   The player splits monthly income across jars: `needs`, `wants`, `emergency`, `goal`, and `invest`
   once unlocked (at L17). Needs has a minimum for the stage.
3. **Wants shop** (optional): spend the wants jar on items for the current stage. Each item gives joy;
   some carry an echo (game top-ups, a phone on EMI).
4. **Cards:** 1–3 event cards, one at a time. A choice gives an outcome and a "why", updates the
   lesson, and may open products or loans, set flags or schedule later cards.
5. **Year end:** summary (net worth, debt, dream progress, meters), the year's headline, and any habit
   echo.

### Crossroads
Three authored big decisions with 3–4 choices each, always shown (`kind: "crossroads"`):
~17–18 (study / work / skill course), ~25–27 (move for work or stay, family duties), ~33–35 (the
dream purchase: how to pay, which documents to trust).

### Meters (0–100)
`joy` (khushi), `health`, `family` (relationships), `gyaan` (knowledge; grows when lessons are applied
or the player uses Ask Ammamma, the glossary or the documents). If `joy` or `family` reaches 0 **or**
100, a crisis card is drawn: too stingy and the family fights; too lavish and the money runs out.
Money is not a meter: it is cash, savings, investments and debt.

### Randomness (seeded)
Every life has a `seed`, and all randomness goes through the engine's seeded RNG, so a life is
reproducible. Randomness picks:
- which card variant teaches a lesson
- random events
- calamity type and year
- market returns
- whether a document is clean or has a problem
- which scam shows up

**Randomness never decides whether a required lesson appears.**

### Lesson coverage rule
For every lesson in section 4, the engine guarantees that one `kind: "lesson"` card for that lesson is
drawn inside its age window. It picks randomly among the storyline's variants for that lesson. Random
and flavour cards fill the remaining slots.

---

## 4. Curriculum (fixed — identical in every storyline)

Pillars from the brief: **PLAN** (plan & budget), **SAVE** (save & manage), **INVEST** (understand
investing), **SAFE** (stay financially safe).

| id | Ages | Pillar | Lesson | Must show |
|---|---|---|---|---|
| L01 | 11–12 | PLAN | Needs vs wants | Sorting needs from wants; wants are fine inside a budget |
| L02 | 11–13 | SAVE | Saving habit and goals | Pay yourself first; small amounts add up |
| L03 | 12–14 | PLAN | Inflation | The same chocolate costs more each year; idle cash shrinks |
| L04 | 12–14 | SAVE | Bank vs tin box | Safety, interest, a minor's savings account |
| L05 | 13–14 | SAVE | Simple vs compound interest | Chakravaddi works for you (savings) or against you (debt) |
| L06 | 11–14 | SAFE | Online safety | Never share OTP/PIN/passwords; "free" game coins and recharge links |
| L07 | 15–17 | PLAN | Peer pressure and EMIs | The true total cost of "only ₹X a month" |
| L08 | 15–18 | PLAN | Earning and opportunity cost | Time, work, and what you give up |
| L09 | 15–18 | SAFE | UPI safely | Collect requests, QR codes; you never enter a PIN to *receive* money |
| L10 | 17–18 | PLAN | Education/career crossroads | Good debt vs bad debt; education loan basics |
| L11 | 15–19 | SAFE | Betting and easy-money apps | The house always wins; chasing losses |
| L12 | 19–21 | PLAN | First income | Payslip, PF, PAN, the idea of income tax |
| L13 | 19–22 | SAVE | Emergency fund | Roughly 3–6 months of expenses, kept safe and reachable |
| L14 | 19–24 | SAVE | Borrowing compared | Moneylender, loan app, credit card, bank; "₹2 per ₹100 per month = 24% a year"; credit score |
| L15 | 18–23 | SAFE | Money mule | Lending your bank account is illegal and traceable |
| L16 | 20–24 | SAFE | Insurance basics | Health, term life, accident and crop cover; government schemes |
| L17 | 20–24 | INVEST | Risk vs return; start early | FD/RD/PPF, gold, index-fund SIP; time matters more than amount |
| L18 | 24–28 | PLAN | Lifestyle inflation and social spending | Weddings, festivals, family duties, remittances |
| L19 | 25–30 | INVEST | Diversification and crashes | Don't panic-sell; don't put everything in one thing |
| L20 | 25–30 | SAVE | Calamity | Flood, drought or hospital: insurance and an emergency fund decide the damage |
| L21 | 26–30 | INVEST | Fees and mis-selling | Commissions; insurance-cum-investment plans vs term cover plus a low-cost fund |
| L22 | 24–32 | SAFE | Too good to be true | Ponzi and "guaranteed returns", fake trading apps, "digital arrest" calls |
| L23 | 31–35 | PLAN | The big purchase | Save vs borrow, EMI vs income, reading and verifying documents |
| L24 | 33–36 | PLAN | Planning ahead | Pension (NPS/APY), nominee and KYC, the next generation |

**Lesson status per life:** `unseen` → `seen` → `applied` (good choice) or `missed` (risky or bad
choice). A missed lesson can still become `applied` through a teach-back card or a second chance.

**Learning loop on every lesson card:**
1. A situation in the persona's world.
2. A choice.
3. An outcome with a number.
4. "Why?": two lines and one number, in the player's language.
5. A Gyaan card is collected (24 cards = the whole curriculum).
6. A teach-back later: a friend or sibling asks *your* advice on the same concept; choosing well
   upgrades the lesson to `applied`. At least one teach-back per pillar per storyline.
7. Parallel Life at the end.

**Assessment:** a 5-question check before and after a life (`quiz.json`), plus the end-of-life
**Gyaan report** (applied / seen / missed, per lesson and per pillar). Teachers and NGOs read this.

---

## 5. Storylines, goals and endings

### Storylines (personas)

| id | Status | Persona |
|---|---|---|
| `village` | v1, playable | A poor family in a Telangana village: farm work or a tiny plot; "no money, no knowledge". Builds on the existing village art (home, kirana shop, grandmother with glasses who calls the player "kanna"). |
| `city` | later, shown as "coming soon" | A family in a city basti (e.g. Hyderabad Old City): daily-wage, auto or gig work; "no money, some knowledge". Has a phone sooner and meets digital scams sooner. |

**Shared roles in every storyline:**
- the mentor: a grandparent who wears glasses
- a friend who takes shortcuts, whose rival life the player can compare with
- a tempter who returns every few years with a bigger scheme
- a sibling who depends on you
- an agent who mis-sells

Each storyline's author invents the names, the backstory, a family **wound** (a past money mistake)
and the **twist** that reveals what really happened.

### Goals (any storyline, chosen at the start)
`house`, `business`, `education` (debt-free study for you or a sibling), `vehicle` (one that earns),
`parents` (their secure old age). Each goal has a base cost in engine assumptions that grows with
inflation. The ending is judged on the chosen goal.

### Endings (the engine decides the id; content writes the text for each goal)
- `dream_on_time`: goal reached by 36, debt manageable
- `dream_with_debt`: reached, but buried in debt
- `dream_close`: not yet, but at least 75% funded and financially secure
- `secure_no_dream`: goal missed, but has an emergency fund and insurance and no high-interest debt
- `debt_trap`: high-interest debt dominates
- modifier `wrong_path`: legal trouble from mule or fraud flags; adds a section showing the way back

Every ending closes with the storyline's **storyteller reveal**, then the Gyaan report, then Parallel
Life.

---

## 6. Signature mechanics

### Echoes: subtle long-term warnings, at every age
- A choice may carry `echo: { level: 1–3, hint }`. The UI keeps it **subtle**: a faint ripple, a
  quiet line, the mentor's look. Never a modal, never preachy.
- The engine records echoes. When a consequence fires, it points back to its origin ("an echo from
  age 15").
- At year end the engine also computes **habit echoes** from patterns, e.g. "if wants stays at 60% of
  income, your dream moves 4 years later".

### Ammamma's glasses (clarity)
- Offer texts on cards and documents can mark ambiguous phrases together with what they really mean.
- The player has limited charges: 3 at the start, +1 per stage. Wearing the glasses on a card reveals
  all of its phrases.
- Phrases whose lesson is already `applied` are revealed for free ("you can see this yourself now"),
  so learning visibly upgrades the glasses.
- Every phrase must appear **verbatim** in that language's text.

### Documents
- Every card that buys an asset (land, gold, vehicle, policy, chit) or takes a formal loan offers
  **"Read the documents"**.
- Each pack has variants, clean or with a problem, chosen by the seeded RNG.
- The player reads it and taps suspicious lines. An optional paid verification is available (a lawyer,
  an encumbrance certificate).
- Going ahead on a problem the player didn't catch schedules a consequence. Catching it lets them walk
  away or renegotiate. Not reading is a risk, not a crime.

### Parallel Life
- The engine logs every decision.
- At the end, the player picks one past decision from a timeline. The engine re-runs the life with the
  same seed and that one choice changed.
- After the change, cards that no longer appear are skipped. Cards that still appear keep the player's
  original choice where possible, otherwise the card's `default` choice.
- Both lives are shown side by side: net worth, debt, goal, meters, ending, and which lessons differed.

### Sahukar's chair (mini-game inspired by Shady Sam)
- Once in the `teen` or `young` stage, the player helps at a lending desk for a day.
- Three borrowers, three loan offers each (rate, term, fees, monthly payment).
- Score = lender profit; then the reveal shows what each loan did to its borrower.
- Teaches L14. It is self-contained and returns gyaan plus a lesson update.

### Ask Ammamma (AI mentor)
- An "Ask" button, plus "Why?" on outcomes.
- The engine sends `{question, language, summary}` to `/api/ask`. The summary contains game state
  only, never personal data.
- Server-side rules:
  - answer in the player's language, at a teen's level, using the game's own numbers
  - never recommend products, stocks or companies
  - politely decline off-topic questions
- If the API fails or takes longer than 8 s, show the closest offline answer from
  `src/content/faq.json`.
- The AI never changes numbers or events.

---

## 7. Data contracts and engine API  *(the Engine session may update this section)*

### Localized text
Every player-facing string in content is `{ "en": "...", "hi": "...", "te": "..." }`. A missing `hi`
or `te` falls back to `en` in the UI. Use simple everyday words and sentences of 20 words or fewer;
Hinglish and Tenglish are fine in dialogue. Money is written as ₹ with Indian grouping (₹1,50,000).

**Tokens inside text:**
- `{player}`: the player's name
- `{cast:<roleId>}`: a cast member's name in the current language
- `[[<termId>]]`: a glossary term. The UI shows the localized name as a tappable chip with its
  definition. This is how scheme and practice names change with language.

### Content files (owned by Content)
```
src/content/
  index.js            the ONLY module the engine and UI import from content
  lessons.json        [{ id: "L01", pillar, ages: [11,12], title, summary, keyNumber }]
  glossary.json       { "<termId>": { name: {en,hi,te}, short: {en,hi,te} } }
  goals.json          [{ id, title, description }]          (costs live in engine assumptions)
  wants.json          [{ id, stage, title, price, joy, echo? }]
  documents.json      [document packs]
  quiz.json           { pre: [5 questions], post: [5 questions] }
  faq.json            [{ id, q, a, lesson }]                 (offline Ask Ammamma answers)
  minigames/sahukar.json
  storylines/<id>/
    storyline.json    { id, playable, title, tagline, persona, cast: { roleId: { name, role } }, intro: [panels], start: {...} }
    cards/*.json      arrays of cards (split files however you like)
    endings.json      { "<endingId>": { "<goalId>": text }, storyteller: text }
```
`index.js` exports `{ lessons, glossary, goals, wants, documents, quiz, faq, minigames, storylines }`,
where `storylines[id] = { ...storyline.json, cards: [...all cards], endings }`.

### Card
```json
{
  "id": "village.teen.phone_emi.a",
  "storyline": "village",
  "kind": "lesson",
  "lesson": "L07",
  "ages": [15, 17],
  "weight": 1,
  "requires": { "flags": [], "notFlags": ["owns_phone"] },
  "speaker": "friend",
  "title": { "en": "Only ₹699 a month!" },
  "text": { "en": "{cast:friend} shows off a new phone. \"Zero down payment, only ₹699 a month on [[emi]] for 12 months. Easy!\"" },
  "clarity": [
    {
      "phrase": { "en": "Zero down payment" },
      "truth": { "en": "Nothing today, but a ₹1,200 processing fee is added to your first bill." },
      "lesson": "L07"
    }
  ],
  "document": "doc.phone_emi",
  "choices": [
    {
      "id": "buy",
      "label": { "en": "Buy it on EMI" },
      "quality": "risky",
      "effects": {
        "loan": { "source": "bnpl_emi", "principal": 7500, "months": 12, "emi": 699, "fee": 1200 },
        "meters": { "joy": 8 },
        "flags": { "add": ["owns_phone"] }
      },
      "echo": { "level": 2, "hint": { "en": "₹699 feels small. Twelve of them don't." } },
      "outcome": { "en": "You pay ₹8,388 in EMIs plus a ₹1,200 fee: ₹9,588 for a ₹7,500 phone." },
      "why": { "en": "An EMI spreads the cost; it doesn't shrink it. Add up every payment before you say yes." }
    },
    {
      "id": "save",
      "label": { "en": "Save ₹700 a month instead" },
      "quality": "good",
      "default": true,
      "effects": {
        "flags": { "add": ["saving_for_phone"] },
        "schedule": [{ "inYears": 1, "card": "village.teen.phone_bought_cash" }]
      },
      "outcome": { "en": "In 11 months you buy it outright and keep the ₹2,088 the EMI would have cost." },
      "why": { "en": "Waiting a little often costs less than paying a lot later." }
    }
  ]
}
```

| Field | Rule |
|---|---|
| `id` | unique; `<storyline>.<stage>.<slug>.<variant>` |
| `storyline` | a storyline id, or `"all"` for cards shared by every storyline |
| `kind` | `lesson` · `random` · `crossroads` · `consequence` · `crisis` · `teachback` · `scam` · `calamity` · `windfall` |
| `lesson` | required on every card: the lesson it teaches or reinforces |
| `ages` | `[min, max]` inclusive; for `lesson` kind it must fit inside the lesson's window |
| `requires` | optional; `flags`, `notFlags`, `minCash`, `owns` (product ids), `lessonStatus` (`{ "L13": "applied" }`) |
| `speaker` | a cast `roleId`, `"narrator"` or `"headline"` |
| `clarity` | optional; ambiguous phrases (see section 6) |
| `document` | optional; a document pack id |
| `choices` | 2–4; exactly one may have `"default": true` (otherwise the first is the default) |
| `quality` | `good` · `neutral` · `risky` · `bad`; maps to lesson status (`good` → applied, `risky`/`bad` → missed) |
| `outcome`, `why` | required on every choice of a `lesson`, `crossroads` or `teachback` card |

### Effects vocabulary (the engine implements exactly these)

| Key | Example | Meaning |
|---|---|---|
| `cash` | `-500` | Change in cash (₹) |
| `jar` | `{ "emergency": -2000, "goal": 1000 }` | Change in a savings jar |
| `meters` | `{ "joy": 5, "family": -3 }` | Clamped to 0–100 |
| `flags` | `{ "add": ["x"], "remove": ["y"] }` | Story flags |
| `open` | `{ "product": "fd", "amount": 5000 }` | Buy or open a product (amount from cash, then savings) |
| `close` | `{ "product": "sip_index" }` | Sell or close a product (returns its current value) |
| `loan` | `{ "source": "moneylender", "principal": 10000, "months": 12 }` | Rate, EMI and fee come from assumptions unless given (`rateYearly`, `emi`, `fee`) |
| `repay` | `{ "loan": "moneylender", "amount": 5000 }` | Prepay a loan |
| `shock` | `{ "kind": "health", "cost": 60000 }` | Paid by insurance first, then the emergency jar, then other savings, then forced borrowing from the worst source available; the engine reports the breakdown |
| `income` | `{ "monthly": 9000, "source": "job_factory" }` | Set the monthly income |
| `schedule` | `[{ "inYears": 2, "card": "id", "unlessFlag": "checked_plot" }]` | Queue a later card |
| `lesson` | `"applied"` | Override the status that `quality` would give |
| `gyaan` | `2` | Add to the gyaan meter |
| `glasses` | `1` | Add glasses charges |

**Products:** `bank`, `fd`, `rd`, `ppf`, `sip_index`, `gold`, `chit`, `land`, `vehicle`,
`insurance_health`, `insurance_term`, `insurance_crop`, `insurance_accident`, `pension`.

**Loan sources:** `family`, `shg`, `moneylender`, `loan_app`, `credit_card`, `bnpl_emi`, `gold_loan`,
`bank_personal`, `education`, `kcc`, `mudra`, `home`, `vehicle_loan`.

### Document pack
```json
{
  "id": "doc.plot_sale",
  "type": "sale_deed",
  "title": { "en": "Sale deed — Plot 14, Survey No. 212" },
  "verify": { "cost": 2000, "label": { "en": "Pay the village lawyer to check the land records" } },
  "variants": [
    { "id": "clean", "weight": 6, "lines": [ { "id": "l1", "text": { "en": "Seller: K. Ramulu, son of K. Venkaiah" } } ] },
    {
      "id": "double_sold", "weight": 4,
      "lines": [
        { "id": "l1", "text": { "en": "Seller: K. Ramulu, son of K. Venkaiah" } },
        { "id": "l2", "text": { "en": "Encumbrance: see attached" }, "redFlag": "no_ec",
          "explain": { "en": "No encumbrance certificate is attached. The plot may already be sold or mortgaged." } }
      ],
      "consequence": { "inYears": 2, "card": "village.settle.plot_dispute.a" }
    }
  ]
}
```

### Engine API (owned by Engine)
```js
import { createLife, step, replay, select, ASSUMPTIONS } from "./engine/index.js";

const life = createLife({ storylineId: "village", goalId: "house", seed: 1234, playerName: "Sravani" });
const next = step(life, { type: "CHOOSE", choiceId: "save" });   // pure: returns a new state
select.hud(next);           // { age, stage, cash, savings, debt, netWorth, meters, dream: {saved, target, pct} }
```

The full API with an example per action and selector is in `src/engine/README.md`. An invalid action
returns the same state with `error: { type, message }`; it never throws.

**Actions:**
- `ADVANCE`: continue to the next phase (in `budget` it keeps the suggested split; in `minigame` it
  skips the mini-game)
- `SET_BUDGET { jars, investIn? }`: monthly ₹ per jar; must sum to `budgetRules.monthlyIncome` (the
  take-home after EMIs and premiums). Commits the budget and moves to the shop. `investIn` picks the
  product the invest jar goes into.
- `BUY_WANT { itemId }`, `SKIP_SHOP`
- `CHOOSE { choiceId }`: on the current card
- `USE_GLASSES`: on the current card
- `OPEN_DOCUMENT { docId }`, `FLAG_LINE { docId, lineId }` (toggles), `VERIFY_DOCUMENT { docId }`
- `MINIGAME_RESULT { id, score, lesson? }`: `lesson` (`"seen"`, `"applied"`, `"missed"`) sets L14
- `ASKED_MENTOR`, `USED_GLOSSARY { termId }`: small gyaan reward, at most 3 a year together

**Phases:** `intro` → `budget` → `shop` → `card` ↔ `outcome` → (`minigame`, once) → `yearEnd` →
(next year) … → `ending`. `minigame` is Sahukar's chair, after the cards of one seeded year at age
17–22.

**Selectors** (`select.*`):
- `hud`, `budgetRules` (`{ monthlyIncome, grossMonthly, autoPaidMonthly, step, minNeeds,
  jarsUnlocked, required, suggested, investIn, investOptions }`), `checkBudget`, `shopItems`,
  `currentCard` (with the document variant and the glasses state resolved), `lastOutcome` (with
  money breakdown), `yearSummary`
- `timeline` (decisions, for Parallel Life), `lessonReport`, `ending`, `echoes`, `minigame`,
  `world` (this life's inflation and returns), `compare(original, parallel)`, `lesson`, `error`

**Parallel Life:** `replay(finalState, { decisionIndex, choiceId })` returns the parallel life's final
state.

**State** (summary; the engine may add fields):
```
{ v, seed, rng, storylineId, goalId, playerName, age, stage, phase,
  money: { cash, jars: { emergency, goal }, products: { fd, rd, ppf, sip_index, gold, chit, ... }, assets: [] },
  loans: [{ id, source, principal, balance, rateYearly, emi, monthsLeft, fee }],
  insurance: [{ type, cover, premiumYearly }], income: { monthly, source }, priceIndex,
  meters: { joy, health, family, gyaan }, glasses: { charges, revealed: [] },
  docs: { [docId]: { variant, opened, flagged: [], verified } },
  flags: [], scheduled: [], queue: [], current, lastOutcome,
  lessons: { L01: "unseen" | "seen" | "applied" | "missed" }, echoes: [], log: [], history: [], ending }
```
Added by the engine: `params`, `world` (seeded luck), `plan` (lesson, crossroads and mini-game
ages), `year` (this year's rules, events and summary), `years` (one snapshot per year), `budget`,
`investIn`, `money.wallet` (the wants jar), `flows` (money ledger), `error`, and bookkeeping.
`history` holds card decisions; `log` holds every successful action.

The UI renders from state and selectors only, **never computes money itself**, and never imports
engine internals.

### Engine rules (how the engine reads content)
These fill gaps in the contract with the smallest sensible rule. Content can rely on them.

**Money and effects**
- Effects inside one choice apply in this order: `income`, `loan`, `close`, `cash` (+), `jar`,
  `cash` (−), `repay`, `open`, `shock`, `meters`, `flags`, `schedule`, `gyaan`, `glasses`.
  So a loan arrives before the purchase it pays for, and a gift arrives before it is saved.
- `loan`, `open`, `close`, `repay`, `shock` and `schedule` may also be arrays.
- `cash: -X` is paid from cash, then the wants jar, bank, goal jar, emergency jar, then liquid
  holdings (FD, RD, chit, gold, index fund), then a forced loan. `cash: +X` is new money.
- `jar` moves money between cash and a jar (`emergency`, `goal`, or `wants`); it is not new money.
  A gift into a jar is `{ "cash": 500, "jar": { "goal": 500 } }`.
- `loan` takes an optional `disburse`: `"cash"` (the money comes to the player; spend it with
  `cash` or `open`) or `"direct"` (it goes straight to the seller, so the item is already paid
  for). Defaults by source: `bnpl_emi`, `credit_card`, `education` are direct; the rest are cash.
  A given `emi` turns the loan into a fixed instalment (`emi × months` + `fee` in total). The fee is
  billed with the first year's payments.
- `open` pays from cash, then the wants jar, bank, goal jar and emergency jar; if that is not enough
  the product is opened with what there was (the outcome reports the `shortfall`). For insurance,
  `amount` is the cover (default in assumptions) and the first premium is paid at once.
- `income` changes the monthly income from the next year (this year's was already paid).
- `schedule` with `inYears: 0` queues the card later this same year.
- Wants money the shop does not take is spent on small treats at year end.

**Flags the engine reads or sets**
- `goal_reached`: set it when the dream is bought (e.g. the 33–35 crossroads). The dream also counts
  as reached the first year-end its savings cover the target.
- `money_mule`, `fraud`, `legal_trouble`, or any flag starting with `legal_`: the `wrong_path`
  ending modifier.
- `owns_phone` or `has_smartphone` (age 18+): forced borrowing can go to a loan app instead of the
  moneylender. In the `city` storyline a loan app is always reachable from 18.
- `chit_unregistered`: an open `chit` can collapse in a seeded year.
- `crisis_joy_low`, `crisis_joy_high`, `crisis_family_low`, `crisis_family_high`: set by the engine
  while a crisis card is shown and removed after the choice. A crisis card picks its extreme with
  `requires.flags`; a crisis card that requires none of them is used for any extreme.

**Cards**
- Variants of one moment share an id prefix: `<storyline>.<stage>.<slug>`. Only one card per prefix
  is drawn in a life. Each crossroads prefix is drawn once at a seeded age inside its `ages`; if no
  variant's `requires` hold that year, it moves to the next year in range.
- A lesson card's `requires` decide which variant is drawn; if none hold at the planned age, a
  variant is drawn anyway (coverage beats flags).
- `consequence` cards are only drawn when scheduled; `crisis` cards only at meter extremes.
  Teach-back cards are drawn only for a lesson that is `seen` or `missed` (three times likelier for
  `missed`).
- Lesson status from `quality`: `good` → `applied`; `neutral` → `seen` (if unseen); `risky` or
  `bad` → `missed`, except that `applied` is never lowered. `effects.lesson` overrides it.
- A document problem is "caught" if the player flagged any red-flag line or verified the document.
  "Going ahead" means choosing a choice with an `open` or `loan` effect. Going ahead on an uncaught
  problem schedules the variant's `consequence` (with `{ inYears, card, unlessFlag? }`).

**Content additions the engine accepts**
- `storyline.json` `start`: `{ cash, jars: { emergency, goal }, meters: {…absolute values},
  flags: [], income: { monthly, source }, effects: {…vocabulary} }`, all optional.
- `wants.json` items may have `effects` (same vocabulary), applied when bought.
- `endings.json` may have `wrong_path: { <goalId>: text }` and `no_safety_net: { <goalId>: text }`
  sections. The ending modifier `no_safety_net` marks a `secure_no_dream` ending without an
  emergency fund or insurance (the life fits no ending cleanly; there is no high-interest debt).

**Endings** (judged at the end of age 36, income = monthly income)
- reached: `dream_on_time` if EMIs are at most 40% of income and high-interest debt (≥ 20% a year)
  is at most one month's income; otherwise `dream_with_debt`.
- not reached: `debt_trap` if high-interest debt is above 3 months' income and above liquid savings;
  else `dream_close` if at least 75% funded and secure; else `secure_no_dream` if secure (3 months
  of needs in the emergency jar, any insurance, no high-interest debt); else `dream_close` if at least
  75% funded; else `debt_trap` if there is any high-interest debt; else `secure_no_dream` with the
  `no_safety_net` modifier.

### Chapter mode (the map game)
The game the UI ships plays a life in **five chapters** instead of 26 separate years: School life
(11–14), College life (15–18), First job (19–24), Marriage & family (25–30) and The dream (31–36).
Every lesson keeps its age window. The chapter's cards wait at places on the village map (home,
school, bank, hospital, kirana shop, sahukar, post office, workplace, panchayat, village square,
cotton field, phone); a card's place follows its lesson (e.g. L12 bank, L14 sahukar, L23 panchayat)
or its kind (crises and windfalls at home, teach-backs at school, scams on the phone). Living the
required events moves the money clock through the chapter's years; going home ends the chapter.
The phone (a gift with the first job, or bought) opens mutual funds (index, debt, active) and four
fictional shares from age 18. Full API: `src/engine/README.md`, "Chapter mode".

### Assumptions
Every number lives in `src/engine/assumptions.js`, with a comment saying what it is based on:
- inflation
- savings, FD, RD and PPF rates
- index-fund and gold return ranges (seeded, with bad years)
- loan rates and fees by source
- insurance premiums and covers
- wages by stage and storyline
- goal costs

All values are illustrative. They are shown in an in-game "How this world works" panel.

---

## 8. Tone and safety
- Everyday spoken words. Short sentences. Show numbers.
- Illegal paths (money mule, betting, Ponzi recruiting, hawala, fake documents) show **consequences,
  never methods**. They are never profitable overall, and there is always a way back.
- No real brands, apps, banks, companies or stocks. Government schemes may use their real names
  (public education).
- No caste, religion or community stereotypes for villains. Poverty is never the player's fault.
- Heavy topics (farmer distress, loan-app harassment, fraud) appear without graphic detail and always
  with a way to get help: family, the bank, the 1930 cyber-crime helpline.
- No personal data collected. Progress is saved in `localStorage` only.

## 9. Integration gates
- **H0:** this spec merged to `main`.
- **H6:** one full `village` life is playable from 11 to 36 in English, with the real engine and
  content.
- **H10:** Hindi and Telugu, glasses, documents, Parallel Life, Ask Ammamma (with offline fallback).
- **H11:** feature freeze. Bug fixes only after this.
- **H13:** backup demo video recorded (`?seed=demo` gives a fixed, rehearsed life).
