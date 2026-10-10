# Requests from the content session

Add requests for other areas here (newest first). Each owner reads the requests addressed to them.

---

## 2026-10-10 — Village storyline v1 (English) is in `src/content/`

`src/content/index.js` exports `{ lessons, glossary, goals, wants, documents, quiz, faq, minigames, storylines }`
as section 7 says. The village has 98 cards: 32 lesson cards covering L01–L24 (8 lessons have two
variants), 3 crossroads, 4 teach-backs (one per pillar), 28 consequence cards, 8 crisis cards and
23 random, scam, calamity and windfall cards. There are also 6 document packs, 56 FAQ answers, the
pre and post quiz, and the Sahukar mini-game.

### For Engine (Claude A)

After your engine landed, I aligned the content with section 7's engine rules. Loans now use your
default rates (the sahukar is "₹2 per ₹100 a month"). Loans that pay for something use
`"disburse": "direct"`. Gifts into jars use `cash` + `jar`. Insurance `amount` is the cover.
Crisis cards use `requires.flags`. Wrong paths use `legal_*` flags. Variants share id prefixes.
The duplicate Sahukar card is gone (your `minigame` phase runs it). I played 60 seeded lives
through `step`: 0 errors, all 24 lessons seen in every life, and 92 of the 98 cards drawn.

1. **Balance: good players end with no safety net.** When a life takes every default choice and
   the suggested budget, 15 of 20 lives end as `secure_no_dream` + `no_safety_net`. The emergency
   jar is ₹0 at 36, because shocks drain it and the suggested split doesn't rebuild it. Could the
   suggested budget refill the emergency jar to 3 months of needs first?
2. **`family_health_card` flag** (Aarogyasri / Ayushman, set at L16) has no premium. Could the
   `shock` waterfall treat it as `insurance_health` with a ₹5 lakh cover? Without that, Ammamma's
   and Nanna's hospital cards still charge the player.
3. **Childhood slots.** L01–L06 need 6 cards in ages 11–14. It works in all 60 test lives, so
   nothing is needed unless you change the draw.
4. **Flags content sets that you may want to use:** `came_clean` (took the way back),
   `betting_heavy`, `knows_wound` (the twist), and `checked_plot`, `dream_bank_loan`,
   `dream_prakash`, `bought_back_212` and `dream_waited` (crossroads 3). Crossroads 3 puts the loan
   money into the goal jar, or buys `land` for the house goal. I don't set `goal_reached`; your
   savings check decides.
5. **Formats I defined:**
   - `quiz.json` items: `{ id, lesson, q, options: [text], answer: index, explain }`.
   - `minigames/sahukar.json`: borrowers with three offers each, every offer holding `totalPaid`,
     `profit`, `rateYearly` and `reveal`. The score is the total profit (max ₹18,300).

### For UI (Claude C)

1. **Cast.** The roleIds are `mentor`, `sibling`, `friend`, `tempter`, `agent`, `father`, `mother`,
   `shopkeeper`, `lender`, `teacher`, `banker` and `buffalo` (Bujji, the family buffalo). Speakers
   can also be `narrator` and `headline`.
2. **Running visual gag.** Lucky Prakash's sunglasses get bigger each time he appears: at 11–14,
   15–19, 18–23, 24–32 and 34–35. Ammamma's glasses are thick and tied with black thread.
3. **The narrator is secretly Chinni.** `endings.json` → `storyteller` reveals it, and the last intro
   panel hints at it.
4. **Rival life.** `storyline.json` → `rival.milestones` lists Chintu's life by age, for the Parallel
   Life or endings screen.
5. **Coming soon.** `storylines.city` has `playable: false`, `cards: []` and `endings: {}`.
6. **Glossary names.** Practice and scheme names already have `hi` and `te` (chit → कमेटी / చిట్టీ).
   Everything else is English only for now. Hindi and Telugu come next session.
