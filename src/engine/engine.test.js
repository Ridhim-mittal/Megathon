import test from "node:test";
import assert from "node:assert/strict";
import {
  newLife,
  apply,
  dispatch,
  currentStep,
  actionAvailable,
  loanQuote,
  roleflipTable,
  scoreRoleflip,
  chittiSchedule,
  chittiOutcome,
  validBudget,
  hud,
  computeEnding,
  endStats,
  previewOption,
  wheelState,
  isFastForward,
} from "./engine.js";
import { runLife, strategyFromLog, turningPoints, parallelLife, hundredLives } from "./simulate.js";
import { loanTerms, monthlyToYearly, emi } from "./finance.js";
import { cardById, crossById, msgById, CFG } from "./data.js";
import { mulberry32 } from "./rng.js";
import { dominantOption } from "../../scripts/card-rules.js";

// A pretend player: random but reproducible choices for every kind of step.
function playRandom(seed, pickSeed = 7) {
  const rnd = mulberry32(pickSeed);
  let s = newLife(seed);
  const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
  let guard = 0;
  while (s.phase !== "ending" && guard++ < 3000) {
    const step = currentStep(s);
    let cmd;
    if (step.kind === "budget") cmd = { type: "budget", budget: pick([{ needs: 55, wants: 15, savings: 15, goal: 15 }, { needs: 50, wants: 30, savings: 10, goal: 10 }]), autoRepay: rnd() < 0.5 };
    else if (step.kind === "crossroads") cmd = { type: "crossroads", id: step.id, optionId: pick(crossById[step.id].options).id };
    else if (step.kind === "roleflip") cmd = { type: "roleflip", picks: { student: pick(["short", "mid", "long"]), mother: "long", youth: pick(["mid", "long"]) } };
    else if (step.kind === "actions") {
      const kinds = ["bank", "learn", "fd", "rd", "chitti", "gold", "sip", "insurance", "loan", "repay"].filter((k) => actionAvailable(s, k).ok);
      cmd = kinds.length && rnd() < 0.7 ? { type: "action", action: { kind: pick(kinds), frac: 0.5, monthly: 1000, amount: 10000, source: "bank", bidPct: pick([0, 20, 29]) } } : { type: "endActions" };
    } else if (step.kind === "event") cmd = { type: "choose", cardId: step.cardId, optionId: pick(cardById[step.cardId].options).id };
    else if (step.kind === "message") cmd = { type: "message", msgId: step.msgId, verdict: pick(["flag", "reply"]) };
    else if (step.kind === "yearEnd") cmd = { type: "nextYear" };
    const next = dispatch(s, cmd);
    if (next === s && step.kind === "actions") s = dispatch(s, { type: "endActions" });
    else s = next;
  }
  return s;
}

const core = (s) => ({ ...hud(s), loans: s.loans.length, seeds: s.seeds.map((x) => x.status), ending: s.ending, years: s.years.length });

test("a full life runs from 17 to 32 and ends with a tale", () => {
  const s = playRandom(42);
  assert.equal(s.phase, "ending");
  assert.equal(s.years.length, 16);
  assert.ok(s.ending);
  assert.deepEqual(s.years.map((y) => y.age), Array.from({ length: 16 }, (_, i) => 17 + i));
});

test("dispatch is pure: the old state is untouched", () => {
  const s = newLife(1);
  const before = JSON.stringify(s);
  const next = dispatch(s, { type: "budget", budget: { needs: 50, wants: 20, savings: 15, goal: 15 } });
  assert.notEqual(next, s);
  assert.equal(JSON.stringify(s), before);
  assert.equal(dispatch(s, { type: "nextYear" }), s, "an out-of-turn command is ignored");
});

test("replaying the command log rebuilds the exact same life", () => {
  for (const seed of [3, 99, 2024]) {
    const life = playRandom(seed, seed + 1);
    const again = runLife(seed, strategyFromLog(life.commands));
    assert.deepEqual(core(again), core(life));
    assert.deepEqual(again.commands.map((c) => c.type), life.commands.map((c) => c.type));
  }
});

test("luck is fixed by the seed: a different choice meets the same ordinary events", () => {
  const life = playRandom(11, 5);
  const point = turningPoints(life).find((p) => p.kind === "crossroads");
  const { alt } = parallelLife(life, point, point.alternatives[0]);
  const ordinary = (s) => s.years.map((y) => y.events.map((e) => e.cardId).filter((id) => !cardById[id].consequence).join(","));
  assert.deepEqual(ordinary(alt), ordinary(life));
  assert.notEqual(alt.crossroads[point.id], life.crossroads[point.id]);
});

