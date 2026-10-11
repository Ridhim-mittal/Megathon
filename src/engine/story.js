// Story mode: a life told as missions (prologue + five chapters). Each mission is a small graph of
// scenes at places on the village map. A scene is shown like a card; each choice applies effects
// and leads to the next scene, and the last choice leads to one of the mission's outcomes. Flags
// set in one mission open or lock choices in later ones.
//
// This file holds the pure helpers: indexing the story content, conditions, routing, the
// flowchart view and validation. The engine wires them into the step reducer.

import { EFFECT_KEYS, LESSON_IDS, LOAN_SOURCES, METERS, PRODUCTS } from "./curriculum.js";
import { LOCATIONS } from "./locations.js";
import { liquidNet, totalDebt } from "./money.js";
import { owns } from "./deck.js";

const list = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);

export const TONES = ["good", "mixed", "bad", "tragic"];

// Scene → card, so the card views, documents, glossary chips and CHOOSE all work unchanged.
function sceneCard(node, mission) {
  return {
    id: node.id,
    kind: "story",
    storyline: "all",
    mission: mission.id,
    lesson: node.lesson ?? null,
    speaker: node.speaker ?? "narrator",
    title: node.title,
    text: node.text,
    document: node.document ?? null,
    clarity: node.clarity ?? [],
    choices: node.choices ?? [],
  };
}

export function indexStory(content) {
  const missions = content?.story?.missions ?? [];
  const nodes = {};
  const cards = {};
  missions.forEach((m, index) => {
    for (const n of m.nodes ?? []) {
      nodes[n.id] = { node: n, mission: m, index };
      if (n.type !== "outcome") cards[n.id] = sceneCard(n, m);
    }
  });
  return { missions, nodes, cards };
}

// ---------- conditions ----------
// { flags: [all], notFlags: [none], anyFlags: [one+], minCount: { flags, n }, owns: [products],
//   minCash, minLiquid, minEmergency, maxDebt, minDebt, ending: [ids], dreamReached: bool,
//   lastDoc: { problem, caught, wentAhead }, lessonStatus: { L01: status | [..] }, goal: [ids],
//   visited: [nodeIds], late: nodeId }
export const COND_KEYS = [
  "flags",
  "notFlags",
  "anyFlags",
  "minCount",
  "owns",
  "minCash",
  "minLiquid",
  "minEmergency",
  "maxDebt",
  "minDebt",
  "ending",
  "dreamReached",
  "lastDoc",
  "lessonStatus",
  "goal",
  "visited",
  "late",
];

export function condOk(s, c, deps) {
  if (!c) return true;
  const has = (f) => s.flags.includes(f);
  if (c.flags && !list(c.flags).every(has)) return false;
  if (c.notFlags && list(c.notFlags).some(has)) return false;
  if (c.anyFlags && !list(c.anyFlags).some(has)) return false;
  if (c.minCount && list(c.minCount.flags).filter(has).length < (c.minCount.n ?? 1)) return false;
  if (c.owns && !list(c.owns).every((p) => owns(s, p))) return false;
  if (c.minCash != null && s.money.cash < c.minCash) return false;
  if (c.minLiquid != null && liquidNet(deps.A, s) < c.minLiquid) return false;
  if (c.minEmergency != null && s.money.jars.emergency < c.minEmergency) return false;
  if (c.maxDebt != null && totalDebt(s) > c.maxDebt) return false;
  if (c.minDebt != null && totalDebt(s) < c.minDebt) return false;
  if (c.ending && !list(c.ending).includes(deps.decideEnding(s).id)) return false;
  if (c.dreamReached != null && Boolean(deps.computeDream(s).reached) !== Boolean(c.dreamReached)) return false;
  if (c.lastDoc) {
    const d = s.lastOutcome?.document;
    if (!d) return false;
    for (const [k, v] of Object.entries(c.lastDoc)) if (Boolean(d[k]) !== Boolean(v)) return false;
  }
  if (c.lessonStatus) {
    for (const [lesson, want] of Object.entries(c.lessonStatus)) {
      const have = s.lessons[lesson] ?? "unseen";
      if (Array.isArray(want) ? !want.includes(have) : have !== want) return false;
    }
  }
  if (c.goal && !list(c.goal).includes(s.goalId)) return false;
  if (c.visited && !list(c.visited).every((id) => s.story?.visited.includes(id))) return false;
  if (c.late && !s.story?.late?.[c.late]) return false;
  return true;
}

// `next` is a node id, or [{ if: cond, to }, …, { to }]: the first match wins.
export function routeNext(s, next, deps) {
  if (typeof next === "string") return next;
  for (const r of list(next)) if (!r.if || condOk(s, r.if, deps)) return r.to;
  return null;
}

export function choiceLocked(s, choice, deps) {
  return Boolean(choice.requires) && !condOk(s, choice.requires, deps);
}

// Every node id a `next` can lead to.
export function targetsOf(next) {
  return typeof next === "string" ? [next] : list(next).map((r) => r.to);
}

