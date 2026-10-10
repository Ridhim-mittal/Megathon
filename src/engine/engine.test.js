import test from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "./engine.js";
import { hashSeed, makeRandom } from "./rng.js";
import { fixtureContent } from "./__fixtures__/content.js";
import { assertConserved, playLife } from "./__fixtures__/players.js";

const E = createEngine(fixtureContent);
const params = { storylineId: "village", goalId: "house", seed: 1234, playerName: "Sravani" };

// Advance until a predicate holds, choosing each card's choice with `pick`.
function runUntil(s, done, pick = (card) => card.choices[0].id) {
  for (let i = 0; !done(s) && s.phase !== "ending" && i < 5000; i++) {
    const action = s.phase === "card" ? { type: "CHOOSE", choiceId: pick(E.select.currentCard(s), s) } : { type: "ADVANCE" };
    const next = E.step(s, action);
    assert.equal(next.error, null, next.error?.message);
    s = next;
  }
  return s;
}

const deepFreeze = (o) => {
  if (o && typeof o === "object") {
    for (const v of Object.values(o)) deepFreeze(v);
    Object.freeze(o);
  }
  return o;
};

test("the seeded RNG is reproducible and spread out", () => {
  const a = makeRandom({ rng: hashSeed("demo") });
  const b = makeRandom({ rng: hashSeed("demo") });
  const xs = Array.from({ length: 1000 }, () => a());
  assert.deepEqual(xs, Array.from({ length: 1000 }, () => b()));
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  const mean = xs.reduce((p, q) => p + q, 0) / xs.length;
  assert.ok(Math.abs(mean - 0.5) < 0.05);
  assert.notEqual(hashSeed("demo"), hashSeed("demo2"));
});

test("the same seed and choices give an identical life", () => {
  const a = playLife(E, params, { seed: 99 });
  const b = playLife(E, params, { seed: 99 });
  assert.deepEqual(a, b);
  assert.equal(a.phase, "ending");
  const c = playLife(E, { ...params, seed: 4321 }, { seed: 99 });
  assert.notDeepEqual(c.world, a.world);
});

test("a string seed (?seed=demo) works and is stable", () => {
  const a = E.createLife({ ...params, seed: "demo" });
  const b = E.createLife({ ...params, seed: "demo" });
  assert.deepEqual(a, b);
  assert.equal(a.seed, hashSeed("demo"));
});

test("step is pure: the input state is never changed", () => {
  let s = E.createLife(params);
  for (let i = 0; i < 400 && s.phase !== "ending"; i++) {
    const frozen = deepFreeze(structuredClone(s));
    const action = s.phase === "card" ? { type: "CHOOSE", choiceId: E.select.currentCard(frozen).choices.at(-1).id } : { type: "ADVANCE" };
    s = E.step(frozen, action); // throws in strict mode if it tried to mutate
    assert.equal(s.error, null);
  }
});

test("phases run intro → budget → shop → card ↔ outcome → yearEnd, from 11 to 36", () => {
  let s = E.createLife(params);
  assert.equal(s.phase, "intro");
  assert.equal(s.age, 11);
  s = E.step(s, { type: "ADVANCE" });
  assert.equal(s.phase, "budget");
  s = E.step(s, { type: "ADVANCE" });
  assert.equal(s.phase, "shop");
  s = E.step(s, { type: "SKIP_SHOP" });
  assert.equal(s.phase, "card");
  s = E.step(s, { type: "CHOOSE", choiceId: E.select.currentCard(s).choices[0].id });
  assert.equal(s.phase, "outcome");
  assert.ok(E.select.lastOutcome(s).why);
  s = runUntil(s, (x) => x.phase === "yearEnd");
  assert.equal(E.select.yearSummary(s).age, 11);
  s = E.step(s, { type: "ADVANCE" });
  assert.equal(s.age, 12);
  s = runUntil(s, (x) => x.phase === "ending");
  assert.equal(s.age, 36);
  assert.equal(s.years.length, 26);
  assert.ok(E.select.ending(s).id);
  assert.match(E.step(s, { type: "ADVANCE" }).error.message, /over/);
});

test("invalid actions return the same state with an error", () => {
  const s = E.step(E.createLife(params), { type: "ADVANCE" });
  const bad = E.step(s, { type: "CHOOSE", choiceId: "nope" });
  assert.ok(bad.error);
  assert.equal(bad.phase, s.phase);
  assert.deepEqual({ ...bad, error: null }, s);
  assert.ok(E.step(s, { type: "NOPE" }).error);
  const ok = E.step(s, { type: "ADVANCE" });
  assert.equal(ok.error, null);
});