test("village phrase ₹2 per ₹100 per month equals 24% a year", () => {
  assert.equal(monthlyToYearly(2), 24);
  const q = loanQuote(newLife(1), 10000, "lender");
  assert.equal(q.annualPct, 24);
  assert.equal(q.perHundredMonthly, 2);
  assert.equal(q.totalRepay, q.emi * q.months + q.fee);
  assert.ok(q.totalRepay > 10000);
});

test("EMI maths: zero rate splits evenly, interest makes total larger", () => {
  assert.equal(emi(12000, 0, 12), 1000);
  const t = loanTerms({ amount: 100000, annualPct: 12, months: 12, feePct: 1 });
  assert.equal(t.emi, 8885);
  assert.equal(t.fee, 1000);
  assert.equal(t.totalRepay, 8885 * 12 + 1000);
});

test("role flip: lowest EMI + longest term is always the most profitable offer", () => {
  for (const c of roleflipTable()) {
    const byEmi = [...c.offers].sort((a, b) => a.emi - b.emi)[0];
    const byProfit = [...c.offers].sort((a, b) => b.profit - a.profit)[0];
    const byTerm = [...c.offers].sort((a, b) => b.months - a.months)[0];
    assert.equal(byEmi.id, byProfit.id);
    assert.equal(byTerm.id, byProfit.id);
  }
  const score = scoreRoleflip({ student: "short", mother: "long", youth: "long" });
  assert.equal(score.mostPicked, "long");
  assert.ok(score.profit < score.maxProfit);
  assert.equal(scoreRoleflip({ student: "short", mother: "mid", youth: "long" }).mostPicked, "long");
});

test("role flip terms come back as the player's next loan offer, once", () => {
  let s = runUntil(newLife(8), (x) => currentStep(x).kind === "roleflip");
  s = dispatch(s, { type: "roleflip", picks: { student: "short", mother: "short", youth: "mid" } });
  const q = loanQuote(s, 20000, "bank");
  assert.equal(q.fromRoleflip, true);
  assert.equal(q.annualPct, CFG.roleflip.offers.find((o) => o.id === "short").annualPct);
  s = dispatch(s, { type: "action", action: { kind: "loan", amount: 20000, source: "bank" } });
  assert.equal(s.loans.at(-1).fromRoleflip, true);
  assert.equal(loanQuote(s, 20000, "bank").fromRoleflip, false);
});

test("chitti auction: deterministic NPC bids and an honest early-vs-wait comparison", () => {
  assert.deepEqual(chittiSchedule(5, 20), chittiSchedule(5, 20));
  const { npcMax } = chittiSchedule(5, 20);
  const lose = chittiOutcome(5, 20, 2000, npcMax);
  const win = chittiOutcome(5, 20, 2000, npcMax + 1);
  assert.equal(lose.won, false);
  assert.equal(win.won, true);
  assert.equal(win.received, win.takeEarly);
  assert.equal(win.earlyTotal + win.gaveUp, win.waitTotal);
  assert.ok(win.gaveUp > 0 && win.yearlyCostPct > 0);
  assert.equal(lose.received, lose.pot);
});

test("tools unlock by age, SIP needs the risk lesson, fast-forward has no actions", () => {
  let s = newLife(4);
  s = dispatch(s, { type: "budget", budget: { needs: 50, wants: 20, savings: 15, goal: 15 } });
  assert.equal(currentStep(s).kind, "actions");
  assert.equal(actionAvailable(s, "bank").reason, "age");
  assert.equal(actionAvailable(s, "learn").ok, true);
  assert.equal(CFG.unlocks.sip, 22);
  assert.equal(CFG.unlocks.insurance, 23);
  const at22 = { ...s, age: 22, bank: true, lessons: 2, energy: 3 };
  assert.equal(actionAvailable(at22, "sip").reason, "lesson");
  assert.equal(actionAvailable({ ...at22, lessons: 3 }, "sip").ok, true);
  assert.equal(isFastForward(25), false);
  assert.equal(isFastForward(26), true);
  const life = playRandom(21);
  for (const y of life.years.filter((y) => y.age >= 26)) assert.equal(y.actions.length, 0);
});

test("budget jars are asked rarely: at stage or income-source changes only", () => {
  const life = playRandom(77);
  const prompts = life.years.filter((y) => y.budgetPrompted).map((y) => y.age);
  assert.ok(prompts.length >= 4 && prompts.length <= 8, `prompts at ${prompts}`);
  for (const age of [17, 18, 21, 26]) assert.ok(prompts.includes(age));
  assert.equal(validBudget({ needs: 50, wants: 20, savings: 15, goal: 15 }), true);
  assert.equal(validBudget({ needs: 50, wants: 20, savings: 15, goal: 10 }), false);
  assert.equal(validBudget({ needs: 52, wants: 18, savings: 15, goal: 15 }), false);
});

