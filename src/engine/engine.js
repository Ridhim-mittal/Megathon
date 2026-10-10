// The life engine: createLife, the pure step() reducer, the year loop and replay().
//
// step(state, action) never mutates `state`: it clones it, runs the action on the clone and
// returns the clone. An invalid action returns the old state with `error: { type, message }`.
// The world's luck (`state.world`) is created once and never changes, so it is shared.

import { ASSUMPTIONS } from "./assumptions.js";
import {
  CURRICULUM,
  END_AGE,
  INVESTABLE,
  JARS,
  LESSON_IDS,
  MUTUAL_FUNDS,
  START_AGE,
  STOCKS,
  stageOf,
} from "./curriculum.js";
import { CHAPTERS, locationOf } from "./locations.js";
import { buildQueue, crisisCandidates, groupOf, indexContent, planLife, resolveSlot } from "./deck.js";
import { addMeter, applyEffects, roundToStep } from "./effects.js";
import {
  addEvent,
  closePenaltyRate,
  depositInto,
  flow,
  highInterestDebt,
  liquidNet,
  monthlyEmi,
  netWorth,
  pay,
  payPremiums,
  productsValue,
  quoteLoan,
  repayLoan,
  runLoansForYear,
  savingsTotal,
  totalDebt,
  growHoldings,
} from "./money.js";
import { hashSeed, makeRandom } from "./rng.js";
import { makeSelectors } from "./select.js";
import { makeWorld } from "./world.js";
import { choiceLocked, indexStory, routeNext } from "./story.js";

const floorStep = (x, step) => Math.max(0, Math.floor(x / step) * step);
const ceilStep = (x, step) => Math.max(0, Math.ceil(x / step) * step);
const round4 = (x) => Math.round(x * 10000) / 10000;

export function nextLessonStatus(prev, quality) {
  if (quality === "good") return "applied";
  if (quality === "risky" || quality === "bad") return prev === "applied" ? "applied" : "missed";
  return prev === "unseen" ? "seen" : prev;
}