test("budget rules: jars must sum to take-home income, needs above the minimum, invest locked until L17", () => {
  let s = E.step(E.createLife(params), { type: "ADVANCE" });
  const rules = E.select.budgetRules(s);
  assert.equal(rules.grossMonthly, 200);
  assert.equal(rules.monthlyIncome, 200);
  assert.equal(rules.step, 10);
  assert.equal(rules.minNeeds, 40);
  assert.ok(!rules.jarsUnlocked.includes("invest"));
  assert.ok(rules.required);
  assert.ok(E.checkBudget(s, rules.suggested).ok);
  const tooMuch = E.step(s, { type: "SET_BUDGET", jars: { needs: 100, wants: 100, emergency: 10, goal: 0 } });
  assert.match(tooMuch.error.message, /add up/);
  assert.match(E.step(s, { type: "SET_BUDGET", jars: { needs: 30, wants: 170 } }).error.message, /at least/);
  assert.match(E.step(s, { type: "SET_BUDGET", jars: { needs: 45, wants: 155 } }).error.message, /steps/);
  assert.match(E.step(s, { type: "SET_BUDGET", jars: { needs: 40, wants: 0, invest: 160 } }).error.message, /invest/);
  s = E.step(s, { type: "SET_BUDGET", jars: { needs: 40, wants: 0, emergency: 60, goal: 100 } });
  assert.equal(s.error, null);
  assert.equal(s.money.jars.goal, 1200);
  assert.equal(s.money.jars.emergency, 720);
  assert.equal(s.money.wallet, 0);
  assertConserved(s);
});

test("EMIs and premiums come out first: take-home shrinks by the auto-paid amount", () => {
  let s = runUntil(E.createLife(params), (x) => x.loans.length > 0 && x.phase === "yearEnd");
  s = E.step(s, { type: "ADVANCE" });
  const rules = E.select.budgetRules(s);
  assert.ok(rules.autoPaidMonthly > 0);
  assert.ok(rules.monthlyIncome <= rules.grossMonthly - rules.autoPaidMonthly);
  assert.ok(rules.monthlyIncome > rules.grossMonthly - rules.autoPaidMonthly - rules.step);
});

test("the wants shop spends only the wants jar and inflates prices", () => {
  let s = E.step(E.createLife(params), { type: "ADVANCE" });
  s = E.step(s, { type: "SET_BUDGET", jars: { needs: 40, wants: 160, emergency: 0, goal: 0 } });
  const items = E.select.shopItems(s);
  assert.ok(items.length > 0);
  const bat = items.find((i) => i.id === "want.cricket_bat");
  const joy = s.meters.joy;
  s = E.step(s, { type: "BUY_WANT", itemId: bat.id });
  assert.equal(s.error, null);
  assert.equal(s.money.wallet, 1920 - 300);
  assert.equal(s.meters.joy, joy + 5);
  assert.match(E.step(s, { type: "BUY_WANT", itemId: bat.id }).error.message, /Already/);
  s = runUntil(s, (x) => x.age === 20 && x.phase === "shop");
  const trip = E.select.shopItems(s).find((i) => i.id === "want.trip");
  assert.ok(trip.price > 4000, "prices rise with inflation");
});

test("lesson status follows the choice quality and gyaan grows", () => {
  let s = runUntil(E.createLife(params), (x) => x.phase === "card" && E.select.currentCard(x).kind === "lesson");
  const card = E.select.currentCard(s);
  const gyaan = s.meters.gyaan;
  const good = fixtureContent.storylines.village.cards.find((c) => c.id === card.id).choices.find((c) => c.quality === "good");
  s = E.step(s, { type: "CHOOSE", choiceId: good.id });
  assert.equal(s.lessons[card.lesson], "applied");
  assert.equal(E.select.lastOutcome(s).lesson.to, "applied");
  assert.ok(s.meters.gyaan >= gyaan + 4);
  const report = E.select.lessonReport(s);
  assert.equal(report.totals.applied, 1);
  assert.equal(report.gyaanCards, 1);
});

test("every lesson is drawn inside its window, crossroads always appear", () => {
  const s = runUntil(E.createLife(params), () => false);
  for (const l of E.select.lessonReport(s).lessons) {
    assert.ok(l.age >= l.ages[0] && l.age <= l.ages[1], `${l.id} at ${l.age}`);
    assert.notEqual(l.status, "unseen");
  }
  const crossroads = s.history.filter((h) => h.kind === "crossroads").map((h) => h.cardId);
  assert.equal(crossroads.length, 3);
});

