// The dev menu must reach every mission and every scene of the story, including ones added later.
import test from "node:test";
import assert from "node:assert/strict";
import { createLife, step } from "../gameAdapter.js";
import { cheats, finishMission, jumpToMission, jumpToNode, playToEnding, storyMap } from "./devTools.js";

const make = () => step(createLife({ storylineId: "village", goalId: "house", seed: "dev", playerName: "", mode: "story", avatar: "boy" }), { type: "ADVANCE" });

test("jumps to the start of every mission", () => {
  for (const m of storyMap()) {
    const r = jumpToMission(null, m.index, make);
    assert.ok(r.ok, `${m.id}: ${r.error}`);
    assert.equal(r.life.story.mission, m.index);
    assert.equal(r.life.phase, "budget");
  }
});

test("jumps to every scene and opens it", () => {
  for (const m of storyMap())
    for (const n of m.nodes.filter((x) => !x.outcome)) {
      const r = jumpToNode(null, n.id, make);
      assert.ok(r.ok, `${n.id}: ${r.error}`);
      assert.equal(r.life.story.node, n.id);
    }
});

test("jumps forward from the current life, and back with a fresh one", () => {
  const map = storyMap();
  const late = map[map.length - 1].nodes.find((n) => !n.outcome);
  const early = map[0].nodes[0];
  const a = jumpToNode(make(), late.id, make);
  assert.ok(a.ok, a.error);
  const b = jumpToNode(a.life, early.id, make);
  assert.ok(b.ok, b.error);
  assert.equal(b.life.story.mission, 0);
});

test("finishes a mission and plays to the ending", () => {
  const r = finishMission(make());
  assert.ok(r.ok, r.error);
  assert.equal(r.life.phase, "chapterEnd");
  const end = playToEnding(r.life);
  assert.ok(end.ok, end.error);
  assert.equal(end.life.phase, "ending");
});

test("cheats edit a copy", () => {
  const life = make();
  const rich = cheats.cash(life, 10000);
  assert.equal(rich.money.cash, life.money.cash + 10000);
  assert.ok(cheats.phone(life).flags.includes("owns_phone"));
  assert.ok(!life.flags.includes("owns_phone"));
});
