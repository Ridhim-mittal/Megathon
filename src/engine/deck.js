// Cards: indexing content, planning the lesson coverage, building each year's queue and
// resolving a queued slot into a concrete card.

import {
  CURRICULUM,
  FILLER_KINDS,
  INSURANCE_PRODUCTS,
  START_AGE,
  END_AGE,
  stageOf,
} from "./curriculum.js";
import { makeRandom } from "./rng.js";

// `<storyline>.<stage>.<slug>.<variant>` → `<storyline>.<stage>.<slug>`: variants of one moment.
export const groupOf = (id) => {
  const parts = String(id).split(".");
  return parts.length > 1 ? parts.slice(0, -1).join(".") : String(id);
};

const fits = (card, age) => Array.isArray(card.ages) && age >= card.ages[0] && age <= card.ages[1];

// Build per-storyline card pools once per engine.
export function indexContent(content) {
  const storylines = content.storylines ?? {};
  const shared = [];
  const seen = new Set();
  for (const sl of Object.values(storylines))
    for (const c of sl.cards ?? []) if (c.storyline === "all" && !seen.has(c.id)) (seen.add(c.id), shared.push(c));
  for (const c of content.cards ?? []) if (!seen.has(c.id)) (seen.add(c.id), shared.push(c));

  const pools = {};
  for (const [id, sl] of Object.entries(storylines)) {
    const cards = [...(sl.cards ?? []).filter((c) => c.storyline !== "all"), ...shared];
    const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
    const lessonVariants = {};
    const crossroads = {};
    for (const c of cards) {
      if (c.kind === "lesson") (lessonVariants[c.lesson] ??= []).push(c);
      if (c.kind === "crossroads") (crossroads[groupOf(c.id)] ??= []).push(c);
    }
    pools[id] = {
      cards,
      byId,
      lessonVariants,
      crossroads,
      fillers: cards.filter((c) => FILLER_KINDS.includes(c.kind)),
      crisis: cards.filter((c) => c.kind === "crisis"),
    };
  }
  return {
    pools,
    documents: Object.fromEntries((content.documents ?? []).map((d) => [d.id, d])),
    wants: content.wants ?? [],
    wantsById: Object.fromEntries((content.wants ?? []).map((w) => [w.id, w])),
    lessons: Object.fromEntries((content.lessons ?? []).map((l) => [l.id, l])),
    goals: Object.fromEntries((content.goals ?? []).map((g) => [g.id, g])),
    minigames: content.minigames ?? {},
  };
}

export function owns(s, product) {
  if (INSURANCE_PRODUCTS.includes(product)) return s.insurance.some((p) => p.type === product);
  return Boolean(s.money.products[product]);
}

export function requiresOk(s, card, extraFlags = []) {
  const q = card.requires;
  if (!q) return true;
  const flags = extraFlags.length ? [...s.flags, ...extraFlags] : s.flags;
  if (q.flags && !q.flags.every((f) => flags.includes(f))) return false;
  if (q.notFlags && q.notFlags.some((f) => flags.includes(f))) return false;
  if (q.minCash != null && s.money.cash < q.minCash) return false;
  if (q.owns && !q.owns.every((p) => owns(s, p))) return false;
  if (q.lessonStatus) {
    for (const [lesson, want] of Object.entries(q.lessonStatus)) {
      const have = s.lessons[lesson] ?? "unseen";
      if (Array.isArray(want) ? !want.includes(have) : have !== want) return false;
    }
  }
  return true;
}

// ---------- planning (once, at createLife) ----------

// Pick the age at which each lesson's card is drawn: inside the lesson window, at an age where
// the storyline has a variant, spreading cards so no year is crowded. Crossroads get a seeded
// age inside their range; Sahukar's chair gets one age.
export function planLife(A, idx, s) {
  const random = makeRandom(s);
  const pool = idx.pools[s.storylineId];
  const load = {};
  for (let a = START_AGE; a <= END_AGE; a++) load[a] = 0;
  const plan = { lessons: {}, crossroads: {}, minigame: null };

  for (const [group, variants] of Object.entries(pool.crossroads)) {
    const lo = Math.max(START_AGE, Math.min(...variants.map((c) => c.ages[0])));
    const hi = Math.min(END_AGE, Math.max(...variants.map((c) => c.ages[1])));
    const age = random.int(lo, hi);
    plan.crossroads[group] = age;
    load[age] += 1;
  }

  const order = [...CURRICULUM].sort((a, b) => a.ages[1] - b.ages[1] || a.ages[0] - b.ages[0]);
  for (const lesson of order) {
    const variants = pool.lessonVariants[lesson.id] ?? [];
    const ages = [];
    for (let a = lesson.ages[0]; a <= lesson.ages[1]; a++) if (variants.some((c) => fits(c, a))) ages.push(a);
    if (!ages.length) {
      plan.lessons[lesson.id] = null;
      continue;
    }
    const min = Math.min(...ages.map((a) => load[a]));
    const age = random.pick(ages.filter((a) => load[a] === min));
    plan.lessons[lesson.id] = age;
    load[age] += 1;
  }

  if (idx.minigames?.sahukar) plan.minigame = { id: "sahukar", age: random.int(A.minigameAges[0], A.minigameAges[1]) };
  return plan;
}

