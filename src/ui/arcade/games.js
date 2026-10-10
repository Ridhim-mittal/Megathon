// Three short arcade games, each with one tiny lesson. Pure logic (no DOM): a game is a state
// object changed by step(state, dt, input); the UI draws it. Coordinates are in a 480×270 field.
//
//   jarDash   catch falling coins in your jar, dodge the impulse buys   (little spends add up)
//   scamSmash block the scam messages, let the real ones through        (prize, panic, OTP = scam)
//   snowball  roll your savings ball, collect coins, dodge money traps  (growth grows on growth)
//   insuranceRush  endless drive; keep your policy renewed (see InsuranceRush.jsx)    (insurance must be active)

export const FIELD = { w: 480, h: 270 };

export const GAMES = [
  { id: "jarDash", place: "post", seconds: 40 },
  { id: "scamSmash", place: "square", seconds: 45 },
  { id: "snowball", place: "bank", seconds: 40 },
  // Endless: runs until a crash with an expired policy. Its logic lives in InsuranceRush.jsx.
  { id: "insuranceRush", place: null, seconds: null },
  // Six "months" with summaries in between. Its logic lives in SwipeBazaar.jsx.
  { id: "swipeBazaar", place: null, seconds: null },
];
export const gameById = Object.fromEntries(GAMES.map((g) => [g.id, g]));
export const gameAtPlace = (place) => GAMES.find((g) => g.place === place) ?? null;

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// ---------- Jar Dash ----------
// Coins (₹1, ₹2, ₹5, ₹10) and impulse buys (sweets, toys, a game top-up) fall. Coins go into
// the jar; an impulse buy takes ₹10 out and shakes the jar.
const JAR = { w: 54, h: 40, speed: 300 };
const SPENDS = ["sweet", "toy", "topup"];

function jarDash(rng) {
  return {
    id: "jarDash",
    time: 0,
    jar: { x: FIELD.w / 2, shake: 0 },
    items: [],
    spawnIn: 0.4,
    score: 0,
    caught: 0,
    spent: 0,
    pops: [],
    rng,
  };
}

function stepJarDash(s, dt, input) {
  const g = gameById.jarDash;
  s.time += dt;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (input.pointerX != null) s.jar.x += clamp(input.pointerX - s.jar.x, -JAR.speed * 1.6 * dt, JAR.speed * 1.6 * dt);
  else s.jar.x += dir * JAR.speed * dt;
  s.jar.x = clamp(s.jar.x, JAR.w / 2, FIELD.w - JAR.w / 2);
  s.jar.shake = Math.max(0, s.jar.shake - dt);

  // It gets busier as the clock runs.
  const pace = 1 + s.time / g.seconds;
  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    s.spawnIn = (0.55 + s.rng() * 0.35) / pace;
    const spend = s.rng() < 0.3;
    const value = spend ? -10 : [1, 2, 2, 5, 5, 10][Math.floor(s.rng() * 6)];
    s.items.push({ x: 16 + s.rng() * (FIELD.w - 32), y: -12, vy: (70 + s.rng() * 50) * pace, value, kind: spend ? SPENDS[Math.floor(s.rng() * SPENDS.length)] : "coin" });
  }
  const top = FIELD.h - JAR.h - 6;
  for (const it of s.items) {
    it.y += it.vy * dt;
    if (!it.done && it.y >= top && it.y <= top + 18 && Math.abs(it.x - s.jar.x) < JAR.w / 2 + 6) {
      it.done = true;
      s.score = Math.max(0, s.score + it.value);
      if (it.value > 0) s.caught += it.value;
      else {
        s.spent += -it.value;
        s.jar.shake = 0.35;
      }
      s.pops.push({ x: it.x, y: top - 8, value: it.value, t: 0 });
    }
  }
  s.items = s.items.filter((it) => !it.done && it.y < FIELD.h + 20);
  for (const p of s.pops) p.t += dt;
  s.pops = s.pops.filter((p) => p.t < 0.8);
  return s.time >= g.seconds;
}