// ---------- the flowchart (Detroit-style) ----------
// Columns are the longest distance from the mission's start; the UI lays out the rows.
export function flowchartOf(story, s, missionId, discovered = null) {
  const m = story.missions.find((x) => x.id === missionId);
  if (!m) return null;
  const byId = Object.fromEntries((m.nodes ?? []).map((n) => [n.id, n]));
  const depth = { [m.start]: 0 };
  // Longest-path depth over a DAG: relax edges until stable (graphs are small).
  for (let pass = 0; pass < (m.nodes?.length ?? 0) + 1; pass++) {
    let changed = false;
    for (const n of m.nodes ?? []) {
      if (depth[n.id] == null) continue;
      for (const c of n.choices ?? [])
        for (const t of targetsOf(c.next))
          if (byId[t] && (depth[t] == null || depth[t] < depth[n.id] + 1) && depth[n.id] + 1 <= m.nodes.length) {
            depth[t] = depth[n.id] + 1;
            changed = true;
          }
    }
    if (!changed) break;
  }
  // Outcomes share the last column.
  const maxScene = Math.max(0, ...m.nodes.filter((n) => n.type !== "outcome" && depth[n.id] != null).map((n) => depth[n.id]));
  const path = (s?.story?.path ?? []).filter((p) => p.mission === missionId);
  const visited = new Set(s?.story?.visited ?? []);
  const known = (id) => visited.has(id) || s?.story?.node === id || Boolean(discovered?.has?.(id));
  const taken = new Set(path.map((p) => `${p.node}:${p.choice}`));
  const outcome = s?.story?.outcomes?.[missionId] ?? null;
  const nodes = m.nodes.map((n) => ({
    id: n.id,
    type: n.type === "outcome" ? "outcome" : "scene",
    tone: n.tone ?? null,
    title: n.title,
    location: n.location ?? null,
    lesson: n.lesson ?? null,
    depth: n.type === "outcome" ? maxScene + 1 : depth[n.id] ?? 0,
    visited: visited.has(n.id),
    known: known(n.id),
    current: s?.story?.node === n.id,
    reached: outcome === n.id,
    choices: (n.choices ?? [])
      .filter((c) => !c.hidden)
      .map((c) => ({
        id: c.id,
        label: c.label,
        quality: c.quality ?? null,
        warn: Boolean(c.warn),
        requires: Boolean(c.requires),
        taken: taken.has(`${n.id}:${c.id}`),
        known: taken.has(`${n.id}:${c.id}`) || Boolean(discovered?.has?.(`${n.id}:${c.id}`)),
        targets: targetsOf(c.next).filter((t) => byId[t]),
      })),
  }));
  const total = nodes.length + nodes.reduce((a, n) => a + n.choices.length, 0);
  const found = nodes.filter((n) => n.known).length + nodes.reduce((a, n) => a + n.choices.filter((c) => c.known).length, 0);
  return {
    mission: { id: m.id, title: m.title, part: m.part },
    start: m.start,
    nodes,
    outcome,
    completion: total ? Math.round((found / total) * 100) : 0,
  };
}

// ---------- validation ----------

