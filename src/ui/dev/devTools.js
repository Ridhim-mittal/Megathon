// Developer tools: skip ahead in a story life without playing every scene. No React, no DOM, so
// it can be tested. Everything is read from the content and the engine at call time, so new
// missions, scenes and story files show up here without changing this file.
//
//   storyMap()                      every mission with its scenes, in story order
//   jumpToMission(life, i, make)    a life standing at the start of mission i
//   jumpToNode(life, nodeId, make)  a life with that scene open (or as the objective)
//   playOne(life) / finishMission(life) / playToEnding(life)
//   cheats.*                        small state edits (cash, meters, glasses, phone, …)

import { ASSUMPTIONS, content, select, step } from "../gameAdapter.js";

const LIMIT = 4000; // actions; a whole life is well under this

// ---------- the story, as data ----------

const missions = () => content.story?.missions ?? [];
const targetsOf = (next) => (typeof next === "string" ? [next] : (next ?? []).map((r) => r.to)).filter(Boolean);

// [{ index, id, title, from, to, nodes: [{ id, age, location, lesson, title, outcome, tone }] }]
export function storyMap() {
  return missions().map((m, index) => ({
    index,
    id: m.id,
    title: m.title,
    from: m.from,
    to: m.to,
    nodes: (m.nodes ?? []).map((n) => ({ id: n.id, age: n.age ?? null, location: n.location ?? null, lesson: n.lesson ?? null, title: n.title, outcome: n.type === "outcome", tone: n.tone ?? null })),
  }));
}

// The scene that offers a choice (choice ids are unique across the story), or null.
export function sceneOfChoice(choiceId) {
  for (const m of missions()) for (const n of m.nodes ?? []) if ((n.choices ?? []).some((c) => c.id === choiceId)) return n.id;
  return null;
}

function findNode(nodeId) {
  for (const [index, m] of missions().entries()) {
    const n = (m.nodes ?? []).find((x) => x.id === nodeId);
    if (n) return { mission: m, index, node: n };
  }
  return null;
}

// Steps from each scene of a mission to `target` (a reverse breadth-first search over every
// choice and every rush failure). Scenes that cannot reach it are missing from the map.
function distancesTo(mission, target) {
  const back = {};
  for (const n of mission.nodes ?? []) {
    const outs = [...(n.choices ?? []).flatMap((c) => targetsOf(c.next)), ...(n.rush?.fail ? [n.rush.fail] : [])];
    for (const t of outs) (back[t] ??= []).push(n.id);
  }
  const dist = { [target]: 0 };
  const queue = [target];
  while (queue.length) {
    const id = queue.shift();
    for (const p of back[id] ?? []) {
      if (dist[p] == null) {
        dist[p] = dist[id] + 1;
        queue.push(p);
      }
    }
  }
  return dist;
}

// ---------- playing for the player ----------

const storyOf = (s) => (s?.mode === "story" ? select.story(s) : null);
const missionIndex = (s) => s?.story?.mission ?? -1;

// One action that moves the life on: the default (or first open) choice, the objective's place,
// the suggested budget.
function nextAction(s) {
  switch (s.phase) {
    case "map": {
      if (s.mode === "story") {
        const obj = storyOf(s)?.objective;
        return obj ? { type: "VISIT", location: obj.location } : null;
      }
      const ch = select.chapter(s);
      if (ch?.canEnd) return { type: "END_CHAPTER" };
      const spot = select.locations(s).find((l) => l.unlocked && l.pending);
      return spot ? { type: "VISIT", location: spot.id } : null;
    }
    case "card": {
      const card = select.currentCard(s);
      const open = (card?.choices ?? []).filter((c) => !c.locked);
      const c = open.find((x) => x.default) ?? open[0];
      return c ? { type: "CHOOSE", choiceId: c.id, ignoredWarning: true } : null;
    }
    case "minigame":
      return { type: "MINIGAME_RESULT", id: select.minigame(s)?.id ?? "sahukar", score: 0 };
    case "ending":
      return null;
    default:
      return { type: "ADVANCE" };
  }
}

// Plays until done(s) is true. Returns { life, ok, steps, error }.
function playUntil(s, done) {
  let steps = 0;
  while (!done(s)) {
    if (steps++ > LIMIT) return { life: s, ok: false, steps, error: "Gave up after too many steps." };
    const a = nextAction(s);
    if (!a) return { life: s, ok: false, steps, error: `Stuck in phase "${s.phase}".` };
    const next = step(s, a);
    if (next.error) return { life: s, ok: false, steps, error: next.error.message };
    s = next;
  }
  return { life: s, ok: true, steps, error: null };
}

export function playOne(s) {
  const a = nextAction(s);
  if (!a) return { life: s, ok: false, error: `Nothing to do in phase "${s.phase}".` };
  const next = step(s, a);
  return next.error ? { life: s, ok: false, error: next.error.message } : { life: next, ok: true, error: null, action: a };
}

// To the end of the current mission (its summary screen), or the next chapter in map mode.
export function finishMission(s) {
  if (s.phase === "chapterEnd") s = playOne(s).life;
  const at = s.mode === "story" ? missionIndex(s) : s.chapter?.id;
  return playUntil(s, (x) => x.phase === "ending" || (x.phase === "chapterEnd" && (x.mode === "story" ? missionIndex(x) === at : x.chapter?.id === at)));
}

export const playToEnding = (s) => playUntil(s, (x) => x.phase === "ending");

