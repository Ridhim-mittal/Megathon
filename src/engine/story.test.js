import test from "node:test";
import assert from "node:assert/strict";
import * as content from "../content/index.js";
import { createEngine } from "./engine.js";
import { netWorth, sumFlows } from "./money.js";
import { makeRandom } from "./rng.js";
import { flowchartOf, indexStory, validateStory } from "./story.js";

const E = createEngine(content);
const missions = content.story.missions;
const raw = Object.fromEntries(missions.flatMap((m) => m.nodes.map((n) => [n.id, n])));

// A random player: walks to each objective, sometimes misses a timed one, picks any open choice.
function playStory(seed, { pick = null, lateChance = 0.3, goalId = "house" } = {}) {
  const r = makeRandom({ rng: seed });
  let s = E.createLife({ storylineId: "village", goalId, seed, mode: "story" });
  for (let n = 0; s.phase !== "ending"; n++) {
    assert.ok(n < 3000, "life does not end");
    let a = { type: "ADVANCE" };
    if (s.phase === "map") {
      const o = E.select.story(s).objective;
      a = o.rush && r() < lateChance ? { type: "STORY_TIMEOUT" } : { type: "VISIT", location: o.location };
    } else if (s.phase === "card") {
      const open = E.select.currentCard(s).choices.filter((c) => !c.locked);
      const choice = (pick && pick(s, open, r)) ?? r.pick(open);
      a = { type: "CHOOSE", choiceId: choice.id, ignoredWarning: Boolean(choice.warn) };
    }
    const next = E.step(s, a);
    assert.equal(next.error, null, `${s.phase} ${JSON.stringify(a)}: ${next.error?.message}`);
    assert.equal(netWorth(next), sumFlows(next.flows), `conservation after ${a.type}`);
    s = next;
  }
  return s;
}

