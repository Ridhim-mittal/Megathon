// A tiny stock exchange for the phone's practice mini-game: one share, an order book, and a
// matching engine with price-time priority, like a real exchange (simplified: whole rupees,
// whole shares, no auction). Practice money only; it never touches the life's real money.
//
// The book is a plain object changed in place by these functions; the UI keeps it in a ref.
//   bids: buy orders, best (highest) price first, then oldest first
//   asks: sell orders, best (lowest) price first, then oldest first

export const TRADERS = ["Ravi", "Meena", "Sita", "Arjun", "Fatima", "Kiran", "Lakshmi", "Imran", "Priya", "Raju", "Joseph", "Anjali"];
export const NEWS = { good: ["good1", "good2", "good3"], bad: ["bad1", "bad2", "bad3"] };

const pick = (rng, list) => list[Math.floor(rng() * list.length)];

export function createBook({ price = 100, cash = 10000, fee = 20, rng = Math.random } = {}) {
  const book = {
    t: 0,
    seq: 0,
    fee,
    bids: [],
    asks: [],
    trades: [],
    ltp: price,
    open: price,
    fair: price,
    history: [price],
    volume: 0,
    sentiment: 0,
    news: null,
    nextNews: 25 + Math.floor(rng() * 15),
    me: { cash, shares: 0, cost: 0, fees: 0, realized: 0, start: cash },
  };
  // Start with a few orders waiting on each side of the price.
  for (let i = 1; i <= 7; i++) {
    for (let n = 1 + Math.floor(rng() * 3); n > 0; n--) {
      rest(book, { side: "buy", price: price - i, qty: lot(rng), owner: "bot", name: pick(rng, TRADERS) });
      rest(book, { side: "sell", price: price + i, qty: lot(rng), owner: "bot", name: pick(rng, TRADERS) });
    }
  }
  return book;
}

const lot = (rng) => pick(rng, [5, 5, 10, 10, 10, 15, 20, 25, 50]);

function rest(book, o) {
  const order = { id: ++book.seq, side: o.side, price: o.price, qty: o.qty, orig: o.qty, owner: o.owner, name: o.name, time: book.t, feePaid: Boolean(o.feePaid) };
  const list = o.side === "buy" ? book.bids : book.asks;
  const better = o.side === "buy" ? (a, b) => a > b : (a, b) => a < b;
  // After every order at a better or the same price: price first, then time.
  let i = 0;
  while (i < list.length && (better(list[i].price, order.price) || list[i].price === order.price)) i++;
  list.splice(i, 0, order);
  return order;
}

// What the player can still spend or sell, after what their waiting orders have promised.
export function available(book) {
  const me = book.me;
  const buys = book.bids.filter((o) => o.owner === "me");
  const sells = book.asks.filter((o) => o.owner === "me");
  return {
    cash: me.cash - buys.reduce((a, o) => a + o.price * o.qty + (o.feePaid ? 0 : book.fee), 0),
    shares: me.shares - sells.reduce((a, o) => a + o.qty, 0),
  };
}

function settleMine(book, side, price, qty, order) {
  const me = book.me;
  if (!order.feePaid) {
    order.feePaid = true;
    me.cash -= book.fee;
    me.fees += book.fee;
  }
  if (side === "buy") {
    me.cash -= price * qty;
    me.shares += qty;
    me.cost += price * qty;
  } else {
    const avg = me.shares ? me.cost / me.shares : 0;
    me.cash += price * qty;
    me.realized += (price - avg) * qty;
    me.cost -= avg * qty;
    me.shares -= qty;
    if (me.shares === 0) me.cost = 0;
  }
}

// Like a real exchange's price band: limit prices must stay within 20% of the last trade.
export function priceBand(book, pct = 0.2) {
  return { lo: Math.max(1, Math.ceil(book.ltp * (1 - pct))), hi: Math.floor(book.ltp * (1 + pct)) };
}

