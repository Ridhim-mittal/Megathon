---
title: "Lakshyam — Game Mechanics & Design Rationale"
subtitle: "Engine, systems, balancing and content rules (UI-independent)"
---

# Lakshyam — Game Mechanics & Design Rationale

This document covers the mechanics and the reasoning behind them. It is not about the UI: any
screen design can sit on top. Every number here is a **fictional teaching assumption**, not
financial advice.

Reference code (temporary branch `claude/youthful-bohr-bel9rc`): engine in `src/engine/`,
content and numbers in `src/data/*.json`, card validator in `scripts/validate-cards.js`.

---

## 1. The idea in one paragraph

The player lives one life from **age 17 to 32**, one year per turn, as a teenager from a village
(Telangana pack or North pack). The goal is to build a **house**, but money is only one of five
meters: **Health, Family, Peace and Gyaan** (knowledge) matter as much. Each year brings income,
a budget, a few actions, one or two life events and often a phone message that may be a scam.
Wrong choices give a small gain now and a bigger loss years later, and there is always a way to
recover. At the end, the player sees which outcomes came from **luck** and which from their
**choices**. They do this by replaying the same life with one choice changed, and then running
100 lives.

### Design principles

1. **Choices are dilemmas, not quizzes.** No option is best on every meter, and a validator
   enforces this.
2. **Show the cost before the tap.** Every option previews its effect on money and at least one
   other meter.
3. **Delayed consequences.** Risky choices plant a seed 🌱 that may grow into an event years
   later.
4. **Luck and choice are separable.** The same seed gives the same luck, whatever the player chose.
5. **Never a gambling feel.** No spin-wheels, loot boxes or tickers. Companies and the market
   index ("Banyan 50") are fictional.
6. **No money leaderboard.** End stats are goal met, debt-free, meters above the floor, scams
   flagged and endings collected. Net worth is never ranked.
7. **Projections are ranges, never single lines.** Each projection carries Sheikh Chilli's pot 🏺
   ("not a promise").

---

## 2. State: one plain object

The engine is a set of **pure functions over one JSON-serializable state object**. The UI only
sends commands; `dispatch(state, cmd)` returns a new state.

| Field | Meaning |
|---|---|
| `seed`, `age` | Life seed (luck) and current age |
| `wallet` | Liquid savings (cash before 18, bank account after) |
| `goalJar`, `fd`, `rd`, `gold`, `sip` | **House fund** = sum of these |
| `loans[]` | `{source, balance, annualPct, months, monthsLeft, emi, fee, totalRepay}` |
| `meters` | `health, family, peace, gyaan` (0–100). Start 70/65/60/10. Floor = 30 |
| `budget` | `{needs, wants, savings, goal}` in 5% steps, total 100 |
| `energy` | Action points left this year (3, or 0 in fast-forward years) |
| `seeds[]` | Planted delayed consequences (see §7) |
| `flags`, `stats` | e.g. `lowScore`; scams flagged / fallen, missed EMIs |
| `crossroads`, `path`, `abroad`, `city`, `business`, `incomePct` | Life-path state |
| `years[]` | One record per finished year (drives the scroll and the review) |
| `commands[]` | Every command the player sent (drives replay and Parallel Life) |

**Commands:** `budget`, `crossroads`, `roleflip`, `action`, `endActions`, `choose` (event option),
`message` (flag/reply), `nextYear`. An out-of-turn command is ignored.

---

## 3. Structure of a year (fixed order)

```
[crossroads?] → income → [budget pots?] → [role-flip at 21] → actions (3 points)
  → event 1 → phone message → event 2 → year-end settlement → stamp + "Why?"
```

The order is fixed so that replaying the same commands always gives the same life. For the same
reason, the phone message arrives mid-year and blocks play until it is answered.

### Pacing

| Ages | Mode |
|---|---|
| 17–25 | Full turns: budget (when needed), 3 action points, events, message |
| 26–32 | **Fast-forward**: the plan runs itself and play stops only for events and crossroads. With the plan's "auto-repay" setting on, spare cash pays costly debt first |

Target pace is about **1 minute per year**, or about 15 minutes per life.

### Budget jars (four clay pots)

- Needs / Wants / Savings / Goal. One coin = 5%.
- The player is asked for a plan **only when the life stage or the income source changes**
  (about 4–6 times per life). Otherwise the saved plan splits income automatically.