export function validateStory(storyContent, { assumptions, lessons = {}, documents = {} } = {}) {
  const errors = [];
  const warnings = [];
  const err = (where, msg) => errors.push({ where, msg });
  const warn = (where, msg) => warnings.push({ where, msg });
  const missions = storyContent?.missions ?? [];
  if (!missions.length) return { errors, warnings };
  const seen = new Set();
  let prevTo = null;
  for (const m of missions) {
    const at = `story.${m.id}`;
    if (!m.id) err(at, "Mission needs an id.");
    if (!Number.isInteger(m.from) || !Number.isInteger(m.to) || m.from > m.to) err(at, "from/to must be ages, from ≤ to.");
    if (prevTo != null && m.from !== prevTo + 1) err(at, `Starts at ${m.from}, but the previous mission ended at ${prevTo}.`);
    prevTo = m.to;
    for (const k of ["title", "intro"]) if (!m[k]?.en) err(at, `Missing ${k}.en.`);
    const nodes = m.nodes ?? [];
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    if (!byId[m.start]) err(at, `start "${m.start}" is not a node.`);
    if (m.startEffects) checkEffects(`${at}.startEffects`, m.startEffects);
    for (const n of nodes) {
      const where = `${at}.${n.id}`;
      if (seen.has(n.id)) err(where, "Duplicate node id (ids are unique across missions).");
      seen.add(n.id);
      if (!n.title?.en) err(where, "Missing title.en.");
      if (!n.text?.en) err(where, "Missing text.en.");
      if (n.type === "outcome") {
        if (!TONES.includes(n.tone)) err(where, `tone must be one of ${TONES.join(", ")}.`);
        if (n.effects) checkEffects(`${where}.effects`, n.effects);
        continue;
      }
      if (!LOCATIONS.includes(n.location)) err(where, `Unknown location "${n.location}".`);
      if (!Number.isInteger(n.age) || n.age < m.from || n.age > m.to) err(where, `age ${n.age} is outside ${m.from}–${m.to}.`);
      if (!n.objective?.en) err(where, "Missing objective.en.");
      if (n.lesson && !LESSON_IDS.includes(n.lesson)) err(where, `Unknown lesson "${n.lesson}".`);
      if (n.lesson && lessons && Object.keys(lessons).length && !lessons[n.lesson]) warn(where, `Lesson ${n.lesson} has no content.`);
      if (n.document && documents && !documents[n.document]) err(where, `Unknown document "${n.document}".`);
      const choices = n.choices ?? [];
      if (!choices.filter((c) => !c.hidden).length) err(where, "Needs at least one visible choice.");
      if (choices.filter((c) => !c.hidden).every((c) => c.requires)) err(where, "At least one visible choice must have no requirement.");
      const ids = new Set();
      for (const c of choices) {
        const cw = `${where}.${c.id}`;
        if (ids.has(c.id)) err(cw, "Duplicate choice id.");
        ids.add(c.id);
        if (!c.label?.en) err(cw, "Missing label.en.");
        if (!c.outcome?.en) err(cw, "Missing outcome.en.");
        if (c.effects) checkEffects(`${cw}.effects`, c.effects);
        if (c.requires) checkCond(`${cw}.requires`, c.requires);
        if (c.requires && !c.lockedHint?.en) warn(cw, "A choice with requires should have a lockedHint.");
        const targets = targetsOf(c.next);
        if (!targets.length) err(cw, "Missing next.");
        if (Array.isArray(c.next)) {
          c.next.forEach((r, i) => r.if && checkCond(`${cw}.next[${i}]`, r.if));
          if (c.next[c.next.length - 1]?.if) err(cw, "The last next rule must have no `if` (the fallback).");
        }
        for (const t of targets) {
          if (!byId[t]) err(cw, `next "${t}" is not a node of this mission.`);
          else if (byId[t].type !== "outcome" && byId[t].age < n.age) err(cw, `next "${t}" goes back in time.`);
        }
      }
      if (n.timer) {
        if (!(n.timer.seconds > 0)) err(where, "timer.seconds must be > 0.");
        if (!ids.has(n.timer.choice)) err(where, `timer.choice "${n.timer.choice}" is not a choice.`);
      }
      if (n.rush) {
        if (!(n.rush.seconds > 0)) err(where, "rush.seconds must be > 0.");
        if (n.rush.fail && !byId[n.rush.fail]) err(where, `rush.fail "${n.rush.fail}" is not a node.`);
        if (n.rush.effects) checkEffects(`${where}.rush.effects`, n.rush.effects);
      }
    }
    // Every node is reachable from the start, and every scene can reach an outcome.
    const reach = new Set([m.start]);
    const queue = [m.start];
    while (queue.length) {
      const n = byId[queue.shift()];
      if (!n) continue;
      const outs = [...(n.choices ?? []).flatMap((c) => targetsOf(c.next)), ...(n.rush?.fail ? [n.rush.fail] : [])];
      for (const t of outs) if (!reach.has(t)) (reach.add(t), queue.push(t));
    }
    for (const n of nodes) if (!reach.has(n.id)) warn(`${at}.${n.id}`, "Not reachable from the start.");
    if (!nodes.some((n) => n.type === "outcome")) err(at, "A mission needs at least one outcome.");
  }

  function checkCond(where, c) {
    if (!isObj(c)) return err(where, "Condition must be an object.");
    for (const k of Object.keys(c)) if (!COND_KEYS.includes(k)) err(where, `Unknown condition "${k}".`);
    if (c.owns) for (const p of list(c.owns)) if (!PRODUCTS.includes(p)) err(where, `Unknown product "${p}".`);
  }

  function checkEffects(where, e) {
    if (!isObj(e)) return err(where, "effects must be an object.");
    for (const [k, v] of Object.entries(e)) {
      if (!EFFECT_KEYS.includes(k)) err(where, `"${k}" is not in the effects vocabulary.`);
      if (k === "schedule") err(where, "Story scenes route with `next`; don't schedule cards.");
      if ((k === "open" || k === "close") && list(v).some((o) => !PRODUCTS.includes(o?.product))) err(where, `Unknown product in ${k}.`);
      if (k === "loan" && list(v).some((o) => !LOAN_SOURCES.includes(o?.source) || !(o?.principal > 0))) err(where, "Bad loan spec.");
      if (k === "repay" && list(v).some((o) => !LOAN_SOURCES.includes(o?.loan))) err(where, "Bad repay spec.");
      if (k === "meters" && isObj(v)) for (const m of Object.keys(v)) if (!METERS.includes(m)) err(where, `Unknown meter "${m}".`);
      if (k === "shock" && list(v).some((o) => !(o?.cost >= 0) || typeof o?.kind !== "string")) err(where, "Bad shock spec.");
    }
  }
  void assumptions;
  return { errors, warnings };
}