// Check a player's order before it goes in. Returns an error key, or null.
export function checkOrder(book, { side, type, qty, price }) {
  if (!(qty > 0) || !Number.isInteger(qty)) return "qty";
  if (type === "limit" && !(price > 0)) return "price";
  const band = priceBand(book);
  if (type === "limit" && (price < band.lo || price > band.hi)) return "priceBand";
  const av = available(book);
  if (side === "sell" && qty > av.shares) return "noShares";
  const opp = side === "buy" ? book.asks : book.bids;
  // Self-trade prevention: your own waiting order is first in line on the other side.
  const crosses = (o) => type === "market" || (side === "buy" ? o.price <= price : o.price >= price);
  if (opp.some((o) => o.owner === "me" && crosses(o))) return "selfTrade";
  if (side === "buy") {
    const best = opp[0]?.price ?? price;
    const need = (type === "limit" ? price : best) * qty + book.fee;
    if (type === "limit" ? need > av.cash : best + book.fee > av.cash) return "noCash";
  }
  if (type === "market" && !opp.length) return "empty";
  return null;
}

// Send an order. Market orders take the best prices until filled (any rest is cancelled);
// limit orders take prices up to their limit, then wait in the book.
// Returns { id, side, type, fills: [{ price, qty, name, waitedSince }], rested, cancelled, bestBefore }.
export function submit(book, { side, type, qty, price = null, owner = "bot", name = "" }) {
  const opp = side === "buy" ? book.asks : book.bids;
  const report = { side, type, owner, fills: [], rested: 0, cancelled: 0, bestBefore: opp[0]?.price ?? null, id: null };
  const order = { feePaid: false };
  let left = qty;
  while (left > 0 && opp.length) {
    const best = opp[0];
    if (type === "limit" && (side === "buy" ? best.price > price : best.price < price)) break;
    if (best.owner === owner && owner === "me") break;
    let q = Math.min(left, best.qty);
    if (owner === "me" && side === "buy") {
      const room = book.me.cash - (order.feePaid ? 0 : book.fee);
      q = Math.min(q, Math.floor(room / best.price));
      if (q <= 0) break;
    }
    const buyer = side === "buy" ? name : best.name;
    const seller = side === "buy" ? best.name : name;
    book.trades.push({ t: book.t, price: best.price, qty: q, buyer, seller, aggressor: side, mine: owner === "me" || best.owner === "me" });
    if (book.trades.length > 60) book.trades.shift();
    book.ltp = best.price;
    book.volume += q;
    report.fills.push({ price: best.price, qty: q, name: best.name, waitedSince: best.time, passiveMine: best.owner === "me" });
    if (best.owner === "me") {
      const avg = book.me.shares ? book.me.cost / book.me.shares : 0;
      settleMine(book, side === "buy" ? "sell" : "buy", best.price, q, best);
      (book.passive ??= []).push({ side: best.side, price: best.price, qty: q, name, done: best.qty === q, id: best.id, avg });
    }
    if (owner === "me") settleMine(book, side, best.price, q, order);
    best.qty -= q;
    left -= q;
    if (best.qty === 0) opp.shift();
  }
  if (left > 0) {
    if (type === "limit") {
      const o = rest(book, { side, price, qty: left, owner, name, feePaid: order.feePaid });
      report.id = o.id;
      report.rested = left;
    } else report.cancelled = left;
  }
  return report;
}

export function cancel(book, id) {
  for (const list of [book.bids, book.asks]) {
    const i = list.findIndex((o) => o.id === id);
    if (i >= 0) return list.splice(i, 1)[0];
  }
  return null;
}

// How many shares wait ahead of an order at its own price (time priority).
export function queueAhead(book, id) {
  for (const list of [book.bids, book.asks]) {
    const i = list.findIndex((o) => o.id === id);
    if (i < 0) continue;
    const o = list[i];
    return list.slice(0, i).filter((x) => x.price === o.price).reduce((a, x) => a + x.qty, 0);
  }
  return 0;
}

