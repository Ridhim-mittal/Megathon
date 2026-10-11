import test from "node:test";
import assert from "node:assert/strict";
import { bankLoan, emiReducing, quickCash } from "./finePrint.js";

test("QuickCash: ₹19,000 in hand, ₹24,800 paid back", () => {
  const q = quickCash();
  assert.equal(q.inHand, 19000);
  assert.equal(q.interest, 3600);
  assert.equal(q.payBack, 24800);
  assert.equal(Math.round(q.per100), 131);
});

test("the bank: 13% reducing over a year costs far less", () => {
  const b = bankLoan();
  assert.equal(Math.round(emiReducing(20000, 0.13, 12)), 1786);
  assert.equal(b.inHand, 19500);
  assert.ok(Math.abs(b.payBack - 21436) < 2);
  assert.equal(Math.round(b.per100), 110);
  assert.ok(b.payBack < quickCash().payBack);
});