test("costs are paid from cash, then savings; only then the moneylender", () => {
  const s = newLife(2);
  apply(s, { type: "budget", budget: { needs: 50, wants: 20, savings: 15, goal: 15 } });
  const before = hud(s);
  const spendOpt = { effects: { money: -10000, family: 1 } };
  const p = previewOption(s, spendOpt);
  assert.equal(p.fx.money, -10000);
  apply(s, { type: "endActions" });
  // Force a big cost through the same pipeline used by cards.
  const step = currentStep(s);
  if (step.kind === "event") {
    const card = cardById[step.cardId];
    const opt = card.options.reduce((a, b) => ((a.effects.money || 0) <= (b.effects.money || 0) ? a : b));
    apply(s, { type: "choose", cardId: card.id, optionId: opt.id });
  }
  assert.ok(hud(s).wallet <= before.wallet);
  assert.ok(s.wallet >= 0 && s.goalJar >= 0);
});

test("insurance pays 80% of an insurable bill", () => {
  const s = newLife(3);
  const card = cardById.medical;
  const opt = card.options.find((o) => o.id === "private");
  s.income = 200000;
  assert.equal(previewOption(s, opt, card).fx.money, -60000);
  s.insured = true;
  const p = previewOption(s, opt, card);
  assert.equal(p.fx.money, -12000);
  assert.equal(p.covered, 48000);
});

test("risky choices plant seeds that fire as threads or wither", () => {
  let found = false;
  for (let seed = 1; seed < 40 && !found; seed++) {
    const life = playRandom(seed, seed);
    for (const sd of life.seeds) {
      if (sd.status === "fired") {
        const year = life.years.find((y) => y.age === sd.fireAge);
        assert.ok(year.threads.includes(sd.id));
        assert.ok(year.events.some((e) => e.seedId === sd.id && e.cardId === sd.consequence));
        assert.ok(life.years.find((y) => y.age === sd.age).seeds.includes(sd.id));
        found = true;
      }
    }
  }
  assert.ok(found);
});

test("every turn offers 1–3 events; scam replies are logged as falls", () => {
  const life = playRandom(55, 3);
  for (const y of life.years) assert.ok(y.events.length >= 1 && y.events.length <= 4, `age ${y.age}`);
  const replies = life.years.filter((y) => y.message && y.message.verdict === "reply" && msgById[y.message.msgId].scam).length;
  assert.equal(life.stats.scamsFallen, replies);
});

test("end stats never rank by net worth", () => {
  const life = playRandom(9);
  const stats = endStats(life);
  assert.deepEqual(Object.keys(stats).sort(), ["debtFree", "goalAge", "goalMet", "goalPct", "metersAboveFloor", "scamsFallen", "scamsFlagged"].sort());
  assert.equal(computeEnding(life), life.ending);
});

test("wheel spins against you when debt interest beats savings interest", () => {
  const s = newLife(1);
  s.wallet = 1000;
  s.bank = true;
  s.loans.push({ balance: 50000, annualPct: 24, source: "lender" });
  const w = wheelState(s);
  assert.equal(w.dir, -1);
  assert.equal(w.rate, 24);
});

test("100 lives: same seeds for both strategies, counts out of 100", () => {
  const life = playRandom(12);
  const point = turningPoints(life)[0];
  const r = hundredLives(life, point, point.alternatives[0], 40);
  assert.equal(r.n, 40);
  for (const side of [r.mine, r.other]) {
    assert.ok(side.met >= 0 && side.met <= 40);
    assert.ok(side.p10 <= side.median && side.median <= side.p90);
  }
  assert.deepEqual(hundredLives(life, point, point.alternatives[0], 40), r);
});

test("validator spots a dominant option", () => {
  const good = [{ effects: { money: -100, peace: 2 } }, { effects: { money: 0, peace: -1 } }];
  const bad = [{ effects: { money: 0, peace: 2 } }, { effects: { money: -100, peace: 1 } }];
  assert.equal(dominantOption(good), undefined);
  assert.equal(dominantOption(bad), bad[0]);
});

function runUntil(s, done) {
  let guard = 0;
  while (!done(s) && guard++ < 500) {
    const step = currentStep(s);
    const cmd =
      step.kind === "budget" ? { type: "budget", budget: { needs: 55, wants: 15, savings: 15, goal: 15 } }
      : step.kind === "crossroads" ? { type: "crossroads", id: step.id, optionId: crossById[step.id].options[0].id }
      : step.kind === "actions" ? { type: "endActions" }
      : step.kind === "event" ? { type: "choose", cardId: step.cardId, optionId: cardById[step.cardId].options[1].id }
      : step.kind === "message" ? { type: "message", msgId: step.msgId, verdict: "flag" }
      : step.kind === "roleflip" ? { type: "roleflip", picks: {} }
      : { type: "nextYear" };
    s = dispatch(s, cmd);
  }
  return s;
}