// Price levels for the order book table: [{ price, qty, orders, mine }], best first.
export function levels(list, depth = 8) {
  const out = [];
  for (const o of list) {
    const last = out[out.length - 1];
    if (last && last.price === o.price) {
      last.qty += o.qty;
      last.orders += 1;
      last.mine = last.mine || o.owner === "me";
    } else {
      if (out.length === depth) break;
      out.push({ price: o.price, qty: o.qty, orders: 1, mine: o.owner === "me" });
    }
  }
  return out;
}

// One moment passes: the other traders act. Returns { reports, news } for this tick.
export function tick(book, rng = Math.random) {
  book.t += 1;
  book.passive = [];
  let news = null;
  if (book.t >= book.nextNews) {
    const good = rng() < 0.5;
    news = { good, id: pick(rng, good ? NEWS.good : NEWS.bad), t: book.t };
    book.news = news;
    book.sentiment = good ? 1 : -1;
    book.fair *= good ? 1.04 : 0.96;
    book.nextNews = book.t + 35 + Math.floor(rng() * 25);
  }
  book.sentiment *= 0.93;
  if (Math.abs(book.sentiment) < 0.05) book.sentiment = 0;
  // A random walk, gently pulled back toward the opening price so a practice session stays readable.
  book.fair = Math.max(10, book.fair + (rng() - 0.5) * 0.7 + (book.open - book.fair) * 0.004);

  // Old bot orders get cancelled now and then, so the book stays fresh.
  for (const list of [book.bids, book.asks]) {
    for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i];
      const far = Math.abs(o.price - book.fair) > 9;
      if (o.owner === "bot" && (far || (book.t - o.time > 45 && rng() < 0.04))) list.splice(i, 1);
    }
  }

  const reports = [];
  const n = 2 + (rng() < 0.3 ? 1 : 0) + (book.sentiment !== 0 && rng() < 0.5 ? 1 : 0);
  for (let k = 0; k < n; k++) {
    const buyProb = Math.min(0.85, Math.max(0.15, 0.5 + book.sentiment * 0.3 + (book.fair - book.ltp) * 0.03));
    const side = rng() < buyProb ? "buy" : "sell";
    // A different trader from the ones first in line on the other side.
    const near = new Set((side === "buy" ? book.asks : book.bids).slice(0, 4).map((o) => o.name));
    const name = pick(rng, TRADERS.filter((x) => !near.has(x)));
    if (rng() < 0.17 + Math.abs(book.sentiment) * 0.2) {
      reports.push(submit(book, { side, type: "market", qty: pick(rng, [2, 5, 5, 10, 15]), owner: "bot", name }));
    } else {
      const offset = Math.floor(rng() ** 1.5 * 8) - 1; // mostly near the price; -1 crosses the spread
      const price = Math.max(1, Math.round(book.fair + (side === "buy" ? -offset : offset) - (side === "buy" ? 0.5 : -0.5)));
      reports.push(submit(book, { side, type: "limit", qty: lot(rng), price, owner: "bot", name }));
    }
  }
  // Keep both sides alive.
  if (!book.bids.some((o) => o.owner === "bot")) rest(book, { side: "buy", price: Math.max(1, Math.floor(book.fair) - 2), qty: lot(rng), owner: "bot", name: pick(rng, TRADERS) });
  if (!book.asks.some((o) => o.owner === "bot")) rest(book, { side: "sell", price: Math.ceil(book.fair) + 2, qty: lot(rng), owner: "bot", name: pick(rng, TRADERS) });

  book.history.push(book.ltp);
  if (book.history.length > 120) book.history.shift();
  return { reports, news, passive: book.passive };
}

// The player's practice account, valued at the last traded price.
export function account(book) {
  const me = book.me;
  const value = me.cash + me.shares * book.ltp;
  return { ...me, avg: me.shares ? me.cost / me.shares : 0, value, pnl: value - me.start, unrealized: me.shares * book.ltp - me.cost };
}
