// The world's luck: inflation and market returns for every year of a life, drawn once from the
// seed at the start. They never depend on choices, so a Parallel Life meets exactly the same
// markets, and luck stays separate from decisions.

import { START_AGE, END_AGE } from "./curriculum.js";
import { streamRandom } from "./rng.js";

const round4 = (x) => Math.round(x * 10000) / 10000;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function makeWorld(A, seed) {
  const random = streamRandom(seed, "world");
  const P = A.products;
  const world = {
    inflation: {},
    returns: { sip_index: {}, gold: {}, land: {}, chit: {} },
    chitCollapse: {},
    crashAges: [],
  };
  const crashAge = random.int(P.sip_index.crashWindow[0], P.sip_index.crashWindow[1]);
  for (let age = START_AGE; age <= END_AGE; age++) {
    world.inflation[age] = round4(random.range(A.inflation.min, A.inflation.max));

    const s = P.sip_index;
    const crash = age === crashAge || random() < s.crashChance;
    const normal = clamp(random.normal(s.mean, s.sd), s.min, s.max);
    const crashDrop = random.range(s.crash[0], s.crash[1]);
    world.returns.sip_index[age] = round4(crash ? crashDrop : Math.max(normal, s.crash[1]));
    if (crash) world.crashAges.push(age);

    const g = P.gold;
    world.returns.gold[age] = round4(clamp(random.normal(g.mean, g.sd), g.min, g.max));
    const l = P.land;
    world.returns.land[age] = round4(clamp(random.normal(l.mean, l.sd), l.min, l.max));
    world.returns.chit[age] = round4(random.range(P.chit.min, P.chit.max));
    world.chitCollapse[age] = random() < P.chit.collapseChance;
  }
  addMarket(A, seed, world);
  return world;
}

// Mutual funds and single stocks, on their own seeded stream (so adding them never changed the
// older draws). Every instrument's yearly return is fixed by the seed, whatever the player does.
function addMarket(A, seed, world) {
  const random = streamRandom(seed, "market");
  const P = A.products;
  const ids = ["mf_debt", "mf_active", "stock_kisan", "stock_chai", "stock_spark", "stock_power"];
  for (const id of ids) world.returns[id] = {};
  world.badNews = {};
  for (let age = START_AGE; age <= END_AGE; age++) {
    const index = world.returns.sip_index[age];
    const d = P.mf_debt;
    world.returns.mf_debt[age] = round4(clamp(random.normal(d.mean, d.sd), d.min, d.max));
    const act = P.mf_active;
    // The index fund's return is already net of its tiny fee; the active fund adds the manager's
    // luck and pays a bigger fee.
    world.returns.mf_active[age] = round4(clamp(index + random.normal(0, act.trackingSd) - (act.expenseRatio - A.market.expenseRatio.sip_index), -0.6, 0.8));
    for (const id of ids.slice(2)) {
      const s = P[id];
      const bad = random() < s.badNewsChance;
      const drop = random.range(A.market.badNews[0], A.market.badNews[1]);
      const own = random.normal(0, s.sd);
      world.returns[id][age] = round4(clamp(bad ? drop : s.beta * index + own, -0.75, 1.2));
      if (bad) (world.badNews[age] ??= []).push(id);
    }
  }
}