- **EMIs come off the top first.** This year's loan payments are reserved before the split,
  capped at 60% of income. This teaches that debt shrinks every jar.
- Effects of the split:
  - **Needs below the stage floor** (40% at 17, 45% at 18–20, 50% at 21–25, 55% at 26+, +5% in
    the city): Health −(gap/2 + 1), Family −gap/3.
  - **Needs at or above the floor:** Health +1.
  - **Wants:** under 5% gives Peace −4; 10–19% gives +1; 20%+ gives +3; over 30% also gives
    Family −2.
  - **Savings** go to the wallet. **Goal** goes to the goal jar.

### Life stages and income

| Stage | Ages | Income model |
|---|---|---|
| Student | 17 | ₹12,000/yr pocket money |
| Early | 18–20 | ₹36,000 at 18. From 19 it depends on path: study ₹36k, work ₹1.08L, mixed ₹72k |
| Job | 21–25 | Study ₹2.4L, then +7%/yr. Work ₹1.5L, then +5%/yr. Mixed ₹1.9L, then +6%/yr |
| Settle | 26–32 | Same growth, plus modifiers |

Modifiers: Gulf ×2.1 (ages 24–27 only), city ×1.3, and permanent `incomePct` from events
(promotion +12%, business boom +30–40%, etc.).

---

## 4. Money model

### Paying for things: the cascade

When a cost arrives, it is paid in this order:

**wallet → goal jar → FD → RD → gold → SIP → forced moneylender loan at 24%**

- When money is taken from the house fund, the house loses bricks visibly, and the year-end
  shows "bricks fell".
- If a cost exceeds everything the player owns, the option shows **"⚠ Short by ₹X → borrow at
  24%"** before the tap. This teaches why an emergency fund matters.

### Year-end settlement (in order)

1. **Chitti:** settle contributions, the pot and dividends.
2. **RD and SIP:** take 12 × monthly from the wallet. If the wallet can't cover it, that year's
   saving is skipped and a note is shown.
3. **Returns:**
   - SIP: seeded "market year" return, mean 11%, SD 14%, clamped to −22%…+32%.
   - Gold: mean 8%, SD 10%, clamped to −12%…+25%.
   - FD 7%, RD 6.5%. Wallet and goal jar 3.5% once a bank account is open.
4. **Insurance premium:** ₹3,000/yr if insured.
5. **Loans, month by month (12 steps):**
   - Each month adds interest; the EMI is paid from the wallet, then the goal jar.
   - A missed EMI adds a ₹500 fee and sets `lowScore` (credit-score flag).
   - When the term ends with money still owed, the loan is restructured over 12 more months.
6. **Auto-repay (fast-forward years):** wallet above 25% of income pays loans at ≥12% interest.
7. **Meter drift:**
   - Debt > income: Peace −8, Health −2.
   - Debt > half of income: Peace −5.
   - Wallet ≥ 25% of income: Peace +2.
   - Age ≥ 28: Health −1/yr.
   - Abroad: Family −5 and Health −2 per year.
8. **Goal check:** house fund ≥ target means the goal is met at this age.

### The house target

₹3.2 lakh at 17, growing **4% a year** (house-price inflation), which is about ₹5.8 lakh at 32.
The target grows on purpose: saving in a tin box loses to inflation.

### Balance check (200 simulated lives each)

| Strategy | Goal met | Typical ending |
|---|---|---|
| **Balanced** (55/15/15/15, bank + lessons + RD + SIP + insurance, careful choices) | **~61%** | House with Blue Walls / Slow River |
| **Spender** (55/35/5/5, bold choices, replies to scams) | ~0% | The Wheel Turned Against Me / Phone Rang Too Often |
| **Generous** (gives a lot, grand wedding on a loan) | ~0% | Wheel Turned Against Me (high Family) |

This is the intended shape: careful play reaches the goal most of the time but not always, and
luck still matters.

---

## 5. Actions (3 points a year, ages 17–25)

Each action costs one point, which forces trade-offs, the way time works in Payback.