export function createEngine(content, { assumptions = ASSUMPTIONS } = {}) {
  const A = assumptions;
  const idx = indexContent(content ?? {});
  const ctx = { A, idx, content };
  // Story scenes are cards too (for the card views, documents and CHOOSE).
  const story = indexStory(content);
  for (const pool of Object.values(idx.pools)) Object.assign(pool.byId, story.cards);
  const mapMode = (s) => s.mode === "chapters" || s.mode === "story";

  const cardById = (s, id) => idx.pools[s.storylineId]?.byId[id] ?? null;

  // ---------- money helpers bound to this engine ----------

  function computeDream(s) {
    const target = Math.round(A.goals[s.goalId] * s.priceIndex);
    const reachedFlag = s.flags.includes(A.goalReachedFlag);
    const saved =
      s.money.jars.goal +
      productsValue(s, ["bank", "fd", "rd", "ppf", "sip_index", "gold", "chit"]) +
      productsValue(s, A.goalAssets[s.goalId] ?? []);
    // Once a year ends with the dream fully funded, it counts as reached (the player would buy it
    // then), even if a later crash dips the savings.
    const reached = reachedFlag || s.dreamReachedAge != null || saved >= target;
    const pct = reached ? 100 : Math.max(0, Math.min(99, Math.floor((saved * 100) / target)));
    return { goalId: s.goalId, saved, target, pct, reached, reachedAge: s.dreamReachedAge };
  }

  function needsMonthly(s) {
    return Math.max(s.budget?.needs ?? 0, s.year?.rules?.minNeeds ?? 0, 1);
  }

  // ---------- budget ----------

  function budgetRules(s) {
    return s.year?.rules ?? null;
  }

  function checkBudget(s, jars) {
    const rules = budgetRules(s);
    const errors = [];
    if (!rules) return { ok: false, errors: ["There is no budget to set right now."] };
    if (!jars || typeof jars !== "object") return { ok: false, errors: ["Give an amount for each jar."] };
    let sum = 0;
    for (const [k, v] of Object.entries(jars)) {
      if (!JARS.includes(k)) errors.push(`Unknown jar "${k}".`);
      else if (!Number.isInteger(v) || v < 0) errors.push(`${k} must be a whole number of rupees, 0 or more.`);
      else if (v % rules.step !== 0) errors.push(`${k} must move in steps of ₹${rules.step}.`);
      else if (k === "invest" && v > 0 && !rules.jarsUnlocked.includes("invest")) errors.push("The invest jar is not open yet.");
      else sum += v;
    }
    if (!errors.length && sum !== rules.monthlyIncome)
      errors.push(`The jars must add up to ₹${rules.monthlyIncome} (now ₹${sum}).`);
    if ((jars.needs ?? 0) < rules.minNeeds) errors.push(`Needs must be at least ₹${rules.minNeeds}.`);
    return { ok: errors.length === 0, errors };
  }

  // Scale a previous split (or the stage starter) to this year's rules.
  function fitBudget(s, base, rules) {
    const { monthlyIncome: total, step, minNeeds, jarsUnlocked } = rules;
    const starter = A.budget.starter[s.stage];
    let src = base && Object.values(base).some((v) => v > 0) ? base : starter;
    if (jarsUnlocked.includes("invest") && !(base && "invest" in base)) src = { ...src, invest: 0 };
    const keys = jarsUnlocked;
    const weight = keys.reduce((a, k) => a + (src[k] ?? 0), 0) || 1;
    const out = {};
    for (const k of keys) out[k] = floorStep((total * (src[k] ?? 0)) / weight, step);
    if (out.needs < minNeeds) {
      let need = minNeeds - out.needs;
      for (const k of ["wants", "goal", "emergency", "invest"]) {
        if (!(k in out) || need <= 0) continue;
        const x = Math.min(out[k], need);
        out[k] -= x;
        need -= x;
      }
      out.needs = minNeeds - need;
    }
    const sum = keys.reduce((a, k) => a + out[k], 0);
    out.needs += total - sum;
    return out;
  }

  function commitBudget(s, jars) {
    const full = Object.fromEntries(s.year.rules.jarsUnlocked.map((k) => [k, jars[k] ?? 0]));
    const year = (k) => (full[k] ?? 0) * 12;
    const total = JARS.reduce((a, k) => a + year(k), 0);
    // By construction cash covers the year's jars; guard anyway.
    const scale = total > s.money.cash ? s.money.cash / total : 1;
    const take = (k) => Math.floor(year(k) * scale);
    const needs = take("needs");
    s.money.cash -= needs;
    flow(s, "living", -needs);
    const wants = take("wants");
    s.money.cash -= wants;
    s.money.wallet += wants;
    for (const jar of ["emergency", "goal"]) {
      const x = take(jar);
      s.money.cash -= x;
      s.money.jars[jar] += x;
    }
    const invest = take("invest");
    if (invest > 0) {
      s.money.cash -= invest;
      depositInto(A, s, s.investIn, invest);
    }
    const rules = s.year.rules;
    if (rules.monthlyIncome > 0 && (full.wants ?? 0) === 0) addMeter(s, "joy", A.budget.stingyJoy);
    if (rules.monthlyIncome > 0 && (full.wants ?? 0) / rules.monthlyIncome >= A.budget.lavishShare)
      addMeter(s, "family", A.budget.lavishFamily);
    if (rules.squeezed) {
      addMeter(s, "health", A.budget.squeezedHealth);
      addMeter(s, "family", A.budget.squeezedFamily);
      addEvent(s, { type: "squeezed", needsFloor: rules.needsFloor, available: rules.monthlyIncome });
    }
    s.budget = full;
    s.year.budget = { ...full, investIn: s.investIn };
    s.phase = mapMode(s) ? "map" : "shop";
  }

  // ---------- the year loop ----------

  function wageFor(s) {
    return A.wages[s.storylineId]?.[s.stage] ?? A.wages.village[s.stage];
  }

  function checkCrisis(s) {
    if (!s.year || s.year.crisis) return;
    for (const meter of ["joy", "family"]) {
      const v = s.meters[meter];
      const extreme = v <= 0 ? "low" : v >= 100 ? "high" : null;
      if (!extreme) continue;
      const key = `${meter}_${extreme}`;
      const last = s.crisisLog[key];
      if (last != null && s.age - last < A.crisis.cooldownYears) continue;
      if (!crisisCandidates(idx, s, key).length) continue;
      s.queue.unshift({ type: "crisis", key });
      s.year.crisis = true;
      s.crisisLog[key] = s.age;
      return;
    }
  }

  function beginYear(s, first) {
    if (!first) {
      s.age += 1;
      s.priceIndex = round4(s.priceIndex * (1 + s.world.inflation[s.age]));
    }
    s.rng = hashSeed(s.seed, "year", s.age);
    const prevStage = s.stage;
    s.stage = stageOf(s.age);
    const stageChanged = first || prevStage !== s.stage;
    const step = A.budget.step[s.stage];
    s.year = {
      age: s.age,
      flows: {},
      events: [],
      startNetWorth: netWorth(s),
      startMeters: { ...s.meters },
      startDebt: totalDebt(s),
      rules: null,
      budget: null,
      bought: [],
      wantsSpent: 0,
      free: 0,
      crisis: false,
      lessons: [],
      decisions: [],
      summary: null,
    };
    if (stageChanged && !first) s.glasses.charges += A.glasses.perStage;

    // Income for the year.
    if (s.income.source === "stage" && stageChanged) s.income.monthly = wageFor(s);
    else if (!first) s.income.monthly = roundToStep(s.income.monthly * (1 + A.wageRaise), step);
    s.income.monthly = roundToStep(s.income.monthly, step);
    const gross = s.income.monthly;
    s.money.cash += gross * 12;
    flow(s, "income", gross * 12);

    // Automatic payments, growth and the year's wear on the meters.
    let autoPaid = 0;
    if (!first) {
      autoPaid += runLoansForYear(A, s).due;
      autoPaid += payPremiums(A, s);
      growHoldings(A, s, s.world, s.age);
      for (const [m, d] of Object.entries(A.meters.drift)) addMeter(s, m, d);
      if (s.age >= A.meters.healthDriftFromAge) addMeter(s, "health", A.meters.healthDrift);
    }

    // This year's budget rules: income after automatic payments.
    const autoMonthly = Math.ceil(autoPaid / 12);
    const available = floorStep(Math.min(gross - autoMonthly, s.money.cash / 12), step);
    const needsFloor = ceilStep(gross * A.budget.minNeedsPct[s.stage], step);
    const investOpen = s.lessons[A.budget.investUnlockLesson] !== "unseen";
    const jarsUnlocked = JARS.filter((j) => j !== "invest" || investOpen);
    const investNew = investOpen && !(s.budget && "invest" in s.budget);
    s.year.rules = {
      monthlyIncome: available,
      grossMonthly: gross,
      autoPaidMonthly: autoMonthly,
      step,
      minNeeds: Math.min(needsFloor, available),
      needsFloor,
      squeezed: available < needsFloor,
      jarsUnlocked,
      required: Boolean(first || stageChanged || s.budgetDirty || investNew),
    };
    s.budget = fitBudget(s, s.budget, s.year.rules);
    s.budgetDirty = false;

    s.current = null;
    // Chapter and story mode: the chapter, not the year, decides what happens next.
    if (mapMode(s)) {
      s.queue = [];
      return;
    }
    s.queue = buildQueue(A, idx, s, makeRandom(s));
    checkCrisis(s);
    s.phase = "budget";
  }

  function presentCard(s, resolved, slot) {
    const card = resolved.card;
    if (!s.drawn.includes(card.id)) s.drawn.push(card.id);
    const group = groupOf(card.id);
    if (!s.drawnGroups.includes(group)) s.drawnGroups.push(group);
    const storyAge = resolved.age ?? s.age;
    if (card.kind === "lesson") s.lessonCards[card.lesson] = { cardId: card.id, age: storyAge };
    if (resolved.crisisFlag && !s.flags.includes(resolved.crisisFlag)) s.flags.push(resolved.crisisFlag);
    let echoFrom = null;
    if (resolved.origin) {
      const o = resolved.origin;
      const echo = s.echoes.find((e) => e.cardId === o.cardId && e.choiceId === o.choiceId && e.firedAge == null);
      if (echo) echo.firedAge = storyAge;
      echoFrom = { age: o.age, cardId: o.cardId, choiceId: o.choiceId, doc: o.doc ?? null, hint: echo?.hint ?? null, level: echo?.level ?? null };
    }
    if (card.document && !s.docs[card.document]) {
      const pack = idx.documents[card.document];
      const variant = pack?.variants?.length ? makeRandom(s).weighted(pack.variants) : null;
      s.docs[card.document] = { variant: variant?.id ?? null, opened: false, flagged: [], verified: false, rewarded: [] };
    }
    s.current = {
      cardId: card.id,
      slot: slot.type,
      slotKey: slot.key ?? null,
      age: resolved.age ?? null,
      crisisFlag: resolved.crisisFlag ?? null,
      echoFrom,
      glasses: false,
      chosen: null,
    };
    s.phase = "card";
  }

  function drawNext(s) {
    const random = makeRandom(s);
    while (s.queue.length) {
      const slot = s.queue.shift();
      const resolved = resolveSlot(A, idx, s, slot, random);
      if (resolved) return presentCard(s, resolved, slot);
    }
    s.current = null;
    const mg = s.plan.minigame;
    if (mg && mg.age === s.age && !s.minigames[mg.id]) {
      s.phase = "minigame";
      return;
    }
    endYear(s);
  }

  function habitEcho(s) {
    const H = A.habits;
    const b = s.year.budget;
    const rules = s.year.rules;
    if (!b || !rules) return null;
    const total = rules.monthlyIncome;
    const dream = computeDream(s);
    if (total > 0 && b.wants / total >= H.wantsShareHigh && !dream.reached) {
      const extra = b.wants - floorStep(total * H.wantsShareTarget, rules.step);
      const saving = ((b.goal ?? 0) + (b.invest ?? 0)) * 12;
      const gap = Math.max(0, dream.target - dream.saved);
      const yearsNow = saving > 0 ? gap / saving : null;
      const yearsBetter = gap / (saving + extra * 12);
      const delay = yearsNow == null ? null : Math.round(yearsNow - yearsBetter);
      if (delay == null || delay >= 1) {
        const pct = Math.round((b.wants * 100) / total);
        return {
          id: "wants_high",
          level: 2,
          values: { wantsPct: pct, delayYears: delay, extraMonthly: extra },
          text: {
            en:
              delay == null
                ? `If wants stays at ${pct}% of income and nothing goes to the goal jar, your dream never arrives.`
                : `If wants stays at ${pct}% of income, your dream moves about ${delay} year${delay === 1 ? "" : "s"} later.`,
          },
        };
      }
    }
    const emi = monthlyEmi(s);
    if (rules.grossMonthly > 0 && emi / rules.grossMonthly >= H.emiShareHigh) {
      const pct = Math.round((emi * 100) / rules.grossMonthly);
      return {
        id: "emi_heavy",
        level: 3,
        values: { emiPct: pct, emiMonthly: emi },
        text: { en: `EMIs now eat ${pct}% of your income. One more loan and the needs jar goes hungry.` },
      };
    }
    if (s.age >= H.emergencyFromAge && s.money.jars.emergency < needsMonthly(s) * H.emergencyMinMonths) {
      const example = Math.round(20000 * s.priceIndex);
      const interest = Math.round(example * A.loans.moneylender.rateYearly);
      return {
        id: "no_emergency",
        level: 2,
        values: { emergency: s.money.jars.emergency, exampleCost: example, exampleInterest: interest },
        text: { en: `With almost nothing in the emergency jar, a ₹${example} bill would go to the moneylender: about ₹${interest} a year in interest.` },
      };
    }
    const idle = s.money.cash + s.money.jars.emergency + s.money.jars.goal;
    if (s.age >= H.idleCashFromAge && !s.money.products.bank && idle >= H.idleCashMin) {
      const lost = Math.round(idle * (s.world.inflation[Math.min(s.age + 1, END_AGE)] ?? A.inflation.min));
      return {
        id: "tin_box",
        level: 1,
        values: { idle, lostToInflation: lost },
        text: { en: `₹${idle} sits in the tin box. Next year it buys about ₹${lost} less.` },
      };
    }
    if (
      s.age >= H.investFromAge &&
      rules.jarsUnlocked.includes("invest") &&
      !(b.invest > 0) &&
      !INVESTABLE.some((p) => s.money.products[p])
    ) {
      const years = END_AGE - s.age;
      const fv = (n) => {
        const i = A.products.rd.rate / 12;
        return Math.round(H.investExampleMonthly * ((Math.pow(1 + i, 12 * n) - 1) / i));
      };
      const now = fv(years);
      const later = fv(Math.max(0, years - 5));
      return {
        id: "start_early",
        level: 1,
        values: { monthly: H.investExampleMonthly, ifNow: now, ifFiveYearsLater: later, rate: A.products.rd.rate },
        text: { en: `₹${H.investExampleMonthly} a month from now grows to about ₹${now} by 36; starting 5 years later gives about ₹${later}.` },
      };
    }
    return null;
  }

  const HEADLINE_ORDER = [
    "shock",
    "chitCollapsed",
    "marketCrash",
    "borrowedForEmi",
    "crossroads",
    "loanCleared",
    "dreamMilestone",
    "income",
    "policyLapsed",
    "squeezed",
    "lessonApplied",
  ];

  function endYear(s) {
    // The wants jar is for spending: whatever the shop did not take goes on small treats.
    const treats = s.money.wallet;
    if (treats > 0) {
      s.money.wallet = 0;
      flow(s, "wants", -treats);
      s.year.wantsSpent += treats;
      const annual = Math.max(1, s.year.rules.grossMonthly * 12);
      const joy = Math.min(A.budget.treatsJoyMax, Math.round((A.budget.treatsJoyPerIncome * treats) / annual));
      addMeter(s, "joy", joy);
      addEvent(s, { type: "treats", amount: treats, joy });
    }
    let dream = computeDream(s);
    if (dream.reached && s.dreamReachedAge == null) {
      s.dreamReachedAge = s.age;
      dream = computeDream(s);
    }
    for (const pct of [25, 50, 75, 100]) {
      if (dream.pct >= pct && s.dreamMilestone < pct) {
        s.dreamMilestone = pct;
        addEvent(s, { type: "dreamMilestone", pct });
      }
    }
    for (const d of s.year.decisions) {
      const h = s.history[d];
      if (h.kind === "crossroads") addEvent(s, { type: "crossroads", cardId: h.cardId, choiceId: h.choiceId });
    }
    for (const l of s.year.lessons) if (l.to === "applied" && l.from !== "applied") addEvent(s, { type: "lessonApplied", lesson: l.lesson });

    let headline = { type: "quiet" };
    for (const type of HEADLINE_ORDER) {
      const events = s.year.events.filter((e) => e.type === type);
      if (!events.length) continue;
      headline = type === "shock" ? events.reduce((a, b) => (b.cost > a.cost ? b : a)) : events[events.length - 1];
      break;
    }
    const nw = netWorth(s);
    const meterChanges = Object.fromEntries(Object.keys(s.meters).map((m) => [m, s.meters[m] - s.year.startMeters[m]]));
    const debt = totalDebt(s);
    const habit = habitEcho(s);
    s.year.summary = {
      age: s.age,
      stage: s.stage,
      netWorth: nw,
      netWorthChange: nw - s.year.startNetWorth,
      cash: s.money.cash,
      savings: savingsTotal(s),
      investments: productsValue(s, ["fd", "rd", "ppf", "sip_index", "gold", "chit", "pension"]),
      debt,
      debtChange: debt - s.year.startDebt,
      dream,
      meters: { ...s.meters },
      meterChanges,
      flows: { ...s.year.flows },
      events: [...s.year.events],
      headline,
      habitEcho: habit,
      lessons: [...s.year.lessons],
      decisions: [...s.year.decisions],
      priceIndex: s.priceIndex,
      inflation: s.world.inflation[s.age],
    };
    if (habit) s.habitEchoes.push({ age: s.age, ...habit });
    s.years.push({
      age: s.age,
      netWorth: nw,
      debt,
      cash: s.money.cash,
      savings: s.year.summary.savings,
      investments: s.year.summary.investments,
      dreamPct: dream.pct,
      meters: { ...s.meters },
      income: s.income.monthly,
      budget: s.year.budget,
      wantsSpent: s.year.wantsSpent,
    });
    s.current = null;
    s.phase = "yearEnd";
  }

  function decideEnding(s) {
    const E = A.endings;
    const dream = computeDream(s);
    const income = Math.max(1, s.income.monthly);
    const hi = highInterestDebt(A, s);
    const emi = monthlyEmi(s);
    const emiShare = emi / income;
    const emergencyMonths = s.money.jars.emergency / needsMonthly(s);
    const insured = s.insurance.length > 0;
    const liquid = liquidNet(A, s);
    const manageable = emiShare <= E.manageableEmiShare && hi <= income * E.manageableHighInterestMonths;
    const debtTrap = hi > income * E.debtTrapMonths && hi > liquid;
    const secure = emergencyMonths >= E.secureEmergencyMonths && insured && hi === 0;
    const close = dream.pct >= E.closePct * 100;
    let id;
    if (dream.reached) id = manageable ? "dream_on_time" : "dream_with_debt";
    else if (debtTrap) id = "debt_trap";
    else if (close && secure) id = "dream_close";
    else if (secure) id = "secure_no_dream";
    else if (close) id = "dream_close";
    else if (hi > 0) id = "debt_trap";
    else id = "secure_no_dream";
    const modifiers = [];
    if (s.flags.some((f) => A.wrongPathFlags.includes(f) || f.startsWith("legal_"))) modifiers.push("wrong_path");
    if (id === "secure_no_dream" && !secure) modifiers.push("no_safety_net");
    return {
      id,
      modifiers,
      goalId: s.goalId,
      reached: dream.reached,
      saved: dream.saved,
      target: dream.target,
      pct: dream.pct,
      netWorth: netWorth(s),
      debt: totalDebt(s),
      highInterestDebt: hi,
      emiMonthly: emi,
      emiShare: Math.round(emiShare * 100) / 100,
      emergencyMonths: Math.round(emergencyMonths * 10) / 10,
      insured,
      secure,
      manageable,
    };
  }

  // ---------- chapter mode ----------
  // A life is five chapters (one per stage). A chapter's events wait at places on the map; the
  // player lives them in any order. The money clock moves a year forward as a share of the
  // chapter's required events is done, and the rest of the chapter's years pass at its end.

  const hasPhone = (s) => s.flags.includes(A.chapters.phoneFlag) || s.flags.includes("has_smartphone");

  // The phone's inbox: game updates and SMSes, language-neutral (the UI writes the words).
  function pushMessage(s, msg) {
    s.inboxSeq = (s.inboxSeq ?? 0) + 1;
    s.inbox = [...(s.inbox ?? []), { id: s.inboxSeq, age: s.age, ...msg }].slice(-A.chapters.inboxSize);
  }

  // A delayed scam lands: the money goes now, and the phone says what happened.
  function settleScams(s, all = false) {
    if (!s.pendingScams?.length) return;
    const keep = [];
    for (const p of s.pendingScams) {
      if (!all && p.eventsLeft > 0) {
        keep.push(p);
        continue;
      }
      const out = [];
      applyEffects(A, s, { cash: p.cash, meters: p.meters }, out, { origin: { age: p.age, cardId: p.cardId, choiceId: p.choiceId }, step: A.budget.step[s.stage] });
      const paid = out.find((m) => m.type === "cash");
      pushMessage(s, { kind: "debit", cardId: p.cardId, amount: -p.cash, paidFrom: paid?.paidFrom ?? [], borrowed: paid?.borrowed ?? null });
      pushMessage(s, { kind: "scamReveal", cardId: p.cardId, choiceId: p.choiceId, amount: -p.cash, fromAge: p.age });
      addEvent(s, { type: "scamRevealed", cardId: p.cardId, amount: -p.cash });
    }
    s.pendingScams = keep;
  }

  function startChapter(s) {
    const ch = CHAPTERS.find((c) => c.id === s.stage);
    s.chapter = {
      id: ch.id,
      from: ch.from,
      to: ch.to,
      slots: [],
      seq: 0,
      startNetWorth: s.year?.startNetWorth ?? netWorth(s),
      startDebt: s.year?.startDebt ?? totalDebt(s),
      startMeters: { ...s.meters },
      startDream: computeDream(s).pct,
      years: [],
      phoneGift: false,
      summary: null,
    };
    if (ch.id === A.chapters.phoneGiftStage && !hasPhone(s)) {
      s.flags.push(A.chapters.phoneFlag);
      s.chapter.phoneGift = true;
      addEvent(s, { type: "phoneGift" });
    }
    buildChapterSlots(s);
    pushMessage(s, { kind: "chapter", chapterId: ch.id, required: s.chapter.slots.filter((x) => x.required).length });
    if (s.chapter.phoneGift) pushMessage(s, { kind: "phoneGift" });
    s.current = null;
    s.phase = "budget";
  }

  function addChapterSlot(s, slot, card) {
    const location =
      slot.location ??
      (card.kind === "teachback" && !["child", "teen"].includes(s.stage) ? "home" : locationOf(card, { hasPhone: hasPhone(s) }));
    s.chapter.slots.push({ ...slot, key: `${s.chapter.id}-${s.chapter.seq++}`, cardId: card?.id ?? null, location, done: false });
  }

  // Resolve a slot as if it were the given age (cards check their age range).
  function resolveAt(s, slot, age, random) {
    const real = s.age;
    s.age = age;
    try {
      return resolveSlot(A, idx, s, slot, random);
    } finally {
      s.age = real;
    }
  }

  function buildChapterSlots(s) {
    const ch = s.chapter;
    const random = makeRandom(s);
    for (let age = ch.from; age <= ch.to; age++) {
      for (const lesson of CURRICULUM) {
        if (s.plan.lessons[lesson.id] !== age) continue;
        const r = resolveAt(s, { type: "lesson", lesson: lesson.id }, age, random);
        if (r) addChapterSlot(s, { type: "lesson", lesson: lesson.id, plannedAge: age, required: true }, r.card);
      }
      for (const [group, plannedAge] of Object.entries(s.plan.crossroads)) {
        if (plannedAge !== age || s.drawnGroups.includes(group)) continue;
        const r = resolveAt(s, { type: "crossroads", group }, age, random);
        if (r) {
          s.drawnGroups.push(group);
          addChapterSlot(s, { type: "crossroads", group, plannedAge: age, required: true }, r.card);
        }
      }
    }
    for (let i = 0; i < (A.chapters.fillers[ch.id] ?? 0); i++) {
      const age = random.int(ch.from, ch.to);
      const r = resolveAt(s, { type: "filler" }, age, random);
      if (!r) continue;
      s.drawn.push(r.card.id);
      s.drawnGroups.push(groupOf(r.card.id));
      addChapterSlot(s, { type: "filler", plannedAge: age, required: false }, r.card);
    }
    absorbScheduled(s);
    const mg = s.plan.minigame;
    if (mg && mg.age >= ch.from && mg.age <= ch.to && !s.minigames[mg.id])
      addChapterSlot(s, { type: "minigame", id: mg.id, plannedAge: mg.age, required: false, location: "sahukar" }, null);
  }

  // Consequences scheduled inside this chapter become events on the map.
  function absorbScheduled(s) {
    const ch = s.chapter;
    const keep = [];
    for (const e of s.scheduled) {
      const card = cardById(s, e.card);
      if (e.age > ch.to || !card) {
        if (card) keep.push(e);
        continue;
      }
      addChapterSlot(s, { type: "scheduled", plannedAge: Math.max(e.age, ch.from), origin: e.origin, unlessFlag: e.unlessFlag, required: true }, card);
    }
    s.scheduled = keep;
    for (const q of s.queue) {
      const card = q.type === "scheduled" ? cardById(s, q.card) : null;
      if (card) addChapterSlot(s, { type: "scheduled", plannedAge: s.current?.age ?? s.age, origin: q.origin, unlessFlag: q.unlessFlag, required: true }, card);
    }
    s.queue = [];
  }

  function chapterCrisis(s) {
    if (s.chapter.slots.some((x) => x.type === "crisis" && !x.done)) return;
    for (const meter of ["joy", "family"]) {
      const v = s.meters[meter];
      const extreme = v <= 0 ? "low" : v >= 100 ? "high" : null;
      if (!extreme) continue;
      const key = `${meter}_${extreme}`;
      const last = s.crisisLog[key];
      if (last != null && s.age - last < A.crisis.cooldownYears) continue;
      const r = resolveAt(s, { type: "crisis", key }, s.age, makeRandom(s));
      if (!r) continue;
      s.crisisLog[key] = s.age;
      addChapterSlot(s, { type: "crisis", crisis: key, crisisFlag: r.crisisFlag, plannedAge: s.age, required: true, location: "home" }, r.card);
      return;
    }
  }

  function nextSlotAt(s, location) {
    return s.chapter.slots
      .filter((x) => !x.done && x.location === location)
      .sort((a, b) => Number(b.required) - Number(a.required) || a.plannedAge - b.plannedAge)[0];
  }

  // Start a slot. Returns false if it vanished (its unlessFlag is now set).
  function playSlot(s, slot) {
    if (slot.type === "minigame") {
      s.current = { cardId: null, slot: "minigame", slotKey: slot.key, age: slot.plannedAge };
      s.phase = "minigame";
      return true;
    }
    if (slot.unlessFlag && s.flags.includes(slot.unlessFlag)) {
      slot.done = true;
      slot.skipped = true;
      return false;
    }
    if (slot.crisisFlag && !s.flags.includes(slot.crisisFlag)) s.flags.push(slot.crisisFlag);
    const card = cardById(s, slot.cardId);
    presentCard(s, { card, origin: slot.origin, crisisFlag: slot.crisisFlag, age: slot.plannedAge }, slot);
    return true;
  }

  function finishSlot(s) {
    const slot = s.chapter.slots.find((x) => x.key === s.current?.slotKey);
    if (slot) slot.done = true;
    if (slot?.type === "minigame" && !s.minigames[slot.id]) s.minigames[slot.id] = { age: s.age, score: 0, skipped: true };
    for (const p of s.pendingScams ?? []) if (p.slotKey !== slot?.key) p.eventsLeft -= 1;
    settleScams(s);
    s.current = null;
    s.phase = "map";
    advanceClock(s);
    chapterCrisis(s);
  }

  function recordYear(s) {
    const y = s.year.summary;
    s.chapter.years.push({ age: y.age, headline: y.headline, netWorthChange: y.netWorthChange, habitEcho: y.habitEcho, inflation: y.inflation });
    pushMessage(s, { kind: "year", yearAge: y.age, headline: y.headline, netWorthChange: y.netWorthChange });
  }

  // One year passes inside a chapter: settle it, then start the next with the same jar split.
  function passYear(s) {
    endYear(s);
    recordYear(s);
    beginYear(s, false);
    commitBudget(s, s.budget);
    s.phase = "map";
  }

  function advanceClock(s) {
    const ch = s.chapter;
    const req = ch.slots.filter((x) => x.required);
    const done = req.filter((x) => x.done).length;
    const span = ch.to - ch.from + 1;
    const target = Math.min(ch.to, ch.from + Math.floor((done / Math.max(1, req.length)) * span));
    while (s.age < target) passYear(s);
  }

  function chapterSummary(s) {
    const ch = s.chapter;
    const nw = netWorth(s);
    return {
      id: ch.id,
      from: ch.from,
      to: ch.to,
      netWorth: nw,
      netWorthChange: nw - ch.startNetWorth,
      debt: totalDebt(s),
      debtChange: totalDebt(s) - ch.startDebt,
      savings: savingsTotal(s) - s.money.cash,
      investments: productsValue(s, ["fd", "rd", "ppf", "sip_index", "mf_debt", "mf_active", "gold", "chit", "pension", ...STOCKS]),
      dream: computeDream(s),
      dreamChange: computeDream(s).pct - ch.startDream,
      meters: { ...s.meters },
      meterChanges: Object.fromEntries(Object.keys(s.meters).map((m) => [m, s.meters[m] - ch.startMeters[m]])),
      years: [...ch.years],
      lessons: ch.slots.filter((x) => x.type === "lesson").map((x) => ({ lesson: x.lesson, status: s.lessons[x.lesson] })),
      market: {
        index: Object.fromEntries(Array.from({ length: ch.to - ch.from + 1 }, (_, i) => [ch.from + i, s.world.returns.sip_index[ch.from + i]])),
        badNews: Object.fromEntries(Object.entries(s.world.badNews ?? {}).filter(([a]) => a >= ch.from && a <= ch.to)),
      },
    };
  }

  // ---------- story mode ----------
  // A life is a list of missions (story.js). A mission's scenes wait one at a time at a place on
  // the map: the active scene is the objective. Each choice routes to the next scene (years pass
  // up to its age) or to an outcome, which ends the mission.

  const storyDeps = { A, decideEnding: (s) => decideEnding(s), computeDream };
  const nodeOf = (id) => story.nodes[id]?.node ?? null;

  // Mission start effects (a phone, a new salary) land before its first year begins.
  function applyMissionStart(s, index) {
    const m = story.missions[index];
    if (m?.startEffects) applyEffects(A, s, m.startEffects, [], { step: A.budget.step[stageOf(m.from)] });
  }

  function startMission(s, index) {
    const m = story.missions[index];
    s.chapter = {
      id: m.id,
      from: m.from,
      to: m.to,
      slots: [],
      seq: 0,
      startNetWorth: s.year?.startNetWorth ?? netWorth(s),
      startDebt: s.year?.startDebt ?? totalDebt(s),
      startMeters: { ...s.meters },
      startDream: computeDream(s).pct,
      years: [],
      phoneGift: Boolean(m.startEffects?.flags?.add?.includes(A.chapters.phoneFlag)),
      summary: null,
    };
    s.story.mission = index;
    s.story.node = m.start;
    s.story.pending = null;
    s.current = null;
    s.phase = "budget";
  }

  // Make a scene the objective; the clock moves on to its age.
  function activateNode(s, id) {
    const n = nodeOf(id);
    s.story.node = id;
    while (s.age < n.age && s.age < s.chapter.to) passYear(s);
    s.phase = "map";
  }

  function presentNode(s) {
    const id = s.story.node;
    const card = story.cards[id];
    if (!s.story.visited.includes(id)) s.story.visited.push(id);
    if (card.lesson) s.lessonCards[card.lesson] = { cardId: id, age: s.age };
    presentCard(s, { card, age: s.age }, { type: "story", key: id });
  }

  function finishScene(s) {
    const prev = nodeOf(s.current?.cardId);
    const nextId = s.story.pending;
    const next = nodeOf(nextId);
    if (!next) return `The story has nowhere to go from "${prev?.id}".`;
    s.story.pending = null;
    s.current = null;
    if (next.type === "outcome") return endMission(s, nextId);
    activateNode(s, nextId);
    // Same place, no race against time: the scene simply continues.
    if (next.location === prev?.location && !next.rush) presentNode(s);
  }

  function endMission(s, outcomeId) {
    const o = nodeOf(outcomeId);
    const m = story.missions[s.story.mission];
    if (o.effects) applyEffects(A, s, o.effects, [], { step: A.budget.step[s.stage] });
    s.story.outcomes[m.id] = outcomeId;
    if (!s.story.visited.includes(outcomeId)) s.story.visited.push(outcomeId);
    s.story.node = null;
    while (s.age < s.chapter.to) passYear(s);
    endYear(s);
    recordYear(s);
    const lessons = [];
    for (const p of s.story.path) {
      const l = p.mission === m.id ? nodeOf(p.node)?.lesson : null;
      if (l && !lessons.some((x) => x.lesson === l)) lessons.push({ lesson: l, status: s.lessons[l] });
    }
    s.chapter.summary = {
      ...chapterSummary(s),
      lessons,
      story: { mission: m.id, outcome: outcomeId, tone: o.tone, title: o.title, text: o.text },
    };
    s.chapterLog.push(s.chapter.summary);
    s.current = null;
    s.phase = "chapterEnd";
  }

  function storyEnding(s) {
    const last = story.missions[story.missions.length - 1];
    const id = s.story.outcomes[last.id];
    const o = nodeOf(id);
    return o ? { id, tone: o.tone, title: o.title, text: o.text } : null;
  }

  // ---------- action handlers: return an error message, or nothing on success ----------

  const freeGyaan = (s, amount) => {
    const key = s.age;
    if (s.freeGyaan.age !== key) s.freeGyaan = { age: key, count: 0 };
    if (s.freeGyaan.count >= A.gyaan.freePerYear) return 0;
    s.freeGyaan.count += 1;
    addMeter(s, "gyaan", amount);
    return amount;
  };

  function currentCardOrError(s) {
    if (s.phase !== "card" || !s.current) return [null, "There is no card to act on right now."];
    return [cardById(s, s.current.cardId), null];
  }

  function docOrError(s, docId) {
    const [card, err] = currentCardOrError(s);
    if (err) return [null, null, err];
    if (!card.document || card.document !== docId) return [null, null, `This card has no document "${docId}".`];
    const pack = idx.documents[docId];
    if (!pack) return [null, null, `Unknown document "${docId}".`];
    return [pack, s.docs[docId], null];
  }

  const HANDLERS = {
    ADVANCE(s) {
      switch (s.phase) {
        case "intro":
          if (s.mode === "story") applyMissionStart(s, 0);
          beginYear(s, true);
          if (s.mode === "chapters") startChapter(s);
          if (s.mode === "story") startMission(s, 0);
          return;
        case "budget": {
          const check = checkBudget(s, s.budget);
          if (!check.ok) return check.errors.join(" ");
          commitBudget(s, s.budget);
          return;
        }
        case "shop":
          drawNext(s);
          return;
        case "card":
          return "Choose an option first.";
        case "outcome":
          if (s.mode === "story") return finishScene(s);
          if (s.mode === "chapters") {
            finishSlot(s);
            return;
          }
          s.current = null;
          checkCrisis(s);
          drawNext(s);
          return;
        case "minigame":
          if (s.mode === "chapters") {
            finishSlot(s);
            return;
          }
          endYear(s);
          return;
        case "map":
          return s.mode === "story" ? "Walk to the place in your objective." : "Walk to a place, or finish the chapter at home.";
        case "chapterEnd":
          if (s.mode === "story") {
            const next = s.story.mission + 1;
            if (next >= story.missions.length || s.age >= END_AGE) {
              s.ending = { ...decideEnding(s), story: storyEnding(s) };
              s.phase = "ending";
            } else {
              applyMissionStart(s, next);
              beginYear(s, false);
              startMission(s, next);
            }
            return;
          }
          if (s.age >= END_AGE) {
            s.ending = decideEnding(s);
            s.phase = "ending";
          } else {
            beginYear(s, false);
            startChapter(s);
          }
          return;
        case "yearEnd":
          if (s.age >= END_AGE) {
            s.ending = decideEnding(s);
            s.phase = "ending";
          } else beginYear(s, false);
          return;
        default:
          return "The life is over.";
      }
    },

    SET_BUDGET(s, { jars, investIn }) {
      if (s.phase !== "budget") return "The budget can only be set at the start of a year.";
      if (investIn != null) {
        if (!INVESTABLE.includes(investIn)) return `Cannot invest in "${investIn}".`;
      }
      const check = checkBudget(s, jars);
      if (!check.ok) return check.errors.join(" ");
      if (investIn != null) s.investIn = investIn;
      commitBudget(s, jars);
    },

    BUY_WANT(s, { itemId }) {
      if (s.phase !== "shop" && !(mapMode(s) && s.phase === "map")) return "The shop is closed right now.";
      const item = idx.wantsById[itemId];
      if (!item || item.stage !== s.stage) return "That item is not in the shop.";
      if (s.year.bought.includes(itemId)) return "Already bought this year.";
      const price = Math.round(item.price * s.priceIndex);
      if (price > s.money.wallet) return `Not enough in the wants jar (₹${s.money.wallet} left).`;
      s.money.wallet -= price;
      flow(s, "wants", -price);
      s.year.bought.push(itemId);
      s.year.wantsSpent += price;
      addMeter(s, "joy", item.joy ?? 0);
      const out = [{ type: "want", itemId, price, joy: item.joy ?? 0 }];
      if (item.effects) applyEffects(A, s, item.effects, out, { origin: { age: s.age, cardId: `want:${itemId}`, choiceId: "buy" }, step: A.budget.step[s.stage] });
      if (item.echo) s.echoes.push({ age: s.age, cardId: `want:${itemId}`, choiceId: "buy", level: item.echo.level ?? 1, hint: item.echo.hint ?? null, firedAge: null });
      if (/phone/i.test(itemId) && !hasPhone(s)) {
        s.flags.push(A.chapters.phoneFlag);
        addEvent(s, { type: "phoneBought", itemId });
      }
      s.lastPurchase = { itemId, price, movements: out };
    },

    SKIP_SHOP(s) {
      if (s.phase !== "shop") return "The shop is closed right now.";
      drawNext(s);
    },

    CHOOSE(s, { choiceId, ignoredWarning = false }) {
      const [card, err] = currentCardOrError(s);
      if (err) return err;
      const choice = (card.choices ?? []).find((c) => c.id === choiceId);
      if (!choice) return `No choice "${choiceId}" on this card.`;
      if (card.kind === "story" && choiceLocked(s, choice, storyDeps)) return "That choice is locked.";
      const before = { netWorth: netWorth(s), cash: s.money.cash, debt: totalDebt(s), gyaan: s.meters.gyaan };
      const storyAge = s.current.age ?? s.age;
      const origin = { age: storyAge, cardId: card.id, choiceId };
      const out = [];
      // Chapter mode: some scams take the money later, not now (see settleScams).
      let effects = choice.effects;
      let delayed = null;
      if (s.mode === "chapters" && A.chapters.delayedScams?.[card.id]?.includes(choiceId) && Number(effects?.cash) < 0) {
        const { cash, meters, ...now } = effects;
        effects = now;
        delayed = { cash, meters: meters ?? null };
      }
      applyEffects(A, s, effects, out, { origin, step: A.budget.step[s.stage] });

      // Documents: going ahead (buying or borrowing) on an uncaught problem schedules trouble.
      let doc = null;
      if (card.document) {
        const pack = idx.documents[card.document];
        const d = s.docs[card.document];
        const variant = pack?.variants?.find((v) => v.id === d?.variant);
        const goesAhead = Boolean(choice.effects?.open || choice.effects?.loan);
        const red = (variant?.lines ?? []).filter((l) => l.redFlag).map((l) => l.id);
        const problem = red.length > 0 || Boolean(variant?.consequence);
        const caught = Boolean(d?.verified || red.some((id) => d?.flagged.includes(id)));
        doc = { id: card.document, variant: variant?.id ?? null, problem, caught, opened: Boolean(d?.opened), wentAhead: goesAhead, consequence: null };
        if (problem && goesAhead && !caught && variant?.consequence?.card) {
          const c = variant.consequence;
          const age = storyAge + Math.max(0, Math.round(c.inYears ?? 1));
          s.scheduled.push({ age, card: c.card, unlessFlag: c.unlessFlag ?? null, origin: { ...origin, doc: card.document } });
          doc.consequence = { card: c.card, age };
        }
      }

      // Lesson status and gyaan.
      const lesson = card.lesson;
      let lessonChange = null;
      if (lesson && lesson in s.lessons) {
        const prev = s.lessons[lesson];
        let next = nextLessonStatus(prev, choice.quality);
        if (choice.effects?.lesson) next = choice.effects.lesson;
        s.lessons[lesson] = next;
        if (prev === "unseen" && next !== "unseen") addMeter(s, "gyaan", A.gyaan.seen);
        if (next === "applied" && prev !== "applied") addMeter(s, "gyaan", A.gyaan.applied);
        lessonChange = { lesson, from: prev, to: next };
        s.year.lessons.push(lessonChange);
      }

      if (choice.echo) s.echoes.push({ age: storyAge, cardId: card.id, choiceId, level: choice.echo.level ?? 1, hint: choice.echo.hint ?? null, firedAge: null });
      if (s.current.crisisFlag) s.flags = s.flags.filter((f) => f !== s.current.crisisFlag);

      const decision = {
        index: s.history.length,
        age: storyAge,
        cardId: card.id,
        choiceId,
        kind: card.kind,
        lesson: lesson ?? null,
        quality: choice.quality ?? "neutral",
        choices: (card.choices ?? []).map((c) => c.id),
      };
      s.history.push(decision);
      s.year.decisions.push(decision.index);

      s.lastOutcome = {
        cardId: card.id,
        choiceId,
        kind: card.kind,
        quality: decision.quality,
        outcome: choice.outcome ?? null,
        why: choice.why ?? null,
        lesson: lessonChange,
        echo: choice.echo ?? null,
        document: doc,
        money: {
          movements: out,
          netWorthChange: netWorth(s) - before.netWorth,
          cashChange: s.money.cash - before.cash,
          debtChange: totalDebt(s) - before.debt,
        },
        gyaanChange: s.meters.gyaan - before.gyaan,
        delayed: Boolean(delayed),
      };
      if (delayed) {
        s.pendingScams = s.pendingScams ?? [];
        s.pendingScams.push({ cardId: card.id, choiceId, age: storyAge, slotKey: s.current.slotKey ?? null, eventsLeft: A.chapters.scamDelayEvents, ...delayed });
        pushMessage(s, { kind: "scamHook", cardId: card.id, choiceId });
      }
      s.current.chosen = choiceId;
      s.phase = "outcome";
      if (s.mode === "chapters") absorbScheduled(s);
      if (card.kind === "story") {
        s.story.path.push({ mission: s.chapter.id, node: card.id, choice: choiceId, age: storyAge });
        if (ignoredWarning && choice.warn) s.story.warningsIgnored += 1;
        s.story.pending = routeNext(s, choice.next, storyDeps);
        s.lastOutcome.next = s.story.pending;
        s.lastOutcome.nextIsOutcome = nodeOf(s.story.pending)?.type === "outcome";
      }
    },

    // The player listened to a warning and chose again (story mode): a little gyaan, once a scene.
    HEED_WARNING(s, { choiceId }) {
      const [card, err] = currentCardOrError(s);
      if (err) return err;
      const choice = (card.choices ?? []).find((c) => c.id === choiceId);
      if (!choice?.warn) return "There is no warning on that choice.";
      const key = `${card.id}:${choiceId}`;
      if (s.story.heeded.includes(key)) return;
      s.story.heeded.push(key);
      s.story.warningsHeeded += 1;
      addMeter(s, "gyaan", 1);
    },

    // Story mode: the clock ran out on the way to a timed scene.
    STORY_TIMEOUT(s) {
      if (s.mode !== "story" || s.phase !== "map") return "No timer is running.";
      const id = s.story.node;
      const n = nodeOf(id);
      if (!n?.rush || s.story.late[id]) return "No timer is running.";
      s.story.late[id] = true;
      if (n.rush.effects) applyEffects(A, s, n.rush.effects, [], { step: A.budget.step[s.stage] });
      s.story.lastLate = { node: id, note: n.rush.note ?? null, fail: n.rush.fail ?? null };
      if (n.rush.fail) activateNode(s, n.rush.fail);
    },

    USE_GLASSES(s) {
      const [card, err] = currentCardOrError(s);
      if (err) return err;
      if (!card.clarity?.length) return "There is nothing hidden on this card.";
      if (s.current.glasses) return "The glasses are already on.";
      if (card.clarity.every((c) => s.lessons[c.lesson] === "applied")) return "You can already see through everything here.";
      if (s.glasses.charges <= 0) return "The glasses have no charges left.";
      s.glasses.charges -= 1;
      s.current.glasses = true;
      if (!s.glasses.revealed.includes(card.id)) s.glasses.revealed.push(card.id);
    },

    OPEN_DOCUMENT(s, { docId }) {
      const [, d, err] = docOrError(s, docId);
      if (err) return err;
      if (!d.opened) {
        d.opened = true;
        addMeter(s, "gyaan", A.gyaan.documentOpened);
      }
    },

    FLAG_LINE(s, { docId, lineId }) {
      const [pack, d, err] = docOrError(s, docId);
      if (err) return err;
      const variant = pack.variants.find((v) => v.id === d.variant);
      const line = variant?.lines?.find((l) => l.id === lineId);
      if (!line) return `No line "${lineId}" in this document.`;
      d.opened = true;
      if (d.flagged.includes(lineId)) {
        d.flagged = d.flagged.filter((x) => x !== lineId);
        return;
      }
      d.flagged.push(lineId);
      if (line.redFlag && !d.rewarded.includes(lineId)) {
        d.rewarded.push(lineId);
        addMeter(s, "gyaan", A.gyaan.redFlagCaught);
      }
    },

    VERIFY_DOCUMENT(s, { docId }) {
      const [pack, d, err] = docOrError(s, docId);
      if (err) return err;
      if (d.verified) return "Already verified.";
      const cost = Math.max(0, Math.round(pack.verify?.cost ?? 0));
      if (!pack.verify) return "This document cannot be verified.";
      if (liquidNet(A, s) < cost) return `Verification costs ₹${cost}; you do not have it.`;
      flow(s, "fees", -cost);
      pay(A, s, cost, { order: "spend" });
      d.verified = true;
      d.opened = true;
    },

    MINIGAME_RESULT(s, { id, score, lesson }) {
      const mg = s.plan.minigame;
      if (s.phase !== "minigame" || !mg || mg.id !== id) return "No mini-game is running.";
      if (lesson != null && !["seen", "applied", "missed"].includes(lesson)) return `Unknown lesson status "${lesson}".`;
      s.minigames[id] = { age: s.age, score: Number(score) || 0 };
      addMeter(s, "gyaan", A.gyaan.minigame);
      const L = "L14";
      const prev = s.lessons[L];
      const next = lesson ?? (prev === "unseen" ? "seen" : prev);
      s.lessons[L] = next;
      if (prev !== next) s.year.lessons.push({ lesson: L, from: prev, to: next });
      if (s.mode === "chapters") finishSlot(s);
      else endYear(s);
    },

    // ---------- chapter mode ----------

    VISIT(s, { location }) {
      if (s.mode === "story" && s.phase === "map") {
        const n = nodeOf(s.story.node);
        if (!n || n.location !== location) return "Nothing is happening here right now.";
        presentNode(s);
        return;
      }
      if (s.mode !== "chapters" || s.phase !== "map") return "There is nowhere to go right now.";
      for (;;) {
        const slot = nextSlotAt(s, location);
        if (!slot) return "Nothing is happening here right now.";
        if (playSlot(s, slot)) return;
      }
    },

    END_CHAPTER(s) {
      if (s.mode !== "chapters" || s.phase !== "map") return "You can only finish a chapter from the map.";
      const left = s.chapter.slots.filter((x) => x.required && !x.done).length;
      if (left) return `${left} event${left === 1 ? "" : "s"} still waiting in this chapter.`;
      settleScams(s, true);
      while (s.age < s.chapter.to) passYear(s);
      endYear(s);
      recordYear(s);
      s.chapter.summary = chapterSummary(s);
      s.chapterLog.push(s.chapter.summary);
      s.current = null;
      s.phase = "chapterEnd";
    },

    // Buy (amount > 0, from cash) or sell (amount < 0, into cash) a fund, stock or deposit.
    TRADE(s, { product, amount }) {
      if (!mapMode(s) || s.phase !== "map") return "Trading happens on your phone, on the map.";
      const x = Math.round(Number(amount));
      if (!Number.isFinite(x) || x === 0) return "Enter an amount.";
      const isMarket = MUTUAL_FUNDS.includes(product) || STOCKS.includes(product);
      if (!isMarket && !["fd", "rd", "ppf", "gold", "bank"].includes(product)) return `You cannot trade "${product}" here.`;
      if (!hasPhone(s)) return "You need a phone for this.";
      if (isMarket && s.age < A.market.minAge) return `Investing in the market needs a PAN and KYC: wait until ${A.market.minAge}.`;
      if (!isMarket && product !== "bank" && !s.money.products.bank) return "Open a bank account first.";
      const fee = STOCKS.includes(product) ? A.market.brokerage : 0;
      if (x > 0) {
        if (x + fee > s.money.cash) return `Not enough cash (₹${s.money.cash}).`;
        s.money.cash -= x + fee;
        if (fee) flow(s, "fees", -fee);
        const { spread } = depositInto(A, s, product, x);
        s.lastTrade = { product, amount: x, fee: fee + spread, side: "buy" };
        return;
      }
      const h = s.money.products[product];
      if (!h || h.value <= 0) return "You hold none of this.";
      const gross = Math.min(-x, h.value);
      const penalty = Math.round(gross * closePenaltyRate(A, s, product));
      const cost = Math.min(gross - penalty, fee);
      h.value -= gross;
      h.invested = Math.max(0, Math.round(h.invested * (h.value / (h.value + gross))));
      if (h.value <= 0) delete s.money.products[product];
      s.money.cash += gross - penalty - cost;
      if (penalty) flow(s, "penalties", -penalty);
      if (cost) flow(s, "fees", -cost);
      s.lastTrade = { product, amount: -gross, fee: penalty + cost, side: "sell" };
    },

    // Move money between cash, the emergency and dream jars, and the bank account.
    MOVE_MONEY(s, { from, to, amount }) {
      if (!mapMode(s) || s.phase !== "map") return "Move money from your phone, on the map.";
      const accounts = ["cash", "emergency", "goal", "bank"];
      if (!accounts.includes(from) || !accounts.includes(to) || from === to) return "Pick two different places.";
      const x = Math.round(Number(amount));
      if (!(x > 0)) return "Enter an amount.";
      if ((from === "bank" || to === "bank") && !s.money.products.bank) return "Open a bank account first.";
      const get = (k) => (k === "cash" ? s.money.cash : k === "bank" ? s.money.products.bank.value : s.money.jars[k]);
      const add = (k, v) => {
        if (k === "cash") s.money.cash += v;
        else if (k === "bank") s.money.products.bank.value += v;
        else s.money.jars[k] += v;
      };
      if (get(from) < x) return "Not enough there.";
      add(from, -x);
      add(to, x);
    },

    // Prepay a loan (by its id) from cash and savings.
    REPAY(s, { loanId, amount }) {
      if (!mapMode(s) || s.phase !== "map") return "Repay from your phone, on the map.";
      if (!s.loans.some((l) => l.id === loanId)) return "No such loan.";
      const out = [];
      repayLoan(A, s, { loan: loanId, amount: amount ?? "all" }, out);
      if (!out[0]?.paid) return "Nothing could be repaid.";
      s.lastTrade = { loanId, amount: out[0].paid, side: "repay" };
    },

    ASKED_MENTOR(s) {
      freeGyaan(s, A.gyaan.mentor);
    },

    USED_GLOSSARY(s) {
      freeGyaan(s, A.gyaan.glossary);
    },
  };

  // ---------- public API ----------

  function createLife({ storylineId = "village", goalId = "house", seed = Date.now(), playerName = "", mode = "years", avatar = null } = {}) {
    const sl = content?.storylines?.[storylineId];
    if (!sl || !idx.pools[storylineId]) throw new Error(`Unknown storyline "${storylineId}".`);
    if (!(goalId in A.goals)) throw new Error(`Unknown goal "${goalId}".`);
    const seedNum = typeof seed === "number" && Number.isFinite(seed) ? seed >>> 0 : hashSeed(seed);
    const s = {
      v: 1,
      params: { storylineId, goalId, seed, playerName, mode, avatar },
      mode: ["chapters", "story"].includes(mode) ? mode : "years",
      avatar,
      chapter: null,
      chapterLog: [],
      lastTrade: null,
      inbox: [],
      inboxSeq: 0,
      pendingScams: [],
      seed: seedNum,
      rng: hashSeed(seedNum, "plan"),
      storylineId,
      goalId,
      playerName,
      age: START_AGE,
      stage: stageOf(START_AGE),
      phase: "intro",
      money: { cash: 0, wallet: 0, jars: { emergency: 0, goal: 0 }, products: {}, assets: [] },
      loans: [],
      insurance: [],
      income: { monthly: 0, source: "stage" },
      budget: null,
      budgetDirty: false,
      investIn: A.budget.defaultInvestIn,
      priceIndex: 1,
      meters: { ...A.meters.start },
      glasses: { charges: A.glasses.start, revealed: [] },
      docs: {},
      flags: [],
      scheduled: [],
      queue: [],
      current: null,
      lastOutcome: null,
      lastPurchase: null,
      lessons: Object.fromEntries(LESSON_IDS.map((id) => [id, "unseen"])),
      lessonCards: {},
      drawn: [],
      drawnGroups: [],
      echoes: [],
      habitEchoes: [],
      log: [],
      history: [],
      years: [],
      ending: null,
      flows: {},
      counters: { loan: 0 },
      crisisLog: {},
      minigames: {},
      freeGyaan: { age: START_AGE, count: 0 },
      dreamMilestone: 0,
      dreamReachedAge: null,
      plan: null,
      year: null,
      error: null,
      world: makeWorld(A, seedNum),
      story:
        mode === "story"
          ? { mission: 0, node: null, pending: null, path: [], visited: [], outcomes: {}, late: {}, lastLate: null, warningsIgnored: 0, warningsHeeded: 0, heeded: [] }
          : null,
    };
    if (mode === "story" && !story.missions.length) throw new Error("This content has no story missions.");
    s.income.monthly = wageFor(s);
    s.plan = planLife(A, idx, s);

    // storyline.json `start`: absolute starting values, plus optional `effects`.
    const start = sl.start ?? {};
    if (start.cash > 0) {
      s.money.cash += Math.round(start.cash);
      flow(s, "start", Math.round(start.cash));
    }
    for (const jar of ["emergency", "goal"]) {
      const x = Math.round(start.jars?.[jar] ?? 0);
      if (x > 0) {
        s.money.jars[jar] += x;
        flow(s, "start", x);
      }
    }
    if (start.meters) for (const [m, v] of Object.entries(start.meters)) if (m in s.meters) s.meters[m] = Math.max(0, Math.min(100, Math.round(v)));
    const startFlags = Array.isArray(start.flags) ? start.flags : start.flags?.add ?? [];
    for (const f of startFlags) if (!s.flags.includes(f)) s.flags.push(f);
    if (start.income?.monthly != null) s.income = { monthly: Math.round(start.income.monthly), source: start.income.source ?? "stage" };
    if (start.effects) applyEffects(A, s, start.effects, [], { cashCategory: "start" });
    return s;
  }

  function step(state, action) {
    const type = action?.type;
    const handler = HANDLERS[type];
    if (!handler) return { ...state, error: { type: type ?? null, message: `Unknown action "${type}".` } };
    // `log`, `history` and `years` are append-only (entries are never changed once written), so
    // their entries are shared; everything else is deep-cloned.
    const { world, log, history, years, ...rest } = state;
    const s = structuredClone(rest);
    s.world = world;
    s.log = [...log];
    s.history = [...history];
    s.years = [...years];
    s.error = null;
    const entry = { action: structuredClone(action), age: state.age, phase: state.phase, cardId: state.current?.cardId ?? null, node: state.story?.node ?? null };
    const err = handler(s, action);
    if (err) return { ...state, error: { type, message: err } };
    if (type === "CHOOSE") entry.decision = s.history.length - 1;
    s.log.push(entry);
    return s;
  }

  const SIDE_ACTIONS = new Set([
    "HEED_WARNING",
    "OPEN_DOCUMENT",
    "FLAG_LINE",
    "VERIFY_DOCUMENT",
    "USE_GLASSES",
    "BUY_WANT",
    "ASKED_MENTOR",
    "USED_GLOSSARY",
    "TRADE",
    "MOVE_MONEY",
    "REPAY",
  ]);

  // Parallel Life: the same seed with one decision changed. Everything before that decision is
  // replayed exactly; after it, cards that still appear keep the original choice (or their
  // default), and budgets, purchases and document actions are repeated where they still fit.
  function replay(finalState, { decisionIndex, choiceId }) {
    const target = finalState.history[decisionIndex];
    if (!target) throw new Error(`No decision #${decisionIndex}.`);
    if (!target.choices.includes(choiceId)) throw new Error(`Card ${target.cardId} has no choice "${choiceId}".`);
    let s = createLife(finalState.params);
    const log = finalState.log;
    let k = 0;
    for (; k < log.length; k++) {
      const e = log[k];
      if (e.action.type === "CHOOSE" && e.decision === decisionIndex) break;
      s = step(s, e.action);
    }
    s = step(s, { type: "CHOOSE", choiceId });
    if (s.error) throw new Error(s.error.message);

    const rest = log.slice(k + 1).map((e) => ({ ...e, used: false }));
    const original = new Map();
    for (const h of finalState.history) if (!original.has(h.cardId)) original.set(h.cardId, h.choiceId);
    const ctxKey = (age, phase, cardId) => `${age}|${phase}|${cardId ?? ""}`;

    for (let guard = 0; s.phase !== "ending" && guard < 5000; guard++) {
      const here = ctxKey(s.age, s.phase, s.current?.cardId);
      for (const e of rest) {
        if (e.used || !SIDE_ACTIONS.has(e.action.type) || ctxKey(e.age, e.phase, e.cardId) !== here) continue;
        e.used = true;
        const n = step(s, e.action);
        if (!n.error) s = n;
      }
      let action = { type: "ADVANCE" };
      if (s.phase === "budget") {
        const orig = rest.find((e) => !e.used && e.action.type === "SET_BUDGET" && e.age === s.age);
        if (orig) {
          orig.used = true;
          const jars = checkBudget(s, orig.action.jars).ok ? orig.action.jars : fitBudget(s, orig.action.jars, s.year.rules);
          action = { type: "SET_BUDGET", jars, investIn: orig.action.investIn };
        }
      } else if (s.phase === "card") {
        const card = cardById(s, s.current.cardId);
        const want = original.get(card.id);
        const choices = card.choices ?? [];
        const open = card.kind === "story" ? choices.filter((c) => !choiceLocked(s, c, storyDeps)) : choices;
        const pick = open.find((c) => c.id === want) ?? open.find((c) => c.default && !c.hidden) ?? open.find((c) => !c.hidden) ?? open[0];
        action = { type: "CHOOSE", choiceId: pick.id };
      } else if (s.phase === "map" && s.mode === "story") {
        // Run out of time where the player did; otherwise walk to the objective.
        const late = rest.find((e) => !e.used && e.action.type === "STORY_TIMEOUT" && e.node === s.story.node);
        if (late) late.used = true;
        action = late ? late.action : { type: "VISIT", location: nodeOf(s.story.node).location };
      } else if (s.phase === "map") {
        // Walk where the player walked, while those places still have events; then anywhere
        // with an event left; then finish the chapter.
        const pending = (loc) => s.chapter.slots.some((x) => !x.done && x.location === loc);
        const orig = rest.find((e) => !e.used && e.action.type === "VISIT" && pending(e.action.location));
        if (orig) {
          orig.used = true;
          action = orig.action;
        } else {
          const next = s.chapter.slots.filter((x) => !x.done && x.required).sort((a, b) => a.plannedAge - b.plannedAge)[0];
          action = next ? { type: "VISIT", location: next.location } : { type: "END_CHAPTER" };
        }
      } else if (s.phase === "minigame") {
        const orig = rest.find((e) => !e.used && e.action.type === "MINIGAME_RESULT" && e.action.id === s.plan.minigame.id);
        if (orig) {
          orig.used = true;
          action = orig.action;
        }
      }
      let n = step(s, action);
      if (n.error && action.type !== "ADVANCE") n = step(s, { type: "ADVANCE" });
      if (n.error) throw new Error(`Replay stuck at age ${s.age} (${s.phase}): ${n.error.message}`);
      s = n;
    }
    s.parallel = { decisionIndex, choiceId, originalChoiceId: target.choiceId, age: target.age, cardId: target.cardId };
    return s;
  }

  const select = makeSelectors({ A, idx, content, computeDream, checkBudget, story, storyDeps });

  return {
    createLife,
    step,
    replay,
    select,
    checkBudget,
    quoteLoan: (spec) => quoteLoan(A, spec),
    ASSUMPTIONS: A,
    content,
  };
}
