import test from "node:test";
import assert from "node:assert/strict";
import { FIELD, GAMES, SNOWBALL, SNOW_TRAPS, createGame, gameAtPlace, laneY, result, stepGame } from "./games.js";

function rng(seed = 1) {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// Run a game to the end with a simple "player"; returns its final state.
function play(id, policy, seed = 1) {
  const s = createGame(id, rng(seed));
  for (let i = 0; i < 20000; i++) if (stepGame(s, 1 / 60, policy(s))) return s;
  throw new Error("game never ended");
}

test("every game ends on time and gives a finite score", () => {
  for (const g of GAMES.filter((x) => x.seconds)) {
    const s = play(g.id, () => ({}));
    assert.ok(Number.isFinite(result(s).score), g.id);
    assert.ok(s.time <= g.seconds + 0.06, g.id);
  }
  assert.equal(gameAtPlace("bank").id, "snowball");
  assert.equal(gameAtPlace("hospital"), null);
});

test("jar dash: chasing coins beats standing still, and impulse buys cost money", () => {
  const idle = result(play("jarDash", () => ({}), 3));
  const chase = result(
    play("jarDash", (s) => {
      const coin = s.items.filter((i) => i.value > 0).sort((a, b) => b.y - a.y)[0];
      return coin ? { pointerX: coin.x } : {};
    }, 3),
  );
  assert.ok(chase.score > idle.score, `${chase.score} > ${idle.score}`);
  assert.ok(chase.caught > 0);
  const s = createGame("jarDash", rng(2));
  s.items = [{ x: s.jar.x, y: FIELD.h - 46 + 2, vy: 10, value: -10, kind: "toy" }];
  s.score = 30;
  stepGame(s, 0.02, {});
  assert.equal(s.score, 20);
  assert.equal(s.spent, 10);
});

test("scam smash: blocking scams scores, missing them costs hearts", () => {
  const smart = play("scamSmash", (s) => ({ taps: s.slots.map((m, i) => (m?.scam ? i : -1)).filter((i) => i >= 0) }), 4);
  assert.equal(smart.hearts, 3);
  assert.ok(result(smart).blocked > 10);
  const lazy = play("scamSmash", () => ({}), 4);
  assert.equal(lazy.hearts, 0, "three scams got through");
  const trigger = play("scamSmash", (s) => ({ taps: s.slots.map((m, i) => (m ? i : -1)).filter((i) => i >= 0) }), 4);
  assert.ok(result(trigger).mistakes > 0, "blocking everything also blocks real messages");
  assert.ok(result(trigger).score < result(smart).score);
});

test("snowball: interest grows on what the ball holds, and SALE signs cut a third", () => {
  const s = createGame("snowball", rng(5));
  s.spawnIn = 999;
  for (let i = 0; i < 61; i++) stepGame(s, 1 / 60, {});
  assert.equal(s.value, SNOWBALL.start + Math.round(SNOWBALL.start * SNOWBALL.rate));
  s.things = [{ x: 82, lane: s.lane, kind: "sale", value: 0 }];
  const before = s.value;
  stepGame(s, 1 / 60, {});
  assert.equal(s.value, before - Math.round(before / 3));
  assert.equal(laneY(0) < laneY(2), true);
  const dodge = result(
    play("snowball", (st) => {
      const near = st.things.filter((t) => t.x > 60 && t.x < 200);
      const bad = new Set(near.filter((t) => SNOW_TRAPS[t.kind]).map((t) => t.lane));
      const good = near.find((t) => t.kind === "coin" && !bad.has(t.lane));
      const target = good ? good.lane : [0, 1, 2].find((l) => !bad.has(l)) ?? st.lane;
      return { up: target < st.lane, down: target > st.lane };
    }, 6),
  );
  assert.ok(dodge.interest > 0 && dodge.score > SNOWBALL.start);
});

test("snowball: the insurance umbrella blocks the next trap; a late fee is flat", () => {
  const s = createGame("snowball", rng(7));
  s.spawnIn = 999;
  s.tickIn = 999;
  s.things = [{ x: 82, lane: s.lane, kind: "shield", value: 0 }];
  stepGame(s, 1 / 60, {});
  assert.ok(s.shield > 0);
  const before = s.value;
  s.things = [{ x: 82, lane: s.lane, kind: "scam", value: 0 }];
  stepGame(s, 1 / 60, {});
  assert.equal(s.value, before, "the umbrella took the hit");
  assert.equal(s.shielded, 1);
  s.things = [{ x: 82, lane: s.lane, kind: "fee", value: 0 }];
  stepGame(s, 1 / 60, {});
  assert.equal(s.value, before - SNOW_TRAPS.fee.flat);
});