| Tool | Unlocks at | What it does |
|---|---|---|
| Learn (Gyaan) | 17 | Next of 5 lessons: Gyaan +8. Lessons: pay yourself first → interest both ways → **risk** (unlocks SIP) → insurance → credit score |
| Bank account | 18 | Wallet and goal jar start earning 3.5%; bank loans become available; Gyaan +3 |
| Loan | 18 | Cash now. Choose the source (bank / moneylender / app) and see the terms first |
| Repay | 18 | Pays the costliest loan first; Peace +3 |
| FD | 20 | Lock 25/50/100% of the wallet at 7% (counts toward the house) |
| RD | 20 | Fixed monthly saving at 6.5% |
| Chitti | 20 | 6-member rotating fund with a 30-second auction mini-game (§8) |
| Gold | 20 | Buy with a share of the wallet; the price moves randomly each year |
| SIP | 22 | Needs the risk lesson. Monthly into the fictional Banyan 50 index. Shown as a growing tree with a range band, never a ticker |
| Insurance | 23 | ₹3,000/yr; pays 80% of "insurable" bills (hospital events) |

---

## 6. Event cards

- **1–2 per year.** A 50/50 seeded draw decides one or two, picked from cards eligible for that age.
- **Medical emergency:** each year from 20, a separate 10% luck roll ("1 in 10 families").
- **Repeat:** some cards repeat after a cooldown (festival, wedding gift, crop failure, job loss,
  roof, check-up), so the late game never runs out.
- **Consequence cards** from fired seeds come first. At most 3 events in a year.
- Cards marked `scaled` multiply money by income (×1 to ×3) so that costs stay meaningful as
  income grows.

### Card rules (enforced by the validator)

1. **2–3 options**, every one with a `style`: `careful`, `bold` or `generous`.
2. Every option previews **money + at least one** of health/family/peace/gyaan.
3. **No dominant option.** The validator fails if any option is ≥ all others on every meter
   (money, income, health, family, peace, gyaan) and strictly better on one. A loan's extra
   cost (total repay − amount) counts against money.
4. Every text field has **en/hi/te**.
5. Every seed or consequence id exists.

### Effects vocabulary

- **Meters and money:** `money`, `health`, `family`, `peace`, `gyaan`.
- **`income`:** permanent percentage change to income.
- **`loan: {amount, source}`:** sources are bank, moneylender, app, shop, card, bnpl.
- **`hidden`:** a seed. Either `{seed, after, chance}`, or `{outcomes:[{p, seed}], after}` for
  a luck-decided result.
- **`ops`:**
  - `payoff:src`: clear that kind of debt.
  - `reduceLoan:src:X`: debt −X.
  - `refinance:src`: move it to a 14% bank loan.
  - `setFlag` / `clearFlag`.
- **`set`:** life-path fields.
- **Card-level `base`:** a loss that has already happened, applied before the option.
- **Card-level `insurable`:** insurance pays 80% of the money cost and any loan.

### Content inventory (27 event cards + 21 consequence cards)

| Ages | Cards |
|---|---|
| 17–20 | Smartphone (shop "no-cost" EMI 🌱), coaching 🌱, trip, grandmother's medicines, game packs, festival clothes |
| 18–24 | Lend a friend money 🌱 (repaid or not: luck), roommate UPI splits |
| 19–32 | Crop failure (luck) 🌱, cousin's wedding gift, medical emergency (luck, insurable) |
| 20–26 | Bike on a loan, gold for Amma, rent hike (luck), evening course 🌱 |
| 21–30 | BNPL festive sale 🌱, credit card minimum due 🌱, Golden Banyan Club Ponzi 🌱, sister's fees, tea-stall partner 🌱 |
| 24–32 | Job loss (luck; loan-app option 🌱), parents' roof, car on EMI, flagship phone, health check-up 🌱, child's school, pilgrimage |

**Consequences**, each with a recovery option:

- EMI bounced → low credit score (bank loans +5%).
- Friend never repaid / friend repaid.
- Coaching paid off (income +8%).
- Father's moneylender debt grew (fix: move it to a Kisan Credit Card).
- Promotion (income +12%).
- Tea stall boom / bust; shop boom / bust.
- BNPL late fees.
- Ponzi collapse (report on 1930 / cybercrime.gov.in).
- Credit-card trap at 42% (balance transfer to 14%).
- Loan-app harassment (RBI Sachet + 1930).
- Ignored symptoms (insurable).
- Task scam, mule account frozen, KYC drain (call 1930 within the golden hour), Telegram tip
  loss (SEBI SCORES), Gulf visa-agent fraud (eMigrate).

