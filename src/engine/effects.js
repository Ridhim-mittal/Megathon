// The effects vocabulary (spec section 7). Applied in a fixed order so that, inside one choice,
// a loan arrives before the purchase it pays for and a gift arrives before it is saved:
//   income, loan, close, cash (+), jar, cash (−), repay, open, shock, meters, flags, schedule,
//   gyaan, glasses.
// `lesson` is handled by the CHOOSE action (it overrides the quality-based status).
// `loan`, `open`, `close`, `repay`, `shock` and `schedule` also accept an array.

import {
  applyShock,
  closeProduct,
  flow,
  addEvent,
  openProduct,
  pay,
  repayLoan,
  takeLoan,
} from "./money.js";

const list = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const num = (x) => Math.round(Number(x) || 0);

export function addMeter(s, meter, delta) {
  if (!(meter in s.meters)) return;
  s.meters[meter] = Math.max(0, Math.min(100, s.meters[meter] + num(delta)));
}

export function roundToStep(x, step) {
  return Math.max(0, Math.round(x / step) * step);
}

export function applyEffects(A, s, effects, out, { origin = null, cashCategory = "gifts", step = 1 } = {}) {
  if (!effects || typeof effects !== "object") return;
  const e = effects;

  if (e.income) {
    const monthly = roundToStep(num(e.income.monthly), step);
    const before = s.income.monthly;
    s.income = { monthly, source: e.income.source ?? "job" };
    s.budgetDirty = true;
    addEvent(s, { type: "income", monthly, before, source: s.income.source });
    out.push({ type: "income", monthly, before, source: s.income.source, from: "nextYear" });
  }

  for (const spec of list(e.loan)) if (A.loans[spec?.source]) takeLoan(A, s, spec, out);
  for (const spec of list(e.close)) if (spec?.product) closeProduct(A, s, spec, out);

  const cash = num(e.cash);
  if (cash > 0) {
    s.money.cash += cash;
    flow(s, cashCategory, cash);
    out.push({ type: "cash", amount: cash });
  }

  if (e.jar && typeof e.jar === "object") {
    for (const [jar, raw] of Object.entries(e.jar)) {
      const x = num(raw);
      const isWallet = jar === "wants";
      if (!isWallet && !(jar in s.money.jars)) continue;
      const balance = isWallet ? s.money.wallet : s.money.jars[jar];
      const moved = x > 0 ? Math.min(x, s.money.cash) : -Math.min(-x, balance);
      s.money.cash -= moved;
      if (isWallet) s.money.wallet += moved;
      else s.money.jars[jar] += moved;
      out.push({ type: "jar", jar, amount: moved, requested: x });
    }
  }

  if (cash < 0) {
    const cost = -cash;
    flow(s, "spend", -cost);
    const r = pay(A, s, cost, { order: "spend", borrow: true, reason: "card" });
    out.push({ type: "cash", amount: -cost, paidFrom: r.paid, penalties: r.penalties, borrowed: r.borrowed });
  }

  for (const spec of list(e.repay)) if (spec?.loan) repayLoan(A, s, spec, out);
  for (const spec of list(e.open)) if (spec?.product) openProduct(A, s, spec, out);
  for (const spec of list(e.shock)) if (spec) applyShock(A, s, spec, out);

  if (e.meters && typeof e.meters === "object") {
    for (const [m, d] of Object.entries(e.meters)) addMeter(s, m, d);
  }

  if (e.flags) {
    for (const f of list(e.flags.add)) if (!s.flags.includes(f)) s.flags.push(f);
    const remove = list(e.flags.remove);
    if (remove.length) s.flags = s.flags.filter((f) => !remove.includes(f));
  }

  for (const item of list(e.schedule)) {
    if (!item?.card) continue;
    const inYears = Math.max(0, num(item.inYears ?? 1));
    const entry = { age: s.age + inYears, card: item.card, unlessFlag: item.unlessFlag ?? null, origin };
    if (inYears === 0) s.queue.unshift({ type: "scheduled", card: entry.card, unlessFlag: entry.unlessFlag, origin });
    else s.scheduled.push(entry);
    out.push({ type: "scheduled", card: item.card, age: entry.age });
  }

  if (e.gyaan) addMeter(s, "gyaan", e.gyaan);
  if (e.glasses) s.glasses.charges = Math.max(0, s.glasses.charges + num(e.glasses));
}
