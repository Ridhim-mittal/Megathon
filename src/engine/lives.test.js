import test from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "./engine.js";
import { CURRICULUM, ENDINGS, GOALS } from "./curriculum.js";
import { fixtureContent } from "./__fixtures__/content.js";
import { findNonFinite, playLife } from "./__fixtures__/players.js";

const E = createEngine(fixtureContent);

test("300 random lives: no NaN, money conserved, an ending at 36, every lesson inside its window", () => {
  const endings = new Map();
  for (let i = 0; i < 300; i++) {
    const params = { storylineId: "village", goalId: GOALS[i % GOALS.length], seed: 1000 + i, playerName: "P" };
    const s = playLife(E, params, { seed: i * 7919 + 1, checkEveryStep: true });

    assert.equal(findNonFinite(s), null, `life ${i}: ${findNonFinite(s)}`);
    assert.equal(s.phase, "ending", `life ${i}`);
    assert.equal(s.age, 36, `life ${i}`);
    assert.equal(s.years.length, 26, `life ${i}`);
    assert.ok(ENDINGS.includes(s.ending.id), `life ${i}: ${s.ending.id}`);
    endings.set(s.ending.id, (endings.get(s.ending.id) ?? 0) + 1);

    for (const lesson of CURRICULUM) {
      const drawn = s.history.find((h) => h.kind === "lesson" && h.lesson === lesson.id);
      assert.ok(drawn, `life ${i}: ${lesson.id} never drawn`);
      assert.ok(drawn.age >= lesson.ages[0] && drawn.age <= lesson.ages[1], `life ${i}: ${lesson.id} at ${drawn.age}`);
      assert.notEqual(s.lessons[lesson.id], "unseen", `life ${i}: ${lesson.id}`);
    }
    assert.equal(s.history.filter((h) => h.kind === "crossroads").length, 3, `life ${i}: crossroads`);
    for (const m of Object.values(s.meters)) assert.ok(m >= 0 && m <= 100);
    assert.ok(s.money.cash >= 0 && s.money.wallet >= 0 && s.money.jars.emergency >= 0 && s.money.jars.goal >= 0);
    for (const l of s.loans) assert.ok(l.balance >= 0 && l.feeDue >= 0);
  }
  // Random play should not funnel every life into one ending.
  assert.ok(endings.size >= 3, JSON.stringify([...endings]));
});