test("story content is valid", () => {
  const documents = Object.fromEntries(content.documents.map((d) => [d.id, d]));
  const { errors, warnings } = validateStory(content.story, { documents });
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("story mode: 150 random lives reach 36 with a story ending, and every node is reachable", () => {
  const visited = new Set();
  for (let i = 0; i < 150; i++) {
    const s = playStory(i + 1, { goalId: ["house", "business", "education", "vehicle", "parents"][i % 5] });
    assert.equal(s.age, 36);
    assert.equal(s.years.length, 26);
    assert.equal(s.chapterLog.length, missions.length);
    assert.ok(s.ending.story?.id, `life ${i} has no story ending`);
    assert.equal(raw[s.ending.story.id].type, "outcome");
    for (const m of missions) assert.ok(s.story.outcomes[m.id], `life ${i}: ${m.id} has no outcome`);
    s.story.visited.forEach((id) => visited.add(id));
  }
  // `end_debt` needs a true debt trap at 36, which random play rarely builds.
  const missing = Object.keys(raw).filter((id) => !visited.has(id) && id !== "end_debt");
  assert.deepEqual(missing, []);
});

test("story mode: a life is short (about 20–35 scenes)", () => {
  for (let i = 0; i < 20; i++) {
    const s = playStory(500 + i);
    assert.ok(s.history.length >= 18 && s.history.length <= 36, `${s.history.length} scenes`);
  }
});

test("story mode: careful players catch the scammer and reach the dream; reckless ones don't", () => {
  const byQuality = (want) => (s, open, r) => {
    const card = E.select.currentCard(s);
    const pool = open.filter((c) => want.includes(raw[card.id].choices.find((x) => x.id === c.id).quality));
    return pool.length ? r.pick(pool) : null;
  };
  const good = Array.from({ length: 10 }, (_, i) => playStory(900 + i, { pick: byQuality(["good"]), lateChance: 0, goalId: "education" }));
  assert.ok(good.every((s) => ["end_buster", "end_dream", "end_quiet"].includes(s.ending.story.id)));
  assert.ok(good.filter((s) => s.ending.story.id === "end_buster").length >= 3);
  const bad = Array.from({ length: 10 }, (_, i) => playStory(900 + i, { pick: byQuality(["bad"]), goalId: "education" }));
  assert.ok(bad.every((s) => raw[s.ending.story.id].tone !== "good"));
});

test("story mode: VISIT works only at the objective; locked choices can't be chosen", () => {
  let s = E.createLife({ storylineId: "village", goalId: "house", seed: "locks", mode: "story" });
  s = E.step(s, { type: "ADVANCE" });
  assert.equal(s.phase, "budget");
  s = E.step(s, { type: "ADVANCE" });
  assert.equal(s.phase, "map");
  // The story opens at the jatara (needs vs wants), then the tin box at home.
  const o = E.select.story(s).objective;
  assert.equal(o.location, "square");
  assert.ok(E.step(s, { type: "VISIT", location: "bank" }).error);
  s = E.step(s, { type: "VISIT", location: "square" });
  assert.equal(s.phase, "card");
  assert.equal(E.select.currentCard(s).id, "p_jatara");

  // Jump to the trap scene with the fund in the bank: investing it is locked.
  let t = E.createLife({ storylineId: "village", goalId: "house", seed: "locks", mode: "story" });
  const want = { p_tin: "bank", p_bank: "both", p_jatara: "notebook_first", m1_treasurer: "rd", m1_call: "hang_up" };
  for (let n = 0; n < 200 && !(t.phase === "card" && t.current.cardId === "m1_trap"); n++) {
    let a = { type: "ADVANCE" };
    if (t.phase === "map") a = { type: "VISIT", location: E.select.story(t).objective.location };
    if (t.phase === "card") a = { type: "CHOOSE", choiceId: want[t.current.cardId] };
    t = E.step(t, a);
    assert.equal(t.error, null, t.error?.message);
  }
  const invest = E.select.currentCard(t).choices.find((c) => c.id === "invest_fund");
  assert.equal(invest.locked, true);
  assert.ok(invest.lockedHint?.en);
  assert.ok(invest.warn?.en);
  assert.ok(E.step(t, { type: "CHOOSE", choiceId: "invest_fund" }).error);
});

test("story mode: running out of time on a rush scene moves to its failure", () => {
  let s = E.createLife({ storylineId: "village", goalId: "house", seed: "rush", mode: "story" });
  const want = { p_tin: "steel_box", p_shop: "buy_box", p_jatara: "save_all", m1_treasurer: "tin_box", m1_trap: "walk", m1_chintu: "help", m1_call: "read_otp" };
  for (let n = 0; n < 200 && !(s.phase === "map" && s.story.node === "m1_drained"); n++) {
    let a = { type: "ADVANCE" };
    if (s.phase === "map") a = { type: "VISIT", location: E.select.story(s).objective.location };
    if (s.phase === "card") a = { type: "CHOOSE", choiceId: want[s.current.cardId] };
    s = E.step(s, a);
  }
  assert.equal(E.select.story(s).objective.rush.seconds, 22);
  s = E.step(s, { type: "STORY_TIMEOUT" });
  assert.equal(s.error, null);
  assert.equal(s.story.node, "m1_too_late");
  assert.ok(E.step(s, { type: "STORY_TIMEOUT" }).error, "only a rush scene can time out");
});

test("story mode: same seed and choices give the same life, and Parallel Life replays", () => {
  const a = playStory(77);
  const b = playStory(77);
  assert.deepEqual(a.ending, b.ending);
  assert.deepEqual(a.story.path, b.story.path);
  const d = a.history.findIndex((h) => raw[h.cardId]?.choices.filter((c) => !c.hidden && !c.requires).length > 1);
  const other = raw[a.history[d].cardId].choices.find((c) => !c.hidden && !c.requires && c.id !== a.history[d].choiceId);
  const p = E.replay(a, { decisionIndex: d, choiceId: other.id });
  assert.equal(p.phase, "ending");
  assert.equal(p.age, 36);
  assert.ok(p.ending.story);
});

test("the flowchart lays out every node of a mission and marks the path taken", () => {
  const s = playStory(5);
  const story = indexStory(content);
  for (const m of missions) {
    const f = flowchartOf(story, s, m.id);
    assert.equal(f.nodes.length, m.nodes.length);
    assert.ok(f.nodes.find((n) => n.id === m.start).depth === 0);
    const reached = f.nodes.filter((n) => n.reached);
    assert.equal(reached.length, 1);
    const outcomes = f.nodes.filter((n) => n.type === "outcome");
    assert.ok(outcomes.every((n) => n.depth === outcomes[0].depth));
    assert.ok(f.nodes.some((n) => n.choices.some((c) => c.taken)));
    assert.ok(f.completion > 0 && f.completion <= 100);
  }
});
