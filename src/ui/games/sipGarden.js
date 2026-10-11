// SIP Garden: a one-minute lane-defence game about mutual funds, SIPs and spreading your money.
// Four fixed lanes: three mutual funds (equity, debt, gold) and a fixed deposit, each with its
// defender already in place. Money you put in a fund buys units at today's NAV (price per unit);
// the lane's value is units × NAV, and that value "feeds" its defender: it levels up, shoots
// harder and faster. Thieves (inflation and debt
// goblins, a market-drop raccoon, scam shadows) walk down every lane evenly; at a defender they
// steal that lane's money, and a lane with nothing left lets them through to your vault. Pure
// logic (no DOM): a game is a state changed by stepGarden(state, dt, input); SipGarden.jsx draws
// it. Field: 960×540.
//
// One wave = one year. NAVs move all the time: equity climbs fastest but swings, debt is steady,
// gold is in between. In the crash year equity's NAV falls 25% and its defender wilts; you choose
// to keep your SIP going (and buy units cheap) or stop it. The FD's value never moves; it pays
// interest as coins on its path. Auto-SIP buys ₹50 of every lane each month: more units when the
// NAV is low, fewer when it is high (rupee-cost averaging).

export const FIELD = { w: 960, h: 540 };
export const LANES = ["equity", "debt", "gold", "fd"];
export const GRID = { x0: 330, y0: 116, row: 97 }; // x0: where the lane paths start
export const DEF_X = 378; // every lane's defender stands here
export const laneY = (i) => GRID.y0 + GRID.row * i + GRID.row / 2;

// nav: starting NAV; rate: its rise per year (made big so it shows in a game); swing: how much
// it wobbles. The FD is not a fund: its "NAV" stays ₹1 and it pays interest out as coins.
export const DEFENDER = {
  equity: { every: 1.0, dmg: 17, nav: 40, rate: 0.3, swing: 0.03, shot: "rocket" },
  debt: { every: 1.35, dmg: 13, nav: 25, rate: 0.12, swing: 0.004, shot: "bolt", guard: 0.5 }, // thieves steal half as fast
  gold: { every: 1.25, dmg: 14, nav: 50, rate: 0.16, swing: 0.012, shot: "nugget", vsInflation: 2 },
  fd: { every: 1.7, dmg: 10, nav: 1, rate: 0, swing: 0, shot: "coin", vsInflation: 0.5, interest: true },
};
export const FUNDS = ["equity", "debt", "gold"];
export const THIEF = {
  inflation: { hp: 100, speed: 44, steal: 18 },
  debt: { hp: 60, speed: 64, steal: 26 },
  raccoon: { hp: 240, speed: 34, steal: 36 },
  scam: { hp: 1, speed: 46, steal: 0, ghost: true }, // shots pass through: tap it to report; it grabs 20% and vanishes
};
export const RULES = {
  start: 400, // cash in hand at the start
  seed: 100, // each defender starts with this much in its lane
  feed: 100, // one tap on a lane invests this much
  coin: 50,
  coinEvery: 1.7,
  coinLife: 9,
  sipEvery: 3, // a "month" of game time
  sipEach: 50, // per lane
  payday: 250, // salary bonus at the start of every new year
  hearts: 3,
  crashFor: 7, // seconds equity wilts
  crashCut: 0.25, // equity loses this share when the crash hits
  report: 50, // reward for reporting a scammer
  interestEvery: 5,
  interestRate: 0.06, // of the FD's value, per interest coin
  vaultLoss: 300,
  between: 2,
};
// Three years, about a minute.
export const WAVES = [
  { seconds: 9, every: 1.7, mix: { inflation: 0.7, debt: 0.3 } },
  { seconds: 10, every: 1.3, mix: { inflation: 0.45, debt: 0.35, raccoon: 0.2 }, crash: true },
  { seconds: 11, every: 0.95, mix: { inflation: 0.4, debt: 0.3, scam: 0.2, raccoon: 0.1 }, huge: true },
];
const VAULT_X = GRID.x0 - 6; // a thief past this is in the vault

