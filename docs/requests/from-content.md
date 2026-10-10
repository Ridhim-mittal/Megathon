# Requests from the content session

Add requests for other areas here (newest first). Each owner reads the requests addressed to them.

---

## 2026-10-10 — Village storyline v1 (English) is in `src/content/`

`src/content/index.js` exports `{ lessons, glossary, goals, wants, documents, quiz, faq, minigames, storylines }`
as section 7 says. The village has 99 cards: 32 lesson cards covering L01–L24 (8 lessons have two
variants), 3 crossroads, 4 teach-backs (one per pillar), 28 consequence cards, 8 crisis cards and
24 random, scam, calamity and windfall cards. There are also 6 document packs, 56 FAQ answers, the
pre and post quiz, and the Sahukar mini-game.

### For Engine (Claude A)

1. **Childhood has too few card slots.** L01–L06 all fall within 11–14, but the `child` stage draws
   1 card a year, which gives 4 slots for 6 required lessons. Please draw 2 cards in some childhood
   years, or treat "cards per year" as a minimum when required lessons are still pending.
2. **Loan convention.** I followed the spec's phone example: a `loan` effect pays for whatever the
   card buys and does **not** add spendable cash. So no card has `loan` plus a matching `cash: -X`.
3. **New optional card fields** (small, ignorable):
   - `trigger: { "meter": "joy" | "family", "at": 0 | 100 }` on `kind: "crisis"` cards. There are two
     variants per extreme: `.a` for ages 11–18 and `.b` for 19–36.
   - `minigame: "sahukar"` on `village.young.sahukar_desk.a`. Choice `play` should launch the
     Sahukar mini-game. Choice `skip` is a normal choice.
   - Card ids use the stage token `any` for cards that span stages (`village.any.crisis_joy_low.a`).
4. **Wrong-path flags.** The `wrong_path` modifier should come from `wrong_mule`, `wrong_hawala`,
   `wrong_fakedoc`, `wrong_ponzi` and `wrong_fraud`. `wrong_betting` is a habit, not legal trouble.
   `came_clean` marks that the player took the way back. Please show it in the wrong-path section.
5. **Income comes from cards.** Start (`storyline.json` → `start`): ₹200 a month pocket money at 11.
   Then L08 sets ₹1,200–1,800. Crossroads 1 sets ₹2,500–15,000. Consequences set ₹6,000–18,000 at
   19–23. Crossroads 2 sets ₹14,000–40,000. If you also have wage assumptions, cards should override
   them.
6. **Insurance flags.** `family_health_card` (Aarogyasri or Ayushman) and `pmjjby` are set as flags
   because `open` takes only one product. Please count `family_health_card` as health cover in the
   `shock` waterfall.
7. **Education loans need a moratorium.** Repayment starts after the course: about 3 years after
   crossroads 1 (degree), and about 4 years for Chinni's nursing loan.
8. **The dream purchase.** At crossroads 3 (`village.settle.dream_papers.a`, ages 34–35), the choices
   set `dream_bank_loan`, `dream_prakash`, `bought_back_212` or `dream_waited` (plus `checked_plot`).
   The engine still decides whether the goal is reached.
9. **Scheduled cards and age windows.** The twist card `village.settle.tin_box.a` is scheduled
   `inYears: 7` from every crossroads 2 choice (age 32–34). Please fire scheduled consequence cards
   even when the age lands one year outside their `ages`.
10. **Numbers I assumed** (please match these in `assumptions.js`, or tell me yours and I'll update the
    cards):
    - inflation 6%
    - savings 3%, FD and RD about 6.5–7%, PPF 7.1%, index fund about 10% on average (with bad
      years), gold about 8%
    - moneylender 36%, SHG 12%, gold loan 10%, KCC 7%, education 10%, Mudra 10%, home 9%, bank
      personal 14%
    - credit card 42%, BNPL/EMI with the ₹1,200 fee, loan app 48% plus a 20% fee
    - PMSBY ₹20 for ₹2 lakh, PMJJBY ₹436 for ₹2 lakh, term ₹50 lakh for about ₹8,000 a year
11. **Other formats I defined:**
    - `quiz.json` items: `{ id, lesson, q, options: [text], answer: index, explain }`.
    - `faq.json`: `{ id, q, a, lesson }`, as in the spec.
    - `minigames/sahukar.json`: borrowers with three offers each, every offer holding `totalPaid`,
      `profit`, `rateYearly` and `reveal`. The score is the total profit (max ₹18,300). Rewards are
      `{ gyaan: 4, lesson: "applied" }` for L14.
12. **Shock kinds used:** `health`, `flood`, `drought`, `repair`.

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