// ---------- Scam Smash ----------
// Six phones. A message pops up on one; tap (or press its number) to block it. Block scams,
// let real messages through. A scam that gets through costs a heart; blocking a real one costs points.
export const MESSAGES = {
  scam: ["prize", "otp", "kyc", "tips", "jobFee", "loanApp", "refund"],
  real: ["amma", "salary", "exam", "match", "busTime", "bankReal"],
};
const PHONES = 6;

function scamSmash(rng) {
  return { id: "scamSmash", time: 0, slots: Array(PHONES).fill(null), spawnIn: 0.6, score: 0, hearts: 3, blocked: 0, passed: 0, mistakes: 0, flashes: [], rng };
}

function stepScamSmash(s, dt, input) {
  const g = gameById.scamSmash;
  s.time += dt;
  const pace = 1 + (s.time / g.seconds) * 0.9;
  for (const tap of input.taps ?? []) {
    const m = s.slots[tap];
    if (!m || m.gone) continue;
    m.gone = true;
    if (m.scam) {
      s.score += 10;
      s.blocked += 1;
      s.flashes.push({ slot: tap, kind: "good", t: 0 });
    } else {
      s.score = Math.max(0, s.score - 5);
      s.mistakes += 1;
      s.flashes.push({ slot: tap, kind: "oops", t: 0 });
    }
  }
  for (let i = 0; i < PHONES; i++) {
    const m = s.slots[i];
    if (!m) continue;
    m.left -= dt;
    if (m.gone) s.slots[i] = null;
    else if (m.left <= 0) {
      // Not tapped: a real message is read (good), a scam gets through.
      if (m.scam) {
        s.hearts -= 1;
        s.passed += 1;
        s.flashes.push({ slot: i, kind: "bad", t: 0 });
      } else {
        s.score += 2;
      }
      s.slots[i] = null;
    }
  }
  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    s.spawnIn = (0.75 + s.rng() * 0.5) / pace;
    const free = s.slots.map((m, i) => (m ? -1 : i)).filter((i) => i >= 0);
    if (free.length) {
      const slot = free[Math.floor(s.rng() * free.length)];
      const scam = s.rng() < 0.55;
      const pool = scam ? MESSAGES.scam : MESSAGES.real;
      const life = (2.4 - (s.time / g.seconds) * 0.9) * (0.9 + s.rng() * 0.2);
      s.slots[slot] = { id: `${s.time.toFixed(3)}-${slot}`, scam, msg: pool[Math.floor(s.rng() * pool.length)], left: life, life };
    }
  }
  for (const f of s.flashes) f.t += dt;
  s.flashes = s.flashes.filter((f) => f.t < 0.6);
  return s.time >= g.seconds || s.hearts <= 0;
}

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

const MAKERS = { jarDash, scamSmash, snowball };
const STEPS = { jarDash: stepJarDash, scamSmash: stepScamSmash, snowball: stepSnowball };

export function createGame(id, rng = Math.random) {
  return MAKERS[id](rng);
}

// Advances the game; returns true when it is over.
export function stepGame(s, dt, input = {}) {
  return STEPS[s.id](s, Math.min(dt, 0.05), input);
}

// The final score and the numbers the result screen shows.
export function result(s) {
  if (s.id === "jarDash") return { score: s.score, caught: s.caught, spent: s.spent };
  if (s.id === "scamSmash") return { score: s.score, blocked: s.blocked, passed: s.passed, mistakes: s.mistakes };
  if (s.id === "insuranceRush") return { score: s.score, distance: s.distance, claims: s.claims, renewals: s.renewals };
  if (s.id === "swipeBazaar") return { score: s.score, saved: s.saved, extraPaid: s.extraPaid, needsMissed: s.needsMissed, emisLeft: s.emisLeft };
  return { score: s.value, added: s.added, interest: s.interest, lost: s.lost, shielded: s.shielded };
}
