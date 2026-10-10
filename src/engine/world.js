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
  return world;
}
