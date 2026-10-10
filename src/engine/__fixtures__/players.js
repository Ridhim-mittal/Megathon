// Test helpers: drive a life to the end with scripted or random choices.

import { makeRandom } from "../rng.js";
import { netWorth, sumFlows } from "../money.js";

export function assertConserved(s, label = "") {
  const nw = netWorth(s);
  const flows = sumFlows(s.flows);
  if (nw !== flows) throw new Error(`Money not conserved ${label} at age ${s.age} (${s.phase}): netWorth ${nw} ≠ flows ${flows}`);
}

// A random but valid budget for the current rules.
export function randomBudget(rules, random) {
  const jars = Object.fromEntries(rules.jarsUnlocked.map((k) => [k, 0]));
  jars.needs = rules.minNeeds;
  let left = (rules.monthlyIncome - rules.minNeeds) / rules.step;
  const weights = rules.jarsUnlocked.map(() => random());
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  rules.jarsUnlocked.forEach((k, i) => {
    const units = Math.floor((left * weights[i]) / total);
    jars[k] += units * rules.step;
  });
  const sum = Object.values(jars).reduce((a, b) => a + b, 0);
  jars.needs += rules.monthlyIncome - sum;
  return jars;
}

// Play a whole life. `choose(state, card, random)` returns a choice id; by default random.
// With `checkEveryStep`, money conservation is asserted after every action.
export function playLife(E, params, { seed = 1, choose = null, checkEveryStep = false, extras = true } = {}) {
  const holder = { rng: seed >>> 0 };
  const random = makeRandom(holder);
  let s = E.createLife(params);
  const act = (action) => {
    const next = E.step(s, action);
    if (!next.error) {
      s = next;
      if (checkEveryStep) assertConserved(s, action.type);
    }
    return !next.error;
  };
  for (let guard = 0; s.phase !== "ending"; guard++) {
    if (guard > 5000) throw new Error(`Life did not end (age ${s.age}, ${s.phase}).`);
    if (extras && random() < 0.05) act({ type: random() < 0.5 ? "ASKED_MENTOR" : "USED_GLOSSARY" });
    switch (s.phase) {
      case "budget": {
        const rules = E.select.budgetRules(s);
        if (extras && random() < 0.6) {
          const investIn = random() < 0.3 ? random.pick(rules.investOptions) : undefined;
          if (!act({ type: "SET_BUDGET", jars: randomBudget(rules, random), investIn })) throw new Error(`Bad budget: ${E.step(s, { type: "SET_BUDGET", jars: randomBudget(rules, random) }).error.message}`);
        } else act({ type: "ADVANCE" });
        break;
      }
      case "shop": {
        if (extras) for (const item of E.select.shopItems(s)) if (item.affordable && random() < 0.4) act({ type: "BUY_WANT", itemId: item.id });
        act({ type: random() < 0.5 ? "SKIP_SHOP" : "ADVANCE" });
        break;
      }
      case "card": {
        const card = E.select.currentCard(s);
        if (extras) {
          if (card.glasses.canUse && random() < 0.4) act({ type: "USE_GLASSES" });
          if (card.document) {
            const docId = card.document.id;
            if (random() < 0.6) act({ type: "OPEN_DOCUMENT", docId });
            if (random() < 0.3) act({ type: "VERIFY_DOCUMENT", docId });
            for (const line of E.select.currentCard(s).document.lines) if (random() < 0.3) act({ type: "FLAG_LINE", docId, lineId: line.id });
          }
        }
        const choiceId = choose ? choose(s, card, random) : random.pick(card.choices).id;
        if (!act({ type: "CHOOSE", choiceId })) throw new Error(`Could not choose ${choiceId} on ${card.id}`);
        break;
      }
      case "minigame":
        act(random() < 0.7 ? { type: "MINIGAME_RESULT", id: E.select.minigame(s).id, score: Math.floor(random() * 100) } : { type: "ADVANCE" });
        break;
      default:
        if (!act({ type: "ADVANCE" })) throw new Error(`ADVANCE failed in ${s.phase}: ${E.step(s, { type: "ADVANCE" }).error.message}`);
    }
  }
  return s;
}

// Every number anywhere in a value is finite.
export function findNonFinite(value, path = "state") {
  if (typeof value === "number") return Number.isFinite(value) ? null : path;
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const bad = findNonFinite(v, `${path}.${k}`);
      if (bad) return bad;
    }
  }
  return null;
}
