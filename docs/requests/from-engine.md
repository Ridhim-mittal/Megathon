# Requests from the engine session

Add requests for other areas here (newest first). Each owner reads the requests addressed to them.

## Engine v1 landed (`src/engine/`) — notes for Content and UI

The engine is complete and tested against fixture content (`src/engine/__fixtures__/content.js`).
Section 7 of `docs/GAME_SPEC.md` now has an **Engine rules** subsection that fills the gaps below;
`src/engine/README.md` lists the whole API with an example per action and selector.

### For Content (Claude B)

1. **Run `npm run validate:content`** once `src/content/index.js` exists. It checks ids, lesson
   windows, the effects vocabulary, scheduled and document ids, clarity phrases (verbatim per
   language), glossary and `{cast:…}` tokens, and that every lesson has a card. Missing `hi`/`te`
   are warnings only.
2. **JSON imports in `index.js`:** please write them as
   `import lessons from "./lessons.json" with { type: "json" };` so Node (tests, the validator) can
   import the file. Vite accepts the same syntax. The validator falls back to reading the JSON files
   from disk if the import fails, but the engine tests cannot.
3. **Flags the engine reads:** `goal_reached` (set it when the dream is bought), `money_mule` /
   `fraud` / `legal_trouble` / any `legal_*` (wrong-path modifier), `owns_phone` or
   `has_smartphone` (loan apps become reachable for forced borrowing), `chit_unregistered` (a chit
   can collapse). Crisis cards should require one of `crisis_joy_low`, `crisis_joy_high`,
   `crisis_family_low`, `crisis_family_high` in `requires.flags` (the engine sets it while the card
   is shown).
4. **Money semantics:** `jar` moves money between cash and a jar (a gift into a jar is
   `{ "cash": 500, "jar": { "goal": 500 } }`). A `loan` from a cash source puts the money in cash, so
   pair it with `cash` or `open` to spend it; `bnpl_emi`, `credit_card` and `education` pay the
   seller directly. Override with `"disburse": "cash" | "direct"` on the loan. `income` takes effect
   from the next year.
5. **Optional extras the engine accepts:** `start` in `storyline.json` (`cash`, `jars`, `meters`
   as absolute values, `flags`, `income`, `effects`); `effects` on a want; `wrong_path` and
   `no_safety_net` sections in `endings.json` keyed by goal.
6. **Shock kinds** with insurance cover: `health`, `hospital`, `accident`, `death`, `crop`,
   `flood`, `drought`. Other kinds (`theft`, `fire`, `repair`, `job_loss`, `legal`, `other`) are
   paid without insurance.
7. Card numbers in text are not inflated by the engine; shop prices and goal costs are.

### For UI (Claude C)

1. Import only from `src/engine/index.js`. Until `src/content/index.js` exists, Vite resolves it to
   the engine's fixture content (one warning in the console), so the real engine can be wired now.
2. An invalid action never throws: it returns the same state with `state.error.message`.
3. `budgetRules.monthlyIncome` is **take-home** (gross minus EMIs and premiums); jars must sum to it.
   `SET_BUDGET` commits and moves to the shop. `checkBudget(state, jars)` validates live.
4. New phase **`minigame`** (Sahukar's chair, once, after the cards of a seeded year at 17–22):
   show it from `select.minigame(s).config`, then send `MINIGAME_RESULT { id, score }`, or
   `ADVANCE` to skip.
5. New action **`USED_GLOSSARY { termId }`** when a glossary chip is opened (gyaan, capped with
   Ask Ammamma at 3 a year).
6. Habit echoes and headlines come as ids plus values with an English fallback
   (`yearSummary.habitEcho`, `yearSummary.headline`); please localize them in `src/i18n`.
7. `select.world(s)` exposes this life's inflation and market returns for "How this world works";
   `ASSUMPTIONS` has every number with comments.
8. Ending modifiers: `wrong_path` and `no_safety_net`; `select.ending(s).modifierTexts` holds their
   content text if any.

### For Person 4 (docs)

- `README.md` could mention `npm run validate:content` next to `npm test` (CLAUDE.md already does).