---

## 7. Seeds & Threads (delayed consequences)

- A risky option plants a **🌱 on that year's panel**. It has no tooltip on purpose: the player
  finds out later.
- When the seed is planted, its fate is fixed by luck:
  `luck(seed, "seed", origin)` < `chance` means it will fire. With `outcomes`, the roll picks
  which consequence (e.g. stall boom 45% / bust 55%).
- At `plantedAge + after`, the seed either **fires**, adding the consequence card to that year,
  or **withers** silently.
- **Threads:** a line is drawn from the seed to the panel where the consequence fired.
- **Life Review → Threads** lists every seed → consequence pair: "fired at age X", "never
  came — lucky", or "still in the ground".
- **Rule for wrong paths:** a small gain now (bonus, commission, phone now), a hidden seed, a
  bigger loss later, and the consequence card **always offers a recovery option**.

---

## 8. Mini-games

### Chitti auction (30 seconds)

- **Setup:** 6 members (5 NPCs + the player), each paying ₹M a month for 6 months. Pot = 6M.
- **Bidding:** members bid a *discount* (5–30% of the pot) to take this month's pot now. The
  discount is shared among all members as a dividend. Discounts decrease over later rounds; the
  last round has none.
- **NPC bids** come from a seeded schedule: same seed, same bids. The NPC maximum is between
  about 9% and 23%.
- **The player** can outbid (+1% each time) or let go and wait. Winning requires a final bid
  above the NPC maximum.
- **Result screen:** "Take early: ₹X vs Wait: ₹Y", then "getting it ~5 months early cost ₹Z —
  like paying N% a year" (yearly cost = discount ÷ amount received × 12/5).
- **Why win early at all?** Liquidity. Early pot money sits in the wallet during this year's
  events, which can prevent a forced 24% loan.

### "Instant Loan Pvt Ltd — Day 1" (role-flip, age 21)

A dream: the player is an intern at a fictional loan app with 3 customers.

| Customer | Need | Amount |
|---|---|---|
| Student | Phone | ₹15,000 |
| Mother | Hospital bill | ₹40,000 |
| Youth | Bike for delivery work | ₹60,000 |

For each customer, the player picks one of 3 ready-made offers. Each shows EMI, fee, term and
total repay. **Score = company profit.**

| Offer | Rate | Term | Fee |
|---|---|---|---|
| Short | 30% | 6 months | 3% |
| Medium | 33% | 12 months | 6% |
| Long & easy | 36% | 36 months | 10% |

**The reveal:** *"The most profitable offer was always the one with the lowest EMI and the
longest term."* A test guarantees this holds for all three customers.

**Authorship payoff:** the player's **next real loan offer** (any source except credit card)
uses the terms they picked most often, labelled "These are the terms you designed". It is used
once. Ties go to the longer term.

---

## 9. Loans and the EMI display rule

| Source | Annual rate | Term | Fee |
|---|---|---|---|
| Bank | 13% (+5% if low credit score) | 36 months | 1% |
| Moneylender (vaddi vyapari / sahukar) | 24% ("₹2 per ₹100 per month") | 24 months | 0 |
| Loan app | 36% | 6 months | 12% |
| Shop "no-cost" EMI | 0% | 12 months | **15%** (hidden in the fee) |
| BNPL | 30% | 9 months | 5% |
| Credit card | 42% | revolving, minimum due 5% | 0 |
| Refinance (balance transfer) | 14% | 24 months | 0 |

**Every loan screen shows:**

- the **monthly EMI in small text**;
- **TOTAL YOU WILL PAY in large red text**;
- the village phrase "**₹N per ₹100 per month**", which flips to "**= N×12% a year**".

(It is a simple ×12, so 2%/month = 24%/yr.)

Purchase loans (phone, bike, car, wedding) pay for the item directly. Cash loans (the loan
action, the loan-app scam) go into the wallet. The fee is paid upfront.

---

## 10. Phone inbox (scam module)

- **Arrival:** from 18, an 80% chance per year of one message, placed after the first event.
  The pool has **8 scams and 4 genuine messages**, so "flag everything" doesn't win.
