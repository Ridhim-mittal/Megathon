// Money mechanics. Every function works on a state the caller already cloned (see engine.js)
// and keeps money in whole rupees.
//
// Conservation: every rupee that enters or leaves the player's balance sheet is recorded in
// `s.flows` (cumulative) and `s.year.flows` (this year) by category. Moving money between the
// player's own accounts records nothing. So at all times:
//   netWorth(s) === sum of s.flows
// which the tests check after every step.

import { INSURANCE_PRODUCTS, INVESTABLE } from "./curriculum.js";

const LIQUID_PRODUCTS = ["bank", "fd", "rd", "chit", "gold", "sip_index", "mf_debt", "mf_active", "stock_kisan", "stock_chai", "stock_spark", "stock_power"];
const round = (x) => Math.round(Number(x) || 0);

// ---------- ledger ----------

export function flow(s, category, amount) {
  const x = round(amount);
  if (!x) return;
  s.flows[category] = (s.flows[category] ?? 0) + x;
  if (s.year) s.year.flows[category] = (s.year.flows[category] ?? 0) + x;
}

export function addEvent(s, event) {
  if (s.year) s.year.events.push({ age: s.age, ...event });
}

export const sumFlows = (flows) => Object.values(flows).reduce((a, b) => a + b, 0);

// ---------- balances ----------

export function productsValue(s, ids = null) {
  let total = 0;
  for (const [id, h] of Object.entries(s.money.products)) if (!ids || ids.includes(id)) total += h.value;
  return total;
}

export function totalDebt(s) {
  return s.loans.reduce((a, l) => a + l.balance + l.feeDue, 0);
}

export function highInterestDebt(A, s) {
  return s.loans
    .filter((l) => l.rateYearly >= A.highInterestRate)
    .reduce((a, l) => a + l.balance + l.feeDue, 0);
}

export function savingsTotal(s) {
  return s.money.cash + s.money.wallet + s.money.jars.emergency + s.money.jars.goal + productsValue(s, ["bank"]);
}

export function liquidTotal(s) {
  return s.money.cash + s.money.wallet + s.money.jars.emergency + s.money.jars.goal + productsValue(s, LIQUID_PRODUCTS);
}

// What could be raised today from liquid holdings, after early-withdrawal penalties.
export function liquidNet(A, s) {
  let total = s.money.cash + s.money.wallet + s.money.jars.emergency + s.money.jars.goal;
  for (const id of LIQUID_PRODUCTS) {
    const h = s.money.products[id];
    if (h) total += h.value - Math.round(h.value * (A.products[id]?.earlyPenalty ?? 0));
  }
  return total;
}

export function netWorth(s) {
  return (
    s.money.cash +
    s.money.wallet +
    s.money.jars.emergency +
    s.money.jars.goal +
    productsValue(s) -
    totalDebt(s)
  );
}

// Sum of monthly EMIs for loans that are being repaid now (not in moratorium).
export function monthlyEmi(s) {
  return s.loans.filter((l) => l.balance > 0 && l.moratoriumLeft <= 0).reduce((a, l) => a + l.emi, 0);
}

// ---------- paying ----------

function penaltyRateFor(A, s, key) {
  const p = A.products[key];
  if (!p) return 0;
  return p.earlyPenalty ?? 0;
}

// Take up to `need` (net) from one account. Breaking a deposit early costs a penalty.
function takeFrom(A, s, key, need) {
  const m = s.money;
  if (key === "cash" || key === "wallet") {
    const x = Math.min(m[key], need);
    m[key] -= x;
    return { amount: x, penalty: 0 };
  }
  if (key === "emergency" || key === "goal") {
    const x = Math.min(m.jars[key], need);
    m.jars[key] -= x;
    return { amount: x, penalty: 0 };
  }
  const h = m.products[key];
  if (!h || h.value <= 0) return { amount: 0, penalty: 0 };
  const rate = penaltyRateFor(A, s, key);
  let gross;
  let net;
  if (h.value - Math.round(h.value * rate) >= need) {
    gross = Math.min(h.value, Math.ceil(need / (1 - rate)));
    net = need;
  } else {
    gross = h.value;
    net = gross - Math.round(gross * rate);
  }
  const penalty = gross - net;
  h.value -= gross;
  if (h.value <= 0) delete m.products[key];
  if (penalty > 0) flow(s, "penalties", -penalty);
  return { amount: net, penalty };
}

