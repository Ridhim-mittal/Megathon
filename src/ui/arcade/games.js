// Three short arcade games, each with one tiny lesson. Pure logic (no DOM): a game is a state
// object changed by step(state, dt, input); the UI draws it. Coordinates are in a 480×270 field.
//
//   snowball  roll your savings ball, collect coins, dodge money traps  (growth grows on growth)
//   insuranceRush  endless drive; keep your policy renewed (see InsuranceRush.jsx)    (insurance must be active)
//   priceSnake     the phone snake; each +1 year makes prices heavier (see priceSnake.js)  (inflation)

import { createPatang, patangResult, stepPatang } from "./patang.js";

export const FIELD = { w: 480, h: 270 };

export const GAMES = [
  { id: "snowball", place: "bank", seconds: 40 },
  // Endless: runs until a crash with an expired policy. Its logic lives in InsuranceRush.jsx.
  { id: "insuranceRush", place: null, seconds: null },
  { id: "patangMarket", place: null, seconds: 54 },
  // Endless too: the classic snake, logic in priceSnake.js.
  { id: "priceSnake", place: null, seconds: null },
  // Six "months" with summaries in between. Its logic lives in SwipeBazaar.jsx.
  { id: "swipeBazaar", place: null, seconds: null },
];
export const gameById = Object.fromEntries(GAMES.map((g) => [g.id, g]));
export const gameAtPlace = (place) => GAMES.find((g) => g.place === place) ?? null;

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// ---------- Snowball ----------
// Your savings ball rolls along three lanes. Coins add to it; every second it also earns 4% on
// what it already holds, so it grows faster as it gets bigger. Money traps break pieces off:
// a SALE! tag, a "no-cost" EMI lock, a "you won!" scam hook, late-fee icicles, a shiny new phone
// and a loan shark that jumps lanes. An insurance umbrella blocks the next trap.
const LANES = [100, 160, 220];
export const SNOWBALL = { rate: 0.04, saleCut: 1 / 3, start: 100, shieldFor: 8 };

// What each trap takes: a share of the ball (cut) or a flat amount. `from` = seconds before it
// starts to appear, so the game teaches one trap at a time.
export const SNOW_TRAPS = {
  sale: { cut: 1 / 3, from: 0 },
  phone: { cut: 0.2, from: 6 },
  fee: { flat: 30, from: 12 },
  emi: { cut: 0.25, from: 17 },
  scam: { cut: 0.5, from: 23 },
  shark: { cut: 0.4, from: 28, hops: true },
};
export const SNOW_GOODIES = { coin: [10, 10, 20, 50], gold: 100 };

function snowball(rng) {
  return { id: "snowball", time: 0, lane: 1, y: LANES[1], value: SNOWBALL.start, added: 0, interest: 0, lost: 0, shielded: 0, shield: 0, things: [], spawnIn: 0.8, tickIn: 1, roll: 0, hit: 0, happy: 0, pops: [], rng, cooldown: 0 };
}

export const ballRadius = (value) => clamp(8 + Math.sqrt(value) * 0.9, 9, 46);

function spawnSnow(s) {
  const r = s.rng();
  const traps = Object.entries(SNOW_TRAPS).filter(([, t]) => s.time >= t.from).map(([k]) => k);
  const lane = Math.floor(s.rng() * 3);
  if (r < 0.36) {
    const kind = traps[Math.floor(s.rng() * traps.length)];
    return { x: FIELD.w + 24, lane, kind, value: 0, bad: true };
  }
  if (r < 0.41) return { x: FIELD.w + 24, lane, kind: "shield", value: 0 };
  if (r < 0.46) return { x: FIELD.w + 24, lane, kind: "gold", value: SNOW_GOODIES.gold };
  return { x: FIELD.w + 24, lane, kind: "coin", value: SNOW_GOODIES.coin[Math.floor(s.rng() * 4)] };
}

