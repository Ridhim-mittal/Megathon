import test from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "./engine.js";
import { fixtureContent } from "./__fixtures__/content.js";
import { assertConserved, playLife } from "./__fixtures__/players.js";

const E = createEngine(fixtureContent);
const params = { storylineId: "village", goalId: "business", seed: 2024, playerName: "Arjun" };

// The parallel life's own action log records what the autopilot pressed (ADVANCE where the
// player pressed SKIP_SHOP), so compare everything else.
const strip = (s) => {
  const { parallel, log, ...rest } = s;
  return rest;
};

test("replaying a decision with the same choice gives the very same life", () => {
  const original = playLife(E, params, { seed: 5 });
  for (const i of [0, 7, Math.floor(original.history.length / 2), original.history.length - 1]) {
    const same = E.replay(original, { decisionIndex: i, choiceId: original.history[i].choiceId });
    assert.deepEqual(strip(same), strip(original), `decision ${i}`);
    assert.equal(same.log.length, original.log.length);
  }
});

test("replay only diverges from the changed decision", () => {
  const original = playLife(E, params, { seed: 11 });
  let tried = 0;
  for (const h of original.history) {
    const other = h.choices.find((c) => c !== h.choiceId);
    if (!other) continue;
    tried += 1;
    const parallel = E.replay(original, { decisionIndex: h.index, choiceId: other });
    // Identical before the decision.
    assert.deepEqual(parallel.history.slice(0, h.index), original.history.slice(0, h.index));
    assert.deepEqual(parallel.years.filter((y) => y.age < h.age), original.years.filter((y) => y.age < h.age));
    // The decision itself changed.
    assert.equal(parallel.history[h.index].cardId, h.cardId);
    assert.equal(parallel.history[h.index].choiceId, other);
    // Same world luck, and a finished life.
    assert.deepEqual(parallel.world, original.world);
    assert.equal(parallel.phase, "ending");
    assert.equal(parallel.age, 36);
    assertConserved(parallel);
    // Cards that still appear keep the original choice (or their default).
    const originalChoice = new Map(original.history.map((x) => [x.cardId, x.choiceId]));
    for (const p of parallel.history.slice(h.index + 1)) {
      const want = originalChoice.get(p.cardId);
      if (want && p.choices.includes(want)) assert.equal(p.choiceId, want, `${p.cardId} kept its choice`);
    }
    const cmp = E.select.compare(original, parallel);
    assert.equal(cmp.firstDifferentDecision, h.index);
    assert.equal(cmp.changed.choiceId, other);
    assert.ok(typeof cmp.parallel.netWorth === "number" && cmp.original.ending && cmp.parallel.ending);
    if (tried >= 12) break;
  }
  assert.ok(tried > 0);
});

test("a different choice can change the ending numbers (cause and effect)", () => {
  const original = playLife(E, params, { seed: 3, choose: (s, card) => card.choices[0].id });
  const differences = original.history
    .filter((h) => h.choices.length > 1)
    .slice(0, 15)
    .map((h) => {
      const p = E.replay(original, { decisionIndex: h.index, choiceId: h.choices.find((c) => c !== h.choiceId) });
      return E.select.hud(p).netWorth - E.select.hud(original).netWorth;
    });
  assert.ok(differences.some((d) => d !== 0));
});

test("replay rejects unknown decisions and choices", () => {
  const original = playLife(E, params, { seed: 8 });
  assert.throws(() => E.replay(original, { decisionIndex: 9999, choiceId: "x" }));
  assert.throws(() => E.replay(original, { decisionIndex: 0, choiceId: "not-a-choice" }));
});