// Which lender the player is pushed to when savings run out: the most expensive one they can
// reach.
export function forcedSource(A, s) {
  const reachable = A.forcedBorrowing.candidates.filter((source) => {
    const rule = A.forcedBorrowing.access[source] ?? {};
    if (rule.orStoryline?.includes(s.storylineId) && (rule.minAge == null || s.age >= rule.minAge)) return true;
    if (rule.minAge != null && s.age < rule.minAge) return false;
    if (rule.anyFlag && !rule.anyFlag.some((f) => s.flags.includes(f))) return false;
    return true;
  });
  const list = reachable.length ? reachable : ["moneylender"];
  return list.reduce((worst, x) => (A.loans[x].rateYearly > A.loans[worst].rateYearly ? x : worst));
}

// Pay `amount` from the player's accounts in the given order. The caller records the flow for
// what was bought; this only moves the money (and records early-withdrawal penalties).
// With `borrow`, any shortfall becomes a forced loan that pays the bill directly.
export function pay(A, s, amount, { order = "spend", borrow = false, exclude = null, reason = null } = {}) {
  let need = Math.max(0, round(amount));
  const paid = [];
  let penalties = 0;
  for (const key of A.payOrder[order]) {
    if (need <= 0) break;
    if (key === exclude) continue;
    const t = takeFrom(A, s, key, need);
    if (t.amount > 0) {
      const last = paid[paid.length - 1];
      if (last?.from === key) last.amount += t.amount;
      else paid.push({ from: key, amount: t.amount });
    }
    need -= t.amount;
    penalties += t.penalty;
  }
  let borrowed = null;
  if (need > 0 && borrow) {
    const source = forcedSource(A, s);
    const loan = createLoan(A, s, { source, principal: need }, { forced: true, reason });
    borrowed = { source, amount: need, loanId: loan.id, rateYearly: loan.rateYearly, emi: loan.emi, months: loan.months };
    need = 0;
  }
  return { paid, penalties, borrowed, unpaid: need };
}

// ---------- loans ----------

export function computeEmi(principal, rateYearly, months, method) {
  if (months <= 0) return principal;
  if (method === "flat") return Math.round(principal / months) + Math.round((principal * rateYearly) / 12);
  if (method === "bullet") return Math.round((principal * rateYearly) / 12);
  const r = rateYearly / 12;
  if (r === 0) return Math.ceil(principal / months);
  const f = Math.pow(1 + r, months);
  return Math.ceil((principal * r * f) / (f - 1));
}

function buildLoan(A, s, spec) {
  const a = A.loans[spec.source];
  if (!a) return null;
  const principal = round(spec.principal);
  if (principal <= 0) return null;
  const months = Math.max(1, round(spec.months ?? a.months));
  const fee = Math.max(0, round(spec.fee ?? principal * a.feePct));
  const explicitEmi = spec.emi != null && Number(spec.emi) > 0;
  const method = explicitEmi ? "flat" : a.method;
  const loan = {
    id: `${spec.source}#${s.counters.loan++}`,
    source: spec.source,
    method,
    principal,
    balance: principal,
    rateYearly: Number(spec.rateYearly ?? a.rateYearly),
    emi: 0,
    months,
    monthsLeft: months,
    fee,
    feeDue: fee,
    principalPart: 0,
    flatInterest: 0,
    moratoriumLeft: round(a.moratoriumMonths ?? 0),
    takenAge: s.age,
    forced: false,
    interestPaid: 0,
  };
  if (method === "flat") {
    loan.principalPart = Math.round(principal / months);
    loan.flatInterest = explicitEmi
      ? Math.max(0, round(spec.emi) - loan.principalPart)
      : Math.round((principal * loan.rateYearly) / 12);
    loan.emi = loan.principalPart + loan.flatInterest;
    if (explicitEmi) loan.rateYearly = Math.round(((loan.flatInterest * 12) / principal) * 10000) / 10000;
  } else {
    loan.emi = computeEmi(principal, loan.rateYearly, months, method);
  }
  return loan;
}

