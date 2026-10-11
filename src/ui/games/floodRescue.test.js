import test from "node:test";
import assert from "node:assert/strict";
import { DECOYS, ESSENTIAL, FIELD, FLOOD, createFlood, floodResult, levelAt, stepFlood } from "./floodRescue.js";

function rng(seed = 1) {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
// Plays a flood with a picker that taps the first matching item each frame.
function play({ insured, want, seed = 1, delay = 0 }) {
  const s = createFlood({ insured, rng: rng(seed) });
  for (let i = 0; i < 30 * 40; i++) {
    const it = s.time >= delay && s.items.find((x) => !x.taken && !x.lost && want(x.kind));
    if (stepFlood(s, 1 / 30, { taps: it ? [{ x: it.x, y: it.y }] : [] })) break;
  }
  return floodResult(s);
}

test("the water rises from the floor to near the ceiling", () => {
  assert.equal(levelAt(0), FIELD.h);
  assert.ok(levelAt(FLOOD.seconds / 2) < FLOOD.floor);
  assert.equal(Math.round(levelAt(FLOOD.seconds)), FLOOD.top);
});

test("without insurance there is no policy to grab and the crop money never comes back", () => {
  const s = createFlood({ insured: false, rng: rng() });
  assert.ok(!s.items.some((i) => i.kind === "policy"));
  const r = play({ insured: false, want: (k) => ESSENTIAL.includes(k) });
  assert.equal(r.claim, 0);
  assert.ok(r.lost >= FLOOD.crop);
});

test("insured, with the policy and an ID saved, the claim pays the whole crop", () => {
  const r = play({ insured: true, want: (k) => ["policy", "aadhaar", "passbook", "cash"].includes(k) });
  assert.equal(r.claim, FLOOD.crop);
  assert.equal(r.loan, 0);
  assert.equal(r.stars, 3);
  assert.ok(r.lost < FLOOD.crop / 10);
});

test("grabbing the TV and sweets fills the bag; the papers float away", () => {
  const r = play({ insured: true, want: (k) => DECOYS.includes(k) });
  assert.equal(r.decoys, FLOOD.bag);
  assert.equal(r.claim, FLOOD.crop * 0.5 * 0.6);
  assert.equal(r.loan, FLOOD.repairs);
});

test("waiting too long: low things are carried off before you can reach them", () => {
  const s = createFlood({ insured: true, rng: rng(3) });
  for (let i = 0; i < 30 * FLOOD.seconds; i++) if (stepFlood(s, 1 / 30, {})) break;
  assert.ok(s.items.some((i) => i.lost));
  assert.ok(s.items.filter((i) => i.homeY > 440).every((i) => i.lost));
  assert.equal(s.phase, "done");
});
