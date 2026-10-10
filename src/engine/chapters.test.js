import test from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "./engine.js";
import { CHAPTERS } from "./locations.js";
import { CURRICULUM, ENDINGS, GOALS } from "./curriculum.js";
import { netWorth, sumFlows } from "./money.js";
import { makeRandom } from "./rng.js";
import { fixtureContent } from "./__fixtures__/content.js";
import { findNonFinite } from "./__fixtures__/players.js";

const E = createEngine(fixtureContent);

// A random player on the map: visits places in any order, sometimes trades, skips optional events.
function playChapters(params, seed, { trade = true } = {}) {
  const r = makeRandom({ rng: seed });
  let s = E.createLife({ ...params, mode: "chapters" });
  const act = (action) => {
    const next = E.step(s, action);
    if (next.error) return next.error;
    assert.equal(netWorth(next), sumFlows(next.flows), `conservation after ${action.type}`);
    s = next;
    return null;
  };
  for (let n = 0; s.phase !== "ending"; n++) {
    assert.ok(n < 2000, "life does not end");
    if (s.phase === "map") {
      const m = E.select.market(s);
      if (trade && m.unlocked && s.money.cash > 3000 && r() < 0.3) act({ type: "TRADE", product: r.pick([...m.funds, ...m.stocks]).id, amount: 1000 });
      const locs = E.select.locations(s);
      const pending = locs.filter((l) => l.pending);
      if (!locs.some((l) => l.required) && (r() < 0.5 || !pending.length)) {
        assert.equal(act({ type: "END_CHAPTER" }), null);
        continue;
      }
      const loc = r.pick(pending);
      assert.equal(act({ type: "VISIT", location: loc.id }), null, `visit ${loc.id}`);
    } else if (s.phase === "card") act({ type: "CHOOSE", choiceId: r.pick(E.select.currentCard(s).choices).id });
    else assert.equal(act({ type: "ADVANCE" }), null, `advance from ${s.phase}`);
  }
  return s;
}

test("chapter mode: 60 random lives finish at 36 with every lesson inside its window", () => {
  for (let i = 0; i < 60; i++) {
    const s = playChapters({ storylineId: "village", goalId: GOALS[i % GOALS.length], seed: 4000 + i, playerName: "P" }, i + 1);
    assert.equal(findNonFinite(s), null, `life ${i}: ${findNonFinite(s)}`);
    assert.equal(s.age, 36, `life ${i}`);
    assert.equal(s.years.length, 26, `life ${i}`);
    assert.equal(s.chapterLog.length, CHAPTERS.length, `life ${i}`);
    assert.ok(ENDINGS.includes(s.ending.id), `life ${i}: ${s.ending.id}`);
    for (const lesson of CURRICULUM) {
      const drawn = s.history.find((h) => h.kind === "lesson" && h.lesson === lesson.id);
      assert.ok(drawn, `life ${i}: ${lesson.id} never drawn`);
      assert.ok(drawn.age >= lesson.ages[0] && drawn.age <= lesson.ages[1], `life ${i}: ${lesson.id} at ${drawn.age}`);
    }
  }
});

test("chapter mode: a short game, about 30–45 decisions", () => {
  for (let i = 0; i < 10; i++) {
    const s = playChapters({ storylineId: "village", goalId: "house", seed: 5000 + i }, i + 1, { trade: false });
    assert.ok(s.history.length >= 25 && s.history.length <= 50, `life ${i}: ${s.history.length} decisions`);
  }
});

test("chapter mode: VISIT only works where an event waits, END_CHAPTER only when required events are done", () => {
  let s = E.createLife({ storylineId: "village", goalId: "house", seed: "chapters", mode: "chapters" });
  s = E.step(s, { type: "ADVANCE" });
  assert.equal(s.phase, "budget");
  s = E.step(s, { type: "SET_BUDGET", jars: { ...s.budget } });
  if (s.phase !== "map") s = E.step(s, { type: "ADVANCE" });
  assert.equal(s.phase, "map");
  const chapter = E.select.chapter(s);
  assert.equal(chapter.id, "child");
  assert.ok(chapter.requiredLeft > 0);
  assert.ok(E.step(s, { type: "END_CHAPTER" }).error, "cannot end with required events left");
  const empty = E.select.locations(s).find((l) => !l.pending && l.id !== "phone");
  assert.ok(E.step(s, { type: "VISIT", location: empty.id }).error, "nothing waits there");
  const place = E.select.locations(s).find((l) => l.pending);
  const next = E.step(s, { type: "VISIT", location: place.id });
  assert.ok(!next.error);
  assert.ok(["card", "minigame"].includes(next.phase));
});

test("chapter mode: the phone arrives with the first job and unlocks the market at 18+", () => {
  let s = E.createLife({ storylineId: "village", goalId: "house", seed: "phone", mode: "chapters" });
  const r = makeRandom({ rng: 3 });
  let sawLocked = false;
  while (s.phase !== "ending") {
    const hud = E.select.hud(s);
    if (s.phase === "map") {
      const m = E.select.market(s);
      if (s.age < 18) {
        assert.equal(m.unlocked, false);
        assert.ok(E.step(s, { type: "TRADE", product: "sip_index", amount: 500 }).error);
        sawLocked = true;
      }
      if (s.chapter.id === "young") {
        assert.equal(hud.hasPhone, true);
        if (s.money.cash > 2000 && !m.lastTrade) {
          const t = E.step(s, { type: "TRADE", product: "sip_index", amount: 1000 });
          assert.ok(!t.error);
          assert.equal(netWorth(t), sumFlows(t.flows));
          s = t;
          continue;
        }
      }
      const locs = E.select.locations(s);
      if (!locs.some((l) => l.required)) s = E.step(s, { type: "END_CHAPTER" });
      else s = E.step(s, { type: "VISIT", location: r.pick(locs.filter((l) => l.required)).id });
    } else if (s.phase === "card") s = E.step(s, { type: "CHOOSE", choiceId: E.select.currentCard(s).choices[0].id });
    else s = E.step(s, { type: "ADVANCE" });
    assert.ok(!s.error, s.error?.message);
  }
  assert.ok(sawLocked);
  assert.ok(s.flags.includes("owns_phone"));
});

test("chapter mode: the same seed and actions give the same life", () => {
  const a = playChapters({ storylineId: "village", goalId: "business", seed: "same" }, 9);
  const b = playChapters({ storylineId: "village", goalId: "business", seed: "same" }, 9);
  assert.deepEqual(a.ending, b.ending);
  assert.equal(netWorth(a), netWorth(b));
});