// One month of a loan. Returns the payment due and how much of it is interest.
function loanMonth(loan) {
  if (loan.balance <= 0) return { payment: 0, interest: 0, capitalized: 0 };
  const monthlyRate = loan.rateYearly / 12;
  if (loan.moratoriumLeft > 0) {
    const capitalized = Math.round(loan.balance * monthlyRate);
    loan.balance += capitalized;
    loan.moratoriumLeft -= 1;
    if (loan.moratoriumLeft === 0) loan.emi = computeEmi(loan.balance, loan.rateYearly, loan.monthsLeft, loan.method);
    return { payment: 0, interest: 0, capitalized };
  }
  const last = loan.monthsLeft <= 1;
  let interest;
  let principal;
  if (loan.method === "flat") {
    interest = loan.flatInterest;
    principal = last ? loan.balance : Math.min(loan.balance, loan.principalPart);
  } else if (loan.method === "bullet") {
    interest = Math.round(loan.balance * monthlyRate);
    principal = last ? loan.balance : 0;
  } else {
    interest = Math.round(loan.balance * monthlyRate);
    principal = last ? loan.balance : Math.min(loan.balance, Math.max(0, loan.emi - interest));
  }
  loan.balance -= principal;
  loan.monthsLeft = Math.max(0, loan.monthsLeft - 1);
  return { payment: principal + interest, interest, capitalized: 0 };
}

// Create a loan record (debt) without moving any cash. Forced loans pay a bill directly.
export function createLoan(A, s, spec, { forced = false, reason = null } = {}) {
  const loan = buildLoan(A, s, spec);
  if (!loan) return null;
  loan.forced = forced;
  if (reason) loan.reason = reason;
  if (loan.fee > 0) flow(s, "fees", -loan.fee);
  s.loans.push(loan);
  addEvent(s, { type: "loanTaken", source: loan.source, principal: loan.principal, forced, loanId: loan.id });
  return loan;
}

// The full repayment picture of a loan before taking it: for outcome screens, Sahukar's chair
// and the "₹2 per ₹100 per month" lesson.
export function quoteLoan(A, spec) {
  const loan = buildLoan(A, { age: 0, counters: { loan: 0 } }, spec);
  if (!loan) return null;
  let totalPaid = loan.fee;
  let interest = 0;
  let capitalized = 0;
  const cashflows = [];
  for (let m = 0; m < 1200 && (loan.balance > 0 || m === 0); m++) {
    const r = loanMonth(loan);
    totalPaid += r.payment;
    interest += r.interest;
    capitalized += r.capitalized;
    cashflows.push(r.payment);
    if (loan.balance <= 0) break;
  }
  const principal = round(spec.principal);
  const a = A.loans[spec.source];
  return {
    source: spec.source,
    principal,
    months: loan.months,
    method: loan.method,
    rateYearly: loan.rateYearly,
    perHundredPerMonth: Math.round(((loan.rateYearly * 100) / 12) * 100) / 100,
    emi: loan.emi,
    fee: loan.fee,
    totalInterest: interest + capitalized,
    totalPayable: totalPaid,
    // The true yearly cost on a reducing-balance basis (what a bank would call the APR).
    effectiveYearly: effectiveRate(principal - loan.fee, cashflows),
    disburse: spec.disburse ?? a.disburse,
  };
}

// Monthly IRR of receiving `received` now and paying `cashflows` monthly, times 12.
function effectiveRate(received, cashflows) {
  if (received <= 0 || !cashflows.length) return 0;
  const npv = (r) => cashflows.reduce((acc, c, i) => acc + c / Math.pow(1 + r, i + 1), 0) - received;
  let lo = 0;
  let hi = 1;
  if (npv(lo) <= 0) return 0;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid;
    else hi = mid;
  }
  return Math.round(lo * 12 * 10000) / 10000;
}

// Run 12 months of every existing loan and pay what is due (plus any first-bill fee) through the
// auto order, borrowing again if nothing is left. Returns the amount paid.
export function runLoansForYear(A, s) {
  const loans = [...s.loans];
  let due = 0;
  let interest = 0;
  for (const loan of loans) {
    due += loan.feeDue;
    loan.feeDue = 0;
    for (let m = 0; m < 12; m++) {
      const r = loanMonth(loan);
      due += r.payment;
      interest += r.interest;
      loan.interestPaid += r.interest;
      if (r.capitalized) flow(s, "loanInterest", -r.capitalized);
      if (loan.balance <= 0) break;
    }
  }
  flow(s, "loanInterest", -interest);
  let result = null;
  if (due > 0) {
    result = pay(A, s, due, { order: "auto", borrow: true, reason: "emi" });
    if (result.borrowed) addEvent(s, { type: "borrowedForEmi", source: result.borrowed.source, amount: result.borrowed.amount });
  }
  clearFinishedLoans(s);
  return { due, interest, result };
}

