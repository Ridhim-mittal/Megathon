// "What if…?" keeps only the decisions where another choice changes the life a lot.
import test from "node:test";
import assert from "node:assert/strict";
import { createLife, select, step } from "./gameAdapter.js";
import { playToEnding } from "./dev/devTools.js";
import { BIG, agreesWithQuality, findTurningPoints, turningPointSearch } from "./turningPoints.js";

const lived = (seed) => playToEnding(step(createLife({ storylineId: "village", goalId: "house", seed, playerName: "", mode: "story", avatar: "boy" }), { type: "ADVANCE" })).life;

test("keeps only big turning points, at most five, in life order", () => {
  for (const seed of ["a", "demo"]) {
    const life = lived(seed);
    const all = select.timeline(life).filter((d) => d.alternatives.length).length;
    const points = findTurningPoints(life);
    assert.ok(points.length <= 5, `${seed}: ${points.length}`);
    assert.ok(points.length < all, `${seed}: ${points.length} of ${all} decisions`);
    for (const p of points) {
      for (const o of p.options) assert.ok(o.endingChanged || o.storyChanged || Math.abs(o.dream) >= BIG.dream || Math.abs(o.nw) >= BIG.netWorth, `${seed} ${p.cardId}/${o.id}`);
      assert.equal(p.top, p.options[0]);
      for (const o of p.options) assert.ok(agreesWithQuality(p, o), `${seed} ${p.cardId}/${o.id} contradicts the choices' quality`);
    }
    assert.deepEqual(points.map((p) => p.index), [...points.map((p) => p.index)].sort((x, y) => x - y));
  }
});

test("searches step by step and skips locked choices", () => {
  const search = turningPointSearch(lived("b"));
  let calls = 0;
  while (!search.step(5)) calls += 1;
  assert.ok(calls > 3);
  assert.equal(search.done, search.total);
  assert.ok(search.result().every((p) => p.options.every((o) => o.parallel?.phase === "ending")));
});

test("a wiser choice is never shown as costing money", () => {
  // m1_trap: "invest_fund" is bad, "ask_name" is good (src/content/story/school.json).
  const d = { cardId: "m1_trap", chosen: { id: "invest_fund" } };
  assert.equal(agreesWithQuality(d, { id: "ask_name", nw: -900000 }), false);
  assert.equal(agreesWithQuality(d, { id: "ask_name", nw: 900000 }), true);
});