export const level = (money) => (money < 1 ? 0 : Math.min(6, 1 + Math.floor(Math.log2(Math.max(1, money / RULES.seed)))));

const pickMix = (mix, r) => {
  let acc = 0;
  for (const [k, w] of Object.entries(mix)) {
    acc += w;
    if (r < acc) return k;
  }
  return Object.keys(mix)[0];
};

export function createGarden(rng = Math.random) {
  return {
    rng,
    ids: 0,
    time: 0,
    phase: "play", // play | between | won | lost
    wave: 0,
    waveTime: 0,
    spawnIn: 2,
    bag: [],
    between: 0,
    wallet: RULES.start,
    invested: LANES.map(() => RULES.seed),
    lanes: LANES.map((kind, i) => {
      const nav = DEFENDER[kind].nav;
      return { kind, lane: i, nav, navStart: nav, units: RULES.seed / nav, money: RULES.seed, cool: 0.5 + i * 0.2, shot: 0, grow: 0, stealFx: 0, sipUnits: 0, sipCost: 0 };
    }),
    crashChoice: null, // kept | stopped | started | skipped
    thieves: [],
    shots: [],
    coins: [],
    coinIn: 1.2,
    interestIn: RULES.interestEvery,
    hearts: RULES.hearts,
    sip: false,
    sipIn: RULES.sipEvery,
    sips: 0,
    crash: 0,
    stolen: 0,
    kills: 0,
    reported: 0,
    growth: 0,
    fx: [], // events for the UI to animate (the UI clears them)
  };
}

export const laneMoney = (s, lane) => s.lanes[lane].money;
export const worth = (s) => Math.round(s.wallet + s.lanes.reduce((a, l) => a + l.money, 0));

// How evenly you spread what you invested: 1 = perfectly even.
export function spread(s) {
  const total = s.invested.reduce((a, x) => a + x, 0);
  if (!total) return 0;
  const off = s.invested.reduce((a, x) => a + Math.abs(x / total - 1 / LANES.length), 0);
  return Math.max(0, 1 - off / (2 * (1 - 1 / LANES.length)));
}

// A lane far below the others: the game flags it "NEED DIVERSIFICATION!".
export const needsMore = (s, lane) => {
  const avg = s.lanes.reduce((a, l) => a + l.money, 0) / LANES.length;
  return avg >= 150 && s.lanes[lane].money < avg * 0.5;
};

const setUnits = (L, units) => {
  L.units = Math.max(0, units);
  L.money = L.units * L.nav;
};

// Buys units of a lane's fund at today's NAV.
export function invest(s, lane, amount = RULES.feed, sip = false) {
  if (s.phase === "won" || s.phase === "lost" || s.wallet < amount) return false;
  const L = s.lanes[lane];
  const before = level(L.money);
  const units = amount / L.nav;
  s.wallet -= amount;
  s.invested[lane] += amount;
  setUnits(L, L.units + units);
  if (sip) {
    L.sipUnits += units;
    L.sipCost += amount;
  }
  L.grow = 1;
  s.fx.push({ kind: "feed", lane, amount, units, nav: L.nav, sip, levelUp: level(L.money) > before });
  return true;
}

// NAVs drift up by their yearly rate and wobble; value and growth follow.
function moveNavs(s, dt) {
  const year = WAVES[s.wave].seconds;
  // A year's growth happens over its own seconds; the walk-in tail after it doesn't add more.
  dt = Math.min(dt, Math.max(0, year - (s.waveTime - dt)));
  if (dt <= 0) return;
  for (const L of s.lanes) {
    const d = DEFENDER[L.kind];
    if (!d.rate) continue;
    const before = L.nav;
    L.nav *= Math.pow(1 + d.rate, dt / year) * (1 + (s.rng() - 0.5) * 2 * d.swing * Math.sqrt(dt * 4));
    s.growth += L.units * (L.nav - before);
    L.money = L.units * L.nav;
  }
}

