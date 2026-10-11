import test from "node:test";
import assert from "node:assert/strict";
import { DEFENDER, DEF_X, LANES, RULES, THIEF, WAVES, createGarden, gardenResult, invest, laneMoney, laneY, level, needsMore, spread, stepGarden } from "./sipGarden.js";

function rng(seed = 1) {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// A player that catches every coin once it lands and reports scammers once they are close.
const taps = (s) => [
  ...s.coins.filter((c) => c.y >= c.to && (c.slide == null || c.x >= c.slide)).map((c) => ({ x: c.x, y: c.y })),
  ...s.thieves.filter((t) => t.alive && t.kind === "scam" && t.x < 700).map((t) => ({ x: t.x, y: t.y - 30 })),
];
function play(policy, seed = 1) {
  const s = createGarden(rng(seed));
  const st = { n: 0 };
  for (let i = 0; i < 30 * 600; i++) {
    if (stepGarden(s, 1 / 30, policy(s, st))) return s;
    s.fx.length = 0;
  }
  throw new Error("the garden never ended");
}
const even = (s, st) => ({ taps: taps(s), invest: s.wallet >= RULES.feed ? [st.n++ % 4] : [] });
const threeLanes = (s, st) => ({ taps: taps(s), invest: s.wallet >= RULES.feed ? [st.n++ % 3] : [] });
const allEquity = (s) => ({ taps: taps(s), invest: s.wallet >= RULES.feed ? [0] : [] });
const autoSip = (s, st) => {
  const out = { taps: taps(s), toggleSip: !st.on };
  st.on = true;
  return out;
};
const quiet = (s) => {
  s.spawnIn = 999;
  s.coinIn = 999;
  s.interestIn = 999;
};
const thief = (kind, lane, x, extra = {}) => ({ id: 900 + lane * 10 + Math.round(x), kind, lane, x, y: laneY(lane), hp: 999, maxHp: 999, speed: 0, stealing: false, alive: true, dying: 0, flash: 0, step: 0, ...extra });

test("every lane starts with its defender in place", () => {
  const s = createGarden(rng());
  assert.deepEqual(
    s.lanes.map((L) => L.kind),
    LANES,
  );
  assert.ok(s.lanes.every((L) => L.money === RULES.seed && level(L.money) === 1));
  assert.equal(s.wallet, RULES.start);
});

test("money feeds a lane's defender and levels it up", () => {
  const s = createGarden(rng());
  assert.ok(invest(s, 2));
  assert.equal(Math.round(laneMoney(s, 2)), 200);
  assert.equal(level(laneMoney(s, 2)), 2);
  assert.ok(Math.abs(s.lanes[2].units - 200 / DEFENDER.gold.nav) < 1e-9, "₹100 buys units at the NAV");
  assert.equal(s.wallet, RULES.start - RULES.feed);
  assert.deepEqual(level(0), 0);
  assert.equal(level(800), 4);
  s.wallet = 50;
  assert.equal(invest(s, 0), false);
  // Tapping a defender feeds it too.
  s.wallet = 500;
  stepGarden(s, 1 / 30, { taps: [{ x: DEF_X, y: laneY(1) }] });
  assert.equal(Math.round(laneMoney(s, 1)), 200);
});

test("spreading money (by hand or with Auto-SIP) holds; fewer lanes or doing nothing loses", () => {
  for (const seed of [1, 2, 3]) {
    const spreadOut = gardenResult(play(even, seed));
    assert.ok(spreadOut.won, `even, seed ${seed}`);
    assert.equal(spreadOut.years, WAVES.length);
    assert.ok(spreadOut.spread > 0.9);
    assert.ok(gardenResult(play(autoSip, seed)).won, `auto-SIP, seed ${seed}`);
    assert.equal(gardenResult(play(threeLanes, seed)).won, false, `three lanes, seed ${seed}`);
    const oneLane = gardenResult(play(allEquity, seed));
    assert.equal(oneLane.won, false, `all equity, seed ${seed}`);
    assert.ok(oneLane.spread < 0.5);
    assert.equal(gardenResult(play(() => ({}), seed)).won, false, `idle, seed ${seed}`);
  }
});

test("a lane far below the others is flagged for diversification", () => {
  const s = createGarden(rng());
  s.wallet = 2000;
  for (let i = 0; i < 4; i++) [0, 1, 2].forEach((lane) => invest(s, lane));
  assert.equal(needsMore(s, 3), true);
  assert.equal(needsMore(s, 0), false);
});

test("the crash year cuts equity and wilts it; the other lanes keep shooting", () => {
  const s = createGarden(rng(5));
  quiet(s);
  s.wave = WAVES.findIndex((w) => w.crash);
  s.waveTime = 5.9;
  stepGarden(s, 0.2, {});
  assert.ok(s.crash > 0);
  assert.ok(Math.abs(laneMoney(s, 0) - RULES.seed * (1 - RULES.crashCut)) < 3);
  assert.ok(s.asking, "the game asks about the SIP");
  stepGarden(s, 1 / 30, { crashChoice: "keep" });
  assert.equal(s.crashChoice, "started");
  assert.equal(s.sip, true);
  for (let lane = 0; lane < 4; lane++) s.thieves.push(thief("inflation", lane, 800));
  const fired = new Set();
  for (let i = 0; i < 60; i++) {
    stepGarden(s, 1 / 30, {});
    for (const sh of s.shots) fired.add(sh.lane);
  }
  assert.equal(fired.has(0), false);
  for (const lane of [1, 2, 3]) assert.ok(fired.has(lane), `lane ${lane}`);
});

test("thieves steal from a lane's money; debt's shield halves it; an empty lane lets them through to the vault", () => {
  const s = createGarden(rng(6));
  quiet(s);
  s.thieves.push(thief("inflation", 0, DEF_X + 20), thief("inflation", 1, DEF_X + 20));
  for (let i = 0; i < 10; i++) stepGarden(s, 0.1, {});
  const took = (i) => (RULES.seed / DEFENDER[LANES[i]].nav - s.lanes[i].units) * s.lanes[i].nav;
  assert.ok(Math.abs(took(0) - THIEF.inflation.steal) < 0.5);
  assert.ok(Math.abs(took(1) - THIEF.inflation.steal * DEFENDER.debt.guard) < 0.5);
  s.lanes[2].units = 0;
  s.lanes[2].money = 0;
  s.thieves.push(thief("debt", 2, DEF_X + 10, { speed: 200 }));
  for (let i = 0; i < 60; i++) stepGarden(s, 1 / 30, {});
  assert.equal(s.hearts, RULES.hearts - 1);
});

test("shots pass through scammers: a tap reports one, or it grabs a fifth of a lane and vanishes", () => {
  const s = createGarden(rng(7));
  quiet(s);
  s.thieves.push(thief("scam", 1, 600, { hp: 1, maxHp: 1 }));
  for (let i = 0; i < 60; i++) stepGarden(s, 1 / 30, {});
  assert.ok(s.thieves[0].alive, "still there after shooting");
  const wallet = s.wallet;
  stepGarden(s, 1 / 30, { taps: [{ x: 600, y: laneY(1) - 30 }] });
  assert.equal(s.reported, 1);
  assert.equal(s.wallet, wallet + RULES.report);
  s.lanes[2].units = 1000 / s.lanes[2].nav;
  s.lanes[2].money = 1000;
  s.thieves.push(thief("scam", 2, DEF_X + 20, { hp: 1, maxHp: 1 }));
  stepGarden(s, 1 / 30, {});
  assert.ok(Math.abs(laneMoney(s, 2) - 800) < 15);
  assert.equal(s.thieves.filter((t) => t.alive).length, 0);
});

test("Auto-SIP puts the same amount in every lane each month", () => {
  const s = createGarden(rng(8));
  quiet(s);
  s.wallet = 1000;
  stepGarden(s, 1 / 30, { toggleSip: true });
  for (let i = 0; i < 30 * (RULES.sipEvery + 2); i++) stepGarden(s, 1 / 30, {});
  assert.ok(s.sips >= 1);
  assert.deepEqual(s.invested, LANES.map(() => RULES.seed + s.sips * RULES.sipEach));
  assert.equal(spread(s), 1);
});

test("over a year each fund's NAV rises by about its return; the FD pays interest coins instead", () => {
  const s = createGarden(rng(9));
  quiet(s);
  s.interestIn = 0.01;
  const year = WAVES[0].seconds;
  for (let i = 0; i < 30 * (year + 0.5); i++) stepGarden(s, 1 / 30, {});
  assert.equal(s.wave, 1);
  LANES.forEach((kind, i) => {
    const grew = s.lanes[i].nav / DEFENDER[kind].nav - 1;
    assert.ok(Math.abs(grew - DEFENDER[kind].rate) < 0.12, `${kind} grew ${grew}`);
  });
  assert.equal(s.lanes[3].nav, 1);
  assert.ok(s.growth > 0);
  assert.ok(s.coins.some((c) => c.interest && c.value >= 10));
});

test("Auto-SIP buys more units when the NAV is low", () => {
  const s = createGarden(rng(10));
  quiet(s);
  s.wallet = 10000;
  s.sip = true;
  s.sipIn = 0;
  stepGarden(s, 1 / 30, {});
  const high = s.lanes[0].sipUnits;
  s.lanes[0].nav *= 0.5;
  s.sipIn = 0;
  stepGarden(s, 1 / 30, {});
  const low = s.lanes[0].sipUnits - high;
  assert.ok(low > high * 1.9, `${low} vs ${high}`);
  const r = gardenResult(s);
  assert.ok(r.funds[0].sipAvg < DEFENDER.equity.nav, "the average price paid is below the starting NAV");
});