export function clearFinishedLoans(s) {
  const done = s.loans.filter((l) => l.balance <= 0 && l.feeDue <= 0);
  for (const l of done) addEvent(s, { type: "loanCleared", source: l.source, loanId: l.id });
  s.loans = s.loans.filter((l) => !(l.balance <= 0 && l.feeDue <= 0));
}

// A loan from a card's `loan` effect.
export function takeLoan(A, s, spec, out) {
  const a = A.loans[spec.source];
  const loan = createLoan(A, s, spec);
  if (!loan) return;
  const disburse = spec.disburse ?? a.disburse;
  if (disburse === "cash") s.money.cash += loan.principal;
  else flow(s, "spend", -loan.principal);
  if (a.familyCost) s.meters.family = Math.max(0, Math.min(100, s.meters.family + a.familyCost));
  const q = quoteLoan(A, { ...spec, principal: loan.principal });
  out.push({
    type: "loan",
    loanId: loan.id,
    source: loan.source,
    principal: loan.principal,
    months: loan.months,
    emi: loan.emi,
    rateYearly: loan.rateYearly,
    fee: loan.fee,
    totalPayable: q.totalPayable,
    totalInterest: q.totalInterest,
    effectiveYearly: q.effectiveYearly,
    disburse,
  });
}

export function repayLoan(A, s, spec, out) {
  const key = spec.loan;
  const targets = s.loans.filter((l) => l.source === key || l.id === key);
  const owed = targets.reduce((a, l) => a + l.balance + l.feeDue, 0);
  const want = spec.amount == null || spec.amount === "all" ? owed : Math.min(owed, Math.max(0, round(spec.amount)));
  if (want <= 0) {
    out.push({ type: "repay", loan: key, requested: 0, paid: 0, paidFrom: [] });
    return;
  }
  const r = pay(A, s, want, { order: "spend", borrow: false });
  let left = want - r.unpaid;
  const paidTotal = left;
  for (const l of targets) {
    const fee = Math.min(l.feeDue, left);
    l.feeDue -= fee;
    left -= fee;
    const bal = Math.min(l.balance, left);
    l.balance -= bal;
    left -= bal;
  }
  clearFinishedLoans(s);
  out.push({ type: "repay", loan: key, requested: want, paid: paidTotal, paidFrom: r.paid });
}

// ---------- products ----------

function holding(s, product) {
  s.money.products[product] ??= { value: 0, invested: 0, openedAge: s.age };
  return s.money.products[product];
}

// Put already-available money into a product (gold loses its buying spread).
export function depositInto(A, s, product, amount) {
  const x = round(amount);
  if (x <= 0) return { added: 0, spread: 0 };
  const spreadRate = A.products[product]?.buySpread ?? 0;
  const spread = Math.round(x * spreadRate);
  const h = holding(s, product);
  h.value += x - spread;
  h.invested += x;
  if (spread) flow(s, "fees", -spread);
  return { added: x - spread, spread };
}

export function premiumOf(A, s, policy) {
  const base = A.insurance[policy.type];
  return Math.max(1, Math.round(base.premiumYearly * (policy.cover / base.cover) * s.priceIndex));
}

function openPolicy(A, s, type, amount, out) {
  const base = A.insurance[type];
  const cover = amount > 0 ? round(amount) : base.cover;
  const policy = { type, cover, since: s.age };
  const premium = premiumOf(A, s, policy);
  if (liquidNet(A, s) < premium) {
    out.push({ type: "insurance", product: type, cover, premium, opened: false });
    return;
  }
  const r = pay(A, s, premium, { order: "spend" });
  flow(s, "premiums", -premium);
  s.insurance = s.insurance.filter((p) => p.type !== type);
  s.insurance.push(policy);
  out.push({ type: "insurance", product: type, cover, premium, opened: true, paidFrom: r.paid });
}

export function openProduct(A, s, spec, out) {
  const product = spec.product;
  if (INSURANCE_PRODUCTS.includes(product)) return openPolicy(A, s, product, spec.amount, out);
  if (!A.products[product]) return;
  const want = Math.max(0, round(spec.amount ?? 0));
  let paidFrom = [];
  let paid = 0;
  if (want > 0) {
    const r = pay(A, s, want, { order: "open", exclude: product });
    paidFrom = r.paid;
    paid = want - r.unpaid;
  }
  holding(s, product);
  const { spread } = depositInto(A, s, product, paid);
  if (INVESTABLE.includes(product)) s.investIn = product;
  out.push({ type: "open", product, requested: want, paid, spread, shortfall: want - paid, paidFrom });
}

