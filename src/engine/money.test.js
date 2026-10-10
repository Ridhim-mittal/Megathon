import test from "node:test";
import assert from "node:assert/strict";
import { ASSUMPTIONS as A } from "./assumptions.js";
import { applyShock, computeEmi, createLoan, netWorth, quoteLoan, runLoansForYear, sumFlows } from "./money.js";
import { createEngine } from "./engine.js";
import { fixtureContent } from "./__fixtures__/content.js";

// A bare state with just the money fields the money functions use.
function wallet({ cash = 0, emergency = 0, goal = 0, products = {}, insurance = [], flags = [], age = 25 } = {}) {
  return {
    age,
    storylineId: "village",
    flags,
    priceIndex: 1,
    money: { cash, wallet: 0, jars: { emergency, goal }, products, assets: [] },
    loans: [],
    insurance,
    meters: { joy: 50, health: 50, family: 50, gyaan: 0 },
    flows: {},
    year: { flows: {}, events: [] },
    counters: { loan: 0 },
  };
}

test('"₹2 per ₹100 per month" works out to 24% a year', () => {
  const q = quoteLoan(A, { source: "moneylender", principal: 10000, months: 12 });
  assert.equal(A.loans.moneylender.perHundredPerMonth, 2);
  assert.equal(q.perHundredPerMonth, 2);
  assert.equal(q.rateYearly, 0.24);
  assert.equal(q.totalInterest, 2400); // ₹2 × 100 hundreds × 12 months
  assert.equal(q.totalInterest / 10000, 0.24);
  assert.equal(q.emi, 1033); // ₹833 principal + ₹200 interest
  // Charged on the full amount every month, the true reducing-balance cost is far above 24%.
  assert.ok(q.effectiveYearly > 0.4, `effective ${q.effectiveYearly}`);

  // The same loan inside a life: one year of payments costs exactly ₹2,400 in interest.
  const s = wallet({ cash: 20000 });
  createLoan(A, s, { source: "moneylender", principal: 10000 });
  const before = s.money.cash;
  const r = runLoansForYear(A, s);
  assert.equal(r.interest, 2400);
  assert.equal(before - s.money.cash, 12400);
  assert.equal(s.loans.length, 0);
});

test("an explicit EMI gives the spec's phone example: ₹9,588 for a ₹7,500 phone", () => {
  const q = quoteLoan(A, { source: "bnpl_emi", principal: 7500, months: 12, emi: 699, fee: 1200 });
  assert.equal(q.emi, 699);
  assert.equal(q.totalPayable, 9588);
  assert.equal(q.disburse, "direct");
});

test("reducing-balance EMI matches the standard formula and repays the principal", () => {
  const emi = computeEmi(100000, 0.12, 12, "reducing");
  assert.equal(emi, 8885); // ₹1,00,000 at 12% for a year
  const q = quoteLoan(A, { source: "bank_personal", principal: 100000, months: 12, rateYearly: 0.12 });
  assert.ok(Math.abs(q.totalPayable - q.fee - 12 * 8885) <= 12, `${q.totalPayable}`);
});

test("an education loan grows during the moratorium and asks for nothing", () => {
  const s = wallet({ cash: 0 });
  createLoan(A, s, { source: "education", principal: 100000 });
  const r = runLoansForYear(A, s);
  assert.equal(r.due, 0);
  assert.ok(s.loans[0].balance > 109000 && s.loans[0].balance < 110500, `${s.loans[0].balance}`);
  assert.equal(netWorth(s), sumFlows(s.flows) - 100000); // the ₹1,00,000 itself was paid to the college elsewhere
});

test("shocks are paid by insurance, then the emergency jar, then savings, then forced borrowing", () => {
  const s = wallet({
    cash: 3000,
    emergency: 5000,
    goal: 4000,
    products: { fd: { value: 10000, invested: 10000, openedAge: 20 } },
    insurance: [{ type: "insurance_health", cover: 20000, since: 20 }],
  });
  const out = [];
  applyShock(A, s, { kind: "health", cost: 50000 }, out);
  const r = out[0];
  assert.equal(r.insurance, 20000);
  assert.deepEqual(
    r.paidFrom.map((p) => p.from),
    ["emergency", "cash", "goal", "fd"],
  );
  assert.deepEqual(r.paidFrom.map((p) => p.amount), [5000, 3000, 4000, 9900]);
  assert.equal(r.borrowed.source, "moneylender");
  assert.equal(r.borrowed.amount, 50000 - 20000 - 5000 - 3000 - 4000 - 9900);
  assert.equal(s.money.jars.emergency, 0);
  assert.equal(s.money.cash, 0);
  assert.equal(s.money.products.fd, undefined); // broken early, 1% penalty
  assert.equal(netWorth(s), sumFlows(s.flows) + 3000 + 5000 + 4000 + 10000);
});

test("a fully insured shock touches no savings; an uninsured one starts with the emergency jar", () => {
  const s = wallet({ cash: 1000, emergency: 1000, insurance: [{ type: "insurance_accident", cover: 200000, since: 20 }] });
  const out = [];
  applyShock(A, s, { kind: "accident", cost: 30000 }, out);
  assert.equal(out[0].insurance, 30000);
  assert.deepEqual(out[0].paidFrom, []);
  applyShock(A, s, { kind: "flood", cost: 1500 }, out);
  assert.deepEqual(out[1].paidFrom, [{ from: "emergency", amount: 1000 }, { from: "cash", amount: 500 }]);
});

test("forced borrowing goes to the worst lender the player can reach", () => {
  const withPhone = wallet({ flags: ["owns_phone"], age: 20 });
  const out = [];
  applyShock(A, withPhone, { kind: "health", cost: 1000 }, out);
  assert.equal(out[0].borrowed.source, "loan_app");
  const child = wallet({ flags: ["owns_phone"], age: 15 });
  applyShock(A, child, { kind: "health", cost: 1000 }, out);
  assert.equal(out[1].borrowed.source, "moneylender");
});

test("money is conserved on a scripted life with loans, shocks, products and documents", () => {
  const E = createEngine(fixtureContent);
  let s = E.createLife({ storylineId: "village", goalId: "house", seed: 7 });
  for (let i = 0; s.phase !== "ending" && i < 3000; i++) {
    const card = E.select.currentCard(s);
    s = E.step(s, s.phase === "card" ? { type: "CHOOSE", choiceId: card.choices[i % card.choices.length].id } : { type: "ADVANCE" });
    assert.equal(s.error, null);
    assert.equal(netWorth(s), sumFlows(s.flows), `age ${s.age} ${s.phase}`);
  }
  assert.equal(s.phase, "ending");
});