test("Ammamma's glasses: a charge reveals a card; applied lessons are revealed for free", () => {
  const tinBox = (x) => x.phase === "card" && x.current.cardId === "village.child.tin_box.a";
  for (let seed = 1; seed < 50; seed++) {
    let s = runUntil(E.createLife({ ...params, seed }), tinBox);
    if (!tinBox(s)) continue;
    let card = E.select.currentCard(s);
    assert.equal(card.clarity[0].revealed, false);
    assert.equal(card.clarity[0].truth, null);
    const charges = s.glasses.charges;
    s = E.step(s, { type: "USE_GLASSES" });
    card = E.select.currentCard(s);
    assert.equal(s.glasses.charges, charges - 1);
    assert.equal(card.clarity[0].revealed, true);
    assert.ok(card.clarity[0].truth.en);
    assert.ok(E.step(s, { type: "USE_GLASSES" }).error);
    // Once L04 is applied, the phrase is free.
    const applied = structuredClone(s);
    applied.lessons.L04 = "applied";
    applied.current.glasses = false;
    const free = E.select.currentCard(applied);
    assert.equal(free.clarity[0].free, true);
    assert.equal(free.clarity[0].revealed, true);
    assert.match(E.step(applied, { type: "USE_GLASSES" }).error.message, /already see/);
    return;
  }
  assert.fail("tin box card never drawn");
});

test("documents: an uncaught problem schedules its consequence; catching it does not", () => {
  const plot = (x) => x.phase === "card" && x.current.cardId === "village.settle.plot.a";
  let checked = { caught: false, missed: false };
  for (let seed = 1; seed < 200 && !(checked.caught && checked.missed); seed++) {
    const s = runUntil(E.createLife({ ...params, seed }), plot, (c) => c.choices.at(-1).id);
    if (!plot(s) || s.docs["doc.plot_sale"].variant !== "double_sold") continue;
    let open = E.step(s, { type: "OPEN_DOCUMENT", docId: "doc.plot_sale" });
    assert.equal(open.meters.gyaan, Math.min(100, s.meters.gyaan + 1));
    const doc = E.select.currentCard(open).document;
    assert.equal(doc.problem, null, "the problem stays hidden until caught");
    // Missed: buy without flagging.
    const missed = E.step(open, { type: "CHOOSE", choiceId: "buy" });
    assert.equal(missed.lastOutcome.document.caught, false);
    assert.equal(missed.lastOutcome.document.consequence.card, "village.settle.plot_dispute.a");
    assert.ok(missed.scheduled.some((x) => x.card === "village.settle.plot_dispute.a"));
    // Caught: flag the red line first.
    open = E.step(open, { type: "FLAG_LINE", docId: "doc.plot_sale", lineId: "l2" });
    const line = E.select.currentCard(open).document.lines.find((l) => l.id === "l2");
    assert.equal(line.isRedFlag, true);
    assert.ok(line.explain.en);
    const caught = E.step(open, { type: "CHOOSE", choiceId: "buy" });
    assert.equal(caught.lastOutcome.document.caught, true);
    assert.equal(caught.lastOutcome.document.consequence, null);
    assert.ok(!caught.scheduled.some((x) => x.card === "village.settle.plot_dispute.a"));
    // Verifying costs money and reveals everything.
    const verified = E.step(s, { type: "VERIFY_DOCUMENT", docId: "doc.plot_sale" });
    if (!verified.error) {
      assert.equal(E.select.currentCard(verified).document.verified, true);
      assertConserved(verified);
    }
    checked = { caught: true, missed: true };
  }
  assert.ok(checked.caught && checked.missed, "no double-sold plot found");
});

test("echoes: a scheduled consequence points back to the choice that caused it", () => {
  const bet = (x) => x.phase === "card" && x.current.cardId === "village.teen.betting.a";
  for (let seed = 1; seed < 100; seed++) {
    let s = runUntil(E.createLife({ ...params, seed }), bet);
    if (!bet(s)) continue;
    s = E.step(s, { type: "CHOOSE", choiceId: "bet" });
    assert.equal(s.echoes.at(-1).level, 3);
    s = runUntil(s, (x) => x.phase === "card" && x.current.cardId === "village.teen.betting_debt.a");
    const card = E.select.currentCard(s);
    assert.equal(card.echoFrom.cardId, "village.teen.betting.a");
    assert.equal(card.echoFrom.age, s.age - 1);
    assert.ok(card.echoFrom.hint.en);
    assert.ok(E.select.echoes(s).choices.find((e) => e.cardId === "village.teen.betting.a").fired);
    return;
  }
  assert.fail("betting card never drawn");
});