export function closePenaltyRate(A, s, product) {
  const p = A.products[product] ?? {};
  const h = s.money.products[product];
  if (product === "ppf") return h && s.age - h.openedAge >= p.lockYears ? 0 : p.earlyPenalty;
  return p.earlyPenalty ?? p.sellCost ?? 0;
}

export function closeProduct(A, s, spec, out) {
  const product = spec.product;
  if (INSURANCE_PRODUCTS.includes(product)) {
    const had = s.insurance.some((p) => p.type === product);
    s.insurance = s.insurance.filter((p) => p.type !== product);
    out.push({ type: "close", product, value: 0, penalty: 0, received: 0, had });
    return;
  }
  const h = s.money.products[product];
  if (!h) {
    out.push({ type: "close", product, value: 0, penalty: 0, received: 0, had: false });
    return;
  }
  const penalty = Math.round(h.value * closePenaltyRate(A, s, product));
  const received = h.value - penalty;
  s.money.cash += received;
  if (penalty) flow(s, "penalties", -penalty);
  delete s.money.products[product];
  if (s.investIn === product) s.investIn = A.budget.defaultInvestIn;
  out.push({ type: "close", product, value: h.value, penalty, received, invested: h.invested, had: true });
}

// ---------- shocks ----------

export function applyShock(A, s, spec, out) {
  const cost = Math.max(0, round(spec.cost));
  const kind = spec.kind ?? "other";
  flow(s, "shocks", -cost);
  let remaining = cost;
  const insurancePaid = [];
  for (const type of A.shockCover[kind] ?? []) {
    const policy = s.insurance.find((p) => p.type === type);
    if (!policy || remaining <= 0) continue;
    const x = Math.min(remaining, policy.cover);
    flow(s, "insurance", x);
    remaining -= x;
    insurancePaid.push({ product: type, amount: x });
  }
  const r = pay(A, s, remaining, { order: "shock", borrow: true, reason: `shock:${kind}` });
  const insurance = insurancePaid.reduce((a, x) => a + x.amount, 0);
  addEvent(s, { type: "shock", kind, cost, insurance, borrowed: r.borrowed?.amount ?? 0 });
  out.push({
    type: "shock",
    kind,
    cost,
    insurance,
    insurancePaid,
    paidFrom: r.paid,
    penalties: r.penalties,
    borrowed: r.borrowed,
  });
}

// ---------- the new-year money routine ----------

export function payPremiums(A, s) {
  let total = 0;
  for (const policy of [...s.insurance]) {
    const premium = premiumOf(A, s, policy);
    if (liquidNet(A, s) < premium) {
      s.insurance = s.insurance.filter((p) => p !== policy);
      addEvent(s, { type: "policyLapsed", product: policy.type });
      continue;
    }
    pay(A, s, premium, { order: "auto" });
    flow(s, "premiums", -premium);
    total += premium;
  }
  return total;
}

// Interest and seeded returns for the year that just ended.
export function growHoldings(A, s, world, age) {
  const P = A.products;
  const m = s.money;
  if (m.products.bank) {
    for (const jar of ["emergency", "goal"]) {
      const i = Math.round(m.jars[jar] * P.bank.rate);
      m.jars[jar] += i;
      flow(s, "interest", i);
    }
  }
  for (const [id, h] of Object.entries(m.products)) {
    let change = 0;
    let category = "interest";
    if (P[id]?.rate != null) change = Math.round(h.value * P[id].rate);
    else if (world.returns[id]) {
      change = Math.round(h.value * world.returns[id][age]);
      category = "returns";
    } else if (id === "vehicle") {
      change = -Math.round(h.value * P.vehicle.depreciation);
      category = "depreciation";
    }
    if (id === "chit" && world.chitCollapse[age] && s.flags.includes(P.chit.collapseFlag)) {
      flow(s, "losses", -h.value);
      addEvent(s, { type: "chitCollapsed", lost: h.value });
      delete m.products[id];
      continue;
    }
    h.value += change;
    flow(s, category, change);
    if (id === "sip_index" && world.crashAges.includes(age) && h.value > 0) {
      addEvent(s, { type: "marketCrash", product: id, pct: Math.round(world.returns.sip_index[age] * 100) });
    }
  }
}
