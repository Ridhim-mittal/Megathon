// "Save first": the story's budget as one choice. Needs are fixed (the minimum), you pick how
// much to save before spending, and the rest is fun money. Savings fill the safety jar first
// (enough for a few surprises), then the dream (and investments, once they open). Pure helpers:
// SaveFirst.jsx draws them; the result goes to the engine's SET_BUDGET as an ordinary jar split.
import { ASSUMPTIONS as A } from "../engine/assumptions.js";

export const SAVE_LEVELS = [
  { id: "little", share: 0.1 },
  { id: "some", share: 0.25 },
  { id: "lots", share: 0.4 },
];
const SAFE_SURPRISES = 3; // the safety jar aims to cover this many surprises

// A typical surprise this stage, in today's rupees.
export function surpriseCost(stage, priceIndex = 1) {
  const [lo, hi] = A.surprise.cost[stage] ?? A.surprise.cost.adult;
  return ((lo + hi) / 2) * priceIndex;
}

const toStep = (x, step) => Math.max(0, Math.round(x / step) * step);

export function planFor(rules, share, { emergency = 0, stage = "child", priceIndex = 1 } = {}) {
  const { monthlyIncome: income, step, minNeeds, jarsUnlocked } = rules;
  const room = Math.max(0, income - minNeeds);
  const save = Math.min(room, toStep(income * share, step));
  const investOpen = jarsUnlocked.includes("invest");
  // Safety first: what the jar still needs this year to cover a few surprises.
  const gap = Math.max(0, SAFE_SURPRISES * surpriseCost(stage, priceIndex) - emergency);
  // At most half the savings go to safety, so the dream always moves.
  let safety = Math.min(Math.floor(save / 2 / step) * step, toStep(gap / 12, step));
  if (save > 0 && safety === 0 && gap > 0) safety = Math.min(save, step);
  const rest = save - safety;
  const invest = investOpen ? toStep(rest / 2, step) : 0;
  const jars = { needs: minNeeds, wants: room - save, emergency: safety, goal: rest - invest };
  if (investOpen) jars.invest = invest;
  return jars;
}

// What a plan means: the dream's age, how many surprises the safety jar covers, fun per month.
export function forecast(jars, { age, dream, emergency = 0, stage = "child", priceIndex = 1, income = 1 }) {
  const perYear = ((jars.goal ?? 0) + (jars.invest ?? 0)) * 12;
  let dreamAge = null;
  if (dream.reached) dreamAge = age;
  else if (perYear > 0) dreamAge = age + Math.ceil(Math.max(0, dream.target - dream.saved) / perYear);
  const shields = Math.floor((emergency + (jars.emergency ?? 0) * 12) / Math.max(1, surpriseCost(stage, priceIndex)));
  const fun = Math.round(((jars.wants ?? 0) / Math.max(1, income)) * 10);
  return { dreamAge, shields, fun };
}

// The level closest to a saved split, so the picker opens on what you chose last time.
export function levelOf(rules, jars) {
  if (!jars) return "some";
  const saved = (jars.emergency ?? 0) + (jars.goal ?? 0) + (jars.invest ?? 0);
  const share = saved / Math.max(1, rules.monthlyIncome);
  return SAVE_LEVELS.reduce((best, l) => (Math.abs(l.share - share) < Math.abs(best.share - share) ? l : best)).id;
}