function spawnThief(s) {
  const w = WAVES[s.wave];
  const kind = pickMix(w.mix, s.rng());
  // Thieves come down every lane evenly: draw lanes from a shuffled bag.
  if (!s.bag.length) {
    s.bag = [0, 1, 2, 3];
    for (let i = 3; i > 0; i--) {
      const j = Math.floor(s.rng() * (i + 1));
      [s.bag[i], s.bag[j]] = [s.bag[j], s.bag[i]];
    }
  }
  let lane = s.bag.pop();
  if (kind === "raccoon" && w.crash) lane = 0; // the market drop goes for equity
  const hp = THIEF[kind].hp * (1 + s.wave * 0.18);
  s.thieves.push({ id: ++s.ids, kind, lane, x: FIELD.w + 24, y: laneY(lane), hp, maxHp: hp, speed: THIEF[kind].speed * (0.9 + s.rng() * 0.2), stealing: false, alive: true, dying: 0, flash: 0, step: s.rng() * 10 });
}

function hurt(s, th, dmg) {
  th.hp -= dmg;
  th.flash = 0.12;
  if (th.hp <= 0 && th.alive) {
    th.alive = false;
    th.dying = 0.5;
    s.kills += 1;
    s.fx.push({ kind: "poof", x: th.x, y: th.y, thief: th.kind });
  }
}

function startWave(s) {
  s.phase = "play";
  s.waveTime = 0;
  s.spawnIn = 2.5;
  if (s.wave > 0) {
    s.wallet += RULES.payday;
    s.fx.push({ kind: "payday", amount: RULES.payday });
  }
  for (const L of s.lanes) L.navStart = L.nav;
  const w = WAVES[s.wave];
  s.fx.push({ kind: "wave", wave: s.wave, huge: Boolean(w.huge), crash: Boolean(w.crash) });
}

// The year in NAVs: how much each fund's price moved.
function yearEnd(s) {
  s.fx.push({ kind: "growth", change: s.lanes.map((L) => (L.navStart ? L.nav / L.navStart - 1 : 0)) });
}