// `make()` returns a fresh life already past its intro (phase budget, mission 0).
export function jumpToMission(life, index, make) {
  const usable = life?.mode === "story" && life.phase !== "ending" && (missionIndex(life) < index || (missionIndex(life) === index && life.phase === "budget"));
  const start = usable ? life : make();
  return playUntil(start, (x) => x.phase === "ending" || (missionIndex(x) === index && x.phase === "budget"));
}

// Plays toward a scene, picking at every card the choice that gets closest to it (and letting a
// rush run out when that is the only way). Starts from `life` when the scene is still ahead of
// it, else from a fresh life. With `open`, the scene's card is shown on arrival.
export function jumpToNode(life, nodeId, make, { open = true } = {}) {
  const found = findNode(nodeId);
  if (!found) return { life, ok: false, error: `No scene "${nodeId}".` };
  const { index, mission, node } = found;
  if (node.type === "outcome") return { life, ok: false, error: "Outcomes end a mission; jump to a scene before it." };
  const dist = distancesTo(mission, nodeId);
  const ahead = (s) => s?.mode === "story" && s.phase !== "ending" && (missionIndex(s) < index || (missionIndex(s) === index && (s.story.node == null ? s.phase === "budget" : dist[s.story.node] != null)));

  let r = jumpToMission(ahead(life) ? life : null, index, make);
  if (!r.ok && !ahead(life)) return r;
  if (missionIndex(r.life) !== index) r = jumpToMission(null, index, make);
  if (!r.ok) return r;

  const reached = routeTo(r.life, mission, index, nodeId, dist);
  if (!reached) return { life: r.life, ok: false, error: `Could not route to "${nodeId}" (no choices on the way meet its conditions).` };
  if (open && reached.phase === "map") {
    const next = step(reached, { type: "VISIT", location: node.location });
    if (!next.error) return { life: next, ok: true, error: null };
  }
  return { life: reached, ok: true, error: null };
}

// Depth-first: at every card try the choices that lead closest to the target first, and back up
// when a lock or a flag-dependent route sends the story elsewhere. Rush scenes try both arriving
// in time and letting the clock run out. Missions are short, so this stays small.
function routeTo(start, mission, index, nodeId, dist) {
  const byId = Object.fromEntries((mission.nodes ?? []).map((n) => [n.id, n]));
  const nearest = (next) => Math.min(...targetsOf(next).map((t) => dist[t] ?? Infinity));
  const here = (x) => x.story?.node === nodeId && (x.phase === "map" || (x.phase === "card" && x.current?.cardId === nodeId));
  const off = (x) => x.phase === "ending" || x.phase === "chapterEnd" || missionIndex(x) !== index;
  let budget = LIMIT;

  const go = (s) => {
    while (budget-- > 0) {
      if (here(s)) return s;
      if (off(s)) return null;
      let options = null;
      if (s.phase === "card") {
        const n = byId[s.current?.cardId];
        const listed = select.currentCard(s)?.choices ?? [];
        // Hidden choices (a timer's timeout) are not on the card but can be chosen.
        const pool = (n?.choices ?? []).filter((c) => listed.some((o) => o.id === c.id && !o.locked) || (c.hidden && !c.requires));
        options = pool
          .map((c) => ({ d: nearest(c.next), a: { type: "CHOOSE", choiceId: c.id, ignoredWarning: true } }))
          .filter((o) => o.d < Infinity)
          .sort((p, q) => p.d - q.d);
      } else if (s.phase === "map" && byId[s.story?.node]?.rush?.fail) {
        const n = byId[s.story.node];
        options = [
          { d: Math.min(...(n.choices ?? []).map((c) => nearest(c.next))), a: nextAction(s) },
          { d: dist[n.rush.fail] ?? Infinity, a: { type: "STORY_TIMEOUT" } },
        ]
          .filter((o) => o.d < Infinity && o.a)
          .sort((p, q) => p.d - q.d);
      }
      if (options) {
        for (const o of options) {
          const next = step(s, o.a);
          if (next.error) continue;
          const found = go(next);
          if (found) return found;
        }
        return null;
      }
      const a = nextAction(s);
      if (!a) return null;
      const next = step(s, a);
      if (next.error) return null;
      s = next;
    }
    return null;
  };
  return go(start);
}

// ---------- cheats: plain state edits (a clone; the engine state stays serializable) ----------

const edit = (life, fn) => {
  const s = structuredClone(life);
  fn(s);
  s.error = null;
  return s;
};

export const cheats = {
  cash: (life, amount) => edit(life, (s) => (s.money.cash = Math.max(0, Math.round(s.money.cash + amount)))),
  jar: (life, jar, amount) => edit(life, (s) => (s.money.jars[jar] = Math.max(0, Math.round((s.money.jars[jar] ?? 0) + amount)))),
  meters: (life, value) => edit(life, (s) => Object.keys(s.meters).forEach((k) => (s.meters[k] = value))),
  glasses: (life, n) => edit(life, (s) => (s.glasses.charges += n)),
  flag: (life, flag, on = true) =>
    edit(life, (s) => {
      s.flags = s.flags.filter((f) => f !== flag);
      if (on) s.flags.push(flag);
    }),
  phone: (life) => cheats.flag(life, ASSUMPTIONS.chapters?.phoneFlag ?? "owns_phone"),
  clearDebt: (life) => edit(life, (s) => (s.loans = [])),
};

// A short line about where the life stands, for the menu's header.
export function whereAmI(life) {
  if (!life) return "no life";
  const st = storyOf(life);
  const bits = [`age ${life.age}`, life.phase];
  if (st) bits.push(st.mission.id, life.story.node ?? "—");
  else if (life.chapter) bits.push(life.chapter.id);
  return bits.join(" · ");
}
