import test from "node:test";
import assert from "node:assert/strict";
import { account, available, cancel, checkOrder, createBook, levels, queueAhead, submit, tick } from "./orderbook.js";

// A seeded random source, so tests are repeatable.
function rng(seed = 1) {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// An empty book with a few hand-placed orders.
function book(orders = [], cash = 10000) {
  const b = createBook({ price: 100, cash, fee: 20, rng: rng() });
  b.bids = [];
  b.asks = [];
  for (const o of orders) submit(b, { owner: "bot", type: "limit", ...o });
  return b;
}

test("books stay sorted: best price first, then oldest first", () => {
  const b = createBook({ rng: rng(3) });
  for (let i = 0; i < 300; i++) tick(b, rng(i + 7));
  const sorted = (list, better) => list.every((o, i) => i === 0 || better(list[i - 1], o));
  assert.ok(sorted(b.bids, (a, o) => a.price > o.price || (a.price === o.price && a.time <= o.time)));
  assert.ok(sorted(b.asks, (a, o) => a.price < o.price || (a.price === o.price && a.time <= o.time)));
  if (b.bids.length && b.asks.length) assert.ok(b.bids[0].price < b.asks[0].price, "a crossed book would have traded");
});

test("a market buy takes the cheapest sell orders and walks the book", () => {
  const b = book([
    { side: "sell", price: 101, qty: 5, name: "A" },
    { side: "sell", price: 102, qty: 10, name: "B" },
  ]);
  const r = submit(b, { side: "buy", type: "market", qty: 8, owner: "me", name: "You" });
  assert.deepEqual(r.fills.map((f) => [f.price, f.qty]), [[101, 5], [102, 3]]);
  assert.equal(b.ltp, 102);
  assert.equal(b.asks[0].qty, 7);
  const a = account(b);
  assert.equal(a.shares, 8);
  assert.equal(a.cash, 10000 - 101 * 5 - 102 * 3 - 20, "one brokerage fee per order");
});

test("a limit order waits in the queue behind older orders at its price", () => {
  const b = book([{ side: "buy", price: 99, qty: 10, name: "A" }, { side: "sell", price: 101, qty: 10, name: "S" }]);
  const r = submit(b, { side: "buy", type: "limit", qty: 5, price: 99, owner: "me", name: "You" });
  assert.equal(r.fills.length, 0);
  assert.equal(r.rested, 5);
  assert.equal(queueAhead(b, r.id), 10);
  assert.deepEqual(levels(b.bids)[0], { price: 99, qty: 15, orders: 2, mine: true });
  // A seller arrives: the older order fills first, then ours.
  submit(b, { side: "sell", type: "market", qty: 12, owner: "bot", name: "X" });
  assert.equal(b.bids[0].qty, 3);
  assert.equal(account(b).shares, 2);
  assert.equal(b.passive.length, 1);
});

test("a crossing limit order trades at the waiting order's price, then rests", () => {
  const b = book([{ side: "sell", price: 101, qty: 4, name: "S" }]);
  const r = submit(b, { side: "buy", type: "limit", qty: 10, price: 103, owner: "me", name: "You" });
  assert.deepEqual(r.fills.map((f) => f.price), [101]);
  assert.equal(r.rested, 6);
  assert.equal(b.bids[0].price, 103);
});

test("checks: cash, shares, self-trade, and cancelling frees the money", () => {
  const b = book([{ side: "sell", price: 101, qty: 50, name: "S" }], 1000);
  assert.equal(checkOrder(b, { side: "buy", type: "limit", qty: 20, price: 100 }), "noCash");
  assert.equal(checkOrder(b, { side: "sell", type: "market", qty: 1 }), "noShares");
  const r = submit(b, { side: "buy", type: "limit", qty: 9, price: 100, owner: "me", name: "You" });
  assert.equal(available(b).cash, 1000 - 900 - 20);
  cancel(b, r.id);
  assert.equal(available(b).cash, 1000);
  submit(b, { side: "buy", type: "market", qty: 2, owner: "me", name: "You" });
  submit(b, { side: "sell", type: "limit", qty: 1, price: 110, owner: "me", name: "You" });
  assert.equal(checkOrder(b, { side: "buy", type: "limit", qty: 1, price: 115 }), "selfTrade");
});

test("selling at a higher price books a profit", () => {
  const b = book([{ side: "sell", price: 100, qty: 10, name: "S" }, { side: "buy", price: 110, qty: 10, name: "B" }].slice(0, 1));
  submit(b, { side: "buy", type: "market", qty: 10, owner: "me", name: "You" });
  submit(b, { side: "buy", type: "limit", qty: 10, price: 110, owner: "bot", name: "B" });
  submit(b, { side: "sell", type: "market", qty: 10, owner: "me", name: "You" });
  const a = account(b);
  assert.equal(a.realized, 100);
  assert.equal(a.pnl, 100 - 40);
});

test("money is conserved: practice cash + shares only change by trades and fees", () => {
  const b = createBook({ rng: rng(11) });
  const r = rng(5);
  for (let i = 0; i < 400; i++) {
    tick(b, r);
    if (i % 7 === 0) {
      const side = r() < 0.5 ? "buy" : "sell";
      const o = { side, type: r() < 0.5 ? "market" : "limit", qty: 3, price: Math.round(b.ltp + (side === "buy" ? -1 : 1)) };
      if (!checkOrder(b, o)) submit(b, { ...o, owner: "me", name: "You" });
    }
    const me = b.me;
    assert.ok(me.cash >= 0 && me.shares >= 0, `step ${i}`);
    assert.ok(available(b).cash >= -1e-9 && available(b).shares >= 0, `step ${i}`);
  }
});

test("limit prices must sit inside the price band around the last trade", () => {
  const b = book([{ side: "sell", price: 101, qty: 5, name: "S" }]);
  assert.equal(checkOrder(b, { side: "buy", type: "limit", qty: 1, price: 101454 }), "priceBand");
  assert.equal(checkOrder(b, { side: "buy", type: "limit", qty: 1, price: 79 }), "priceBand");
  assert.equal(checkOrder(b, { side: "buy", type: "limit", qty: 1, price: 95 }), null);
});

test("simulated traders never trade with someone of their own name", () => {
  const b = createBook({ rng: rng(21) });
  const r = rng(8);
  for (let i = 0; i < 500; i++) tick(b, r);
  assert.ok(b.trades.every((x) => x.buyer !== x.seller));
});