// input: { taps: [{x, y}], invest: [lane], toggleSip: bool }
export function stepGarden(s, dt, input = {}) {
  dt = Math.min(dt, 0.1);
  if (s.phase === "won" || s.phase === "lost") return true;
  s.time += dt;

  if (input.toggleSip) {
    s.sip = !s.sip;
    s.sipIn = Math.min(s.sipIn, 1.5);
  }
  for (const lane of input.invest ?? []) invest(s, lane);
  // The crash question: keep the SIP going (or start one), or stop it.
  if (input.crashChoice && s.asking) {
    s.asking = false;
    const keep = input.crashChoice === "keep";
    s.crashChoice = s.sip ? (keep ? "kept" : "stopped") : keep ? "started" : "skipped";
    s.sip = keep;
    if (keep) s.sipIn = Math.min(s.sipIn, 0.5);
  }

  // Taps: a coin first, then a scammer, then a defender (tapping it feeds it).
  for (const tap of input.taps ?? []) {
    const coin = s.coins.find((c) => !c.taken && Math.hypot(c.x - tap.x, c.y - tap.y) < 30);
    if (coin) {
      coin.taken = true;
      s.wallet += coin.value;
      s.fx.push({ kind: "coin", x: coin.x, y: coin.y, value: coin.value, interest: coin.interest });
      continue;
    }
    const ghost = s.thieves.find((t) => t.alive && t.kind === "scam" && Math.abs(t.x - tap.x) < 30 && tap.y < t.y + 34 && tap.y > t.y - 64);
    if (ghost) {
      ghost.alive = false;
      ghost.dying = 0.5;
      s.reported += 1;
      s.wallet += RULES.report;
      s.fx.push({ kind: "reported", x: ghost.x, y: ghost.y - 40, value: RULES.report });
      continue;
    }
    const lane = s.lanes.findIndex((_, i) => Math.abs(tap.x - DEF_X) < 40 && Math.abs(tap.y - laneY(i)) < 42);
    if (lane >= 0) invest(s, lane);
  }

  if (s.phase === "between") {
    s.between -= dt;
    if (s.between <= 0) startWave(s);
  } else {
    const w = WAVES[s.wave];
    s.waveTime += dt;
    const spawning = s.waveTime < w.seconds;
    if (spawning) {
      s.spawnIn -= dt;
      if (s.spawnIn <= 0) {
        s.spawnIn = w.every * (0.75 + s.rng() * 0.5);
        spawnThief(s);
        if (w.huge && s.waveTime > w.seconds * 0.55 && s.rng() < 0.5) spawnThief(s);
      }
    }
    if (w.crash && s.waveTime >= 3 && !s.crashed) {
      s.crashed = true;
      s.crash = RULES.crashFor;
      const L = s.lanes[0];
      const cut = L.money * RULES.crashCut;
      s.growth -= cut;
      L.nav *= 1 - RULES.crashCut;
      L.money = L.units * L.nav;
      s.asking = true;
      s.fx.push({ kind: "crash", cut: Math.round(cut), sip: s.sip });
    }
    moveNavs(s, dt);
    if (!spawning && !s.thieves.some((t) => t.alive)) {
      yearEnd(s);
      s.wave += 1;
      s.crashed = false;
      if (s.wave >= WAVES.length) {
        s.phase = "won";
        s.fx.push({ kind: "won" });
        return true;
      }
      s.phase = "between";
      s.between = RULES.between;
    }
  }
  s.crash = Math.max(0, s.crash - dt);

  // ---- salary coins rain in; the FD safe pays interest on its own path ----
  s.coinIn -= dt;
  if (s.coinIn <= 0) {
    s.coinIn = RULES.coinEvery * (0.8 + s.rng() * 0.4);
    s.coins.push({ id: ++s.ids, x: 430 + s.rng() * 470, y: 40, to: 130 + s.rng() * 360, value: RULES.coin, life: RULES.coinLife, note: s.rng() < 0.35, taken: false });
  }
  s.interestIn -= dt;
  if (s.interestIn <= 0) {
    s.interestIn = RULES.interestEvery;
    const fd = s.lanes[3];
    if (fd.money >= 1) {
      const value = Math.max(10, Math.round(fd.money * RULES.interestRate));
      s.coins.push({ id: ++s.ids, x: DEF_X + 40, y: laneY(3), to: laneY(3) + 8, slide: DEF_X + 90 + s.rng() * 200, value, life: RULES.coinLife, interest: true, taken: false });
    }
  }
  for (const c of s.coins) {
    if (c.slide != null && c.x < c.slide) c.x = Math.min(c.slide, c.x + 140 * dt);
    else if (c.y < c.to) c.y = Math.min(c.to, c.y + 90 * dt);
    else c.life -= dt;
  }
  s.coins = s.coins.filter((c) => !c.taken && c.life > 0);

  // ---- Auto-SIP: ₹50 into every lane each month ----
  if (s.sip) {
    s.sipIn -= dt;
    if (s.sipIn <= 0) {
      s.sipIn = RULES.sipEvery;
      const need = RULES.sipEach * LANES.length;
      if (s.wallet >= need) {
        for (let i = 0; i < LANES.length; i++) invest(s, i, RULES.sipEach, true);
        s.sips += 1;
        s.fx.push({ kind: "sip" });
      } else s.fx.push({ kind: "sipShort" });
    }
  }

  // ---- defenders ----
  for (const L of s.lanes) {
    L.grow = Math.max(0, L.grow - dt * 2);
    L.shot = Math.max(0, L.shot - dt * 5);
    const lv = level(L.money);
    if (!lv || (L.kind === "equity" && s.crash > 0)) continue; // broke, or wilted by the crash
    L.cool -= dt;
    if (L.cool > 0) continue;
    const target = s.thieves.some((t) => t.alive && t.lane === L.lane && !THIEF[t.kind].ghost && t.x > DEF_X - 10 && t.x < FIELD.w - 10);
    if (!target) {
      L.cool = 0.1;
      continue;
    }
    const d = DEFENDER[L.kind];
    L.cool = d.every / (1 + 0.12 * (lv - 1));
    L.shot = 1;
    const n = lv >= 5 ? 3 : lv >= 3 ? 2 : 1;
    const dmg = d.dmg * Math.sqrt(L.money / RULES.seed) * (n === 1 ? 1 : 0.7);
    for (let k = 0; k < n; k++) s.shots.push({ lane: L.lane, kind: d.shot, x: DEF_X + 30 - k * 18, dy: (k - (n - 1) / 2) * 9, dmg, inflation: d.vsInflation ?? 1 });
  }

  // ---- shots ----
  for (const sh of s.shots) {
    sh.x += 430 * dt;
    const hit = s.thieves.find((t) => t.alive && t.lane === sh.lane && !THIEF[t.kind].ghost && Math.abs(t.x - sh.x) < 18);
    if (hit) {
      hurt(s, hit, sh.dmg * (hit.kind === "inflation" ? sh.inflation : 1));
      sh.done = true;
      s.fx.push({ kind: "hit", x: sh.x, y: laneY(sh.lane) - 18 + sh.dy, shot: sh.kind });
    }
  }
  s.shots = s.shots.filter((sh) => !sh.done && sh.x < FIELD.w + 20);

  // ---- thieves ----
  for (const th of s.thieves) {
    th.flash = Math.max(0, th.flash - dt);
    if (!th.alive) {
      th.dying -= dt;
      continue;
    }
    const L = s.lanes[th.lane];
    if (th.kind === "scam" && th.x <= DEF_X + 30) {
      // A scam is one big grab, then the scammer is gone.
      const take = Math.min(L.money, Math.max(50, L.money * 0.2));
      setUnits(L, L.units - take / L.nav);
      s.stolen += take;
      th.alive = false;
      th.dying = 0.4;
      s.fx.push({ kind: "scammed", lane: th.lane, x: th.x, value: Math.round(take) });
      continue;
    }
    if (L.money >= 1 && th.x <= DEF_X + 30) {
      // At the defender: steal from this lane.
      th.stealing = true;
      const take = Math.min(L.money, THIEF[th.kind].steal * (DEFENDER[L.kind].guard ?? 1) * dt);
      setUnits(L, L.units - take / L.nav);
      s.stolen += take;
      L.stealFx -= dt;
      if (L.stealFx <= 0) {
        L.stealFx = 0.45;
        s.fx.push({ kind: "steal", lane: th.lane, x: th.x });
      }
      if (L.money < 1) {
        setUnits(L, 0);
        s.fx.push({ kind: "broke", lane: th.lane });
      }
      continue;
    }
    th.stealing = false;
    th.x -= th.speed * dt;
    th.step += th.speed * dt;
    if (th.x < VAULT_X) {
      th.alive = false;
      th.dying = 0;
      s.hearts -= 1;
      s.stolen += RULES.vaultLoss;
      s.fx.push({ kind: "vault", lane: th.lane });
      if (s.hearts <= 0) {
        s.phase = "lost";
        s.fx.push({ kind: "lost" });
        return true;
      }
    }
  }
  s.thieves = s.thieves.filter((t) => t.alive || t.dying > 0);
  return false;
}

export function gardenResult(s) {
  return {
    won: s.phase === "won",
    worth: worth(s),
    invested: s.invested.slice(),
    lanes: s.lanes.map((L) => Math.round(L.money)),
    spread: spread(s),
    growth: Math.round(s.growth),
    stolen: Math.round(s.stolen),
    kills: s.kills,
    reported: s.reported,
    sips: s.sips,
    hearts: s.hearts,
    crashChoice: s.crashChoice,
    // What the SIP bought: units, the average price paid, and today's NAV, fund by fund.
    funds: s.lanes
      .filter((L) => FUNDS.includes(L.kind))
      .map((L) => ({ kind: L.kind, units: L.units, nav: L.nav, startNav: DEFENDER[L.kind].nav, sipUnits: L.sipUnits, sipAvg: L.sipUnits ? L.sipCost / L.sipUnits : 0 })),
    years: Math.min(s.wave, WAVES.length),
  };
}
