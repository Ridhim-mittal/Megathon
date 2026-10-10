# Lakshyam — Financial Literacy Life-Sim Game Design

Based on *Lakshyam — Financial Literacy Life-Sim Game Design* (PDF, Oct 10, 2026, @Mohammad),
revised with the team's changes from Oct 10, 2026. What changed is listed in the
[Change log](#change-log).

---

## Contents

- [Three things to fix early](#three-things-to-fix-early)
- [The concept in one line](#the-concept-in-one-line)
- [How one playthrough works](#how-one-playthrough-works)
- [Three mechanics that make it a learning game, not just BitLife](#three-mechanics-that-make-it-a-learning-game-not-just-bitlife)
- [Seeing clearly: warnings, documents and the Glasses of Clarity](#seeing-clearly-warnings-documents-and-the-glasses-of-clarity)
- [The financial toolbox, localized](#the-financial-toolbox-localized)
- [The local layer: tales, sayings, myths](#the-local-layer-tales-sayings-myths)
- [The scam module: make it painfully local](#the-scam-module-make-it-painfully-local)
- [Where AI actually earns its place](#where-ai-actually-earns-its-place)
- [Scalability](#scalability-the-main-criterion-so-make-it-the-strongest-slide)
- [2D or 2.5D?](#2d-or-25d)
- [What to build for the hackathon](#what-to-build-for-the-hackathon)
- [Open questions](#open-questions)
- [Change log](#change-log)
- [Sources](#sources)

---

## Three things to fix early

These three decide whether judges see a learning tool or just a fun sim.

1. **Match the audience and adapt by age.** The problem statement targets Grades 11–12.
   Every persona starts as a child of **11 or 12** and grows up to **36**. The childhood years
   are a light, pocket-money stage. The Senior Inter years (about 17) mirror Grade 11–12
   players' own lives. Adulthood shows where today's habits lead. Choices, needs and wants
   change as the character ages, which covers the "persona-led: adapt by age" criterion.
2. **Pure BitLife randomness teaches the wrong lesson.** If a kid fails and doesn't know
   why, they learn "money is luck." The game needs a clear way to show cause and effect.
   The Parallel Life replay (below) is the main answer, backed by subtle long-term warnings
   during play.
3. **Game balance is the curriculum.** Players learn whatever strategy wins. If "put
   everything in stocks" always wins, the game effectively recommends investments,
   which breaks the brief's one guardrail. The right move has to depend on the goal and
   the time horizon.

## The concept in one line

> Pick a dream. Grow up from 12 to 36 in a Telangana village or city. Then a village
> storyteller shows you which of your choices, and which bits of luck, shaped your ending.

**Name ideas**

- **Lakshyam** (లక్ష్యం / लक्ष्य): "goal" in both Telugu and Hindi
- **Kaasu Katha**: "money story"

---

## How one playthrough works

A full life should take about 20–25 minutes, so it fits a 45-minute class period with time
for discussion. This matters a lot for NGO delivery. (A 24-year life makes this tight; see
[Open questions](#open-questions).)

```
One life: yearly turns from age 11–12 to 36, a Crossroads every ~5 years, then a rewind

  Choose a persona ──► Choose a goal card   (its price rises with inflation)
                              │
                              ▼
  ┌─ Each year = one turn (options change with age) ─────────────────────────┐
  │ Income arrives ► Budget jars ► 1–2 event cards ► Optional actions ►      │
  │                                                     Year-end review      │
  │        ▲──────────────────────── next year ─────────────────┘            │
  └──────────────────────────────────────────────────────────────────────────┘
        ▲ │ every ~5 years, then back           │ age 36 / goal deadline reached
        │ ▼                                     ▼
   Crossroads                                 Ending
   (Detroit-style branching scene)            (one of several tale endings)
        ▲                                       │
        │                                       ▼
        └──── rewind to a Crossroads ──── Life Review + Parallel Life
                                          (same life, one choice changed)
```

The yearly loop repeats until the character reaches 36 or the goal deadline. The rewind
from the Life Review is what turns a failed life into a lesson.

### Setup: choose a persona

Every persona is from an underprivileged family. They differ in where they grow up and
how much they already know about money.

| Persona type | Money | Financial knowledge | Example personas |
|---|---|---|---|
| **Village** | None | None | A cotton farmer's daughter near Warangal; a girl whose mother runs a tiffin centre in Siddipet |
| **City** | None | Some | An auto driver's son in Hyderabad's Old City |

- Every persona starts at **age 11 or 12** and the game runs to **age 36**.
- The village persona starts with the "Gyaan" meter empty and fewer tools visible. Banks,
  apps and paperwork are unfamiliar, so they rely more on family, the SHG and the
  moneylender.
- The city persona starts with some knowledge and more options nearby (bank branch, UPI,
  phone EMIs). They also get more exposure to loan apps, online scams and city prices.
- More persona types can be added later as data (e.g. a migrant family or a girl expected to
  stop studying), using the same engine.

### Setup: choose a goal card

Then they pick a goal card: a pukka house, an auto-rickshaw, a kirana shop, or a sibling's
college fees. The first lesson happens right here. The goal's price rises with inflation, so a
₹15 lakh house becomes about ₹40 lakh after 20 years at 5% inflation.

### Each turn is one year

1. **Income arrives.** It starts as pocket money, then a stipend, then a salary, crop income or
   business income.
2. **Budget jars.** The player drags money into needs, wants, savings and goal. They set a
   monthly plan once and revisit it only when life changes, so 24 years doesn't mean 288
   budget screens.
3. **One or two event cards.** A festival, a broken phone, a friend's birthday, a crop failure, a
   job offer, or a WhatsApp message that might be a scam.
4. **Optional actions** from a BitLife-style menu: bank, chitti, gold, land, market, insurance,
   loans. Any purchase of an asset and any loan includes the option to
   [check the documents](#document-checks).
5. **Year-end review.** Net worth, goal progress, and three non-money meters: health,
   family, and peace of mind. These stop the game from implying that money is all that
   matters.

### Options, needs and wants change with age

The options that come into the character's life change as they grow older, and so do their
needs and wants. A child wants simple things like chocolates, toys or some clothes. An
adult wants new clothes, a new vehicle or a vacation.

| Life stage | Income | Example wants | Example needs and decisions |
|---|---|---|---|
| **Child (11–14)** | Pocket money, festival money from relatives | Chocolates, toys, some clothes | Gullak savings, saving up for something small, sharing with siblings |
| **Teen (15–18)** | Pocket money, small part-time earnings | Phone, outings with friends, clothes | Inter fees and books, first bank account at 18, the "rent out your account" scam |
| **Young adult (19–25)** | Stipend, first salary, crop or business income | New clothes, a phone on EMI, a bike | First job vs. fake job offers, first loan, supporting family, starting an emergency fund |
| **Adult (26–36)** | Salary, crop or business income | New vehicle, vacations, a bigger wedding | Family costs, a house or plot, insurance, a business loan, long-term investing |

Event cards, wants and menu actions are tagged by age range in the content data, so the
same engine serves every stage.

### Every ~5 years, a Crossroads

These are the Detroit moments: authored, branching scenes. Examples across the life:

- **About 16:** continue studying or start earning to help the family.
- **About 21:** go to the Gulf or stay.
- **About 26:** spend big on a sister's wedding or not.
- **About 31:** take a loan to start a business.

### Knowledge unlocks tools

A "Gyaan" meter grows when the player asks the mentor or finishes a short lesson. The
stock market stays locked until they've learned what risk is. This keeps the game simple
for beginners and turns learning into progress. The village persona starts lower on the
meter than the city persona.

---

## Three mechanics that make it a learning game, not just BitLife

### Parallel Life (replay with one change)

Use a seeded random number generator so every life can be reproduced exactly. At the
end, the engine re-runs the same life (same monsoon, same hospital bill) with one choice
changed, and shows both lives side by side. For example: "At 24 you had no emergency
fund, so the hospital bill sent you to the moneylender. Here's the same life with ₹30,000
saved."

This is the strongest learning feature we can build, and it's cheap: it's just the simulation
run twice. Pair it with a Detroit-style flowchart at the end of each chapter, showing the
paths taken and the greyed-out ones not taken. For learning, Detroit's flowchart is worth
copying more than its branching.

### Separate luck from choices

In the Life Review, split outcomes into "what was luck" and "what you chose." Our players
come from struggling families. A game that implies poverty is purely your own fault is
wrong, and it will push them away. Show that shocks are real, and that preparation makes
them smaller.

Show the odds openly too, e.g. "in this world, about 1 in 10 families face a medical
emergency each year." That is itself a lesson about insurance.

### No single winning strategy

- For a 3-year goal, a recurring or fixed deposit should usually beat the market basket,
  because markets swing.
- For 20 years, the basket usually wins, but it has bad decades.
- Gold and land should do well in some lives and badly in others.

Add an **"Assumptions" panel** that states how the game world works, and always show
projections as ranges, never single numbers. That is exactly the brief's "simulations are
assumptions, not promises" rule. Use fictional companies and a fictional index, with no
real stock names.

---

## Seeing clearly: warnings, documents and the Glasses of Clarity

Three tools help the player see past the immediate moment, the fine print and the clever
wording.

### Subtle long-term warnings

At every age, the game gives quiet hints that **a short-term decision can be bad in the long
term**. They are hints, not blocking pop-ups. The player still decides and learns from the
result.

- **Where they appear:** right when the player chooses, e.g. spending the goal jar on a
  want, borrowing for a festival, skipping insurance, or buying on EMI.
- **What they look like:**
  - The chakravaddi wheel starts to turn the wrong way.
  - A brick wobbles on the goal house.
  - The peace-of-mind meter flickers.
  - A one-line aside from the narrator or Ammamma, often a saying ("Appu chesi pappu
    koodu").
- **Age-appropriate examples:**
  - **12:** spending all the festival money on chocolates on day one means nothing is
    left for the school trip.
  - **17:** a phone on EMI swallows months of pocket money.
  - **25:** a loan-app loan for a party compounds.
  - **32:** a car loan pushes out the emergency fund.
- **Paid off later:** the Life Review and Parallel Life point back to the moment, e.g. "this
  small choice at 14 is why the goal was ₹40,000 short."

### Document checks

Any purchase of an asset and any loan comes with a **"See documents"** option. The
lesson: **always check the documents before you pay or sign.**

| Deal | Documents the player can inspect | What a bad set of papers hides |
|---|---|---|
| Buying a plot or land | Sale/title deed, encumbrance certificate, approved layout | Title dispute, the plot is mortgaged, unapproved "venture" layout |
| Any loan (bank, gold loan, moneylender, loan app, phone EMI) | Interest rate per year, total repayment, fees, penalties, lender's registration | Real interest far above the advertised rate, hidden fees, an unregistered lender |
| Joining a chitti | Registration of the chit fund, the organiser's details, the written agreement | Unregistered organiser who can vanish with the pot |
| Buying gold | Hallmark and bill showing weight, purity and making charges | Impure gold, making charges you lose on resale |
| Buying a vehicle | Registration certificate, insurance, loan clearance | Stolen or still-under-loan vehicle |
| Insurance policy | What's covered, exclusions, waiting periods | The claim you expect isn't covered |

- Each check is quick: highlighted lines, 2–3 things to look at.
- Skipping the check is allowed. Sometimes it's fine, and sometimes the exact problem the
  papers would have shown turns up later, so checking feels useful, not like a chore.
- Checking can cost a little in-game time or a small fee (an advocate or bank visit), so
  skipping it is a real temptation.
- **Village persona:** papers are harder to read and they may need to ask someone they
  trust (the SHG leader, a teacher, a bank mitra). That itself teaches *where* to get help.

### The Glasses of Clarity

A pair of **"Glasses of Clarity"** the player can put on to see what ambiguous statements
really mean. These statements are written to trap the player in a scam or push them into a
wrong step.

With the glasses on, tricky phrases are highlighted and rewritten in plain words:

| Statement | Through the Glasses of Clarity |
|---|---|
| "Guaranteed 2x returns in 30 days!" | No real investment can guarantee this. Money from new members pays old ones until it collapses. |
| "0% interest*" | *Processing fee and a late fee of ₹500 per missed EMI. |
| "Just lend me your bank account for a few days, I'll pay ₹2,000." | Your account will be used to move stolen money. You can be arrested. |
| "Enter your UPI PIN to receive ₹5,000." | You never enter your PIN to receive money. This takes money out. |
| "Only ₹999 registration fee to confirm your job." | Real employers don't charge you to hire you. |
| "Prices only go up, book this plot today before it's gone." | Pressure to skip checking the documents. |

- **Where they work:** scam inbox messages, loan and EMI offers, chitti and "double your
  money" pitches, Telegram tips groups, recruitment agents, and sales talk during
  purchases.
- **Who gives them:** Tenali Ramakrishna, already the scam mini-game's hint character,
  hands the player the glasses.
- **Keeping it a skill, not a crutch:** limited uses per year, unlocked through the Gyaan
  meter. Players who spot the trap without the glasses earn Gyaan.

---

## The financial toolbox, localized

Every tool uses the local form students already know, and each has a twist that teaches
its risk.

| Tool | Local form | What it teaches | In-game twist |
|---|---|---|---|
| Cash at home | Gullak, tin box | Inflation eats idle money | Theft, "a relative borrowed it", value shrinks each year |
| Bank & post office | Jan Dhan account, RD, FD | Safety, slow steady growth | First account at 18, plus the temptation to rent it out (see scams) |
| Chit fund | Chitti | Group saving, bidding for an early lump sum | Auction mechanic; an unregistered organiser can vanish (check the documents) |
| Savings group | Podupu sangham (SHG) | Group discipline, cheap credit | Mother's or grandmother's storyline |
| Gold | Jewellery, coins | Cultural safety net; gold loans give quick cash | Making charges lost on resale; wedding pressure; check the hallmark |
| Land | "Venture" plot | Long-term and hard to sell | You can't sell half a plot in an emergency; title disputes (check the documents) |
| Livestock | Buffalo, goats | An asset that earns income | Milk income vs. disease risk |
| Market basket | Fictional index and companies | Risk, time, diversification | Crashes, recoveries, hype events |
| Insurance | Health, term, crop | "Money you hope to waste" | Only pays off in some lives, and that's the point |
| Credit | Kirana khata, moneylender, gold loan, bank loan, phone EMI, loan app | Interest and debt traps | The chakravaddi wheel (see local layer); read the real rate in the documents |

Tools unlock by age as well as by Gyaan. A 12-year-old has the gullak and the family. A
bank account comes at 18, and loans and land come in adulthood.

### Government schemes as data, not code

Real schemes like Rythu Bharosa, Aarogyasri and Jan Dhan should appear as event cards,
stored in editable data. Schemes change constantly:

- Rythu Bharosa replaced the earlier Rythu Bandhu scheme as a renamed and somewhat
  enhanced version (South First).
- Kalyana Lakshmi's future became a political fight after a High Court verdict this year
  (Telangana Today).

NGO partners need to be able to update these without a developer.

---

## The local layer: tales, sayings, myths

Each lesson rides on a tale or saying students already know.

| Source | Lesson | Where it lives |
|---|---|---|
| Chakravaddi, the Telugu word for compound interest, literally "wheel interest" | Compounding works both ways | Central visual: a wheel turning for you (a water wheel filling your field) or against you (moneylender, loan app); also the main long-term warning signal |
| "Appu chesi pappu koodu" (borrowing to eat a feast) | Borrowing for show | Festival and wedding event cards; subtle warnings |
| Sheikh Chilli / the Panchatantra Brahmin who daydreams over his pot of flour | Don't count returns before they arrive | Shown on every projection; it is the "assumptions, not promises" guardrail told as a story |
| Grains of rice on a chessboard | Compounding: time matters more than the amount | Investing tutorial |
| The goose that laid golden eggs | "Double your money" schemes | Ponzi event cards |
| Tenali Ramakrishna tricking thieves into watering his garden | Outsmarting scammers | Tenali as the hint character in the scam mini-game, and the giver of the Glasses of Clarity |
| Sumati Shatakam's verse on living where there's a lender, a doctor and a flowing river | Plan for emergencies and access to credit | Insurance and emergency fund lessons |
| Mixed cropping vs. all-cotton | Diversification, in terms a farming family already knows | Better than "eggs in one basket" |
| "Boond boond se sagar banta hai" (drop by drop, the ocean fills) | Small regular saving adds up | Savings streaks, starting with the childhood gullak |
| An old man planting a mango tree he may never eat from | Long-term investing | Market basket intro |

### Financial myths as "The Village Says…" cards

- "Land prices only go up."
- "Gold never loses value."
- "Insurance is wasted money."
- "The share market is satta."
- "Banks are for rich people."
- "Loans from relatives are free."

Each has a kernel of truth, so the game should test the nuance rather than mock it.
Students' parents believe these, and the game needs parents' trust. Don't make the
moneylender or the scammer a recognizable caste or community.

### Art and narration

- Use **Cheriyal scroll painting**, Telangana's own narrative scroll art, as the visual style:
  flat, bold, red backgrounds. It's cheap to produce in 2D and instantly distinctive.
- Make the narrator an **Oggu Katha / Burra Katha** storyteller. Each ending unrolls as a
  scroll telling your life.
- Let the village or city change visibly over the 24 years: mud road to tar road, keypad
  phones to smartphones. The character visibly grows from child to adult.
- Show the goal being built in the background. The house rises brick by brick as you save,
  and bricks come off when you withdraw.
- Use **Pochampally ikat** patterns for UI borders.

### Endings named like tales

- **"The House with Blue Walls"**: goal met
- **"The Golden Cage"**: goal met, but buried in debt
- **"The Wise Detour"**: swapped the goal for a better one
- **"The Wheel Turned Against Me"**: debt trap
- **"The Patient Mango Tree"**: missed the goal, but financially secure

Collecting endings drives replay. Every bad ending includes a way out: talking to family,
restructuring the loan with a bank, or reporting the scam. Heavy realities like farmer
distress or loan-app harassment can appear, but never as a dead end.

---

## The scam module: make it painfully local

Build "Stay financially safe" as a fake phone inbox. Messages arrive, and the player flags
them or responds, with or without the Glasses of Clarity. Messages match the character's
age: game-currency and prize scams for a young teen, account-renting and job scams at
17–25, investment and loan-app scams later. Base the messages on what's actually
happening in Telangana:

- **Part-time job and "task" scams.** Hyderabad alone recorded 6,819 part-time job and
  investment frauds in 2024 (South First).
- **Fake job offers.** Police registered 26,809 fake job scam cases in Telangana between
  January 2024 and August 2025 (ETV Bharat).
- **Digital arrest.** Fraudsters pose as government officials and frighten victims into
  paying.
- **Loan apps.** Harassment by loan apps continued through 2024.
- **Renting out your bank account.** Critical for 17–18-year-olds opening their first account.
  The state's cyber security bureau has arrested people for handing over bank accounts
  to fraudsters (Telangana Today). A senior offering ₹2,000 to "use your account for a
  few days" makes a perfect event card.
- **Fake overseas jobs.** One person was arrested for sending job seekers to Cambodia,
  where they were made to do cybercrime. Add the Gulf recruitment agent too, which is
  very Telangana.
- **UPI "collect" requests.** Teach the rule: you never enter your PIN to receive money.

Every scam ends with one real-world fact a kid can use the next day: report fraud on the
national cybercrime portal or call the **1930 helpline** (UNI).

### Market hype

Add a "Telegram tips group" event with a real number behind it. SEBI found that people
under 30 made up 43% of individual F&O traders in FY26, and about 89% of them lost
money (Free Press Journal).

Keep the market screens calm, so investing feels like planting a tree, not a casino. For the
same reason, avoid spin-wheels and loot boxes as rewards. Gambling-style loops send the
wrong message in a money-literacy game.

---

## Where AI actually earns its place

The rule for the pitch: **the engine computes, the AI explains.** Every number comes from
the simulation. The AI never invents money figures or events.

1. **A "Why?" button on every outcome.** Kids new to finance don't know what to ask, so
   an open chatbot tends to sit unused. A button like "Why did my savings shrink?" with
   three suggested follow-up questions gets used. The AI sees only the game state, never
   personal data, and explains using the player's own numbers.
2. **A mentor character for open questions.** For example, Ammamma/Nani, who runs the
   village SHG, answering in the player's language. Real students type Romanized Telugu
   ("savings ela cheyali") and Hyderabadi Dakhni, so test with that, not clean script.
   Ground her answers in a curated lesson bank. Give her hard rules: no product or stock
   recommendations, decline off-topic questions, stay age-appropriate for the character's
   current age.
3. **Life Review narration.** The engine logs the turning points, and the AI writes your life as
   a short katha in your language.
4. **Teacher/NGO insights.** Anonymous, class-level summaries, e.g. "60% of this class fell
   for the job scam, so spend 10 minutes on it."
5. **Voice for low-literacy players.** Bhashini, the Government of India's language AI
   platform, can handle Telugu and Hindi speech in and out.

Don't use AI to generate events on the fly. It breaks the game balance, it's risky with
minors, and it doesn't scale. Glasses of Clarity rewrites and document-check highlights are
authored content too, not AI-generated.

---

## Scalability: the main criterion, so make it the strongest slide

Frame it as what breaks at each step: 1,500 → 1.5 lakh → 15 lakh students.

- **Offline-first.** The simulation runs on the phone. AI is an optional layer, with pre-written
  answers to the top ~100 questions as a fallback. Pitch line: *AI-enhanced, not
  AI-dependent.*
- **AI cost.** As a rough estimate, about 20 questions per student to a small model costs a
  rupee or two per student. That's trivial at 1,500 and real money at 15 lakh, which is why
  caching common answers matters.
- **Cheap, shared phones.**
  - Small download that runs on 2–3 GB RAM Android phones.
  - Several player profiles per phone, because siblings share.
  - A web-app link NGOs can send on WhatsApp, plus an APK.
- **Content as data.** Event cards (tagged by age and persona type), prices, schemes, tales,
  document sets and Clarity rewrites all live in spreadsheets or JSON, with a column per
  language. The engine stays the same, and a region pack swaps the cultural layer:
  Telangana now, Bihar or Odisha later, written by local NGOs without developers. New
  persona types are data too. This is the best scaling argument.
- **Languages from day one.** Every piece of text sits in a table, not in code. Add Urdu next,
  since it matters in Hyderabad.
- **Telugu text gotcha.** Some game engines render Telugu conjuncts wrongly. Browsers
  and Godot 4 shape Telugu properly. Unity's TextMeshPro has historically broken Indic
  scripts without extra shaping support, so test on day one if using Unity.
- **Classroom mode.** One phone plus a projector: the class votes on each decision by
  show of hands and the teacher taps the choice. This works where students don't have
  their own devices, and the group discussion is where much of the learning happens.
- **NGO-integrated.** Class codes, a one-page facilitator guide per pillar, and a simple
  progress dashboard.
- **Privacy.** These are minors, and India's DPDP Act requires verifiable parental consent to
  process children's personal data. The clean solution is to collect none: no names, no
  phone numbers, anonymous NGO-issued codes, and the AI only ever sees game state.
- **Measuring learning.** Run a five-question check before and after. Also read learning
  from players' choices:
  - Did they build an emergency fund before investing?
  - Did they flag the scam?
  - Did they check the documents before buying or borrowing?
  - Did they act on the long-term warnings?
  - Did they spot traps without the Glasses of Clarity?

  Map results to the four pillars. Vanguard will want proof of impact as much as fun.

---

## 2D or 2.5D?

Go **2D**, with layered backgrounds for a sense of depth. The learning happens in decisions,
not in 3D space. 2D is also:

- lighter on cheap phones and smaller to download
- faster to build in a hackathon
- a natural fit for Cheriyal art, which is flat by nature

For the tech, a web stack (React or Svelte with PixiJS or Phaser) is the easiest to ship as
an installable web app and handles Telugu text natively. Godot 4 is fine if the team already
knows it. Most of the game is cards and menus anyway. (This repo uses React 19 + Vite 7,
see [README.md](../README.md).)

---

## What to build for the hackathon

A thin, polished slice beats a broad, broken one.

- **Two persona types** (village and city), with at least one fully playable and the other at
  least partly playable. 1–2 goals. The life runs from age 11–12 to 36, with childhood years
  moving faster.
- ~25–30 event cards across all four pillars and all four life stages, in English, Telugu and
  Hindi.
- 1 Crossroads chapter.
- Budget jars, savings account, chitti, gold, market basket, one insurance product, and a
  moneylender loan.
- Subtle long-term warnings on the key spending and borrowing choices.
- Document checks for at least a plot purchase and a loan.
- The Glasses of Clarity, working on the scam inbox and at least one loan offer.
- A scam inbox with 5–6 messages.
- The "Why?" button and the mentor.
- The ending scroll plus the Parallel Life comparison (the demo's wow moment).
- Mockups only, not code, for classroom mode, the teacher dashboard and the region-pack
  editor.

### Demo flow for the judges

1. Choose a village persona, age 12, and set a goal in Telugu.
2. Play a childhood year (chocolates vs. the gullak) and see a subtle long-term warning.
3. Jump to 17–18 and dodge a scam using the Glasses of Clarity.
4. Buy a plot or take a loan, and check the documents.
5. Get hit by a hospital bill.
6. Ask the mentor a question in Tenglish.
7. Reach the ending at 36, then rewind and show the parallel life.
8. Close on the scaling slide.

### Two last suggestions

- Test with five or six Inter students before the final round, and put one or two of their
  quotes in the pitch.
- The brief's slide says "six measures of success" but lists seven. Include one slide that
  maps our features to all seven explicitly.

---

## Open questions

1. **Session length.** A 24-year life (12 → 36) in a 45-minute class means about one
   minute per year. Do we speed up childhood (e.g. 2 years per turn until 15), or split the
   life into chapters across sessions?
2. **Jumping ahead.** Should Grade 11–12 players be able to start at 17 with an
   auto-generated childhood, for short sessions?
3. **Glasses of Clarity limits.** How many uses per year, and how are more earned?
4. **Persona balance.** How big should the knowledge gap between village and city
   personas be at the start, and how quickly can it close?

---

## Change log

Changes made on Oct 10, 2026 to the original PDF design:

1. **Underprivileged persona types and an age 11–12 to 36 life.**
   - Personas are grouped as **village** (no money, no knowledge) and **city** (no money,
     some knowledge).
   - Every persona starts at **11 or 12** and plays to **36**. This replaces the original
     start at 17 and the separate pocket-money mode.
   - Options, needs and wants change as the character ages: chocolates, toys and clothes
     for a child; new clothes, a vehicle and vacations for an adult.
2. **Subtle long-term warnings**, at every age, showing that short-term decisions can be
   bad in the long term.
3. **Document checks.** The player can see the documents for any asset purchase or loan
   (e.g. a plot or any loan). Lesson: always check documents.
4. **Glasses of Clarity.** A tool that reveals what ambiguous statements, meant to trap the
   player in a scam or a wrong step, really mean.

---

## Sources

- Rythu Bharosa replacing Rythu Bandhu – South First
- Kalyana Lakshmi scheme row – Telangana Today
- Cybercrime in Hyderabad 2024 – South First
- Fake job scams in Telangana – ETV Bharat
- TGCSB arrests (mule accounts, Cambodia jobs) – Telangana Today
- Cyberabad police and the 1930 helpline – UNI
- SEBI study on young F&O traders – Free Press Journal
