// Replays and "what if" lives. A strategy is read from the player's command log:
// exact matches (same age + card) first, then the same card at any age, then the
// player's usual style. Everything here is pure and runs client-side.
import { newLife, apply, currentStep, hud, endStats, totalDebt, DEFAULT_BUDGET } from "./engine.js";
import { cardById, crossById, msgById, CFG } from "./data.js";
import { hash32 } from "./rng.js";

const keyOf = (c) =>
  c.type === "choose" ? `event:${c.cardId}` : c.type === "crossroads" ? `crossroads:${c.id}` : c.type === "message" ? `message:${c.msgId}` : null;

export function strategyFromLog(commands, override = null) {
  const exact = new Map();
  const byId = new Map();
  const budgets = [];
  const actions = new Map();
  const styles = { careful: 0, bold: 0, generous: 0 };
  let scamsSeen = 0;
  let scamsFlagged = 0;
  let roleflip = null;
  for (const c of commands) {
    const k = keyOf(c);
    if (k) {
      const choice = c.optionId ?? c.verdict;
      exact.set(`${c.age}|${k}`, choice);
      byId.set(k, choice);
      if (c.type === "choose") {
        const opt = cardById[c.cardId].options.find((o) => o.id === c.optionId);
        if (opt) styles[opt.style] += 1;
      }
      if (c.type === "message" && msgById[c.msgId].scam) {
        scamsSeen += 1;
        if (c.verdict === "flag") scamsFlagged += 1;
      }
    }
    if (c.type === "budget") budgets.push(c);
    if (c.type === "action") {
      if (!actions.has(c.age)) actions.set(c.age, []);
      actions.get(c.age).push(c.action);
    }
    if (c.type === "roleflip") roleflip = c.picks;
  }
  if (override) {
    exact.set(`${override.age}|${override.key}`, override.choice);
    byId.set(override.key, override.choice);
  }
  const favourite = Object.entries(styles).sort((a, b) => b[1] - a[1])[0][0];
  return { exact, byId, budgets, actions, favourite, flagsScams: scamsSeen === 0 || scamsFlagged / scamsSeen >= 0.5, roleflip };
}

function decide(s, step, st) {
  const age = s.cur.age;
  const pick = (k, options) => {
    const hit = st.exact.get(`${age}|${k}`) ?? st.byId.get(k);
    if (hit && options.some((o) => o.id === hit)) return hit;
    return (options.find((o) => o.style === st.favourite) || options[0]).id;
  };
  switch (step.kind) {
    case "crossroads":
      return [{ type: "crossroads", id: step.id, optionId: pick(`crossroads:${step.id}`, crossById[step.id].options) }];
    case "budget": {
      const prior = st.budgets.filter((b) => b.age <= age);
      const b = prior.at(-1) || st.budgets[0];
      return [{ type: "budget", budget: b ? b.budget : { ...DEFAULT_BUDGET }, autoRepay: b ? b.autoRepay : true }];
    }
    case "roleflip":
      return [{ type: "roleflip", picks: st.roleflip || { student: "mid", mother: "mid", youth: "mid" } }];
    case "actions":
      return [...(st.actions.get(age) || []).map((action) => ({ type: "action", action })), { type: "endActions" }];
    case "event":
      return [{ type: "choose", cardId: step.cardId, optionId: pick(`event:${step.cardId}`, cardById[step.cardId].options) }];
    case "message": {
      const hit = st.exact.get(`${age}|message:${step.msgId}`) ?? st.byId.get(`message:${step.msgId}`);
      const scam = msgById[step.msgId].scam;
      const verdict = hit || (scam ? (st.flagsScams ? "flag" : "reply") : "reply");
      return [{ type: "message", msgId: step.msgId, verdict }];
    }
    case "yearEnd":
      return [{ type: "nextYear" }];
    default:
      return [];
  }
}

export function runLife(seed, strategy, { keepHistory = true } = {}) {
  const s = newLife(seed);
  let guard = 0;
  while (s.phase !== "ending" && guard++ < 2000) {
    const step = currentStep(s);
    const cmds = decide(s, step, strategy);
    let moved = false;
    for (const c of cmds) moved = apply(s, c) || moved;
    if (!moved && step.kind === "actions") apply(s, { type: "endActions" });
  }
  if (!keepHistory) s.commands = [];
  return s;
}

// Every decision a player can rewind in Parallel Life.
export function turningPoints(life) {
  const out = [];
  life.commands.forEach((c, index) => {
    const key = keyOf(c);
    if (!key) return;
    let options;
    let title;
    let art;
    if (c.type === "choose") {
      const card = cardById[c.cardId];
      options = card.options.map((o) => o.id);
      title = card.title;
      art = card.art;
    } else if (c.type === "crossroads") {
      const cr = crossById[c.id];
      options = cr.options.map((o) => o.id);
      title = cr.title;
      art = cr.art;
    } else {
      options = ["flag", "reply"];
      title = msgById[c.msgId].sender;
      art = "📱";
    }
    const chosen = c.optionId ?? c.verdict;
    const year = life.years.find((y) => y.age === c.age);
    const risky = Boolean(year && year.seeds.length && (year.events.some((e) => e.cardId === c.cardId && e.planted) || (year.message && year.message.planted && c.msgId)));
    out.push({ index, age: c.age, key, kind: c.type, id: c.cardId || c.id || c.msgId, chosen, alternatives: options.filter((o) => o !== chosen), title, art, risky: risky || c.type === "crossroads" });
  });
  return out;
}

export function parallelLife(life, point, choice) {
  const st = strategyFromLog(life.commands, { age: point.age, key: point.key, choice });
  const alt = runLife(life.seed, st);
  const divergence = point.age;
  return { alt, divergence };
}

export const outcomeOf = (s) => ({ ...endStats(s), ...hud(s), debt: totalDebt(s) });

function quantile(sorted, q) {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo);
}

export function summarize(outcomes) {
  const pcts = outcomes.map((o) => o.goalPct).sort((a, b) => a - b);
  return {
    met: outcomes.filter((o) => o.goalMet).length,
    debtFree: outcomes.filter((o) => o.debtFree).length,
    min: pcts[0],
    p10: quantile(pcts, 0.1),
    median: quantile(pcts, 0.5),
    p90: quantile(pcts, 0.9),
    max: pcts.at(-1),
  };
}

// The same 100 seeds for both strategies, so only the choice differs.
export function hundredLives(life, point, choice, n = 100) {
  const mine = strategyFromLog(life.commands);
  const other = strategyFromLog(life.commands, { age: point.age, key: point.key, choice });
  const a = [];
  const b = [];
  for (let i = 0; i < n; i++) {
    const seed = hash32(`${life.seed}|life|${i}`);
    a.push(outcomeOf(runLife(seed, mine, { keepHistory: false })));
    b.push(outcomeOf(runLife(seed, other, { keepHistory: false })));
  }
  return { mine: summarize(a), other: summarize(b), n };
}

export { CFG };
