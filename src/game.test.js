import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_BUDGET,
  resolveMonth,
  validBudget,
  ALLOWANCE,
  REPAIR,
} from "./game.js";

test("repair uses emergency savings, then goal savings, without losing money", () => {
  const r = resolveMonth(INITIAL_BUDGET);
  assert.equal(r.emergencyUsed, 200);
  assert.equal(r.goalUsed, 400);
  assert.equal(r.goalLeft, 200);
  assert.equal(r.debt, 0);
});
test("borrowing preserves goal but includes principal and interest in the next month", () => {
  const r = resolveMonth(INITIAL_BUDGET, "borrow");
  assert.equal(r.goalLeft, 600);
  assert.equal(r.borrowed, 400);
  assert.equal(r.interest, 40);
  assert.equal(r.nextAllowance, 1560);
  assert.equal(r.netPosition, 160);
});
test("same repair and approach with more emergency savings changes debt predictably", () => {
  const a = resolveMonth(INITIAL_BUDGET, "borrow");
  const b = resolveMonth(
    { needs: 800, wants: 400, emergency: 600, goal: 200 },
    "borrow",
  );
  assert.equal(b.debt, 0);
  assert.equal(b.goalLeft, 200);
  assert.equal(b.netPosition - a.netPosition, 40);
  assert.equal(b.budget.wants, a.budget.wants);
});
test("insufficient savings borrows only the uncovered amount", () => {
  const r = resolveMonth({
    needs: 800,
    wants: 1000,
    emergency: 100,
    goal: 100,
  });
  assert.equal(r.borrowed, 400);
  assert.equal(r.debt, 440);
});
test("reject invalid budgets and unknown approaches", () => {
  for (const b of [
    { ...INITIAL_BUDGET, needs: 700 },
    { ...INITIAL_BUDGET, wants: -100 },
    { ...INITIAL_BUDGET, goal: 601 },
    { ...INITIAL_BUDGET, goal: NaN },
    { ...INITIAL_BUDGET, extra: 0 },
  ]) {
    assert.equal(validBudget(b), false);
    assert.throws(() => resolveMonth(b));
  }
  assert.throws(() => resolveMonth(INITIAL_BUDGET, "other"));
});
test("all allowed allocations conserve funds and produce reproducible results", () => {
  for (let needs = 800; needs <= ALLOWANCE; needs += 100) {
    for (let wants = 0; wants <= ALLOWANCE - needs; wants += 100) {
      for (
        let emergency = 0;
        emergency <= ALLOWANCE - needs - wants;
        emergency += 100
      ) {
        const budget = {
          needs,
          wants,
          emergency,
          goal: ALLOWANCE - needs - wants - emergency,
        };
        for (const approach of ["savings", "borrow"]) {
          const r = resolveMonth(budget, approach);
          assert.equal(r.emergencyUsed + r.goalUsed + r.borrowed, REPAIR);
          assert.equal(
            r.netPosition,
            budget.emergency + budget.goal - REPAIR - r.interest,
          );
          assert.ok(r.goalLeft >= 0 && r.emergencyLeft >= 0);
          assert.deepEqual(r, resolveMonth(budget, approach));
        }
      }
    }
  }
});