- **Answering:** swipe left to **Flag 🚩** or right to **Reply**. A **Tenali Rama hint** gives
  one clue: who is the real customer? why hurry? why a PIN to *receive* money?
- **Scam, flagged:** Gyaan +5, plus a toast with a real fact (1930, cybercrime.gov.in,
  sachet.rbi.org.in, emigrate.gov.in, "UPI PIN is only for paying", "digital arrest doesn't
  exist").
- **Scam, replied:** a small gain now and a seed that fires a year later. The toast says only
  "Replied." The consequence stays hidden until then.
- **Genuine message, flagged:** a small Family or Peace loss, plus "That one was real — look for
  money requests, links, PINs and hurry."

| Scam | Small gain now | Later consequence |
|---|---|---|
| YouTube "like" task job | +₹300 | ₹8,000 "VIP deposit" taken |
| Instant loan app (contacts permission) | ₹10,000 loan | Recovery agents harass your contacts |
| UPI collect "cashback" | — | Account drained |
| "Lend your account" | +₹2,000 commission | Mule account frozen, police notice |
| Telegram "300% tips" | +₹1,500 first tip | Pump-and-dump loss |
| KYC link SMS | — | Account drained |
| "Digital arrest" video call | −₹15,000 | Further drain |
| Gulf visa agent | — | ₹40,000 and passport copy gone |

Genuine messages: Amma checking in, a college scholarship notice, a bank salary alert, a friend's
cricket invite.

---

## 11. Crossroads (about every 5 years)

Each crossroads has a full-screen scene with 2–3 big choices and a **mini flowchart**: past roads
lit, roads not taken greyed, future crossroads shown as "not yet".

| Age | Crossroads | Options |
|---|---|---|
| 19 | After Class 12 | Degree in the city (low pay for now, high later) / Textile mill now (steady, slow) / Work + evening ITI (middle, tiring) |
| 24 | The Gulf letter | Gulf 4 years (~2× pay, Family and Health drain) / Stay near family / City IT park (1.3× pay, costly life) |
| 27 | The wedding | Grand (₹2L savings + ₹3L loan) / Simple (₹1.5L) / Temple + registration (₹40k, relatives grumble) |
| 30 | A shop of your own | ₹3L business loan (boom 55% / bust 45%, luck) / Small weekend stall / Stay in the job |

---

## 12. Luck that doesn't depend on choices

Luck is a hash: **`luck(seed, age, tag)`** via FNV-1a + mulberry32. There is no shared random
stream, so changing a choice never shifts later luck. Event draws, the medical roll, market and
gold years, message picks, seed fates and chitti bids all depend only on `(seed, age, tag)`.

**Consequence:** a **Parallel Life** with the same seed meets the *same* ordinary events, market
years and emergencies. Only the effects of the changed choice differ. A test checks this.

### Replay and strategy

- **Exact replay:** run the command log on the same seed. A test checks this rebuilds the
  identical life.
- **A strategy** is read from the log and looked up in this order:
  1. same age + same card;
  2. the same card at any age;
  3. the player's usual style (careful / bold / generous, by count);
  4. for scams, the player's flag rate.
  Budgets and actions are replayed by age.

---

## 13. Ending, review and replay value

### Endings

Ten folk-tale endings, decided in priority order:

| # | Condition | Ending |
|---|---|---|
| 1 | Debt > 75% of income | *The Wheel Turned Against Me* |
| 2 | Fell for 2+ scams | *The Phone That Rang Too Often* |
| 3 | Health below the floor | *The Body Keeps the Ledger* |
| 4 | Goal met, but Family < 40 or Peace < 35 | *The Big House with Quiet Rooms* |
| 5 | Goal met via the Gulf | *Letters from the Desert* |
| 6 | Goal met | *The House with Blue Walls* |
| 7 | Business boom | *The Shop at the Crossroads* |
| 8 | Debt-free and goal ≥ 60% | *The Slow, Steady River* |
| 9 | Gyaan ≥ 70 | *The Lamp That Learned* |
| 10 | Otherwise | *A Story Still Being Written* |

### Reflection and replay

- **Life Review, "Luck" vs "Your Choices":**
  - Luck: luck cards, the best and worst market years, seed outcomes decided by luck, and seeds
    that never fired.
  - Choices: crossroads, bold or seed-planting choices, scam verdicts, key actions.
- **Parallel Life:**
  - The player picks any turning point (event choice, crossroads or message verdict) and an
    alternative.
  - The same seed runs again with only that choice changed.
  - The two scrolls appear side by side with synced scrolling, the divergence year in yellow
    and the final meters compared.
- **100 Lives:** both strategies run on the **same 100 seeds**. Two horizontal range bars show
  the house fund % at 32 (10th–90th percentile band, median dot) and "goal met in X/100 lives".
  It is a pure function and runs on the device in well under a second.
- **End stats (no net worth):** goal met (yes/no + age), debt-free, meters above the floor (out
  of 4), scams flagged, tales collected.
- **Reflection:** a two-line "letter to my 17-year-old self", saved on the device and included
  in a mock teacher summary export.
- **Tales collection:** unlocked ending cards, which drive replay.

---

## 14. Chakravaddi wheel, mentor, assumptions and region

### Chakravaddi wheel

- **Savings interest** per year = Σ balance × expected rate.
- **Debt interest** per year = Σ balance × loan rate.
- If debt interest is bigger, the wheel spins **counter-clockwise in red** (the moneylender).
  Otherwise it spins **clockwise in green** (water filling a field).
- Speed is proportional to the effective yearly rate of the winning side.

### Mentor (Ammamma / Nani)

- "Why?" offers **3 suggested questions**, picked by state: debt grew, bricks fell, has a loan,
  low wallet, market age, uninsured, chitti age, plus general ones.
- An optional server function sends **game state only**, never personal text, to an LLM.
- Offline, or on failure, it uses canned answers from JSON, filled with the player's numbers.

### Assumptions panel

- Inflation 6%, house price +4%.
- Bank 3.5%, FD 7%, RD 6.5%.
- Market −22%…+32% in any one year; gold −12%…+25%.
- Medical emergency "1 in 10 families a year".
- All loan rates.
- Projections (house fund at 32, SIP at 32) use low/mid/high long-run rates: market 4/10/14%,
  safe savings 3/6/8%.

### Region packs

Region changes **only text tokens**, never mechanics:

| Token | Telangana | North |
|---|---|---|
| Mentor | Ammamma | Nani |
| Festival | Bathukamma | Diwali |
| Village | Pochampally | Rampur |
| City | Hyderabad | Lucknow |
| Rotating fund | chitti | committee (BC) |
| Moneylender | vaddi vyapari | sahukar |
| Storyteller | Oggu Katha | Alha |
| Wheel | Chakravaddi | Chakravriddhi |

Language (en/hi/te) and region are separate settings and both switch live.

---

## 15. Tests that guard the design

| Guarantee | Check |
|---|---|
| A life runs 17→32 and ends with a tale | engine test |
| `dispatch` is pure; out-of-turn commands are ignored | engine test |
| Replaying the command log rebuilds the exact life | engine test (3 seeds) |
| Same seed, different choice → same ordinary events | engine test |
| ₹2 per ₹100 per month = 24%; total = EMI × months + fee | engine test |
| Role-flip: lowest EMI = longest term = most profit, for every customer | engine test |
| Role-flip terms return once as the next loan | engine test |
| Chitti: same seed → same bids; early + gave-up = wait | engine test |
| Tools unlock by age; SIP needs the lesson; fast-forward has no actions | engine test |
| Budget asked only at stage or income-source changes | engine test |
| Insurance pays 80% | engine test |
| Seeds fire as threads in the right year, or wither | engine test |
| End stats contain no net worth | engine test |
| 100 lives: same seeds for both sides, deterministic | engine test |
| No dominant option; money + one meter on every option; en/hi/te present | `validate-cards.js` |

---

## 16. Open questions for the team

1. **Age range.** This design uses 17–32. The team spec on `main` says 11–36. The mechanics
   don't depend on it; extend the stages and income table if needed.
2. **Goal choice.** The house is the only goal here. The team spec has a dream chosen at the
   start, and the target can be swapped per goal.
3. **Content format.** Cards here live in `src/data/cards.json`; the team spec uses
   `src/content/`. The schema in §6 can map onto the spec's card format.
4. **Difficulty.** Change `goalTarget` (₹3.2L) and `houseInflationPct` (4%) to make the game
   harder or easier. At these values a balanced strategy meets the goal in about 61% of lives.
