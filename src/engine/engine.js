// Lakshyam life engine. One plain state object, advanced by commands.
// `dispatch(state, cmd)` is pure (clones first); `apply` mutates and is used
// by fast simulations. Luck comes only from rng.js, keyed by seed and age.
import {
  CFG,
  METERS,
  cards,
  messages,
  crossroads,
  lessons,
  cardById,
  msgById,
  crossById,
} from "./data.js";
import { luck, luckNormal, rngFor } from "./rng.js";
import { emi, loanTerms, sum } from "./finance.js";

const { startAge, endAge, fullTurnsUntil } = CFG;
const clamp = (n, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const r100 = (n) => Math.round(n / 100) * 100;

export const stageFor = (age) =>
  CFG.stages.find((st) => age >= st.from && age <= st.to);
export const isFastForward = (age) => age > fullTurnsUntil;
export const goalTargetAt = (age) =>
  r100(CFG.goalTarget * (1 + CFG.houseInflationPct / 100) ** (age - startAge));
export const houseFund = (s) => s.goalJar + s.fd + s.rd + s.gold + s.sip;
export const totalDebt = (s) => sum(s.loans.map((l) => l.balance));
export const abroadNow = (s, age = s.age) => s.abroad && age >= 24 && age <= 27;

export function hud(s) {
  const fund = houseFund(s);
  return {
    wallet: Math.round(s.wallet),
    debt: Math.round(totalDebt(s)),
    goalPct: Math.min(100, Math.floor((fund / goalTargetAt(s.age)) * 100)),
    fund: Math.round(fund),
    ...Object.fromEntries(METERS.map((m) => [m, Math.round(s.meters[m])])),
  };
}

export function newLife(seed) {
  const s = {
    v: 1,
    seed,
    age: startAge,
    wallet: 0,
    goalJar: 0,
    fd: 0,
    rd: 0,
    rdMonthly: 0,
    gold: 0,
    sip: 0,
    sipMonthly: 0,
    bank: false,
    insured: false,
    chitti: null,
    loans: [],
    nextId: 1,
    meters: { ...CFG.meterStart },
    budget: null,
    budgetKey: null,
    autoRepay: true,
    incomePct: 0,
    income: 0,
    path: null,
    abroad: false,
    city: false,
    business: null,
    flags: {},
    lessons: 0,
    seeds: [],
    seen: {},
    loanTemplate: null,
    roleflip: null,
    crossroads: {},
    goalMetAge: null,
    stats: { scamsFlagged: 0, scamsFallen: 0, legitFlagged: 0, missedEmis: 0 },
    years: [],
    cur: null,
    queue: [],
    phase: "play",
    energy: 0,
    commands: [],
    ending: null,
  };
  beginYear(s);
  return s;
}

/* ---------- income & budget ---------- */

export function incomeFor(s, age = s.age) {
  if (age === 17) return 12000;
  if (age === 18) return 36000;
  const path = s.path || "work";
  let inc;
  if (age <= 20) inc = { study: 36000, work: 108000, mixed: 72000 }[path];
  else {
    const base = { study: 240000, work: 150000, mixed: 190000 }[path];
    const g = { study: 0.07, work: 0.05, mixed: 0.06 }[path];
    inc = base * (1 + g) ** (age - 21);
  }
  if (abroadNow(s, age)) inc *= 2.1;
  if (s.city) inc *= 1.3;
  inc *= 1 + s.incomePct / 100;
  return Math.max(0, Math.round(inc / 1000) * 1000);
}

export const budgetKeyFor = (s) =>
  [stageFor(s.age).id, s.path || "-", abroadNow(s) ? "abroad" : "home", s.city ? "city" : ""].join("|");

export const DEFAULT_BUDGET = Object.freeze({ needs: 50, wants: 20, savings: 15, goal: 15 });

export function validBudget(b) {
  const keys = ["needs", "wants", "savings", "goal"];
  return (
    b &&
    keys.every((k) => Number.isInteger(b[k]) && b[k] >= 0 && b[k] % 5 === 0) &&
    sum(keys.map((k) => b[k])) === 100
  );
}

export const needsFloor = (s) => stageFor(s.age).needsFloor + (s.city ? 5 : 0);

// EMIs due this year come out of income before the jars are filled.
export function emiReserve(s) {
  const yearly = sum(
    s.loans.map((l) => (l.source === "card" ? Math.max(500, l.balance * 0.05) : l.emi) * Math.min(12, l.monthsLeft)),
  );
  return Math.min(Math.round(yearly), Math.round(s.income * 0.6));
}

function applySplit(s) {
  const b = s.budget;
  const reserved = emiReserve(s);
  const inc = s.income - reserved;
  const amt = {
    needs: Math.round((inc * b.needs) / 100),
    wants: Math.round((inc * b.wants) / 100),
    savings: Math.round((inc * b.savings) / 100),
    goal: 0,
  };
  amt.goal = inc - amt.needs - amt.wants - amt.savings;
  const fx = {};
  const gap = needsFloor(s) - b.needs;
  if (gap > 0) {
    fx.health = -(Math.ceil(gap / 2) + 1);
    fx.family = -Math.ceil(gap / 3);
    note(s, "needsShort", { floor: needsFloor(s) });
  } else fx.health = 1;
  fx.peace = b.wants < 5 ? -4 : b.wants >= 20 ? 3 : b.wants >= 10 ? 1 : 0;
  if (b.wants > 30) fx.family = (fx.family || 0) - 2;
  bumpMeters(s, fx);
  s.wallet += amt.savings + reserved;
  s.goalJar += amt.goal;
  s.cur.split = { ...amt, reserved };
}

/* ---------- year flow ---------- */

function beginYear(s) {
  const age = s.age;
  s.cur = {
    age,
    income: 0,
    split: null,
    actions: [],
    events: [],
    message: null,
    seeds: [],
    threads: [],
    notes: [],
    luck: [],
    before: hud(s),
    budgetPrompted: false,
    goalWithdrawn: 0,
  };
  s.energy = isFastForward(age) ? 0 : 3;
  const q = [];
  const cr = crossroads.find((c) => c.age === age);
  if (cr) q.push({ kind: "crossroads", id: cr.id });
  q.push({ kind: "income" });
  if (age === CFG.roleflip.age) q.push({ kind: "roleflip" });
  if (!isFastForward(age)) q.push({ kind: "actions" });
  q.push({ kind: "draw" });
  q.push({ kind: "settle" });
  s.queue = q;
  advance(s);
}

function advance(s) {
  while (s.queue.length) {
    const step = s.queue[0];
    if (step.kind === "income") {
      s.queue.shift();
      s.income = incomeFor(s);
      s.cur.income = s.income;
      const key = budgetKeyFor(s);
      if (!s.budget || s.budgetKey !== key) {
        s.cur.budgetPrompted = true;
        s.queue.unshift({ kind: "budget" });
      } else applySplit(s);
      continue;
    }
    if (step.kind === "draw") {
      s.queue.shift();
      s.queue.unshift(...drawYear(s));
      continue;
    }
    if (step.kind === "settle") {
      s.queue.shift();
      settle(s);
      s.queue = [{ kind: "yearEnd" }];
      return;
    }
    return; // a decision is needed
  }
}

export const currentStep = (s) => (s.phase === "ending" ? { kind: "ending" } : s.queue[0]);

function drawYear(s) {
  const age = s.age;
  const steps = [];
  for (const seed of s.seeds) {
    if (seed.fireAge !== age || seed.status !== "growing") continue;
    if (seed.fires) {
      seed.status = "fired";
      steps.push({ kind: "event", cardId: seed.consequence, seedId: seed.id });
      s.cur.threads.push(seed.id);
    } else seed.status = "withered";
  }
  const rng = rngFor(s.seed, "events", age);
  const want = rng() < 0.5 ? 1 : 2;
  const medical =
    age >= 20 && luck(s.seed, "medical", age) < CFG.insurance.medicalOdds;
  if (medical) steps.push({ kind: "event", cardId: "medical" });
  const pool = cards.filter(
    (c) =>
      !c.consequence &&
      !c.medical &&
      age >= c.ages[0] &&
      age <= c.ages[1] &&
      (!(c.id in s.seen) || (c.repeat && age - s.seen[c.id] >= c.repeat)),
  );
  const room = Math.max(steps.length ? 0 : 1, Math.min(want, 3 - steps.length));
  for (let i = 0; i < room && pool.length; i++) {
    const [card] = pool.splice(Math.floor(rng() * pool.length), 1);
    s.seen[card.id] = age;
    steps.push({ kind: "event", cardId: card.id });
  }
  if (age >= 18 && luck(s.seed, "msg", age) < 0.8) {
    const mpool = messages.filter(
      (m) => age >= m.ages[0] && age <= m.ages[1] && !(m.id in s.seen),
    );
    if (mpool.length) {
      const m = mpool[Math.floor(luck(s.seed, "msgpick", age) * mpool.length)];
      s.seen[m.id] = age;
      steps.splice(Math.min(1, steps.length), 0, { kind: "message", msgId: m.id });
    }
  }
  return steps;
}

/* ---------- money movement ---------- */

function note(s, key, params = {}) {
  s.cur.notes.push({ key, ...params });
}

function bumpMeters(s, fx) {
  for (const m of METERS) if (fx[m]) s.meters[m] = clamp(s.meters[m] + fx[m]);
}

const CASCADE = ["wallet", "goalJar", "fd", "rd", "gold", "sip"];

// Pay from cash first, then break savings; borrow from the lender only as a last resort.
export function spend(s, amount, why = "spend") {
  let need = Math.round(amount);
  for (const k of CASCADE) {
    if (need <= 0) break;
    const take = Math.min(Math.max(0, s[k]), need);
    if (take <= 0) continue;
    s[k] -= take;
    need -= take;
    if (k !== "wallet") {
      s.cur.goalWithdrawn += take;
      note(s, "broke", { from: k, amount: take });
    }
  }
  if (need > 0) {
    addLoan(s, need, "lender", { forced: true, cash: false });
    note(s, "forcedLoan", { amount: need, why });
  }
}

export function loanQuote(s, amount, source) {
  const tpl = s.loanTemplate && !s.loanTemplate.used && source !== "card" && source !== "refinance";
  const base = tpl ? s.loanTemplate : CFG.loans[source];
  let annualPct = base.annualPct;
  if (!tpl && source === "bank" && s.flags.lowScore) annualPct += CFG.lowScorePenaltyPct;
  return {
    ...loanTerms({ amount, annualPct, months: base.months, feePct: base.feePct }),
    source,
    fromRoleflip: Boolean(tpl),
    perHundredMonthly: annualPct / 12,
  };
}

// cash=true pays the amount into the wallet; otherwise it buys something directly.
function addLoan(s, amount, source, { forced = false, cash = false } = {}) {
  if (amount <= 0) return null;
  const q = loanQuote(s, amount, source);
  if (q.fromRoleflip) s.loanTemplate.used = true;
  const loan = {
    id: s.nextId++,
    source,
    amount,
    balance: amount,
    annualPct: q.annualPct,
    months: q.months,
    monthsLeft: q.months,
    emi: q.emi,
    fee: q.fee,
    totalRepay: q.totalRepay,
    takenAge: s.age,
    forced,
    fromRoleflip: q.fromRoleflip,
  };
  s.loans.push(loan);
  if (cash) s.wallet += amount;
  if (q.fee) spend(s, q.fee, "fee");
  s.cur.notes.push({ key: "loan", source, amount, total: q.totalRepay, emi: q.emi });
  return loan;
}

function payLoan(s, loan, amount) {
  const paid = Math.min(amount, loan.balance);
  loan.balance -= paid;
  return paid;
}

function prepay(s, amount, source) {
  let left = amount;
  const order = [...s.loans]
    .filter((l) => !source || l.source === source)
    .sort((a, b) => b.annualPct - a.annualPct);
  for (const l of order) left -= payLoan(s, l, left);
  s.loans = s.loans.filter((l) => l.balance > 0.5);
  return amount - left;
}

/* ---------- effects ---------- */

export function cardScale(s, card) {
  if (!card.scaled) return 1;
  return Math.min(3, Math.max(1, Math.round((s.income / 150000) * 4) / 4));
}

// What an option will do, computed before the tap so the UI can show it.
export function previewOption(s, opt, card = {}) {
  const scale = cardScale(s, card);
  const fx = { ...opt.effects };
  if (fx.money) fx.money = r100(fx.money * scale);
  let covered = 0;
  if (card.insurable && s.insured && fx.money < 0) {
    covered = Math.round((-fx.money * CFG.insurance.coverPct) / 100);
    fx.money += covered;
  }
  let loan = null;
  if (opt.loan) {
    let amount = r100(opt.loan.amount * scale);
    if (card.insurable && s.insured) amount = r100(amount * (1 - CFG.insurance.coverPct / 100));
    loan = loanQuote(s, amount, opt.loan.source);
  }
  const debtDown = (opt.ops || [])
    .filter((o) => o.startsWith("reduceLoan:"))
    .reduce((a, o) => a + Number(o.split(":")[2]), 0);
  return { fx, loan, covered, hidden: Boolean(opt.hidden || opt.seed), debtDown, ops: opt.ops || [] };
}

function applyOption(s, opt, card, origin) {
  const p = previewOption(s, opt, card);
  if (p.fx.money > 0) s.wallet += p.fx.money;
  if (p.fx.money < 0) spend(s, -p.fx.money, card.id);
  bumpMeters(s, p.fx);
  if (p.fx.income) s.incomePct += p.fx.income;
  if (p.covered) note(s, "insured", { amount: p.covered });
  if (p.loan) addLoan(s, p.loan.amount, p.loan.source, { cash: Boolean(opt.loan.cash) });
  for (const op of p.ops) runOp(s, op);
  if (opt.set) {
    for (const [k, v] of Object.entries(opt.set)) s[k] = v;
  }
  let planted = null;
  if (opt.hidden) planted = plant(s, opt.hidden, origin);
  return { fx: p.fx, loan: p.loan, covered: p.covered, planted };
}

function runOp(s, op) {
  const [name, a, b] = op.split(":");
  if (name === "setFlag") s.flags[a] = true;
  if (name === "clearFlag") delete s.flags[a];
  if (name === "payoff") s.loans = s.loans.filter((l) => l.source !== a);
  if (name === "reduceLoan") {
    const used = prepay(s, Number(b), a);
    s.wallet += Number(b) - used;
  }
  if (name === "refinance") {
    for (const l of s.loans.filter((x) => x.source === a)) {
      const t = CFG.loans.refinance;
      Object.assign(l, {
        source: "refinance",
        annualPct: t.annualPct,
        months: t.months,
        monthsLeft: t.months,
        emi: emi(l.balance, t.annualPct, t.months),
      });
    }
  }
}

function plant(s, hidden, origin) {
  const key = `${origin.kind}:${origin.id}:${origin.optionId}`;
  let consequence = hidden.seed;
  let fires = true;
  const roll = luck(s.seed, "seed", key);
  if (hidden.outcomes) {
    let acc = 0;
    consequence = hidden.outcomes[hidden.outcomes.length - 1].seed;
    for (const o of hidden.outcomes) {
      acc += o.p;
      if (roll < acc) {
        consequence = o.seed;
        break;
      }
    }
  } else fires = roll < (hidden.chance ?? 1);
  const seed = {
    id: `seed${s.seeds.length + 1}`,
    age: s.age,
    origin,
    consequence,
    fires,
    fireAge: Math.min(endAge, s.age + (hidden.after ?? 1)),
    status: "growing",
  };
  if (seed.fireAge === s.age) seed.fireAge = s.age + 1;
  s.seeds.push(seed);
  s.cur.seeds.push(seed.id);
  return seed.id;
}

/* ---------- actions (energy points) ---------- */

export const ACTIONS = ["bank", "learn", "fd", "rd", "chitti", "gold", "sip", "insurance", "loan", "repay"];

export function actionAvailable(s, kind) {
  const age = s.age;
  if (age < CFG.unlocks[kind]) return { ok: false, reason: "age", at: CFG.unlocks[kind] };
  if (s.energy <= 0) return { ok: false, reason: "energy" };
  const needBank = ["fd", "rd", "sip"].includes(kind);
  if (needBank && !s.bank) return { ok: false, reason: "bank" };
  if (kind === "bank" && s.bank) return { ok: false, reason: "done" };
  if (kind === "learn" && s.lessons >= lessons.length) return { ok: false, reason: "done" };
  if (kind === "sip" && s.lessons < 3) return { ok: false, reason: "lesson" };
  if (kind === "insurance" && s.insured) return { ok: false, reason: "done" };
  if (kind === "chitti" && s.chitti) return { ok: false, reason: "done" };
  if (kind === "repay" && !s.loans.length) return { ok: false, reason: "noDebt" };
  if (["fd", "gold"].includes(kind) && s.wallet < 1000) return { ok: false, reason: "cash" };
  return { ok: true };
}

function doAction(s, a) {
  if (!actionAvailable(s, a.kind).ok) return false;
  const rec = { kind: a.kind };
  switch (a.kind) {
    case "bank":
      s.bank = true;
      bumpMeters(s, { gyaan: 3 });
      break;
    case "learn": {
      const lesson = lessons[s.lessons];
      s.lessons += 1;
      rec.lesson = lesson.id;
      bumpMeters(s, { gyaan: 8, peace: 1 });
      break;
    }
    case "fd":
    case "gold": {
      const amt = r100(s.wallet * clamp(a.frac ?? 0.5, 0, 1));
      if (amt <= 0) return false;
      s.wallet -= amt;
      s[a.kind] += amt;
      rec.amount = amt;
      break;
    }
    case "rd":
    case "sip": {
      const monthly = Math.max(0, Math.round(a.monthly ?? 1000));
      s[`${a.kind}Monthly`] = monthly;
      rec.monthly = monthly;
      break;
    }
    case "insurance":
      s.insured = true;
      bumpMeters(s, { peace: 3 });
      break;
    case "loan": {
      const amount = r100(Math.max(1000, a.amount ?? 10000));
      const loan = addLoan(s, amount, a.source || "bank", { cash: true });
      rec.amount = amount;
      rec.source = loan.source;
      rec.total = loan.totalRepay;
      break;
    }
    case "repay": {
      const amt = r100(Math.min(s.wallet, totalDebt(s)) * clamp(a.frac ?? 1, 0, 1));
      const used = prepay(s, amt);
      s.wallet -= used;
      rec.amount = used;
      bumpMeters(s, { peace: used > 0 ? 3 : 0 });
      break;
    }
    case "chitti": {
      const out = chittiOutcome(s.seed, s.age, a.monthly ?? 2000, a.bidPct ?? 0);
      s.chitti = out;
      if (out.won) s.wallet += out.received;
      rec.monthly = out.monthly;
      rec.won = out.won;
      rec.bidPct = out.bidPct;
      break;
    }
    default:
      return false;
  }
  s.energy -= 1;
  s.cur.actions.push(rec);
  return true;
}

/* ---------- chitti (rotating savings) ---------- */

// NPC bids for round 1, in seconds from the start. Pure: same seed → same bids.
export function chittiSchedule(seed, age) {
  const { seconds, minBidPct, maxBidPct } = CFG.chitti;
  const rng = rngFor(seed, "chitti", age);
  const cap = Math.round(minBidPct + 4 + rng() * (maxBidPct - minBidPct - 12));
  const bids = [];
  let pct = minBidPct;
  let t = 2;
  while (pct < cap && t < seconds - 2) {
    pct = Math.min(cap, pct + 1 + Math.floor(rng() * 3));
    t += 1.5 + rng() * 4;
    bids.push({ t: Math.min(seconds - 2, Math.round(t * 10) / 10), member: 1 + Math.floor(rng() * 5), pct });
  }
  return { bids, npcMax: cap };
}

export function chittiOutcome(seed, age, monthly, bidPct) {
  const { members } = CFG.chitti;
  const pot = monthly * members;
  const { npcMax } = chittiSchedule(seed, age);
  const won = bidPct > npcMax;
  const d1 = won ? bidPct : npcMax;
  const discounts = [d1];
  for (let k = 1; k < members - 1; k++) discounts.push(Math.max(0, Math.round(d1 * (1 - 0.22 * k))));
  discounts.push(0);
  const dividends = Math.round(sum(discounts.map((d) => (pot * d) / 100 / members)));
  const contributions = monthly * members;
  const takeEarly = Math.round(pot * (1 - d1 / 100));
  const received = won ? takeEarly : pot;
  const waitTotal = pot + dividends;
  const earlyTotal = takeEarly + dividends;
  // Getting money ~5 months early cost the discount: express it as a yearly rate.
  const yearlyCostPct = Math.round(((pot - takeEarly) / takeEarly) * (12 / 5) * 100);
  return {
    monthly,
    pot,
    bidPct: won ? bidPct : 0,
    npcMax,
    won,
    received,
    dividends,
    contributions,
    takeEarly,
    waitTotal,
    earlyTotal,
    gaveUp: waitTotal - earlyTotal,
    yearlyCostPct,
    net: received + dividends - contributions,
  };
}

/* ---------- role flip: Instant Loan Pvt Ltd ---------- */

export function roleflipTable() {
  return CFG.roleflip.customers.map((c) => ({
    ...c,
    offers: CFG.roleflip.offers.map((o) => {
      const t = loanTerms({ amount: c.amount, ...o });
      return { ...o, ...t, profit: t.totalRepay - c.amount };
    }),
  }));
}

export function scoreRoleflip(picks) {
  const table = roleflipTable();
  let profit = 0;
  const counts = {};
  for (const c of table) {
    const o = c.offers.find((x) => x.id === picks[c.id]) || c.offers[0];
    profit += o.profit;
    counts[o.id] = (counts[o.id] || 0) + 1;
  }
  const order = CFG.roleflip.offers.map((o) => o.id);
  const mostPicked = [...order].sort(
    (a, b) => (counts[b] || 0) - (counts[a] || 0) || order.indexOf(b) - order.indexOf(a),
  )[0];
  const maxProfit = sum(table.map((c) => Math.max(...c.offers.map((o) => o.profit))));
  return { profit, maxProfit, mostPicked, counts };
}

/* ---------- year end ---------- */

function settle(s) {
  const age = s.age;
  const cur = s.cur;
  if (s.chitti) {
    const c = s.chitti;
    if (!c.won) s.wallet += c.received;
    s.wallet += c.dividends;
    spend(s, c.contributions, "chitti");
    s.chitti = null;
  }
  for (const [k, rateKey] of [["rd", "rd"], ["sip", null]]) {
    const monthly = s[`${k}Monthly`];
    if (!monthly) continue;
    const yearly = monthly * 12;
    if (s.wallet >= yearly) {
      s.wallet -= yearly;
      s[k] += yearly;
    } else note(s, "missedSaving", { what: k });
    if (rateKey) s[k] *= 1 + CFG.rates[rateKey] / 100;
  }
  const market = luckNormal(s.seed, CFG.market.mean, CFG.market.sd, CFG.market.min, CFG.market.max, "market", age);
  const goldR = luckNormal(s.seed, CFG.gold.mean, CFG.gold.sd, CFG.gold.min, CFG.gold.max, "gold", age);
  if (s.sip > 0) cur.luck.push({ key: "market", pct: Math.round(market) });
  if (s.gold > 0) cur.luck.push({ key: "gold", pct: Math.round(goldR) });
  s.sip *= 1 + market / 100;
  s.gold *= 1 + goldR / 100;
  s.fd *= 1 + CFG.rates.fd / 100;
  if (s.bank) {
    if (s.wallet > 0) s.wallet *= 1 + CFG.rates.bank / 100;
    s.goalJar *= 1 + CFG.rates.goalJar / 100;
  }
  if (s.insured) spend(s, CFG.insurance.premium, "premium");
  runLoanYear(s);
  if (isFastForward(age) && s.autoRepay) {
    const spare = s.wallet - s.income * 0.25;
    const costly = s.loans.some((l) => l.annualPct >= 12);
    if (spare > 0 && costly) {
      const used = prepay(s, spare);
      s.wallet -= used;
      if (used > 0) note(s, "autoRepay", { amount: Math.round(used) });
    }
  }
  const debt = totalDebt(s);
  const fx = {};
  if (debt > s.income) Object.assign(fx, { peace: -8, health: -2 });
  else if (debt > s.income * 0.5) fx.peace = -5;
  else if (s.wallet >= s.income * 0.25) fx.peace = 2;
  if (age >= 28) fx.health = (fx.health || 0) - 1;
  if (abroadNow(s)) {
    fx.family = -5;
    fx.health = (fx.health || 0) - 2;
  }
  bumpMeters(s, fx);
  for (const k of ["wallet", "goalJar", "fd", "rd", "gold", "sip"]) s[k] = Math.round(s[k]);
  if (s.goalMetAge === null && houseFund(s) >= goalTargetAt(age)) {
    s.goalMetAge = age;
    note(s, "goalMet");
  }
  cur.after = hud(s);
  cur.drift = fx;
  cur.era = eraFor(age);
  s.years.push(cur);
}

function runLoanYear(s) {
  for (let m = 0; m < 12; m++) {
    for (const loan of s.loans) {
      if (loan.balance <= 0) continue;
      const interest = (loan.balance * loan.annualPct) / 100 / 12;
      const due =
        loan.source === "card"
          ? Math.min(loan.balance + interest, Math.max(500, loan.balance * 0.05))
          : Math.min(loan.emi, loan.balance + interest);
      let paid = Math.min(Math.max(0, s.wallet), due);
      s.wallet -= paid;
      if (paid < due) {
        const fromGoal = Math.min(Math.max(0, s.goalJar), due - paid);
        s.goalJar -= fromGoal;
        s.cur.goalWithdrawn += fromGoal;
        paid += fromGoal;
      }
      loan.balance += interest - paid;
      if (paid + 1 < due) {
        loan.balance += 500;
        s.stats.missedEmis += 1;
        s.cur.missed = (s.cur.missed || 0) + 1;
        s.flags.lowScore = true;
      }
      loan.monthsLeft -= 1;
      if (loan.monthsLeft <= 0 && loan.balance > 1 && loan.source !== "card") {
        loan.monthsLeft = 12;
        loan.emi = emi(loan.balance, loan.annualPct, 12);
      }
    }
    s.loans = s.loans.filter((l) => l.balance > 1);
  }
  for (const l of s.loans) l.balance = Math.round(l.balance);
  if (s.cur.missed) note(s, "missedEmi", { count: s.cur.missed });
}

export function eraFor(age) {
  return { road: age >= 23 ? "tar" : age >= 20 ? "mixed" : "mud", phone: age >= 21 ? "smart" : "keypad" };
}

// Yearly interest flows for the Chakravaddi wheel.
export function wheelState(s) {
  const pools = [
    [s.bank ? s.wallet : 0, CFG.rates.bank],
    [s.goalJar, s.bank ? CFG.rates.goalJar : 0],
    [s.fd, CFG.rates.fd],
    [s.rd, CFG.rates.rd],
    [s.gold, CFG.gold.mean],
    [s.sip, CFG.market.mean],
  ].filter(([v]) => v > 0);
  const savBal = sum(pools.map(([v]) => v));
  const savFlow = sum(pools.map(([v, r]) => (v * r) / 100));
  const debtBal = totalDebt(s);
  const debtFlow = sum(s.loans.map((l) => (l.balance * l.annualPct) / 100));
  const savRate = savBal ? (savFlow / savBal) * 100 : 0;
  const debtRate = debtBal ? (debtFlow / debtBal) * 100 : 0;
  const against = debtFlow > savFlow;
  return {
    dir: against ? -1 : savFlow > 0 ? 1 : 0,
    rate: Math.round((against ? debtRate : savRate) * 10) / 10,
    savFlow: Math.round(savFlow),
    debtFlow: Math.round(debtFlow),
  };
}

/* ---------- endings ---------- */

export function computeEnding(s) {
  const debt = totalDebt(s);
  const income = s.income || 1;
  const m = s.meters;
  const goalMet = s.goalMetAge !== null;
  if (debt > income * 0.75) return "wheel_against";
  if (s.stats.scamsFallen >= 2) return "phone_rang";
  if (m.health < CFG.meterFloor) return "body_ledger";
  if (goalMet && (m.family < 40 || m.peace < 35)) return "house_quiet";
  if (goalMet && s.crossroads.cr_gulf === "gulf") return "desert_letters";
  if (goalMet) return "house_blue";
  if (s.business === "boom") return "shop_crossroads";
  if (debt === 0 && hud(s).goalPct >= 60) return "slow_river";
  if (m.gyaan >= 70) return "lamp";
  return "unwritten";
}

export function endStats(s) {
  return {
    goalMet: s.goalMetAge !== null,
    goalAge: s.goalMetAge,
    goalPct: hud(s).goalPct,
    debtFree: totalDebt(s) === 0,
    metersAboveFloor: METERS.filter((k) => s.meters[k] >= CFG.meterFloor).length,
    scamsFlagged: s.stats.scamsFlagged,
    scamsFallen: s.stats.scamsFallen,
  };
}

/* ---------- commands ---------- */

export function apply(s, cmd) {
  const step = currentStep(s);
  const ok = applyInner(s, cmd, step);
  if (ok) s.commands.push({ ...cmd, age: s.cur ? s.cur.age : s.age });
  return ok;
}

function applyInner(s, cmd, step) {
  if (!step) return false;
  switch (cmd.type) {
    case "budget": {
      if (step.kind !== "budget" || !validBudget(cmd.budget)) return false;
      s.budget = { ...cmd.budget };
      s.budgetKey = budgetKeyFor(s);
      if (typeof cmd.autoRepay === "boolean") s.autoRepay = cmd.autoRepay;
      s.queue.shift();
      applySplit(s);
      advance(s);
      return true;
    }
    case "crossroads": {
      if (step.kind !== "crossroads" || step.id !== cmd.id) return false;
      const cr = crossById[cmd.id];
      const opt = cr.options.find((o) => o.id === cmd.optionId);
      if (!opt) return false;
      const origin = { kind: "crossroads", id: cr.id, optionId: opt.id };
      const res = applyOption(s, opt, cr, origin);
      s.crossroads[cr.id] = opt.id;
      s.cur.crossroads = { id: cr.id, optionId: opt.id, ...res };
      s.queue.shift();
      advance(s);
      return true;
    }
    case "roleflip": {
      if (step.kind !== "roleflip") return false;
      const score = scoreRoleflip(cmd.picks || {});
      const tpl = CFG.roleflip.offers.find((o) => o.id === score.mostPicked);
      s.loanTemplate = { ...tpl, used: false };
      s.roleflip = { picks: { ...cmd.picks }, ...score };
      bumpMeters(s, { gyaan: 6, peace: -2 });
      s.cur.roleflip = s.roleflip;
      s.queue.shift();
      advance(s);
      return true;
    }
    case "action":
      if (step.kind !== "actions") return false;
      return doAction(s, cmd.action);
    case "endActions":
      if (step.kind !== "actions") return false;
      s.energy = 0;
      s.queue.shift();
      advance(s);
      return true;
    case "choose": {
      if (step.kind !== "event" || step.cardId !== cmd.cardId) return false;
      const card = cardById[cmd.cardId];
      const opt = card.options.find((o) => o.id === cmd.optionId);
      if (!opt) return false;
      if (card.base) {
        if (card.base.money) spend(s, -card.base.money, card.id);
        if (card.base.loan) addLoan(s, card.base.loan.amount, card.base.loan.source);
      }
      const origin = { kind: "event", id: card.id, optionId: opt.id };
      const res = applyOption(s, opt, card, origin);
      if (card.id === "c_shop_boom") s.business = "boom";
      if (card.id === "c_shop_bust") s.business = "bust";
      s.cur.events.push({ cardId: card.id, optionId: opt.id, seedId: step.seedId || null, ...res });
      s.queue.shift();
      advance(s);
      return true;
    }
    case "message": {
      if (step.kind !== "message" || step.msgId !== cmd.msgId) return false;
      const msg = msgById[cmd.msgId];
      const verdict = cmd.verdict === "flag" ? "flag" : "reply";
      const rec = { msgId: msg.id, verdict, correct: (verdict === "flag") === msg.scam };
      if (verdict === "flag") {
        if (msg.scam) {
          s.stats.scamsFlagged += 1;
          bumpMeters(s, { gyaan: 5 });
        } else {
          s.stats.legitFlagged += 1;
          bumpMeters(s, msg.flag.effects);
        }
      } else {
        const r = msg.reply;
        if (r.effects.money > 0) s.wallet += r.effects.money;
        if (r.effects.money < 0) spend(s, -r.effects.money, msg.id);
        bumpMeters(s, r.effects);
        if (r.loan) addLoan(s, r.loan.amount, r.loan.source, { cash: true });
        if (msg.scam) {
          s.stats.scamsFallen += 1;
          rec.planted = plant(s, { seed: r.seed, after: r.after, chance: 1 }, { kind: "message", id: msg.id, optionId: "reply" });
        }
      }
      s.cur.message = rec;
      s.queue.shift();
      advance(s);
      return true;
    }
    case "nextYear": {
      if (step.kind !== "yearEnd") return false;
      s.age += 1;
      if (s.age > endAge) {
        s.age = endAge;
        s.phase = "ending";
        s.queue = [];
        s.cur = null;
        s.ending = computeEnding(s);
        return true;
      }
      beginYear(s);
      return true;
    }
    default:
      return false;
  }
}

export function dispatch(state, cmd) {
  const s = structuredClone(state);
  return apply(s, cmd) ? s : state;
}

export const ALL = { cards, messages, crossroads };