function stepSnowball(s, dt, input) {
  const g = gameById.snowball;
  s.time += dt;
  s.cooldown = Math.max(0, s.cooldown - dt);
  if (s.cooldown === 0) {
    if (input.up && s.lane > 0) {
      s.lane -= 1;
      s.cooldown = 0.16;
    } else if (input.down && s.lane < 2) {
      s.lane += 1;
      s.cooldown = 0.16;
    }
  }
  if (input.pointerY != null) s.lane = LANES.reduce((best, y, i) => (Math.abs(y - input.pointerY) < Math.abs(LANES[best] - input.pointerY) ? i : best), 0);
  s.y += (LANES[s.lane] - s.y) * Math.min(1, dt * 14);
  s.roll += dt * 6;
  s.hit = Math.max(0, s.hit - dt);
  s.happy = Math.max(0, s.happy - dt);
  s.shield = Math.max(0, s.shield - dt);

  // Interest, once a second, on what the ball already holds.
  s.tickIn -= dt;
  if (s.tickIn <= 0) {
    s.tickIn += 1;
    const earned = Math.round(s.value * SNOWBALL.rate);
    s.value += earned;
    s.interest += earned;
    if (earned > 0) s.pops.push({ x: 92, y: s.y - ballRadius(s.value) - 6, text: `+${earned}`, kind: "interest", t: 0 });
  }

  const speed = 150 + s.time * 3;
  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    s.spawnIn = 0.55 + s.rng() * 0.45;
    s.things.push(spawnSnow(s));
  }
  const r = ballRadius(s.value);
  for (const it of s.things) {
    it.x -= speed * dt;
    // The loan shark jumps to a neighbouring lane once, partway in.
    if (it.kind === "shark" && !it.hopped && it.x < 300) {
      it.hopped = true;
      it.lane = it.lane === 0 ? 1 : it.lane === 2 ? 1 : s.rng() < 0.5 ? 0 : 2;
    }
    if (!it.done && it.lane === s.lane && Math.abs(it.x - 80) < r + 10) {
      it.done = true;
      if (it.kind === "coin" || it.kind === "gold") {
        s.value += it.value;
        s.added += it.value;
        s.happy = 0.35;
        s.pops.push({ x: 80, y: s.y - r - 6, text: `+${it.value}`, kind: "coin", t: 0 });
      } else if (it.kind === "shield") {
        s.shield = SNOWBALL.shieldFor;
        s.happy = 0.35;
        s.pops.push({ x: 80, y: s.y - r - 6, text: "INSURED", kind: "shield", t: 0 });
      } else if (s.shield > 0) {
        s.shield = 0;
        s.shielded += 1;
        s.pops.push({ x: 80, y: s.y - r - 6, text: "SAFE!", kind: "shield", t: 0 });
      } else {
        const trap = SNOW_TRAPS[it.kind] ?? SNOW_TRAPS.sale;
        const cut = Math.min(s.value, trap.flat ?? Math.round(s.value * trap.cut));
        s.value -= cut;
        s.lost += cut;
        s.hit = 0.45;
        s.pops.push({ x: 80, y: s.y - r - 6, text: `−${cut}`, kind: "sale", t: 0 });
      }
    }
  }
  s.things = s.things.filter((it) => !it.done && it.x > -30);
  for (const p of s.pops) p.t += dt;
  s.pops = s.pops.filter((p) => p.t < 0.9);
  return s.time >= g.seconds;
}
export const laneY = (i) => LANES[i];

// ---------- shared ----------

const MAKERS = { snowball, patangMarket: createPatang };
const STEPS = { snowball: stepSnowball, patangMarket: stepPatang };

export function createGame(id, rng = Math.random) {
  return MAKERS[id](rng);
}

// Advances the game; returns true when it is over.
export function stepGame(s, dt, input = {}) {
  return STEPS[s.id](s, Math.min(dt, 0.05), input);
}

// The final score and the numbers the result screen shows.
export function result(s) {
  if (s.id === "patangMarket") return patangResult(s);
  if (s.id === "priceSnake") return { score: s.score, years: s.years, price: s.price, history: s.history, reason: s.reason };
  if (s.id === "insuranceRush") return { score: s.score, distance: s.distance, claims: s.claims, renewals: s.renewals };
  if (s.id === "swipeBazaar") return { score: s.score, saved: s.saved, extraPaid: s.extraPaid, needsMissed: s.needsMissed, emisLeft: s.emisLeft };
  return { score: s.value, added: s.added, interest: s.interest, lost: s.lost, shielded: s.shielded };
}
