import test from "node:test";
import assert from "node:assert/strict";
import { SAVE_LEVELS, forecast, levelOf, planFor, surpriseCost } from "./savePlan.js";

const child = { monthlyIncome: 200, step: 10, minNeeds: 40, jarsUnlocked: ["needs", "wants", "emergency", "goal"] };
const adult = { monthlyIncome: 30000, step: 100, minNeeds: 15000, jarsUnlocked: ["needs", "wants", "emergency", "goal", "invest"] };
const sum = (j) => Object.values(j).reduce((a, x) => a + x, 0);

test("every level is a valid jar split: adds up, in steps, needs at the minimum", () => {
  for (const rules of [child, adult]) {
    for (const l of SAVE_LEVELS) {
      const j = planFor(rules, l.share, { stage: rules === child ? "child" : "adult" });
      assert.equal(sum(j), rules.monthlyIncome);
      assert.equal(j.needs, rules.minNeeds);
      for (const v of Object.values(j)) assert.equal(v % rules.step, 0);
      assert.deepEqual(Object.keys(j).sort(), [...rules.jarsUnlocked].sort());
    }
  }
});

test("saving more means less fun, a nearer dream and more surprises covered", () => {
  const dream = { reached: false, target: 5000, saved: 0 };
  const plans = SAVE_LEVELS.map((l) => planFor(child, l.share, { stage: "child" }));
  const f = plans.map((j) => forecast(j, { age: 11, dream, stage: "child", income: 200 }));
  assert.ok(plans[0].wants > plans[1].wants && plans[1].wants > plans[2].wants);
  assert.ok(f[0].dreamAge > f[2].dreamAge);
  assert.ok(f[2].shields >= f[0].shields);
  assert.ok(f[0].fun > f[2].fun);
});

test("the safety jar fills first, then savings go to the dream", () => {
  const empty = planFor(child, 0.25, { stage: "child", emergency: 0 });
  const full = planFor(child, 0.25, { stage: "child", emergency: 10 * surpriseCost("child") });
  assert.ok(empty.emergency > 0);
  assert.equal(full.emergency, 0);
  assert.ok(full.goal > empty.goal);
  assert.equal(levelOf(child, empty), "some");
});
