// "Save first": the story's budget as one choice. Needs are fixed (the minimum), you pick how
// much to save before spending, and the rest is fun money. Savings fill the safety jar first
// (enough for a few surprises), then the dream (and investments, once they open). Pure helpers:
// SaveFirst.jsx draws them; the result goes to the engine's SET_BUDGET as an ordinary jar split.
import { ASSUMPTIONS as A } from "../engine/assumptions.js";
import { END_AGE, stageOf } from "../engine/curriculum.js";

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
// The dream age assumes you keep saving the same share as your income grows with age (pocket
// money now, a job later), from the engine's own wage table.
export function forecast(jars, { age, dream, emergency = 0, stage = "child", priceIndex = 1, income = 1, share = 0, storylineId = "village" }) {
  const nowShare = ((jars.goal ?? 0) + (jars.invest ?? 0)) / Math.max(1, income);
  const wages = A.wages[storylineId] ?? A.wages.village;
  let dreamAge = null;
  if (dream.reached) dreamAge = age;
  else if (nowShare > 0) {
    let saved = dream.saved;
    for (let a = age; a <= END_AGE; a++) {
      // This year at today's split; later years the safety jar is full, so most savings go to the dream.
      const monthly = a === age ? income : Math.max(income, wages[stageOf(a)] ?? income);
      saved += monthly * 12 * (a === age ? nowShare : Math.max(nowShare, share * 0.8));
      if (saved >= dream.target) {
        dreamAge = a + 1;
        break;
      }
    }
  }
  const shields = Math.round((emergency + (jars.emergency ?? 0) * 12) / Math.max(1, surpriseCost(stage, priceIndex)));
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
