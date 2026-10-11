import test from "node:test";
import assert from "node:assert/strict";
import { PATANG, candleX, createPatang, marketPath, patangResult, stepPatang } from "./patang.js";

function rng(seed = 1) {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// A pilot that aims for the next gap (or its coin) and steers round anything bad just ahead.
function pilot(s) {
  const ahead = (c, t) => candleX(c.i) + (t?.x ?? 0) - s.scroll;
  const next = s.candles.find((c) => ahead(c) > -PATANG.candleW / 2) ?? s.candles.at(-1);
  const bads = s.candles.flatMap((c) => c.things.filter((t) => t.kind !== "coin" && !t.taken && ahead(c, t) > -12 && ahead(c, t) < 110).map((t) => c.y + t.dy));
  const coin = next.things.find((t) => t.kind === "coin" && !t.taken);
  let target = coin ? next.y + coin.dy : next.y;
  for (const by of bads) if (Math.abs(by - target) < 30) target = by > next.y ? next.y - next.gap * 0.22 : next.y + next.gap * 0.22;
  return { flap: s.kite.y > target + 5 && s.kite.vy > -30 };
}

function fly(seed, policy) {
  const s = createPatang(rng(seed));
  for (let n = 0; n < 60 * 120; n++) if (stepPatang(s, 1 / 60, policy(s))) break;
  return s;
}

test("the market rises over ten years but has one crash", () => {
  for (let seed = 1; seed < 30; seed++) {
    const m = marketPath(rng(seed));
    assert.equal(m.prices.length, PATANG.candles);
    const [a, b] = m.crash;
    assert.ok(m.prices[b] < m.prices[a - 1] * 0.8, `seed ${seed}: the crash falls at least 20%`);
    assert.ok(m.prices.at(-1) > m.prices[0], `seed ${seed}: ten years end higher`);
  }
});

test("a careful pilot stays invested to the end; coins in the crash buy more units", () => {
  let stayed = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const s = fly(seed, pilot);
    const r = patangResult(s);
    if (r.reason === "stayed") stayed += 1;
    assert.ok(Number.isFinite(r.score));
    if (r.reason === "stayed" && r.report.avgUnitsCheap && r.report.avgUnitsDear) assert.ok(r.report.avgUnitsCheap > r.report.avgUnitsDear, `seed ${seed}`);
  }
  assert.ok(stayed >= 8, `${stayed}/12 runs stayed to the end`);
});

test("doing nothing falls to the ground: the shield forgives once, then you have quit", () => {
  const s = fly(3, () => ({}));
  assert.equal(s.shield, 0);
  assert.equal(s.exit.reason, "crashed");
  const r = patangResult(s);
  assert.equal(r.score, 0, "nothing bought, nothing to sell");
});

test("quitting sells at that moment's price; a panic bubble ends the run", () => {
  const s = createPatang(rng(9));
  s.units = 10;
  const c = s.candles[s.market.crash[0] + 2];
  s.scroll = candleX(c.i);
  s.kite.y = c.y;
  c.things = [{ kind: "panic", dy: 0, x: 0, taken: false }];
  s.shield = 1;
  assert.equal(stepPatang(s, 0.001, {}), true);
  assert.equal(s.exit.reason, "panic", "the shield does not protect against panic selling");
  const r = patangResult(s);
  assert.equal(r.score, Math.round(10 * s.exit.price));
  assert.ok(r.report.stayValue > r.score, "staying would have been worth more");
});