// ---------- the yearly queue ----------

export function buildQueue(A, idx, s, random) {
  const age = s.age;
  const due = s.scheduled.filter((x) => x.age === age);
  s.scheduled = s.scheduled.filter((x) => x.age !== age);
  const slots = due.map((x) => ({ type: "scheduled", card: x.card, unlessFlag: x.unlessFlag ?? null, origin: x.origin ?? null }));

  const middle = [];
  for (const lesson of CURRICULUM) if (s.plan.lessons[lesson.id] === age) middle.push({ type: "lesson", lesson: lesson.id });
  const crossroads = Object.entries(s.plan.crossroads)
    .filter(([, a]) => a === age)
    .map(([group]) => ({ type: "crossroads", group }));

  const [lo, hi] = A.cardsPerYear[stageOf(age)];
  const target = random.int(lo, hi);
  const fill = Math.max(0, target - slots.length - middle.length - crossroads.length);
  for (let i = 0; i < fill; i++) middle.push({ type: "filler" });

  return [...slots, ...random.shuffle(middle), ...crossroads];
}

// ---------- resolving a slot ----------

function notDrawn(s, card) {
  return !s.drawn.includes(card.id) && !s.drawnGroups.includes(groupOf(card.id));
}

export function crisisCandidates(idx, s, key) {
  const flag = `crisis_${key}`;
  const pool = idx.pools[s.storylineId];
  const eligible = pool.crisis.filter((c) => fits(c, s.age) && requiresOk(s, c, [flag]));
  const specific = eligible.filter((c) => c.requires?.flags?.includes(flag));
  if (specific.length) return specific;
  return eligible.filter((c) => !(c.requires?.flags ?? []).some((f) => f.startsWith("crisis_")));
}

// Returns a card (and extra info) for a slot, or null to skip it.
export function resolveSlot(A, idx, s, slot, random) {
  const pool = idx.pools[s.storylineId];
  const age = s.age;

  if (slot.type === "scheduled") {
    const card = pool.byId[slot.card];
    if (!card) return null;
    if (slot.unlessFlag && s.flags.includes(slot.unlessFlag)) return null;
    if (!requiresOk(s, card)) return null;
    return { card, origin: slot.origin };
  }

  if (slot.type === "lesson") {
    if (s.lessonCards[slot.lesson]) return null;
    const variants = pool.lessonVariants[slot.lesson] ?? [];
    const atAge = variants.filter((c) => fits(c, age));
    const eligible = atAge.filter((c) => requiresOk(s, c));
    // Coverage beats flags: if no variant's requirements hold, any variant for this age is used.
    const list = eligible.length ? eligible : atAge.length ? atAge : variants;
    if (!list.length) return null;
    return { card: random.weighted(list) };
  }

  if (slot.type === "crossroads") {
    const variants = pool.crossroads[slot.group] ?? [];
    const eligible = variants.filter((c) => fits(c, age) && requiresOk(s, c) && notDrawn(s, c));
    if (eligible.length) return { card: random.weighted(eligible) };
    // Not possible this year: try again next year while the crossroads' range lasts.
    const hi = Math.max(...variants.map((c) => c.ages[1]));
    if (age + 1 <= Math.min(hi, END_AGE) && !s.drawnGroups.includes(slot.group)) s.plan.crossroads[slot.group] = age + 1;
    return null;
  }

  if (slot.type === "filler") {
    const eligible = pool.fillers.filter((c) => {
      if (!fits(c, age) || !notDrawn(s, c) || !requiresOk(s, c)) return false;
      if (c.kind === "teachback") return ["seen", "missed"].includes(s.lessons[c.lesson]);
      return true;
    });
    if (!eligible.length) return null;
    const weight = (c) =>
      (c.weight ?? 1) * (c.kind === "teachback" && s.lessons[c.lesson] === "missed" ? A.teachbackMissedWeight : 1);
    return { card: random.weighted(eligible, weight) };
  }

  if (slot.type === "crisis") {
    const list = crisisCandidates(idx, s, slot.key).filter((c) => notDrawn(s, c) || c.repeatable !== false);
    if (!list.length) return null;
    return { card: random.weighted(list), crisisFlag: `crisis_${slot.key}` };
  }

  return null;
}