test("a crisis card is drawn when joy hits 0", () => {
  let s = runUntil(E.createLife(params), (x) => x.phase === "outcome" && x.age >= 13);
  const low = structuredClone(s);
  low.meters.joy = 0;
  const next = runUntil(E.step(low, { type: "ADVANCE" }), (x) => x.phase === "card" || x.phase === "yearEnd");
  assert.equal(next.current.cardId, "village.any.crisis_joy_low.a");
  assert.equal(E.select.currentCard(next).crisis, "joy_low");
  assert.ok(next.flags.includes("crisis_joy_low"));
  const after = E.step(next, { type: "CHOOSE", choiceId: "care" });
  assert.ok(!after.flags.includes("crisis_joy_low"));
  assert.equal(after.meters.joy, 30);
});

test("Sahukar's chair runs once in the teen or young stage", () => {
  let s = runUntil(E.createLife(params), (x) => x.phase === "minigame");
  assert.equal(s.phase, "minigame");
  assert.ok(s.age >= 17 && s.age <= 22);
  const mg = E.select.minigame(s);
  assert.equal(mg.id, "sahukar");
  assert.ok(mg.config);
  const gyaan = s.meters.gyaan;
  s = E.step(s, { type: "MINIGAME_RESULT", id: "sahukar", score: 4200 });
  assert.equal(s.phase, "yearEnd");
  assert.equal(s.meters.gyaan, Math.min(100, gyaan + 3));
  assert.notEqual(s.lessons.L14, "unseen");
  assert.ok(E.select.minigame(s).done);
});

test("mentor and glossary gyaan is capped per year", () => {
  let s = E.step(E.createLife(params), { type: "ADVANCE" });
  const g = s.meters.gyaan;
  for (let i = 0; i < 6; i++) s = E.step(s, { type: i % 2 ? "USED_GLOSSARY" : "ASKED_MENTOR" });
  assert.equal(s.meters.gyaan, g + 3);
});

test("endings: the dream flag with no debt is dream_on_time; the wrong path adds a modifier", () => {
  const goodOrFirst = (card) => {
    if (card.id === "village.settle.crossroads_dream.a") return "loan"; // sets goal_reached
    const raw = fixtureContent.storylines.village.cards.find((c) => c.id === card.id);
    return (raw.choices.find((c) => c.quality === "good") ?? raw.choices[0]).id;
  };
  const s = runUntil(E.createLife(params), () => false, goodOrFirst);
  const ending = E.select.ending(s);
  assert.ok(s.flags.includes("goal_reached"));
  assert.equal(ending.id, "dream_on_time");
  assert.equal(ending.reached, true);
  assert.equal(ending.highInterestDebt, 0);
  assert.ok(ending.debt > 0, "a home loan is debt, but manageable");
  assert.deepEqual(ending.modifiers, []);
  assert.ok(ending.text.en);
  assert.ok(ending.storyteller.en);

  const mule = (card) => (card.id === "village.young.mule.a" ? "lend" : card.choices.at(-1).id);
  const bad = runUntil(E.createLife(params), () => false, mule);
  assert.ok(bad.flags.includes("money_mule"));
  assert.ok(E.select.ending(bad).modifiers.includes("wrong_path"));
});

test("selectors return plain data the UI can render", () => {
  let s = runUntil(E.createLife(params), (x) => x.phase === "card" && x.age >= 16);
  const hud = E.select.hud(s);
  for (const k of ["age", "cash", "savings", "investments", "debt", "netWorth"]) assert.equal(typeof hud[k], "number");
  assert.equal(hud.stage, "teen");
  assert.equal(hud.netWorth, hud.cash + hud.wallet + hud.jars.emergency + hud.jars.goal + Object.values(hud.products).reduce((a, b) => a + b, 0) - hud.debt);
  assert.deepEqual(Object.keys(hud.dream).sort(), ["goalId", "pct", "reached", "reachedAge", "saved", "target"]);
  const card = E.select.currentCard(s);
  assert.ok(card.title.en && card.text.en && card.choices.length >= 2);
  assert.ok(!("quality" in card.choices[0]) && !("effects" in card.choices[0]), "choices do not leak their quality");
  s = runUntil(s, (x) => x.phase === "ending");
  assert.equal(E.select.timeline(s).length, s.history.length);
  assert.ok(E.select.timeline(s)[0].chosen.label.en);
  assert.ok(Object.keys(E.select.world(s).inflation).length === 26);
  assert.ok(Array.isArray(E.select.echoes(s).habits));
});
